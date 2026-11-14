'use strict';
const $=id=>document.getElementById(id);
const images={A:null,B:null},gate=new WallView.RevealGate();
let frame=null,busy=false,loadCount=0,hasBaseline=false,watchdog=null;
function status(text){$('status').textContent=text;}
function ready(){return !!images.A&&!!images.B;}
function controls(){
  $('start').disabled=!ready()||busy||loadCount>0;$('stop').disabled=!frame;$('manual').disabled=!ready()||loadCount>0;
  for(const key of ['A','B'])$('image'+key).disabled=busy;
}
function clearSession(){
  clearTimeout(watchdog);watchdog=null;
  if(frame){frame.remove();frame=null;} // The frame owns camera, workers and GPU resources.
  busy=false;hasBaseline=false;gate.reset();$('stand').disabled=true;$('crouch').disabled=true;
  $('tracking').textContent='未启动';$('angle').textContent='—';$('content').textContent='真实画面';
  $('empty').hidden=false;$('viewState').textContent=ready()?'双图已就绪':'等待上传双图';controls();
}
for(const key of ['A','B']){
  let revision=0;
  $('image'+key).onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    const token=++revision;loadCount++;controls();const url=URL.createObjectURL(file);
    try{
      const img=new Image();img.src=url;await img.decode();
      if(img.naturalWidth*img.naturalHeight>40e6)throw new Error('请使用 4000 万像素以内的图片');
      if(Math.min(img.naturalWidth,img.naturalHeight)<64)throw new Error('图片太小，请换用清晰原图');
      const limit=key==='A'?1000:1800,scale=Math.min(1,limit/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
      const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('图片转换失败');
      if(token!==revision)return;
      clearSession();$('manual').checked=false;$('testPreview').hidden=true;
      if(images[key])URL.revokeObjectURL(images[key].url);
      images[key]={blob,url:URL.createObjectURL(blob),width:canvas.width,height:canvas.height};
      $('thumb'+key).src=images[key].url;$('thumb'+key).hidden=false;$('name'+key).textContent=file.name;
      $('viewState').textContent=ready()?'双图已就绪':'继续上传另一张图';
      status(ready()?'两张图已准备好。打开摄像头，站立对准墙上的 A。':'图片已载入，请继续上传另一张。');
    }catch(e){status(`无法载入图片：${e.message}`);}
    finally{URL.revokeObjectURL(url);event.target.value='';loadCount--;controls();}
  };
}
function send(type,extra={}){frame?.contentWindow.postMessage({type,...extra},location.origin);}
$('start').onclick=()=>{
  if(!ready()||busy)return;
  if(!isSecureContext||!navigator.mediaDevices?.getUserMedia){status('手机摄像头需要 HTTPS。请用 HTTPS 网站地址打开此页。');return;}
  clearSession();$('manual').checked=false;$('testPreview').hidden=true;busy=true;
  frame=document.createElement('iframe');frame.title='墙图识别与视角覆盖';frame.allow='camera';frame.src='ar.html';$('stage').append(frame);$('empty').hidden=true;
  status('正在启动图片识别。首次加载需要联网，图片和摄像头画面留在本机。');$('viewState').textContent='正在准备';controls();
  watchdog=setTimeout(()=>{clearSession();status('识别启动超时。请检查网络、相机权限或换用更小的图片，再重试。');},150000);
};
$('stop').onclick=()=>{clearSession();status('摄像头已关闭。两张图片仍保留，可再次开始。');};
$('stand').onclick=()=>send('calibrate-standing');$('crouch').onclick=()=>send('calibrate-crouching');
$('threshold').oninput=()=>{$('thresholdValue').textContent=$('threshold').value+'°';gate.reset();send('threshold',{value:Number($('threshold').value)});};
window.addEventListener('message',event=>{
  if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin)return;
  const message=event.data;if(!message||typeof message.type!=='string')return;
  if(message.type==='ready')send('initialize',{target:images.A.blob,reveal:images.B.blob,threshold:Number($('threshold').value)});
  if(message.type==='status')status(message.text);
  if(message.type==='started'){clearTimeout(watchdog);watchdog=null;status('摄像头已开启。对准墙上的 A，识别稳定后点击「记录站立视角」。');}
  if(message.type==='error'){clearSession();status(message.text);}
  if(message.type==='calibrated'){
    hasBaseline=true;
    if(Number.isFinite(message.threshold)){$('threshold').value=message.threshold;$('thresholdValue').textContent=message.threshold+'°';}
    status(message.text);
  }
  if(message.type==='tracking'){
    $('tracking').textContent=message.tracked?'已识别 A':'寻找墙图 A';$('angle').textContent=Number.isFinite(message.angle)?message.angle.toFixed(1)+'°':'—';
    $('content').textContent=message.visible?'隐藏图片 B':'真实画面';$('viewState').textContent=message.visible?'儿童视角 · B':message.tracked?'已锁定墙图':'请对准墙图';
    $('stand').disabled=!message.stable;$('crouch').disabled=!message.stable||!hasBaseline;
  }
});
$('manual').onchange=()=>{
  clearSession();gate.reset();$('testPreview').hidden=!$('manual').checked;$('empty').hidden=$('manual').checked;
  if($('manual').checked){$('viewState').textContent='手动测试';status('拖动模拟仰角测试切换。此模式不使用摄像头，也不进行墙图识别。');}
};
$('testAngle').oninput=()=>{$('testValue').textContent=$('testAngle').value+'°';};
function preview(time){
  if($('manual').checked&&ready()){
    const visible=gate.update(Number($('testAngle').value),Number($('threshold').value),true,time),src=images[visible?'B':'A'].url;
    if($('testImage').src!==src)$('testImage').src=src;
    $('content').textContent=visible?'隐藏图片 B':'墙图 A（测试）';$('angle').textContent=$('testAngle').value+'°';
  }
  requestAnimationFrame(preview);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){clearSession();status('页面进入后台，摄像头已关闭。返回后请重新启动并校准。');}});
window.addEventListener('pagehide',clearSession);controls();requestAnimationFrame(preview);
