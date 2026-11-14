const assert=require('node:assert/strict');const {frameAt,pitch,sampleIndex,track}=require('./core.js');
assert.equal(pitch(600,20,127),6);
assert.equal(frameAt(-30,6),0);assert.equal(frameAt(30,6),5);assert.equal(frameAt(-30,6,true),5);
for(let frame=0;frame<6;frame++)for(let row=0;row<600;row++)assert.equal(sampleIndex(row,6,frame,6,0,600)%6,frame);
assert.equal(sampleIndex(12,6,2,6,.5,600),11);
const w=120,h=90,ref=new Float32Array(w*h),cur=new Float32Array(w*h);let seed=123;for(let i=0;i<ref.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;ref[i]=seed>>>24;}for(let y=0;y<h-6;y++)for(let x=0;x<w-4;x++)cur[(y+6)*w+x+4]=ref[y*w+x];const motion=track(ref,cur,w,h);assert.equal(motion.ok,true);assert.equal(motion.dx,4);assert.equal(motion.dy,6);assert.equal(track(new Float32Array(w*h),cur,w,h).ok,false);
console.log('PASS: physical pitch, view boundaries, interlaced recovery, phase offset, translation tracking, texture rejection');

