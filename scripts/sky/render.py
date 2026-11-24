import json,re,html,datetime,sys,os,collections,argparse
ap=argparse.ArgumentParser(description='Render the /sky/ page body fragment from generated data.')
ap.add_argument('--events',required=True); ap.add_argument('--stars',required=True)
ap.add_argument('--meteors',default='data/sky/meteor-nights.json'); ap.add_argument('--today',required=True)
ap.add_argument('--out',required=True); ap.add_argument('--open',action='store_true',help='open every accordion (for screenshots)')
A=ap.parse_args()
d=json.load(open(A.events)); MET=json.load(open(A.meteors))
openall=A.open
e=html.escape
MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
def dd(s):
    y,m,dd_=s[:10].split('-'); return f'{int(dd_)} {MON[int(m)-1]} {y}'
def tm(s):
    h,mi=int(s[11:13]),s[14:16]; return f'{(h%12) or 12}:{mi} {"am" if h<12 else "pm"}'
def dt_(s): return f'{dd(s)}, {tm(s)}'
TODAY=A.today
def _addmonths(s,n):
    y,m,dd_=[int(x) for x in s.split('-')]; m+=n; y+=(m-1)//12; m=(m-1)%12+1
    import calendar
    return f'{y}-{m:02d}-{min(dd_,calendar.monthrange(y,m)[1]):02d}'
WEND=_addmonths(TODAY,3)
LAST=max([x['t'][:10] for x in d['phases']])
css='''<style>
.sky-chips{margin:var(--s6) 0 0}
.sky-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--s4);margin-top:var(--s6)}
.sky-card{border:2px solid var(--ink);border-radius:var(--r-card);background:var(--white);padding:var(--s5)}
.sky-card .when{font:600 .78rem var(--body);letter-spacing:.06em;text-transform:uppercase;color:var(--brick-dark);margin:0 0 6px}
.sky-card h3{margin:0 0 6px;font-size:1.15rem}
.sky-card p{margin:6px 0 0;font-size:.95rem;color:var(--ink-soft)}
.sky-tag{display:inline-block;border:1.5px solid var(--ink);border-radius:var(--r-card);padding:6px 12px;font:600 .9rem/1.3 var(--body);margin-top:12px;background:var(--sage);color:var(--ink)}
.sky-tag.warn{background:var(--haldi)}.sky-tag.no{background:var(--clay)}
details.yr{border-top:1.5px solid var(--rule);padding:var(--s3) 0}
details.yr>summary{cursor:pointer;font:600 1.05rem var(--body);padding:var(--s2) 0}
.rows{list-style:none;margin:var(--s2) 0 var(--s3);padding:0}
.rows li{display:grid;grid-template-columns:150px 1fr;gap:var(--s3);padding:8px 0;border-bottom:1px solid var(--rule);font-size:.95rem}
.rows li b{font-weight:600}
.rows small{display:block;color:var(--ink-soft)}
.safety{border:2px solid var(--ink);background:var(--haldi);border-radius:var(--r-card);padding:var(--s6);box-shadow:var(--lift)}
.safety h2{margin-top:0}
.limits li{margin:8px 0}
@media (max-width:560px){.rows li{grid-template-columns:1fr;gap:2px}}
</style>'''
CSSBLOCK=css
def emp(cs):
    vis=any('hidden' not in c.split('>')[0] for c in cs)
    return '<p class="note empty"'+('' if not vis else ' hidden')+'>None visible from Pune in the next 3 months.</p>'
def hid(ds): return f' data-d="{ds}"'+(' hidden' if not (TODAY<=ds<=WEND) else '')
def card(when,title,body,tag=None,cls='',ds=None):
    t=f'<span class="sky-tag {cls}">{e(tag)}</span>' if tag else ''
    return f'<div class="sky-card"{hid(ds) if ds else ""}><p class="when">{e(when)}</p><h3>{e(title)}</h3><p>{body}</p>{t}</div>'
# eclipses
lun=[]; 
for x in d['lunar']:
    if x['cat'].startswith('Not'): continue
    pen=x['type']=='Penumbral'
    pct=round(x['frac_up']*100)
    span=f"{tm(x['start'])} to {tm(x['end'])} IST"
    if pen: body=f"Penumbral: the Moon only dims slightly, hard to notice by eye. Shadow phase {span}."
    else: body=f"{'Partial' if x['type']=='Partial' else 'Total'} eclipse, dark umbral shadow phase {span}."
    if x['type']=='Total': body+=' Totality is seen from Pune.' if x['total_seen'] else ' Totality happens with the Moon below the horizon.'
    if pct>=99: tag,cls='All of the shadow phase is above Pune horizon',''
    else: tag,cls=f'Moon is up for about {pct}% of the shadow phase','warn'
    lun.append(card(dt_(x['t']),f"{x['type']} lunar eclipse",e(body),tag,cls,x['t'][:10]))
