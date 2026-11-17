import {tagCorners,photoGeometry} from './catalog.mjs';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),norm=a=>Math.hypot(...a),mul=(a,b)=>Array.from({length:9},(_,i)=>[0,1,2].reduce((s,k)=>s+a[Math.floor(i/3)*3+k]*b[k*3+i%3],0));
function solve(a,b){
  a=a.map((row,i)=>[...row,b[i]]);const n=b.length;
  for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(a[r][c])>Math.abs(a[p][c]))p=r;if(Math.abs(a[p][c])<1e-10)return null;[a[c],a[p]]=[a[p],a[c]];const v=a[c][c];for(let j=c;j<=n;j++)a[c][j]/=v;for(let r=0;r<n;r++)if(r!==c){const k=a[r][c];for(let j=c;j<=n;j++)a[r][j]-=k*a[c][j];}}
  return a.map(row=>row[n]);
}
export function mapPoint(h,[x,y]){const z=h[6]*x+h[7]*y+h[8];return Math.abs(z)<1e-9?null:[(h[0]*x+h[1]*y+h[2])/z,(h[3]*x+h[4]*y+h[5])/z];}
function normalize(points){const x=points.reduce((s,p)=>s+p[0],0)/points.length,y=points.reduce((s,p)=>s+p[1],0)/points.length;const scale=Math.sqrt(2)/(points.reduce((s,p)=>s+Math.hypot(p[0]-x,p[1]-y),0)/points.length||1);return {matrix:[scale,0,-scale*x,0,scale,-scale*y,0,0,1],inverse:[1/scale,0,x,0,1/scale,y,0,0,1],points:points.map(p=>[(p[0]-x)*scale,(p[1]-y)*scale])};}
export function fitHomography(source,target){
  if(source.length!==target.length||source.length<4||target.some(p=>!p||!p.every(Number.isFinite)))return null;
  const a=normalize(source),b=normalize(target),rows=[],values=[];
  a.points.forEach(([x,y],i)=>{const [u,v]=b.points[i];rows.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]);values.push(u,v);});
  const ata=Array.from({length:8},(_,i)=>Array.from({length:8},(_,j)=>rows.reduce((s,row)=>s+row[i]*row[j],0))),atb=Array.from({length:8},(_,i)=>rows.reduce((s,row,j)=>s+row[i]*values[j],0));
  const h=solve(ata,atb);if(!h)return null;
  const result=mul(mul(b.inverse,[...h,1]),a.matrix);if(Math.abs(result[8])<1e-10)return null;return result.map(v=>v/result[8]);
}
export function cameraFromHomography(h,item,width,height,fov){
  const f=Math.hypot(width,height)/(2*Math.tan(fov*Math.PI/360)),cx=width/2,cy=height/2;
  const col=i=>[(h[i]-cx*h[6+i])/f,(h[3+i]-cy*h[6+i])/f,h[6+i]];
  let r1=col(0),r2=col(1),t=col(2);const scale=2/(norm(r1)+norm(r2));if(!Number.isFinite(scale))return null;
  r1=r1.map(v=>v/norm(col(0)));const d=dot(r1,r2);r2=r2.map((v,i)=>v-d*r1[i]);const n=norm(r2);if(n<1e-10)return null;r2=r2.map(v=>v/n);t=t.map(v=>v*scale);
  const r3=[r1[1]*r2[2]-r1[2]*r2[1],r1[2]*r2[0]-r1[0]*r2[2],r1[0]*r2[1]-r1[1]*r2[0]],camera=[-dot(r1,t),-dot(r2,t),-dot(r3,t)];
  const angle=Math.atan2(camera[1]-item.heightMm/2,Math.hypot(camera[0]-item.widthMm/2,camera[2]))*180/Math.PI;
  const cameraHeightMm=(item.wallCenterHeightMm??1750)+item.heightMm/2-camera[1];
  return Number.isFinite(angle)&&Math.abs(angle)<80&&Number.isFinite(cameraHeightMm)?{angle,cameraHeightMm}:null;
}
export function angleFromHomography(h,item,width,height,fov){return cameraFromHomography(h,item,width,height,fov)?.angle??null;}
export function locateItem(item,detections,width,height,fov){
  const valid=detections.filter(d=>d.family==='tag36h11'&&d.hamming===0&&d.decisionMargin>=25);
  const left=valid.filter(d=>d.id===item.leftTag),right=valid.filter(d=>d.id===item.rightTag);
  if(left.length!==1||right.length!==1)return null;
  const source=[...tagCorners(item,'left'),...tagCorners(item,'right')];
  // AprilTag C p[] is BL, BR, TR, TL for an upright printed tag.
  const corners=d=>[3,2,1,0].map(i=>[d.corners[i].x,d.corners[i].y]);
  const target=[...corners(left[0]),...corners(right[0])];
  const edge=d=>Math.min(...d.corners.map((p,i)=>Math.hypot(p.x-d.corners[(i+1)%4].x,p.y-d.corners[(i+1)%4].y)));
  if(Math.min(edge(left[0]),edge(right[0]))<16)return null;
  const h=fitHomography(source,target);if(!h)return null;
  const error=Math.sqrt(source.reduce((s,p,i)=>{const q=mapPoint(h,p);return q?s+(q[0]-target[i][0])**2+(q[1]-target[i][1])**2:Infinity;},0)/8);
  if(error>Math.max(2.5,width*.004))return null;
  const {x,y,diameter:d}=photoGeometry(item);
  const quad=[[x,y],[x+d,y],[x+d,y+d],[x,y+d]].map(p=>mapPoint(h,p));
  if(quad.some(p=>!p||p.some(v=>!Number.isFinite(v)||Math.abs(v)>Math.max(width,height)*5)))return null;
  const area=Math.abs(quad.reduce((s,p,i)=>s+p[0]*quad[(i+1)%4][1]-p[1]*quad[(i+1)%4][0],0))/2;
  if(area<400)return null;
  const pose=cameraFromHomography(h,item,width,height,fov);if(!pose)return null;
  return {id:item.id,quad,...pose,error,area};
}
export function coverQuad(quad,width,height,viewWidth,viewHeight){const scale=Math.max(viewWidth/width,viewHeight/height);return quad.map(([x,y])=>[x*scale-(width*scale-viewWidth)/2,y*scale-(height*scale-viewHeight)/2]);}
