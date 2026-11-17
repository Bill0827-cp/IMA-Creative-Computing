import {loadPhoto} from './circular-photo.mjs';
import {emptyCatalog,newItem,validateCatalog} from './catalog.mjs';
import {layoutSVG,tagSVG} from './tag-format.mjs';
const $=id=>document.getElementById(id),heights=['wallCenterHeightMm','fadeStartHeightMm','revealHeightMm'],numeric=['widthMm','heightMm','tagSizeMm','tagGapMm','tagSeparationMm','leftTag','rightTag',...heights,'blendDurationMs'];
let config=emptyCatalog(),revision=0,selected=null,token=sessionStorage.getItem('wall-admin-token')||'',dirty=false,busy=0,family=null,previewURL=null,previewJob=0,draftTimer;
const status=text=>{$('status').textContent=text;},current=()=>config.items.find(v=>v.id===selected);
function dirtyMark(){dirty=true;$('revision').textContent=`已发布 v${revision} · 有未发布修改`;clearTimeout(draftTimer);draftTimer=setTimeout(()=>saveDraft().catch(()=>status('本地草稿保存失败，请及时发布或备份。')),500);}
async function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('wall-perspectives-admin',1);r.onupgradeneeded=()=>r.result.createObjectStore('draft');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function saveDraft(){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('draft','readwrite');tx.objectStore('draft').put({config,revision},'current');tx.oncomplete=()=>{d.close();resolve();};tx.onerror=()=>{d.close();reject(tx.error);};});}
async function readDraft(){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('draft'),r=tx.objectStore('draft').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>d.close();});}
async function api(path,options={}){const response=await fetch(path,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers}});let data;try{data=await response.json();}catch{throw Error('后台服务未连接，请使用 Cloudflare 地址或 Wrangler 本地开发服务。');}if(!response.ok)throw Error(data.error||`请求失败 ${response.status}`);return data;}
function controls(){for(const id of ['publish','reload','add','remove','uploadA','uploadB','downloadLayout','downloadTags'])$(id).disabled=busy>0;}
function list(){const container=$('items');container.replaceChildren();for(const item of config.items){const button=document.createElement('button');button.textContent=`${item.enabled?'●':'○'} ${item.name} · ${item.leftTag}/${item.rightTag}`;button.className=item.id===selected?'active':'';button.onclick=()=>{selected=item.id;render();};container.append(button);}}
function render(){
  $('title').value=config.title;$('cameraFov').value=config.cameraFov;list();const item=current();$('form').hidden=!item;$('noSelection').hidden=!!item;
  if(!item)return;$('name').value=item.name;$('enabled').checked=item.enabled;for(const key of numeric)$(key).value=heights.includes(key)?item[key]/10:item[key];
  for(const key of ['A','B']){$('preview'+key).hidden=!item['image'+key];if(item['image'+key])$('preview'+key).src=item['image'+key];else $('preview'+key).removeAttribute('src');}
  drawPreview();
}
async function dataURL(path){const response=await fetch(path);if(!response.ok)throw Error('无法读取图片，请重新上传');const blob=await response.blob();return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}
async function sheet(item){if(!family)throw Error('标签数据尚未载入');validateCatalog({...config,items:[item]},{allowEmptyImages:true});if(!item.imageA)throw Error('先上传墙图 A，即可预览和下载标签布置。');const photo=await loadPhoto(item.imageA);return layoutSVG(item,family,photo.data,photo.width,photo.height);}
async function drawPreview(){
  const job=++previewJob,item=current();if(!item)return;
  try{const svg=await sheet({...item});if(job!==previewJob)return;if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const img=new Image();img.alt='墙图与下方两个 AprilTag 的固定布置';img.src=previewURL;$('layoutPreview').replaceChildren(img);}
  catch(error){if(job===previewJob)$('layoutPreview').textContent=error.message;}
}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function loadServer(){const data=await api('/api/catalog');config=validateCatalog(data.config);revision=data.revision;dirty=false;selected=config.items[0]?.id||null;$('revision').textContent=`已发布 v${revision}`;render();await saveDraft();}
async function login(restore=true){await api('/api/admin/session');sessionStorage.setItem('wall-admin-token',token);$('loginPanel').hidden=true;$('editor').hidden=false;
  const draft=restore?await readDraft().catch(()=>null):null;
  const data=await api('/api/catalog');
  if(draft&&JSON.stringify(draft.config)!==JSON.stringify(data.config)){config=validateCatalog(draft.config,{allowEmptyImages:true});revision=draft.revision;dirty=true;selected=config.items[0]?.id||null;$('revision').textContent=`本地草稿基于 v${revision} · 服务器 v${data.revision}`;render();status('已恢复本地草稿。若服务器版本更新，请先备份，再重新载入已发布版本。');}
  else{await loadServer();status('后台已连接。添加图片组并设置布置，保存发布后手机会自动获取更新。');}}
