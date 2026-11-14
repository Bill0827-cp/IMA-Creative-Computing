const assert=require('node:assert/strict');
const {viewingAngle,targetQuad,homography,RevealGate}=require('./core.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const front=[1,0,0,0,0,1,0,0,0,0,1,0,-100,-150,-600,1];
close(viewingAngle(front,200,300),0);
const below=[...front];below[13]=50;
close(viewingAngle(below,200,300),Math.atan2(200,600)*180/Math.PI);
const above=[...front];above[13]=-350;assert.ok(viewingAngle(above,200,300)<0);
// Rotating the camera at the same location must NOT simulate crouching.
function rotateCamera(m,a){const c=Math.cos(a),s=Math.sin(a),out=[...m];for(let col=0;col<4;col++){out[col*4+1]=c*m[col*4+1]-s*m[col*4+2];out[col*4+2]=s*m[col*4+1]+c*m[col*4+2];}return out;}
close(viewingAngle(rotateCamera(front,.4),200,300),0);
close(viewingAngle(rotateCamera(below,.4),200,300),viewingAngle(below,200,300));
assert.equal(viewingAngle(Array(16).fill(0),200,300),null);
const behind=[...front];behind[14]=600;assert.equal(viewingAngle(behind,200,300),null);
const projection=[2,0,0,0,0,2,0,0,0,0,-1,-1,0,0,-20,0];
const quad=targetQuad(front,projection,200,300,800,600,800,600);
close(quad[0][0],800/3);close(quad[0][1],150);close(quad[2][0],1600/3);close(quad[2][1],450);
// A portrait viewport crops the same camera feed with object-fit: cover.
const cropped=targetQuad(front,projection,200,300,800,600,300,600);close(cropped[0][0],800/3-250);
for(const q of [quad,[[12,10],[190,35],[230,290],[-5,270]]]){
  const h=homography(200,300,q);assert.ok(h);
  [[0,0],[200,0],[200,300],[0,300]].forEach(([x,y],i)=>{const w=h[3]*x+h[7]*y+1;close((h[0]*x+h[4]*y+h[12])/w,q[i][0]);close((h[1]*x+h[5]*y+h[13])/w,q[i][1]);});
}
assert.equal(homography(200,300,[[0,0],[0,0],[0,0],[0,0]]),null);
const gate=new RevealGate();
assert.equal(gate.update(20,12,false,0),false);
assert.equal(gate.update(0,12,true,10),false);
assert.equal(gate.update(20,12,true,100),false);
assert.equal(gate.update(20,12,true,499),false);
assert.equal(gate.update(20,12,true,500),true);
assert.equal(gate.update(10,12,true,600),true); // hysteresis
assert.equal(gate.update(0,12,true,700),true);
assert.equal(gate.update(0,12,true,1100),false);
gate.update(20,12,true,1200);assert.equal(gate.update(20,12,true,1600),true);
assert.equal(gate.update(20,12,false,1601),false); // target loss hides immediately
assert.equal(gate.update(null,12,true,1700),false);
console.log('PASS: standing/crouching geometry, camera rotation invariance, projection/crop, perspective overlay, dwell/hysteresis, target loss');
