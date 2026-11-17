import {loadPhoto,circularPhoto} from './circular-photo.mjs';
import {validateCatalog,photoGeometry} from './catalog.mjs';
import {locateItem,coverQuad} from './tag-pose.mjs';
import {Detector} from './detector-client.mjs';
const $=id=>document.getElementById(id),C=window.WallView,video=$('video'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
let config=null,revision=-1,stream=null,detector=null,running=false,starting=false,session=0,detectTimer=null,lastDetection=0,loading=false;
const states=new Map();
function status(text){$('status').textContent=text;}
function clearStates(){for(const s of states.values())s.img.remove();states.clear();}
function controls(){$('start').disabled=starting||running||loading;}
async function loadCatalog(){
  if(loading)return;loading=true;
  try{const response=await fetch('/api/catalog',{cache:'no-store'});if(!response.ok)throw Error('无法获取展览配置');const data=await response.json();const next=validateCatalog(data.config);
    if(data.revision!==revision){config=next;revision=data.revision;clearStates();if(!running&&!starting)status(config.items.some(i=>i.enabled)?'':'装置暂未开放，请稍后重试。');}
  }catch(error){if(!running&&!starting)status(config?'':'暂时无法连接，请点击按钮重试。');}finally{loading=false;controls();}
}
function stop(){session++;running=false;starting=false;clearTimeout(detectTimer);detector?.close();detector=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;clearStates();$('startSheet').hidden=false;$('start').textContent='开启摄像头';controls();}
$('start').onclick=async()=>{
  if(starting||running||loading)return;if(!isSecureContext||!navigator.mediaDevices?.getUserMedia){status('请通过 HTTPS 地址打开，浏览器才能访问摄像头。');return;}
  if(!config?.items.some(i=>i.enabled)){await loadCatalog();if(!config?.items.some(i=>i.enabled))return;}
  const ticket=++session;starting=true;controls();$('start').textContent='正在开启…';status('');
  try{
    const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    if(ticket!==session){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;video.srcObject=stream;await video.play();if(ticket!==session)return;
    detector=new Detector();await detector.init();if(ticket!==session)return;starting=false;running=true;$('startSheet').hidden=true;controls();status('');detectFrame(ticket);
  }catch(error){if(ticket!==session)return;stop();status(error.name==='NotAllowedError'?'请允许摄像头权限后重试。':`无法启动：${error.message}`);}
};
function stateFor(item){
  if(states.has(item.id))return states.get(item.id);
  const img=new Image();img.className='ar-overlay';img.alt=item.name+' · 仰视画面';loadPhoto(item.imageB).then(photo=>{if(!img.isConnected)return;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(circularPhoto(photo.data,photo.width,photo.height,photoGeometry(item).diameter,null,true));}).catch(()=>{img.removeAttribute('src');});img.style.width=photoGeometry(item).diameter+'px';img.style.height=photoGeometry(item).diameter+'px';$('overlayRoot').append(img);
  const state={img,blend:new C.HeightReveal(),filter:new C.QuadSmoother(),pose:null,last:0,lastTransform:null,lostAt:null};states.set(item.id,state);return state;
}
async function detectFrame(ticket){
  if(!running||ticket!==session)return;
  try{
    const scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
    ctx.drawImage(video,0,0,canvas.width,canvas.height);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data,gray=new Uint8Array(canvas.width*canvas.height);
    for(let p=0;p<gray.length;p++)gray[p]=rgba[p*4]*.299+rgba[p*4+1]*.587+rgba[p*4+2]*.114;
    const version=revision,results=await detector.detect(gray,canvas.width,canvas.height);if(ticket!==session)return;
    if(version===revision){const now=performance.now();lastDetection=now;for(const item of config.items.filter(i=>i.enabled)){
      const pose=locateItem(item,results,canvas.width,canvas.height,config.cameraFov),s=pose?stateFor(item):states.get(item.id);if(!s)continue;
      if(pose){if(!s.pose){s.blend.reset();s.filter.reset();s.lastTransform=null;}s.pose={...pose,sourceWidth:canvas.width,sourceHeight:canvas.height};s.last=now;s.lostAt=null;}
      else if(s.pose){s.pose=null;s.lostAt=now;s.filter.reset();}
    }}
    detectTimer=setTimeout(()=>detectFrame(ticket),60);
  }catch(error){if(ticket!==session)return;stop();status(`标签检测中断：${error.message}。请重新打开相机。`);}
}
function render(time){
  if(running){
    for(const item of config.items.filter(i=>i.enabled)){
      const s=states.get(item.id);if(!s)continue;
      if(s.pose&&(time-s.last>600||time-lastDetection>600)){s.pose=null;s.lostAt=time;s.filter.reset();}
      let transform=null;
      if(s.pose){const quad=s.filter.update(coverQuad(s.pose.quad,s.pose.sourceWidth,s.pose.sourceHeight,$('stage').clientWidth,$('stage').clientHeight),time);transform=quad?C.homography(photoGeometry(item).diameter,photoGeometry(item).diameter,quad):null;}
      let opacity=s.blend.update(s.pose?.cameraHeightMm,item.fadeStartHeightMm,item.revealHeightMm,!!transform&&s.img.complete&&s.img.naturalWidth>0,time,item.blendDurationMs);
      if(transform)s.lastTransform=transform;
      if((s.lostAt!==null&&time-s.lostAt>150)||(s.pose&&!transform)){s.blend.reset();opacity=0;s.lastTransform=null;}
      const show=opacity>.001&&s.lastTransform&&s.img.complete&&s.img.naturalWidth>0;s.img.style.display=show?'block':'none';s.img.style.opacity=String(opacity);if(show)s.img.style.transform=`matrix3d(${s.lastTransform.join(',')})`;
    }
  }requestAnimationFrame(render);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(running||starting)){stop();status('页面进入后台，相机已关闭。返回后重新打开即可，无需校准。');}});window.addEventListener('pagehide',stop);
await loadCatalog();setInterval(loadCatalog,15000);requestAnimationFrame(render);
