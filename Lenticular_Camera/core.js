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
  // Search native-pixel recurrence. Repeated content can imitate interlacing:
  // the score describes periodic evidence, not proof of a lenticular encoding.
  function analyzeInterlacing(image){
    const {width,height,data}=image;
    if(width<24||height<24)return {reliable:false,candidates:[],reason:'small'};
    const candidates=[];
    for(const axis of ['x','y']){
      const length=axis==='y'?height:width,cross=axis==='y'?width:height;
      const maxLag=Math.min(96,Math.floor(length/4)),errors=new Float64Array(maxLag+1);
      // Fixed pseudorandom positions avoid aliasing between sample stride and stripes.
      const points=[];let seed=89231;
      for(let i=0;i<1800;i++){
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;const p=Math.floor(seed/4294967296*(length-maxLag));
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;const q=Math.floor(seed/4294967296*cross);
        points.push(axis==='y'?(p*width+q)*4:(q*width+p)*4);
      }
      const step=axis==='y'?width*4:4;
      for(let lag=1;lag<=maxLag;lag++){
        let sum=0,count=0;
        for(const index of points){const other=index+lag*step;if(data[index+3]<240||data[other+3]<240)continue;
          for(let c=0;c<3;c++)sum+=Math.abs(data[index+c]-data[other+c]);count+=3;
        }
        errors[lag]=count?sum/count:0;
      }
      const baseline=errors[1];if(baseline<2)continue;
      for(let lag=2;lag<maxLag;lag++){
        const error=errors[lag],neighbors=(errors[lag-1]+errors[lag+1])/2;
        const contrast=1-error/Math.max(neighbors,.01),recovery=1-error/baseline;
        if(error<=errors[lag-1]&&error<errors[lag+1]&&contrast>.22&&recovery>.3){
          candidates.push({axis,period:lag,score:Math.max(0,Math.min(contrast,recovery)),error});
        }
      }
    }
    // Reject harmonics only when the shorter period has comparable evidence.
    const ranked=candidates.filter(c=>!candidates.some(shorter=>shorter.axis===c.axis&&shorter.period<c.period&&shorter.score>=c.score-.08&&Math.abs(c.period/shorter.period-Math.round(c.period/shorter.period))<.06));
    ranked.sort((a,b)=>b.score-a.score||a.period-b.period);
    const best=ranked[0],runner=ranked[1];
    return {reliable:!!best&&best.score>.65&&(!runner||best.score-runner.score>.15),candidates:ranked.slice(0,4),reason:best?'periodic':'unclear'};
  }
  const api={clamp,frameAt,pitch,sampleIndex,track,analyzeInterlacing};if(typeof module!=='undefined')module.exports=api;else root.Lens=api;
})(typeof window==='undefined'?globalThis:window);
