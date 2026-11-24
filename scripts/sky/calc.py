import json, datetime, sys, os, argparse
import numpy as np
from skyfield.api import Loader, wgs84
from skyfield import almanac, eclipselib
from skyfield.framelib import ecliptic_frame
from datetime import timezone, timedelta
ap=argparse.ArgumentParser(description='Pune sky events: moon phases, eclipses, planets, meteor nights.')
ap.add_argument('--start',required=True,help='first day, YYYY-MM-DD (IST)')
ap.add_argument('--end',required=True,help='last day, YYYY-MM-DD')
ap.add_argument('--out',required=True)
ap.add_argument('--meteors',default='data/sky/meteor-nights.json')
A=ap.parse_args()
HERE=os.path.dirname(os.path.abspath(__file__))
ld=Loader(os.environ.get('SKY_EPH_DIR',os.path.join(HERE,'.cache'))); ts=ld.timescale(); eph=ld('de440s.bsp')
IST=timezone(timedelta(hours=5,minutes=30))
E,S,M=eph['earth'],eph['sun'],eph['moon']
pune=wgs84.latlon(18.5204,73.8567,elevation_m=560); obs=E+pune
_s=[int(x) for x in A.start.split('-')]; _e=[int(x) for x in A.end.split('-')]
t0=ts.utc(*_s); t1=ts.utc(_e[0],_e[1],_e[2]+1)
def dt(t): return t.astimezone(IST)
def fs(t): return dt(t).strftime('%Y-%m-%d %H:%M')
def alt(body,T): return obs.at(T).observe(body).apparent().altaz()
out={}
# phases
t,y=almanac.find_discrete(t0,t1,almanac.moon_phases(eph))
names=['New Moon','First Quarter','Full Moon','Last Quarter']
ph=[]
for ti,yi in zip(t,y):
    d=E.at(ti).observe(M).distance().km
    ph.append({'t':fs(ti),'phase':names[yi],'km':round(float(d)),'near':bool(yi==2 and d<361500)})
out['phases']=ph
# lunar eclipses with contacts
t,y,det=eclipselib.lunar_eclipses(t0,t1,eph)
le=[]
for i,(ti,yi) in enumerate(zip(t,y)):
    kind=eclipselib.LUNAR_ECLIPSES[yi]
    mins=np.arange(-240,241)
    T=ts.tt_jd(ti.tt+mins/1440.0)
    ge=E.at(T)
    sp=ge.observe(S).apparent().position.km; mp=ge.observe(M).apparent().position.km
    # angle between moon and anti-sun
    a=-sp/np.linalg.norm(sp,axis=0); b=mp/np.linalg.norm(mp,axis=0)
    sep=np.degrees(np.arccos(np.clip((a*b).sum(0),-1,1)))
    dm=np.linalg.norm(mp,axis=0); ds=np.linalg.norm(sp,axis=0)
    Re,Rs,Rm=6378.137,696340.0,1737.4
    # umbra/penumbra angular radii at moon distance (standard, with atmospheric enlargement 1/50)
    Reff=Re*1.02
    pi_m=np.degrees(np.arcsin(Re/dm)); pi_s=np.degrees(np.arcsin(Re/ds)); s_s=np.degrees(np.arcsin(Rs/ds))
    umb=1.02*(pi_m+pi_s-s_s); pen=1.02*(pi_m+pi_s+s_s); rm=np.degrees(np.arcsin(Rm/dm))
    al=alt(M,T)[0].degrees
    def window(rad):
        ok=sep<rad; 
        return ok
    if kind=='Penumbral':
        ok=sep<pen+rm; 
        label='penumbral'
    else:
        ok=sep<umb+rm
    tot=sep<umb-rm
    if not ok.any(): continue
    up=al>0
    frac=float((ok&up).sum()/ok.sum())
    maxup=bool(al[np.argmin(sep)]>0)
    idx=np.where(ok)[0]
    cat='All of it above the horizon' if frac>0.99 else ('Part of it above the horizon' if frac>0.0 else 'Not visible (Moon below horizon)')
    totup=bool((tot&up).any()) if tot.any() else None
    le.append({'t':fs(ti),'type':kind,'start':fs(T[idx[0]]),'end':fs(T[idx[-1]]),'frac_up':round(frac,2),'cat':cat,'max_up':maxup,'moon_alt_max':round(float(al[np.argmin(sep)]),1),'total_seen':totup})
