import assert from 'node:assert/strict';
import {emptyCatalog,newItem,validateCatalog,tagCorners,photoGeometry} from './catalog.mjs';
import {fitHomography,mapPoint,angleFromHomography,cameraFromHomography,locateItem} from './tag-pose.mjs';
const item={...newItem(),imageA:'/media/00000000-0000-4000-8000-000000000001.jpg',imageB:'/media/00000000-0000-4000-8000-000000000002.jpg'};
const config={...emptyCatalog(),items:[item]};assert.equal(validateCatalog(config).items.length,1);
assert.throws(()=>validateCatalog({...config,items:[item,{...item,id:'other'}]}),/ID/);
assert.throws(()=>validateCatalog({...config,items:[{...item,rightTag:item.leftTag}]}),/ID/);
assert.throws(()=>validateCatalog({...config,items:[{...item,imageB:'javascript:alert(1)'}]}),/上传/);
assert.throws(()=>validateCatalog({...config,items:[{...item,tagSeparationMm:10}]}),/重叠/);
assert.throws(()=>validateCatalog({...config,items:[{...item,tagGapMm:0}]}),/白边/);
const width=960,height=720,fov=60,f=Math.hypot(width,height)/(2*Math.tan(fov*Math.PI/360)),distance=900;
function hFor(cameraY){return [f/distance,0,width/2-f*item.widthMm/2/distance,0,f/distance,height/2-f*cameraY/distance,0,0,1];}
const source=[...tagCorners(item,'left'),...tagCorners(item,'right')],close=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
for(const offset of [0,240,-100]){
  const h=hFor(item.heightMm/2+offset),target=source.map(p=>mapPoint(h,p)),fit=fitHomography(source,target);
  source.forEach((p,i)=>{const q=mapPoint(fit,p);close(q[0],target[i][0]);close(q[1],target[i][1]);});
  close(angleFromHomography(fit,item,width,height,fov),Math.atan2(offset,distance)*180/Math.PI);
  const detections=['left','right'].map((side,i)=>({id:item[side+'Tag'],family:'tag36h11',hamming:0,decisionMargin:100,corners:[3,2,1,0].map(k=>({x:target[i*4+k][0],y:target[i*4+k][1]}))}));
  const pose=locateItem(item,detections,width,height,fov);assert.ok(pose);close(pose.angle,Math.atan2(offset,distance)*180/Math.PI);
  const circle=photoGeometry(item),expected=mapPoint(h,[circle.x,circle.y]);
  close(pose.quad[0][0],expected[0]);close(pose.quad[0][1],expected[1]);
  assert.equal(locateItem(item,detections.slice(0,1),width,height,fov),null);
  assert.equal(locateItem(item,[...detections,detections[0]],width,height,fov),null);
  const wrong=detections.map((d,i)=>({...d,corners:d.corners.map(p=>({x:p.x+(i?80:0),y:p.y}))}));assert.equal(locateItem(item,wrong,width,height,fov),null);
}
// Perspective tilt: rotating the camera about its own center preserves the viewing height.
const theta=.22,c=Math.cos(theta),s=Math.sin(theta),cy=item.heightMm/2+240,cx=item.widthMm/2;
const project=([x,y])=>{const X=x-cx,Y=c*(y-cy)-s*distance,Z=s*(y-cy)+c*distance;return [f*X/Z+width/2,f*Y/Z+height/2];};
const perspective=fitHomography(source,source.map(project));close(angleFromHomography(perspective,item,width,height,fov),Math.atan2(240,distance)*180/Math.PI);
console.log('PASS: catalog validation, unique tag pairs, pair geometry, absolute viewing angle, pose under camera tilt, missing/duplicate/misplaced tag rejection');
const old={...item};for(const key of ['wallCenterHeightMm','fadeStartHeightMm','revealHeightMm','blendDurationMs'])delete old[key];
const upgraded=validateCatalog({...config,items:[old]}).items[0];assert.equal(upgraded.wallCenterHeightMm,1750);assert.equal(upgraded.revealHeightMm,1200);assert.equal(upgraded.imageA,item.imageA);
assert.throws(()=>validateCatalog({...config,items:[{...item,revealHeightMm:1600}]}),/融合高度/);
assert.throws(()=>validateCatalog({...config,items:[{...item,wallCenterHeightMm:null}]}),/高度/);
for(const cameraHeight of [1750,1500,1350,1200,1000]){
  const h=hFor(item.heightMm/2+1750-cameraHeight),pose=cameraFromHomography(h,item,width,height,fov);close(pose.cameraHeightMm,cameraHeight);
}
close(cameraFromHomography(perspective,item,width,height,fov).cameraHeightMm,1510);
console.log('PASS: legacy configuration defaults, floor-referenced camera heights including 120 cm, tilted-camera height and invalid height rejection');
for(const [w,h] of [[400,300],[300,400],[400,400]]){
  const v={...item,widthMm:w,heightMm:h},g=photoGeometry(v);
  assert.equal(g.diameter,400);
  close(g.x+g.diameter/2,w/2);close(g.y+g.diameter/2,h/2);
  close(tagCorners(v,'left')[0][1]-(g.y+g.diameter),v.tagGapMm);
}
console.log('PASS: enlarged circle center, projected corners and tag clearance for portrait/landscape/square photos');
