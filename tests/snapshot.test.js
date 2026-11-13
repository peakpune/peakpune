import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSnapshot,safeDistrictLink,nextRefreshAt} from '../public/lib/snapshot.js';
import {istDate,isDate} from '../public/lib/filters.js';
const now=Date.parse('2026-11-13T15:30:00Z');
const row={title:'Real source fixture',date:'2026-11-14',city:'Pune',place:'Source venue',links:[{url:'https://www.district.in/events/example'}]};
const snapshot={schemaVersion:1,fetchedAt:'2026-11-13T15:00:00Z',expiresAt:'2026-11-14T15:00:00Z',events:[row],status:[{state:'ok'}]};
test('typed boundary retains valid local source facts only',()=>{
 const result=parseSnapshot({...snapshot,events:[row,null,{...row,city:'Mumbai'},{...row,date:'2026-02-30'},{...row,date:'2026-11-12'},{...row,links:[{url:'https://elsewhere.example/'}]}]},now);
 assert.equal(result.events.length,1);assert.equal(result.events[0].title,row.title);
});
test('URL boundary rejects look-alikes, credentials, scripts and invalid objects',()=>{
 for(const value of [null,{},'https://www.district.in', {url:'https://www.district.in.evil.example/'},{url:'https://user@www.district.in/'},{url:'javascript:alert(1)'},{url:'http://www.district.in/'}])assert.equal(safeDistrictLink(value),false);
 assert.equal(safeDistrictLink(row.links[0]),true);
});
test('expired, future, inverted and overlong snapshots fail closed',()=>{
 for(const value of [null,{}, {...snapshot,expiresAt:'2026-11-13T15:30:00Z'}, {...snapshot,fetchedAt:'2026-11-13T15:32:00Z'}, {...snapshot,expiresAt:'2026-11-15T15:00:00Z'}, {...snapshot,fetchedAt:'bad'}, {...snapshot,fetchedAt:'2026-11-13T15:30:30Z',expiresAt:'2026-11-13T15:30:20Z'}])assert.throws(()=>parseSnapshot(value,now),TypeError);
});
test('malformed individual dates do not throw and suppress other valid rows',()=>{
 assert.equal(parseSnapshot({...snapshot,events:[{...row,date:'9999-99-99'},row]},now).events.length,1);
 assert.equal(isDate('9999-99-99'),false);
});
test('refresh is scheduled at IST midnight or expiry, including an empty snapshot',()=>{
 const parsed=parseSnapshot(snapshot,now);
 assert.equal(nextRefreshAt(parsed,now),Date.parse('2026-11-13T18:30:00Z')-now+10);
 assert.equal(nextRefreshAt({...parsed,expiresAt:now+1000},now),1010);
 assert.equal(nextRefreshAt(parseSnapshot({...snapshot,events:[]},now),now),10800010);
 assert.equal(istDate(Date.parse('2026-11-13T19:00:00Z')),'2026-11-14');
});