sol=[]; border=[]
for x in d['solar']:
    if x['pct']<10:
        border.append(x)
    else:
        sol.append(card(dd(x['t']),'Partial solar eclipse',f"Maximum about {tm(x['t'])} IST, Sun {round(x['sun_alt'])} degrees up. The Moon covers {x['pct']}% of the Sun's diameter. Partial phase roughly {tm(x['start'])} to {tm(x['end'])}.",'Needs solar eclipse glasses','warn',x['t'][:10]))
bn=''.join(f"<p class=\"note\">Not counted as visible: {dd(x['t'])}. timeanddate.com lists this eclipse as not visible from Pune. Our calculation shows the Moon only just touching the Sun's edge, about {x['pct']}% of its diameter at most, for roughly three minutes at sunrise, around {tm(x['t'])} IST.</p>" for x in border)
# planets rows by year
def prow(x):
    w=dd(x['t'])
    if x['kind']=='opposition':
        r=f"rises about {tm('0000-00-00 '+x['rise'][0])} IST" if x['rise'] else 'rises the evening before'
        s_=f"sets about {tm('0000-00-00 '+x['set'][0])}" if x['set'] else ''
        return w,f"<b>{x['body']} at opposition</b><small>Opposite the Sun in the sky, so it is up for most of the night: {r}{', '+s_ if s_ else ''}.</small>"
    if x['kind']=='elong':
        side='after sunset' if x['east'] else 'before sunrise'
        low=' Low, needs a clear horizon.' if x['alt']<12 else ''
        return w,f"<b>{x['body']} furthest from the Sun in the {'evening' if x['east'] else 'morning'} sky</b><small>{x['deg']} degrees from the Sun. About 40 minutes {side} (around {tm('0000-00-00 '+x['clock'])} IST) it is {x['alt']} degrees up in the {x['dir']}.{low}</small>"
    a=x['alts']
    return w,f"<b>{x['a']} and {x['b']} close together</b><small>Within {x['sep']} degrees. Best view about 40 minutes {x['when'].split(', ')[1].replace('40 min ','')} (around {tm('0000-00-00 '+x['clock'])} IST): {x['a']} {a[0][0]} degrees up ({a[0][1]}), {x['b']} {a[1][0]} degrees up ({a[1][1]}).</small>"
by=collections.OrderedDict()
for x in d['planets']: by.setdefault(x['t'][:4],[]).append(x)
pl=''.join(f'<details class="yr"{" open" if openall else ""}><summary>{y}</summary><ul class="rows">'+''.join(f'<li{hid(q["t"][:10])}><span>{p[0]}</span><span>{p[1]}</span></li>' for q,p in zip(l,map(prow,l)))+'</ul></details>' for y,l in by.items())
# meteors
note={'Quadrantids':'Short peak of a few hours.','Lyrids':'','Eta Aquariids':'','Perseids':'','Orionids':'','Leonids':'','Geminids':'Best of the year when the Moon cooperates.'}
by=collections.OrderedDict()
for m in sorted(d['meteors'],key=lambda m:m['night']): by.setdefault(m['year'],[]).append(m)
def mrow(m):
    mo=m['night'];  
    nxt=(datetime.date.fromisoformat(mo)+datetime.timedelta(days=1)).isoformat()
    chk='' if m['year'] in MET['checked_years'] else ' Night not yet checked against the IMO calendar.'
    return f"<li{hid(mo)}><span>around {dd(mo)}</span><span><b>{m['shower']}</b><small>Moon about {m['moon_pct']}% lit. Calculated: of {m['dark_h']} dark hours that night, about {m['moonfree_h']} are without the Moon above the horizon.{chk}</small></span></li>"
ms=''.join(f'<details class="yr"{" open" if openall else ""}><summary>{y}</summary><ul class="rows">'+''.join(map(mrow,l))+'</ul></details>' for y,l in by.items())
# phases
by=collections.OrderedDict()
for p in d['phases']: by.setdefault(p['t'][:4],[]).append(p)
def prr(p):
    tag=' (closer than usual)' if p['near'] else ''
    return f"<li{hid(p['t'][:10])}><span>{dd(p['t'])}</span><span><b>{p['phase']}</b>{tag}, {tm(p['t'])} IST</span></li>"