$('loginForm').onsubmit=async event=>{event.preventDefault();token=$('token').value.trim();try{await login();$('token').value='';}catch(error){status(error.message);}};
$('logout').onclick=()=>{token='';sessionStorage.removeItem('wall-admin-token');$('editor').hidden=true;$('loginPanel').hidden=false;status('已退出。当前草稿保留在本机浏览器。');};
$('reload').onclick=async()=>{if(dirty&&!confirm('放弃当前未发布修改，重新载入服务器版本？'))return;try{await loadServer();status('已载入服务器最新配置。');}catch(error){status(error.message);}};
$('add').onclick=()=>{if(config.items.length>=40){status('最多 40 组图片。');return;}const item=newItem(config.items.flatMap(i=>[i.leftTag,i.rightTag]));config.items.push(item);selected=item.id;dirtyMark();render();};
$('remove').onclick=()=>{if(!current()||!confirm('从当前配置移除这一组？保存发布后对观众生效。'))return;config.items=config.items.filter(i=>i.id!==selected);selected=config.items[0]?.id||null;dirtyMark();render();};
for(const key of ['name','enabled',...numeric])$(key).oninput=()=>{const item=current();if(!item)return;item[key]=key==='enabled'?$(key).checked:numeric.includes(key)?Number($(key).value)*(heights.includes(key)?10:1):$(key).value;dirtyMark();list();drawPreview();};
for(const key of ['title','cameraFov'])$(key).oninput=()=>{config[key]=key==='cameraFov'?Number($(key).value):$(key).value;dirtyMark();};
for(const key of ['A','B'])$('upload'+key).onchange=async event=>{
  const file=event.target.files[0],item=current();if(!file||!item)return;busy++;controls();const url=URL.createObjectURL(file);
  try{const img=new Image();img.src=url;await img.decode();if(img.naturalWidth*img.naturalHeight>40e6)throw Error('图片超过 4000 万像素');const scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));if(!blob)throw Error('图片转换失败');
    status('正在上传图片到 Cloudflare…');const result=await api('/api/admin/images',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob});if(!item.imageA&&key==='A')item.heightMm=Math.max(50,Math.min(2000,Math.round(item.widthMm*img.naturalHeight/img.naturalWidth)));item['image'+key]=result.url;dirtyMark();render();status('图片已上传。点击「保存并发布」后更新观众看到的配对。');
  }catch(error){status(error.message);}finally{URL.revokeObjectURL(url);event.target.value='';busy--;controls();}
};
$('publish').onclick=async()=>{busy++;controls();try{const clean=validateCatalog(config);const result=await api('/api/admin/catalog',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,config:clean})});config=result.config;revision=result.revision;dirty=false;clearTimeout(draftTimer);await saveDraft();$('revision').textContent=`已发布 v${revision}`;status('发布成功。手机重新打开即生效；已打开的观看页约 15 秒内自动刷新配置。');}catch(error){status(error.message);}finally{busy--;controls();}};
$('backup').onclick=()=>download('wall-config-backup.json',JSON.stringify({revision,config},null,2),'application/json');
$('downloadLayout').onclick=async()=>{try{download(`wall-${current().leftTag}-${current().rightTag}.svg`,await sheet(current()),'image/svg+xml');}catch(error){status(error.message);}};
$('downloadTags').onclick=()=>{try{const item=current();validateCatalog({...config,items:[item]},{allowEmptyImages:true});for(const side of ['left','right'])download(`tag36h11-${item[side+'Tag']}-${side}.svg`,tagSVG(family,item[side+'Tag']).replace('viewBox=',`width="${item.tagSizeMm*1.25}mm" height="${item.tagSizeMm*1.25}mm" viewBox=`),'image/svg+xml');}catch(error){status(error.message);}};
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
try{const response=await fetch('./vendor/apriltag/tag36h11.json');if(!response.ok)throw Error('标签文件加载失败');family=await response.json();if(token)await login();else status('输入管理员密钥以管理图片配对。');}catch(error){status(error.message);}