out['lunar']=le
# solar
se=[]; rs,rm_=696340.0,1737.4
for p in [p for p in ph if p['phase']=='New Moon']:
    c=datetime.datetime.strptime(p['t'],'%Y-%m-%d %H:%M').replace(tzinfo=IST).astimezone(timezone.utc)
    mins=np.arange(-300,301)
    tt=ts.utc(c.year,c.month,c.day,c.hour,c.minute+mins)
    ap=obs.at(tt); s=ap.observe(S).apparent(); m=ap.observe(M).apparent()
    sep=s.separation_from(m).degrees
    ar=np.degrees(np.arcsin(rs/s.distance().km)); am=np.degrees(np.arcsin(rm_/m.distance().km))
    alts=s.altaz()[0].degrees
    ok=(sep<ar+am)&(alts>-0.8)
    if ok.any():
        idx=np.where(ok)[0]; k=idx[np.argmin(sep[idx])]
        mag=(ar[k]+am[k]-sep[k])/(2*ar[k])
        if mag<0.005: continue
        def lens(r1,r2,dd):
            import math
            if dd>=r1+r2: return 0.0
            if dd<=abs(r1-r2): return (min(r1,r2)**2)/(r1**2)
            a1=math.acos((dd*dd+r1*r1-r2*r2)/(2*dd*r1)); a2=math.acos((dd*dd+r2*r2-r1*r1)/(2*dd*r2))
            A=r1*r1*a1+r2*r2*a2-0.5*math.sqrt((-dd+r1+r2)*(dd+r1-r2)*(dd-r1+r2)*(dd+r1+r2))
            return A/(math.pi*r1*r1)
        obsc=lens(float(ar[k]),float(am[k]),float(sep[k]))
        se.append({'obsc':round(obsc*100,1),'t':fs(tt[int(k)]),'start':fs(tt[int(idx[0])]),'end':fs(tt[int(idx[-1])]),'pct':round(float(mag)*100),'sun_alt':round(float(alts[k]),1),'cut_by_horizon':bool(idx[0]==np.where(alts>-0.8)[0][0] or idx[-1]==np.where(alts>-0.8)[0][-1])})
out['solar']=se
# planets
def sun_times(d):
    t=ts.utc(d.year,d.month,d.day-1,0,0); u=ts.utc(d.year,d.month,d.day+1,0,0)
    f=almanac.sunrise_sunset(eph,pune); tt,yy=almanac.find_discrete(t,u,f); return tt,yy