mp=''.join(f'<details class="yr"{" open" if openall else ""}><summary>{y}</summary><ul class="rows">'+''.join(map(prr,l))+'</ul></details>' for y,l in by.items())
st=json.load(open(A.stars))
seen=set(); S=[]
for r in st:
    nm=(r['name'] or '').rstrip('.')
    if not nm or nm in seen or nm in ('Alp2Cen','Alp2Cru'): continue
    seen.add(nm); r['nm']=nm; S.append(r)
MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
def starrow(r):
    best=max(range(1,13),key=lambda m:r['m'][str(m)][0]); ba,bd=r['m'][str(best)]
    if r['maxalt']<5: txt=f"Never rises above {round(r['maxalt'])} degrees from Pune, so effectively not visible."
    else:
        txt=f"Highest it can get from Pune: {round(r['maxalt'])} degrees. At 9 pm it is highest in {MN[best-1]} ({ba} degrees, {bd})."
        if r['maxalt']<20: txt+=' Always low in the sky and needs a clear horizon.'
    return f"<li><span><b>{r['nm']}</b></span><span>{r['con']}, magnitude {r['v']:.2f}<small>{txt}</small></span></li>"
HI=[r for r in S if r['maxalt']>=30]; LO=[r for r in S if r['maxalt']<30]
stars_html='<ul class="rows">'+''.join(map(starrow,HI))+'</ul>'
low_html='<ul class="rows">'+''.join(map(starrow,LO))+'</ul>'
mg=[]
for m in range(1,13):
    cons={}
    for r in st:
        if r['m'][str(m)][0]>=30:
            c=r['con']; nm=(r['name'] or r['bayer']).rstrip('.')
            if c not in cons or r['v']<cons[c][0]: cons[c]=(r['v'],nm,r['m'][str(m)][1])
    items=sorted(cons.items(),key=lambda kv:kv[1][0])
    body='; '.join(f"{c} ({v[1]}, {v[2]})" for c,v in items[:7]) or 'No bright stars are high up.'
    mg.append(card(MN[m-1],f"Evening sky, mid {MN[m-1]}",e(body)))
mg_html='<div class="sky-grid">'+''.join(mg)+'</div>'
STARSEC=('<section class="section" id="stars"><div class="section-head"><h2>Stars and constellations</h2></div>'
 '<p class="note">This is a seasonal guide: the same stars come back every year, so there are no dates here. Each card lists constellations that have a star of magnitude 2.0 or brighter at least 30 degrees above the horizon at 9 pm IST in mid-month, with that star and the direction to look. Constellations whose stars are all fainter are not shown. Star positions come from the Yale Bright Star Catalogue (J2000, https://github.com/brettonw/YaleBrightStarCatalog) and are moved to the observing date with Skyfield.</p>'
 +mg_html+'<h3 style="margin-top:var(--s8)">The bright stars, from Pune</h3><details class="yr"'+(' open' if openall else '')+'><summary>Good viewing targets: '+str(len(HI))+' stars that rise 30 degrees or more</summary>'+stars_html+'</details><details class="yr"'+(' open' if openall else '')+'><summary>Low or not visible from Pune: '+str(len(LO))+' southern stars</summary><p class="note">These stay under 30 degrees from Pune. Those between 5 and 30 degrees need a clear southern horizon. A star under 5 degrees, like Miaplacidus (about 2 degrees at best), technically clears the horizon but is too low to see in practice.</p>'+low_html+'</details></section>\n')
# next up
ev=[]
for p in d['phases']:
    if p['phase'] in ('Full Moon','New Moon') and p['t'][:10]>=TODAY: ev.append((p['t'],p['phase'],f"{dt_(p['t'])} IST."+(' Full Moon closer to Earth than usual.' if p['near'] else ''),'moon'))
for x in d['lunar']:
    if x['t'][:10]>=TODAY and not x['cat'].startswith('Not'): ev.append((x['t'],x['type']+' lunar eclipse',f"Shadow phase {tm(x['start'])} to {tm(x['end'])} IST."+('' if x['frac_up']>0.99 else f" Moon is up for about {round(x['frac_up']*100)}% of it."),'ecl'))
