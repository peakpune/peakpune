import json,re,math
from skyfield.api import Loader,wgs84,Star
from datetime import timezone,timedelta
import os,sys
HERE=os.path.dirname(os.path.abspath(__file__))
YEAR=int(sys.argv[1]); OUT=sys.argv[2]; CAT=sys.argv[3]
ld=Loader(os.environ.get('SKY_EPH_DIR',os.path.join(HERE,'.cache'))); ts=ld.timescale(); eph=ld('de440s.bsp')
IST=timezone(timedelta(hours=5,minutes=30))
obs=eph['earth']+wgs84.latlon(18.5204,73.8567,elevation_m=560)
def ra(s): h,m,sec=re.match(r"(\d+)h (\d+)m ([\d.]+)s",s).groups(); return int(h)+int(m)/60+float(sec)/3600
def de(s):
    m=re.match(r"([+-])(\d+)° (\d+)′ ([\d.]+)″",s); sg=-1 if m.group(1)=='-' else 1
    return sg*(int(m.group(2))+int(m.group(3))/60+float(m.group(4))/3600)
stars=json.load(open(CAT))['stars']
def dirn(az): return ['N','NE','E','SE','S','SW','W','NW'][int(((az+22.5)%360)//45)]
out=[]
for s in stars:
    maxalt=90-abs(18.5204-s['dec'])
    rec=dict(s); rec['maxalt']=round(maxalt,1)
    st=Star(ra_hours=s['ra'],dec_degrees=s['dec'])
    months={}
    for m in range(1,13):
        t=ts.utc(YEAR,m,15,15,30)  # 21:00 IST
        alt,az,_=obs.at(t).observe(st).apparent().altaz()
        months[m]=(round(float(alt.degrees)),dirn(az.degrees))
    rec['m']=months; out.append(rec)
json.dump(out,open(OUT,'w'),sort_keys=True)