def dirn(az):
    return ['N','NE','E','SE','S','SW','W','NW'][int(((az+22.5)%360)//45)]
def twilight_view(bodies,T0):
    d=dt(T0).date()
    tt,yy=sun_times(d)
    best=None
    res=[]
    for ti,yi in zip(tt,yy):
        if dt(ti).date()!=d: continue
        if yi==0: # sunset
            T=ts.tt_jd(ti.tt+40/1440); when='evening, 40 min after sunset'
        else:
            T=ts.tt_jd(ti.tt-40/1440); when='morning, 40 min before sunrise'
        al=[alt(b,T) for b in bodies]
        res.append((min(a[0].degrees for a in al),when,[(round(float(a[0].degrees)),dirn(a[1].degrees)) for a in al],fs(T)[11:]))
    res.sort(key=lambda r:-r[0]); return res[0]
ev=[]
def date_s(t): return fs(t)[:10]
for n,k in {'Mars':'mars barycenter','Jupiter':'jupiter barycenter','Saturn':'saturn barycenter'}.items():
    tt,yy=almanac.find_discrete(t0,t1,almanac.oppositions_conjunctions(eph,eph[k]))
    for ti,yi in zip(tt,yy):
        if yi!=1: continue
        # closest approach within +-90 days
        days=np.arange(-90,91,0.5); T=ts.tt_jd(ti.tt+days)
        dist=E.at(T).observe(eph[k]).distance().au; j=int(np.argmin(dist))
        # rise/set that evening
        d=dt(ti).date()
        a=ts.utc(d.year,d.month,d.day,0,0); b=ts.utc(d.year,d.month,d.day+1,0,0)
        tr,yr=almanac.find_discrete(a,b,almanac.risings_and_settings(eph,eph[k],pune))
        rise=[fs(x)[11:] for x,z in zip(tr,yr) if z==1]; sets=[fs(x)[11:] for x,z in zip(tr,yr) if z==0]
        ev.append({'t':fs(ti),'kind':'opposition','body':n,'rise':rise,'set':sets,'closest':date_s(T[j]),'closest_au':round(float(dist[j]),2)})
for n,k in {'Mercury':'mercury','Venus':'venus'}.items():
    days=np.arange(0,(t1.tt-t0.tt),0.25); T=ts.tt_jd(t0.tt+days); a=E.at(T)
    pp=a.observe(eph[k]).apparent(); ss=a.observe(S).apparent()
    el=pp.separation_from(ss).degrees
    d=(pp.frame_latlon(ecliptic_frame)[1].degrees-ss.frame_latlon(ecliptic_frame)[1].degrees+180)%360-180
    for i in range(1,len(el)-1):
        if el[i]>el[i-1] and el[i]>=el[i+1] and el[i]>14:
            T0=T[i]; east=bool(d[i]>0)
            # use the twilight on the matching side
            dd=dt(T0).date(); tt,yy=sun_times(dd)
            ti=[x for x,z in zip(tt,yy) if dt(x).date()==dd and z==(0 if east else 1)][0]
            Tv=ts.tt_jd(ti.tt+(40 if east else -40)/1440)
            aa=alt(eph[k],Tv)
            ev.append({'t':fs(T0),'kind':'elong','body':n,'east':east,'deg':round(float(el[i])),'alt':round(float(aa[0].degrees)),'dir':dirn(aa[1].degrees),'clock':fs(Tv)[11:]})
pn=['mercury','venus','mars barycenter','jupiter barycenter','saturn barycenter']
days=np.arange(0,(t1.tt-t0.tt),0.125); T=ts.tt_jd(t0.tt+days); a=E.at(T)
pos={p:a.observe(eph[p]).apparent() for p in pn}; sun=a.observe(S).apparent()
sunel={p:pos[p].separation_from(sun).degrees for p in pn}
dropped=0
for i,p in enumerate(pn):
    for q in pn[i+1:]:
        sep=pos[p].separation_from(pos[q]).degrees
        for j in range(1,len(sep)-1):
            if sep[j]<sep[j-1] and sep[j]<=sep[j+1] and sep[j]<1.0 and min(sunel[p][j],sunel[q][j])>15:
                r=twilight_view([eph[p],eph[q]],T[j])
                if r[0]>=8:
                    ev.append({'t':fs(T[j]),'kind':'pair','a':p.split()[0].title(),'b':q.split()[0].title(),'sep':round(float(sep[j]),1),'when':r[1],'alts':r[2],'clock':r[3]})
                else: dropped+=1
out['planets']=sorted(ev,key=lambda x:x['t']); out['pairs_dropped_low']=dropped
# meteors
_cfg=json.load(open(A.meteors)); sh=[(n,m,d) for n,m,d in _cfg['showers']]
ms=[]
for y_ in range(_s[0],_e[0]+1):
    for n,mo,dy in sh:
        _nd=f'{y_}-{mo:02d}-{dy:02d}'
        if _nd<A.start or _nd>A.end: continue
        a=ts.utc(y_,mo,dy,12,30)  # 18:00 IST
        mins=np.arange(0,721,5)
        T=ts.tt_jd(a.tt+mins/1440.0)
        sa=obs.at(T).observe(S).apparent().altaz()[0].degrees
        ma=obs.at(T).observe(M).apparent().altaz()[0].degrees
        dark=sa<-18; free=dark&(ma<0)
        ill=float(almanac.fraction_illuminated(eph,'moon',ts.tt_jd(a.tt+0.25)))
        ms.append({'year':y_,'shower':n,'night':f'{y_}-{mo:02d}-{dy:02d}','moon_pct':round(ill*100),'dark_h':round(float(dark.sum())*5/60,1),'moonfree_h':round(float(free.sum())*5/60,1)})
out['meteors']=ms
json.dump(out,open(A.out,'w'),indent=1,sort_keys=True)
