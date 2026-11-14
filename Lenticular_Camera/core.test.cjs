const assert=require('node:assert/strict');const {frameAt,pitch,sampleIndex,track}=require('./core.js');
assert.equal(pitch(600,20,127),6);
assert.equal(frameAt(-30,6),0);assert.equal(frameAt(30,6),5);assert.equal(frameAt(-30,6,true),5);
for(let frame=0;frame<6;frame++)for(let row=0;row<600;row++)assert.equal(sampleIndex(row,6,frame,6,0,600)%6,frame);
assert.equal(sampleIndex(12,6,2,6,.5,600),11);
const w=120,h=90,ref=new Float32Array(w*h),cur=new Float32Array(w*h);let seed=123;for(let i=0;i<ref.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;ref[i]=seed>>>24;}for(let y=0;y<h-6;y++)for(let x=0;x<w-4;x++)cur[(y+6)*w+x+4]=ref[y*w+x];const motion=track(ref,cur,w,h);assert.equal(motion.ok,true);assert.equal(motion.dx,4);assert.equal(motion.dy,6);assert.equal(track(new Float32Array(w*h),cur,w,h).ok,false);
console.log('PASS: physical pitch, view boundaries, interlaced recovery, phase offset, translation tracking, texture rejection');
const {analyzeInterlacing}=require('./core.js');
function fixture(axis,period,kind='interlaced'){
  const width=180,height=168,data=new Uint8ClampedArray(width*height*4);
  const colors=[20,180,65,230,105,155,40,210];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,p=axis==='y'?y:x,q=axis==='y'?x:y;
    const v=kind==='flat'?100:kind==='gradient'?x+y/3:colors[p%period]+q*.07+Math.floor(p/period)*.08;
    data[i]=v;data[i+1]=v*.8;data[i+2]=v*.6;data[i+3]=255;
  }
  return {width,height,data};
}
for(const axis of ['x','y'])for(const period of [3,6,8]){
  const result=analyzeInterlacing(fixture(axis,period));
  assert.equal(result.reliable,true,JSON.stringify(result));
  assert.equal(result.candidates[0].axis,axis);assert.equal(result.candidates[0].period,period);
}
for(const kind of ['flat','gradient'])assert.equal(analyzeInterlacing(fixture('x',6,kind)).candidates.length,0);
const noise=fixture('x',6);for(let i=0;i<noise.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise.data[i]=noise.data[i+1]=noise.data[i+2]=seed>>>24;}
assert.equal(analyzeInterlacing(noise).reliable,false);
const transparent=fixture('y',6);for(let i=3;i<transparent.data.length;i+=4)transparent.data[i]=0;
assert.equal(analyzeInterlacing(transparent).reliable,false);
console.log('PASS: native-pixel period and direction detection; flat, gradient, noise and transparent rejection');
const twoPixel=fixture('y',6),expanded={width:180,height:336,data:new Uint8ClampedArray(180*336*4)};
for(let y=0;y<336;y++)expanded.data.set(twoPixel.data.subarray(Math.floor(y/2)*180*4,(Math.floor(y/2)+1)*180*4),y*180*4);
assert.equal(analyzeInterlacing(expanded).candidates[0].period,12);
const ambiguous=fixture('x',6);for(let y=0;y<ambiguous.height;y++)for(let x=0;x<ambiguous.width;x++){const i=(y*ambiguous.width+x)*4;const v=(x%6)*17+(y%6)*17;ambiguous.data[i]=ambiguous.data[i+1]=ambiguous.data[i+2]=v;}
assert.equal(analyzeInterlacing(ambiguous).reliable,false);
console.log('PASS: multi-pixel frame stripes and ambiguous directions');

