(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // MindAR: column-major target-to-camera matrix, origin at lower-left, +Y up.
  function viewingAngle(matrix,width,height){
    if(!matrix||matrix.length!==16||!matrix.every(Number.isFinite))return null;
    const t=[matrix[12],matrix[13],matrix[14]],camera=[];
    for(let axis=0;axis<3;axis++){
      const c=axis*4,scale=matrix[c]**2+matrix[c+1]**2+matrix[c+2]**2;
      if(scale<1e-10)return null;
      camera.push(-(matrix[c]*t[0]+matrix[c+1]*t[1]+matrix[c+2]*t[2])/scale);
    }
    if(camera[2]<=0)return null;
    return Math.atan2(height/2-camera[1],Math.hypot(camera[0]-width/2,camera[2]))*180/Math.PI;
  }
  function projectPoint(m,p,x,y){
    const v=[m[0]*x+m[4]*y+m[12],m[1]*x+m[5]*y+m[13],m[2]*x+m[6]*y+m[14],1],clip=[0,0,0,0];
    for(let r=0;r<4;r++)for(let c=0;c<4;c++)clip[r]+=p[c*4+r]*v[c];
    if(clip[3]<=0||!clip.every(Number.isFinite))return null;
    return [(clip[0]/clip[3]+1)/2,(1-clip[1]/clip[3])/2];
  }
  function targetQuad(m,p,width,height,videoWidth,videoHeight,viewWidth,viewHeight){
    const scale=Math.max(viewWidth/videoWidth,viewHeight/videoHeight),dw=videoWidth*scale,dh=videoHeight*scale;
    return [[0,height],[width,height],[width,0],[0,0]].map(([x,y])=>{
      const q=projectPoint(m,p,x,y);return q?[q[0]*dw-(dw-viewWidth)/2,q[1]*dh-(dh-viewHeight)/2]:null;
    });
  }
  function homography(width,height,quad){
    if(quad.some(p=>!p||!p.every(Number.isFinite)))return null;
    const points=[[0,0],[width,0],[width,height],[0,height]],a=[];
    for(let i=0;i<4;i++){const [x,y]=points[i],[u,v]=quad[i];a.push([x,y,1,0,0,0,-u*x,-u*y,u]);a.push([0,0,0,x,y,1,-v*x,-v*y,v]);}
    for(let col=0;col<8;col++){
      let pivot=col;for(let r=col+1;r<8;r++)if(Math.abs(a[r][col])>Math.abs(a[pivot][col]))pivot=r;
      if(Math.abs(a[pivot][col])<1e-9)return null;
      [a[col],a[pivot]]=[a[pivot],a[col]];const divisor=a[col][col];for(let c=col;c<9;c++)a[col][c]/=divisor;
      for(let r=0;r<8;r++)if(r!==col){const factor=a[r][col];for(let c=col;c<9;c++)a[r][c]-=factor*a[col][c];}
    }
    const h=a.map(row=>row[8]);return [h[0],h[3],0,h[6],h[1],h[4],0,h[7],0,0,1,0,h[2],h[5],0,1];
  }
  class RevealGate{
    constructor(){this.reset();}
    reset(){this.visible=false;this.pending=null;this.since=0;}
    update(angle,threshold,eligible,now){
      if(!eligible||!Number.isFinite(angle)){this.reset();return false;}
      const desired=this.visible?angle>=threshold-3:angle>=threshold;
      if(desired===this.visible){this.pending=null;return this.visible;}
      if(this.pending!==desired){this.pending=desired;this.since=now;}
      if(now-this.since>=400){this.visible=desired;this.pending=null;}
      return this.visible;
    }
  }
  class RevealBlend{
    constructor(){this.reset();}
    reset(){this.opacity=0;this.lastTime=null;}
    update(angle,threshold,width,eligible,now){
      const dt=this.lastTime===null?0:clamp(now-this.lastTime,0,100);this.lastTime=now;
      const start=Math.max(1,threshold-width/2),end=threshold+width/2;
      const t=eligible&&Number.isFinite(angle)?clamp((angle-start)/(end-start),0,1):0;
      const target=t*t*t*(t*(t*6-15)+10); // Zero slope and curvature at both endpoints.
      this.opacity+=(target-this.opacity)*(1-Math.exp(-dt/(eligible?150:45)));
      if(Math.abs(this.opacity-target)<.001)this.opacity=target;
      return this.opacity;
    }
  }
  class QuadSmoother{
    constructor(){this.reset();}
    reset(){this.points=null;this.lastTime=null;}
    update(points,now){
      if(points.some(p=>!p||!p.every(Number.isFinite))){this.reset();return null;}
      if(!this.points){this.points=points.map(p=>[...p]);this.lastTime=now;return this.points;}
      const dt=clamp(now-this.lastTime,0,100);this.lastTime=now;
      const distance=Math.max(...points.map((p,i)=>Math.hypot(p[0]-this.points[i][0],p[1]-this.points[i][1])));
      // Filter small jitter; follow deliberate motion quickly to avoid a floating overlay.
      const tau=distance>35?12:55,weight=1-Math.exp(-dt/tau);
      this.points=this.points.map((p,i)=>p.map((v,j)=>v+(points[i][j]-v)*weight));return this.points;
    }
  }
  class HeightReveal{
    constructor(){this.reset();}
    reset(){this.opacity=0;this.lastTime=null;}
    update(height,start,full,eligible,now,duration=900){
      const dt=this.lastTime===null?0:clamp(now-this.lastTime,0,100);this.lastTime=now;
      const valid=eligible&&Number.isFinite(height)&&start>full;
      const progress=valid?clamp((start-height)/(start-full),0,1):0;
      const smooth=progress**3*(progress*(progress*6-15)+10);
      // Keep the real wall image dominant early, then blend into B near child height.
      const target=smooth**1.7;
      const tau=valid?clamp(duration,200,2000):45;
      this.opacity+=(target-this.opacity)*(1-Math.exp(-dt/tau));
      if(Math.abs(this.opacity-target)<.001)this.opacity=target;
      return this.opacity;
    }
  }
  const api={clamp,viewingAngle,targetQuad,homography,RevealGate,RevealBlend,QuadSmoother,HeightReveal};
  if(typeof module!=='undefined')module.exports=api;else root.WallView=api;
})(typeof window==='undefined'?globalThis:window);
