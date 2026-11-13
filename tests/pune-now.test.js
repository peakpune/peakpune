import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildView, aqiBand, parseLocal, clock, duration, istDate, forecastUrl, airUrl } from '../public/lib/pune-now-model.js';
import { moonTimes, moonIllumination, phaseName } from '../public/lib/astro.js';

const forecast = {
  current: { time: '2026-11-14T03:30', temperature_2m: 18.4 },
  hourly: {
    time: ['2026-11-14T02:00', '2026-11-14T03:00', '2026-11-14T04:00', '2026-11-14T05:00'],
    temperature_2m: [19, 18.6, 18.1, 17.7],
    precipitation_probability: [0, 5, 10, 15],
  },
  daily: { time: ['2026-11-14', '2026-11-15'], sunrise: ['2026-11-14T06:36', '2026-11-15T06:37'], sunset: ['2026-11-14T17:58', '2026-11-15T17:58'] },
};
const air = { current: { time: '2026-11-14T03:30', us_aqi: 120, pm2_5: 36.8 } };
const NOW = new Date('2026-11-14T03:30:00+05:30');

test('next hour is the first slot that starts after now, with its own temperature and rain chance', () => {
  const v = buildView(forecast, air, NOW);
  assert.deepEqual(v.next, { at: '4:00 am', temp: 18.1, rain: 10 });
  assert.equal(v.now.temp, 18.4);
});

test('exactly on the hour moves to the following hour, and the last slot of the data gives no next hour', () => {
  assert.equal(buildView(forecast, air, new Date('2026-11-14T04:00:00+05:30')).next.at, '5:00 am');
  assert.equal(buildView(forecast, air, new Date('2026-11-14T05:30:00+05:30')).next, null);
});

test('sunrise, sunset and daylight come from the service for today in Pune, not from the visitor\'s time zone', () => {
  const v = buildView(forecast, air, NOW);
  assert.deepEqual(v.sun, { rise: '6:36 am', set: '5:58 pm', daylight: '11 h 22 m' });
  // 23:30 UTC on 13 Nov is already 14 Nov in Pune.
  assert.equal(buildView(forecast, air, new Date('2026-11-13T23:30:00Z')).sun.rise, '6:36 am');
  assert.equal(buildView(forecast, air, new Date('2026-11-20T03:30:00+05:30')).sun, null, 'a day the data does not cover is not guessed');
});

test('AQI uses the US categories and the boundaries are right', () => {
  assert.deepEqual([0, 50, 51, 100, 101, 150, 151, 200, 201, 300, 301].map((n) => aqiBand(n).label), ['Good', 'Good', 'Moderate', 'Moderate', 'Unhealthy for sensitive groups', 'Unhealthy for sensitive groups', 'Unhealthy', 'Unhealthy', 'Very unhealthy', 'Very unhealthy', 'Hazardous']);
  const v = buildView(forecast, air, NOW);
  assert.deepEqual(v.air, { value: 120, label: 'Unhealthy for sensitive groups', tone: 'sensitive', pm25: 36.8 });
});

test('missing or malformed service data becomes null, never a made-up number', () => {
  const v = buildView({ current: { temperature_2m: 'warm' }, hourly: { time: ['2026-11-14T04:00'], temperature_2m: [null] }, daily: {} }, { current: { us_aqi: null } }, NOW);
  assert.equal(v.air, null); assert.equal(v.now, null); assert.equal(v.next, null); assert.equal(v.sun, null);
  const none = buildView(null, undefined, NOW);
  assert.equal(none.air, null); assert.equal(none.next, null);
  assert.ok(none.moon.phase.length > 0, 'the moon is computed locally and does not need the network');
});

test('formatting helpers', () => {
  assert.equal(clock(new Date('2026-11-14T12:05:00+05:30')), '12:05 pm');
  assert.equal(clock(new Date('2026-11-14T00:00:00+05:30')), '12:00 am');
  assert.equal(duration(11 * 3600000 + 22 * 60000), '11 h 22 m');
  assert.equal(istDate(new Date('2026-11-13T19:00:00Z')), '2026-11-14');
  assert.equal(parseLocal('nonsense'), null);
  assert.equal(parseLocal('2026-11-14T06:36').toISOString(), '2026-11-14T01:06:00.000Z');
});

test('requests go to Open-Meteo for Pune in the Pune time zone', () => {
  for (const u of [forecastUrl(), airUrl()]) {
    const url = new URL(u);
    assert.ok(['api.open-meteo.com', 'air-quality-api.open-meteo.com'].includes(url.hostname));
    assert.equal(url.searchParams.get('timezone'), 'Asia/Kolkata');
    assert.ok(Math.abs(Number(url.searchParams.get('latitude')) - 18.52) < 0.01);
  }
});

test('moon: known full moon and new moon dates, and rise/set land on the right side of the day', () => {
  // Cross-checked against an independent library: full moon about 24 Dec 2026, new moon about 9 Dec 2026.
  assert.equal(phaseName(moonIllumination(new Date('2026-12-24T01:28:00Z')).phase), 'Full moon');
  assert.ok(moonIllumination(new Date('2026-12-24T01:28:00Z')).fraction > 0.99);
  assert.ok(moonIllumination(new Date('2026-12-09T12:00:00Z')).fraction < 0.01);
  // Near full moon the moon rises around sunset and sets around sunrise.
  const t = moonTimes(new Date('2026-12-23T00:00:00+05:30'), 18.5204, 73.8567);
  assert.ok(t.rise && t.rise.getUTCHours() + t.rise.getUTCMinutes() / 60 > 11 && t.rise.getUTCHours() < 13.5, String(t.rise)); // ~17:00-19:00 IST
});

test('the home page ships the hidden strip, the script and the attribution; other pages do not load it', () => {
  const home = readFileSync('public/index.html', 'utf8');
  assert.match(home, /<section class="section now" id="pune-now"[^>]* hidden>/);
  assert.match(home, /lib\/pune-now\.js\?v=[a-f0-9]{12}/);
  assert.match(home, /Open-Meteo\.com/);
  assert.ok(!readFileSync('public/events/index.html', 'utf8').includes('pune-now'));
});
