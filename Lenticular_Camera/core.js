(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mod=(a,b)=>((a%b)+b)%b;
  function frameAt(angle,frames,reverse=false){const f=clamp(Math.floor((clamp(angle,-30,30)+30)/60*frames),0,frames-1);return reverse?frames-1-f:f;}
  function pitch(pixels,lpi,mm){return pixels*25.4/(lpi*mm);}
  function sampleIndex(position,period,frame,frames,phase,limit){const origin=phase*period;const cell=Math.floor((position-origin)/period);return clamp(Math.floor(origin+cell*period+(frame+.5)*period/frames),0,limit-1);}
  // Absolute displacement against the calibration image; no integration drift.
  function track(reference,current,width,height,radius=20){let best=Infinity,second=Infinity,bx=0,by=0;let sum=0,sq=0,count=0;for(let y=radius;y<height-radius;y+=3)for(let x=radius;x<width-radius;x+=3){const v=reference[y*width+x];sum+=v;sq+=v*v;count++;}const variance=sq/count-(sum/count)**2;if(!count||variance<35)return {ok:false,dx:0,dy:0,error:Infinity};
    for(let dy=-radius;dy<=radius;dy+=2)for(let dx=-radius;dx<=radius;dx+=2){let error=0,n=0;for(let y=radius;y<height-radius;y+=3)for(let x=radius;x<width-radius;x+=3){error+=Math.abs(reference[y*width+x]-current[(y+dy)*width+x+dx]);n++;}error/=n;if(error<best){second=best;best=error;bx=dx;by=dy;}else if(error<second)second=error;}
    return {ok:best<28&&second-best>.08&&Math.abs(bx)<radius&&Math.abs(by)<radius,dx:bx,dy:by,error:best};
  }
  const api={clamp,frameAt,pitch,sampleIndex,track};if(typeof module!=='undefined')module.exports=api;else root.Lens=api;
})(typeof window==='undefined'?globalThis:window);