for x in d['solar']:
    if x['t'][:10]>=TODAY and x['pct']>=10: ev.append((x['t'],'Partial solar eclipse',f"Maximum about {tm(x['t'])} IST, {x['pct']}% of the Sun's diameter covered. Eclipse glasses needed.",'sol'))
for x in d['planets']:
    if x['t'][:10]>=TODAY:
        p=prow(x); ev.append((x['t'],re.sub('<[^>]+>','',p[1].split('</b>')[0]),re.sub('<[^>]+>','',p[1].split('</b>')[1]),'pl'))
for m in d['meteors']:
    if m['night']>=TODAY: ev.append((m['night']+' 00:00',m['shower']+' meteor shower',f"Around the night of {dd(m['night'])}, give or take a day or two. Moon about {m['moon_pct']}% lit.",'met'))
ev.sort(key=lambda r:r[0]); nxh=''.join(card(dd(a),b_,e(c)) for a,b_,c,_ in ev[:8])
pool=json.dumps([[a,dd(a),b_,c] for a,b_,c,_ in ev]).replace('</','<\\/')
nxscript="<script>(function(){var P="+pool+";var n=new Date(Date.now()+19800000).toISOString().slice(0,16).replace('T',' ');var g=document.getElementById('nextgrid');if(!g)return;var o=P.filter(function(r){return r[0]>=n}).slice(0,8);if(!o.length)return;g.innerHTML='';o.forEach(function(r){var c=document.createElement('div');c.className='sky-card';var a=document.createElement('p');a.className='when';a.textContent=r[1];var h=document.createElement('h3');h.textContent=r[2];var t=document.createElement('p');t.textContent=r[3];c.appendChild(a);c.appendChild(h);c.appendChild(t);g.appendChild(c)})})();</script>"
WINJS="<script>(function(){var d=new Date(Date.now()+19800000),pad=function(n){return(n<10?'0':'')+n},t=d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());var e=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+3,d.getUTCDate()));if(e.getUTCMonth()!=(d.getUTCMonth()+3)%12)e=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+4,0));var w=e.getUTCFullYear()+'-'+pad(e.getUTCMonth()+1)+'-'+pad(e.getUTCDate());document.querySelectorAll('[data-d]').forEach(function(x){x.hidden=!(x.dataset.d>=t&&x.dataset.d<=w)});document.querySelectorAll('details.yr').forEach(function(y){y.hidden=!y.querySelector('[data-d]:not([hidden])')&&!!y.querySelector('[data-d]')});document.querySelectorAll('p.empty').forEach(function(p){var g=p.previousElementSibling;p.hidden=!!g.querySelector('[data-d]:not([hidden])')})})();</script>"
page=CSSBLOCK+'''<div class="hero hero-single"><div><div class="eyebrow">Pune sky calendar</div><h1>Look up, Pune.<br><em>Moon, eclipses, planets and meteor showers.</em></h1><p class="lede">Astronomy only. Dates are calculated for Pune city and shown in IST. Read the limits at the bottom before planning a night around one.</p>
<div class="chips sky-chips"><a class="chip" href="#next">Next up</a><a class="chip" href="#eclipses">Eclipses</a><a class="chip" href="#planets">Planets</a><a class="chip" href="#stars">Stars</a><a class="chip" href="#meteors">Meteor showers</a><a class="chip" href="#moon">Moon phases</a><a class="chip" href="#limits">How it is calculated</a></div></div></div>
<section class="section" id="next"><div class="section-head"><h2>Next up</h2></div><p class="note">The next eight sky events in date order: new and full Moons, eclipses, planet events and meteor showers (quarter Moons are in the Moon phases list below). Every section below shows the next 3 months from today; the list rolls forward as dates pass.</p><div class="sky-grid" id="nextgrid">'''+nxh+'''</div></section>'''+nxscript+WINJS+'''
<section class="section" id="eclipses"><div class="section-head"><h2>Eclipses visible from Pune</h2></div>
<p class="note">Only eclipses with some part above Pune horizon are listed. 'Lunar' times are the dark-shadow (umbral) phase; penumbral eclipses use the faint outer shadow.</p>
<div class="safety" style="margin:var(--s6) 0"><h2>Solar eclipses: protect your eyes</h2><p>Never look at a partly eclipsed Sun directly. Use solar eclipse glasses or a handheld solar viewer that meets ISO 12312-2. Regular sunglasses are not safe, however dark. Do not look at the Sun through a camera, binoculars or telescope without a solar filter on the front, even while wearing eclipse glasses. A pinhole projector (a hole in card, the Sun at your back) is a safe indirect option. Lunar eclipses are safe to watch with the naked eye. Source: <a href="https://science.nasa.gov/eclipses/safety/">NASA eclipse safety</a>.</p></div>
<h3>Solar (partial from Pune)</h3><p class="note">The percentage is the share of the Sun's diameter covered (the eclipse 'magnitude'), not the share of its area.</p><div class="sky-grid">'''+''.join(sol)+'''</div>'''+emp(sol)+'''
'''+bn+'''<h3 style="margin-top:var(--s8)">Lunar</h3><div class="sky-grid">'''+''.join(lun)+'''</div>'''+emp(lun)+'''</section>
<section class="section" id="planets"><div class="section-head"><h2>Planets</h2></div>
<p class="note">Mercury and Venus appear near the Sun, so their best dates are listed with where to look in twilight from Pune. Mars, Jupiter and Saturn are listed at opposition. Close pairs are listed only if both are at least 8 degrees up in twilight. Brightness numbers are not included.</p>'''+pl+'''</section>
'''+STARSEC+'''<section class="section" id="meteors"><div class="section-head"><h2>Meteor showers</h2></div>
<p class="note">Dates are approximate annual windows, not predicted peaks: each shower peaks around the same night every year, give or take a day or two, and the exact hour shifts. The nights are checked against the International Meteor Organization (IMO) calendar for '''+' and '.join(map(str,MET['checked_years']))+'''. Nights in other years use the same dates and are marked as not yet checked. We show how much of the dark night has no Moon above the horizon. Rates are for dark sky and will be lower from Pune city.</p>'''+ms+'''</section>
<section class="section" id="moon"><div class="section-head"><h2>Moon phases</h2></div><p class="note">New, first quarter, full and last quarter, in IST. 'Closer than usual' marks full moons closer to Earth than about 361,500 km, our own cut-off, not an official definition.</p>'''+mp+'''</section>
<section class="section provenance" id="limits"><h2>How this is calculated, and its limits</h2><ul class="limits">
<li>Calculated with NASA JPL's DE440s planetary ephemeris and the Skyfield library for Pune city centre (18.52 N, 73.86 E, 560 m). Times are IST. This copy was generated on '''+dd(TODAY)+''' and has data to '''+dd(LAST)+'''. The page shows the next 3 months from the day you open it.</li>
<li>Checked when this page was first built (24 Nov 2026), for 2026 and 2027 only: (1) all 3 lunar and 1 solar eclipse dates, and lunar types, match the <a href="https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html">NASA lunar</a> and <a href="https://eclipse.gsfc.nasa.gov/SEdecade/SEdecade2021.html">NASA solar</a> catalogues. (2) Local start, maximum, end and magnitude for the 2 Aug 2027 solar eclipse agree with <a href="https://www.timeanddate.com/eclipse/in/india/pune">timeanddate Pune</a> to within one minute. (3) Moon phase times for Jan and Feb 2027 match <a href="https://www.timeanddate.com/moon/phases/india/pune">timeanddate</a>. (4) Planet altitudes for the Mercury, Venus and close-pair rows agree within about 1 degree with a separate calculation using Astropy's built-in ephemeris. (5) Meteor shower nights match the <a href="https://www.imo.net/calendar/">IMO calendar</a>.</li>
<li>Later dates are calculated the same way, by a script that is re-run every quarter, but they have not been checked one by one against these sources.</li>
<li>Calculated here, not independently checked: the monthly star guide (altitudes and directions are Skyfield output from Yale Bright Star Catalogue positions; they were spot-checked against Astropy for all stars, within 0.5 degrees, and the positions against a second table in the same catalogue repository, within 0.25 degrees), Mars, Jupiter and Saturn rise and set times, the Moon-free hours on meteor nights, and eclipse times other than those listed above. Meteor nights are approximate windows, give or take a day or two.</li>
<li>Twilight is a rule of thumb: 40 minutes after sunset or before sunrise. Buildings, hills, haze and light pollution are ignored, and the horizon is taken as flat. Calculated altitudes ignore air refraction.</li>
<li>Elsewhere in Pune district, rise and set times and eclipse times differ slightly from Pune city.</li>
<li>Not included: comets, satellite and space station passes, bright asteroids, Moon-planet pairings, and anything from the Hindu calendar.</li>
</ul><p class="note">Sources: <a href="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp">JPL DE440s</a>, <a href="https://www.imo.net/calendar/">IMO meteor shower calendar</a>.</p></section>
'''
open(A.out,'w').write(page)
