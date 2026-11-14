import test from 'node:test';import assert from 'node:assert/strict';
import {sanitizeImage,MAX_BYTES} from '../src/image-sanitize.js';
import {FIX} from './fixtures-images.js';
const bytes=k=>new Uint8Array(Buffer.from(FIX[k],'base64'));
const has=(u,s)=>Buffer.from(u).includes(s);
test('jpeg: EXIF/GPS removed, trailing data dropped, still starts/ends as a JPEG',()=>{
 const src=bytes('jpg');assert.ok(has(src,'Exif')&&has(src,'PhoneCo'));
 const poly=new Uint8Array([...src,...Buffer.from('<script>x</script>')]);
 const r=sanitizeImage(poly);assert.equal(r.ok,true);
 assert.ok(!has(r.bytes,'Exif')&&!has(r.bytes,'PhoneCo')&&!has(r.bytes,'<script>'));
 assert.deepEqual([r.bytes[0],r.bytes[1],r.bytes.at(-2),r.bytes.at(-1)],[0xff,0xd8,0xff,0xd9]);
});
test('png: text and exif chunks removed',()=>{
 const src=bytes('png');assert.ok(has(src,'secret-gps'));
 const r=sanitizeImage(src);assert.equal(r.ok,true);
 assert.ok(!has(r.bytes,'secret-gps')&&!has(r.bytes,'eXIf')&&!has(r.bytes,'tEXt'));assert.ok(has(r.bytes,'IDAT')&&has(r.bytes,'IEND'));
});
test('webp: EXIF and XMP chunks removed, RIFF size consistent',()=>{
 const src=bytes('webp');assert.ok(has(src,'EXIF')&&has(src,'XMP '));
 const r=sanitizeImage(src);assert.equal(r.ok,true);
 assert.ok(!has(r.bytes,'EXIF')&&!has(r.bytes,'XMP ')&&!has(r.bytes,'secret'));
 assert.equal(Buffer.from(r.bytes).readUInt32LE(4)+8,r.bytes.length);
});
test('rejects wrong type, truncated, oversize, animated, tiny input',()=>{
 assert.equal(sanitizeImage(new TextEncoder().encode('<?php echo 1; ?>'+'A'.repeat(100))).reason,'type');
 assert.equal(sanitizeImage(bytes('jpg').slice(0,200)).ok,false);
 assert.equal(sanitizeImage(bytes('png').slice(0,60)).ok,false);
 assert.equal(sanitizeImage(new Uint8Array(MAX_BYTES+1)).reason,'size');
 assert.equal(sanitizeImage(new Uint8Array(4)).reason,'size');
 const apng=Buffer.from(bytes('png'));const i=apng.indexOf('IDAT')-4;
 const acTL=Buffer.concat([Buffer.from([0,0,0,8]),Buffer.from('acTL'),Buffer.alloc(8),Buffer.alloc(4)]);
 assert.equal(sanitizeImage(new Uint8Array(Buffer.concat([apng.subarray(0,i),acTL,apng.subarray(i)]))).reason,'animated');
});
test('sanitizer is not wired into any page or script',async()=>{
 const {readdirSync,readFileSync}=await import('node:fs');
 for(const d of ['public','scripts']) for(const f of readdirSync(d)) if(/\.(js|mjs|html)$/.test(f)) assert.ok(!readFileSync(d+'/'+f,'utf8').includes('image-sanitize'),f);
});
