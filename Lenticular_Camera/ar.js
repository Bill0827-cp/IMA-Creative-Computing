// MindAR's compiler and controller run in this disposable, same-origin frame.
const video=document.getElementById('video'),overlay=document.getElementById('overlay'),hint=document.getElementById('hint');
const C=window.WallView,blend=new C.RevealBlend(),quadFilter=new C.QuadSmoother();
let controller=null,stream=null,initialized=false,stopped=false,tracked=false,matrix=null,projection=null;
let targetWidth=0,targetHeight=0,baseline=null,threshold=12,blendWidth=12,smoothed=null,samples=[],lastPose=0,lastReport=0,lastTransform=null,lostAt=null;
const urls=[];
function report(type,extra={}){parent.postMessage({type,...extra},location.origin);}
function message(text){hint.textContent=text;report('status',{text});}
function stable(){return tracked&&samples.length>=10&&Math.max(...samples)-Math.min(...samples)<4&&performance.now()-lastPose<500;}
function mean(){return samples.reduce((a,b)=>a+b,0)/samples.length;}
async function imageFromBlob(blob){const url=URL.createObjectURL(blob);urls.push(url);const image=new Image();image.src=url;await image.decode();return image;}
function lose(){if(tracked)lostAt=performance.now();tracked=false;matrix=null;smoothed=null;samples=[];quadFilter.reset();}
function stop(){stopped=true;controller?.stopProcessVideo();stream?.getTracks().forEach(t=>t.stop());for(const url of urls)URL.revokeObjectURL(url);lose();blend.reset();overlay.style.opacity='0';overlay.style.display='none';}
function errorMessage(error){
  if(error?.name==='NotAllowedError')return '摄像头权限未获允许。请允许此网站使用摄像头，然后重试。';
  if(error?.name==='NotFoundError')return '没有找到摄像头，请在带后置摄像头的手机上打开。';
  return `识别未能启动：${error?.message||'请检查网络、HTTPS、相机权限与 WebGL 支持，然后重试。'}`;
}
async function initialize(data){
  if(initialized)return;initialized=true;threshold=C.clamp(Number(data.threshold)||12,5,45);blendWidth=C.clamp(Number(data.blendWidth)||12,4,24);
  try{
    message('请允许摄像头访问。');
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    if(stopped){stream.getTracks().forEach(t=>t.stop());return;}
    video.srcObject=stream;await video.play();video.width=video.videoWidth;video.height=video.videoHeight;
    message('正在加载识别引擎，首次打开需要联网…');
    const {Compiler,Controller}=await import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js');
    if(stopped)return;
    const target=await imageFromBlob(data.target),reveal=await imageFromBlob(data.reveal);
    targetWidth=target.naturalWidth;targetHeight=target.naturalHeight;
    overlay.src=reveal.src;overlay.style.width=targetWidth+'px';overlay.style.height=targetHeight+'px';
    const compiler=new Compiler();let lastProgress=-1;
    const compiled=await compiler.compileImageTargets([target],progress=>{
      const percent=Math.floor(progress/5)*5;if(percent!==lastProgress){lastProgress=percent;message(`正在分析墙图 A 的识别特征 · ${percent}%`);}
    });
    if(stopped)return;
    const features=compiled[0]?.matchingData?.reduce((sum,k)=>sum+k.maximaPoints.length+k.minimaPoints.length,0)||0;
    if(features<20)throw new Error('墙图细节不足，请换用有更多纹理与对比的图片。');
    controller=new Controller({inputWidth:video.videoWidth,inputHeight:video.videoHeight,maxTrack:1,warmupTolerance:5,missTolerance:2,onUpdate:event=>{
      if(stopped||event.type!=='updateMatrix')return;
      if(!event.worldMatrix){lose();return;}
      const angle=C.viewingAngle(event.worldMatrix,targetWidth,targetHeight);
      if(angle===null){lose();return;}
      if(!tracked){blend.reset();quadFilter.reset();lastTransform=null;} // Never carry an old overlay onto a newly acquired target.
      tracked=true;lostAt=null;matrix=event.worldMatrix;lastPose=performance.now();
      smoothed=smoothed===null?angle:smoothed*.7+angle*.3;
      samples.push(angle);if(samples.length>15)samples.shift();
    }});
    controller.addImageTargetsFromBuffer(compiler.exportData());projection=controller.getProjectionMatrix();
    message('正在预热识别，请保持墙图完整入镜…');await controller.dummyRun(video);
    if(stopped)return;
    controller.processVideo(video);report('started');requestAnimationFrame(render);
  }catch(error){stop();report('error',{text:errorMessage(error)});}
}
function render(time){
  if(stopped)return;
  if(tracked&&time-lastPose>500)lose();
  const angle=tracked&&baseline!==null?smoothed-baseline:null;
  let transform=null;
  if(tracked&&matrix){
    const quad=quadFilter.update(C.targetQuad(matrix,projection,targetWidth,targetHeight,video.videoWidth,video.videoHeight,innerWidth,innerHeight),time);
    transform=quad?C.homography(targetWidth,targetHeight,quad):null;
  }
  let opacity=blend.update(angle,threshold,blendWidth,tracked&&baseline!==null&&!!transform,time);
  if(transform)lastTransform=transform;
  // On loss, fade briefly at the last valid position, then remove it completely.
  if((!tracked&&lostAt!==null&&time-lostAt>=150)||(tracked&&!transform)){blend.reset();opacity=0;lastTransform=null;}
  const visible=opacity>.001&&!!lastTransform;
  overlay.style.display=visible?'block':'none';overlay.style.opacity=String(opacity);
  if(visible)overlay.style.transform=`matrix3d(${lastTransform.join(',')})`;
  hint.textContent=!tracked?'请对准墙上的图片 A，保持完整入镜':baseline===null?'已识别墙图。请站立并点击「记录站立视角」':opacity>.98?'儿童视角 · 第二张图已显现':opacity>.02?'随视角逐渐显现':'站立视角 · 蹲下并继续对准墙图';
  hint.style.opacity=tracked&&baseline!==null?'0':'1';
  document.getElementById('mark').hidden=tracked;
  if(time-lastReport>200){lastReport=time;report('tracking',{tracked,stable:stable(),angle,visible,opacity});}
  requestAnimationFrame(render);
}
window.addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==location.origin)return;
  const data=event.data;if(!data)return;
  if(data.type==='initialize'&&data.target instanceof Blob&&data.reveal instanceof Blob)initialize(data);
  if(data.type==='threshold')threshold=C.clamp(Number(data.value)||12,5,45);
  if(data.type==='blend-width')blendWidth=C.clamp(Number(data.value)||12,4,24);
  if(data.type==='calibrate-standing'){
    if(!stable()){message('墙图识别尚不稳定，请保持手机不动片刻再记录。');return;}
    baseline=mean();blend.reset();overlay.style.opacity='0';overlay.style.display='none';
    report('calibrated',{text:'站立视角已记录。现在蹲下、仰视墙图，再点击「记录蹲下视角」。'});
  }
  if(data.type==='calibrate-crouching'){
    if(!stable()||baseline===null){message('请先记录站立视角，并等待墙图识别稳定。');return;}
    const difference=mean()-baseline;
    if(difference<7){message('仰视角度变化还不够。请把手机随身体降低，并继续对准墙图，再次记录。');return;}
    threshold=C.clamp(Math.round(difference*.6),5,45);
    report('calibrated',{threshold,text:`双视角校准完成，触发阈值为 ${threshold}°。站起来看真实画面，蹲下看图片 B。`});
  }
});
window.addEventListener('pagehide',stop);
window.addEventListener('unhandledrejection',event=>{stop();report('error',{text:errorMessage(event.reason)});});
report('ready');
