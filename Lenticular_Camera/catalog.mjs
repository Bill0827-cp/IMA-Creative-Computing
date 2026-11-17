export const FAMILY='tag36h11';
export const MAX_ITEMS=40;
export function emptyCatalog(){return {schemaVersion:1,title:'低一点，看见另一面',cameraFov:60,items:[]};}
export function newItem(used=[]){
  let left=0;while(used.includes(left)||used.includes(left+1))left+=2;
  return {id:crypto.randomUUID(),name:'新墙图',enabled:true,imageA:'',imageB:'',widthMm:300,heightMm:400,tagSizeMm:60,tagGapMm:30,tagSeparationMm:210,leftTag:left,rightTag:left+1,angleCenter:12,angleRange:12,wallCenterHeightMm:1750,fadeStartHeightMm:1500,revealHeightMm:1200,blendDurationMs:900};
}
export function validateCatalog(value,{allowEmptyImages=false}={}){
  if(!value||value.schemaVersion!==1||!Array.isArray(value.items)||value.items.length>MAX_ITEMS)throw Error('配置格式不正确，最多支持 40 组图片。');
  if(typeof value.title!=='string'||value.title.length>100)throw Error('展览名称最多 100 字。');
  if(!Number.isFinite(value.cameraFov)||value.cameraFov<35||value.cameraFov>100)throw Error('相机对角视场角应为 35–100°。');
  const ids=new Set(),tags=new Set();
  const asset=/^\/media\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/;
  const items=value.items.map((v,index)=>{
    // Upgrade pre-height configurations without changing any uploaded images or tag layout.
    v={wallCenterHeightMm:1750,fadeStartHeightMm:1500,revealHeightMm:1200,blendDurationMs:900,...v};
    if(!v||typeof v.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(v.id)||ids.has(v.id))throw Error('图片组 ID 重复或无效。');ids.add(v.id);
    if(typeof v.name!=='string'||!v.name.trim()||v.name.length>100)throw Error(`第 ${index+1} 组需要名称（最多 100 字）。`);
    if(typeof v.enabled!=='boolean')throw Error('启用状态无效。');
    for(const key of ['imageA','imageB'])if(!(allowEmptyImages&&v[key]==='')&&!(typeof v[key]==='string'&&asset.test(v[key])))throw Error(`${v.name}：请上传墙图 A 和显示图 B。`);
    for(const key of ['widthMm','heightMm','tagSizeMm','tagGapMm','tagSeparationMm','angleCenter','angleRange'])if(!Number.isFinite(v[key]))throw Error(`${v.name}：尺寸和角度必须为数字。`);
    if(v.widthMm<50||v.widthMm>2000||v.heightMm<50||v.heightMm>2000)throw Error(`${v.name}：墙图宽高应为 50–2000 mm。`);
    if(v.tagSizeMm<20||v.tagSizeMm>200)throw Error(`${v.name}：标签黑框边长应为 20–200 mm。`);
    if(v.tagGapMm<v.tagSizeMm/8||v.tagGapMm>500)throw Error(`${v.name}：图片下缘到标签黑框上缘的间距需留出白边（至少 ${v.tagSizeMm/8} mm）。`);
    if(v.tagSeparationMm<v.tagSizeMm*1.5||v.tagSeparationMm+v.tagSizeMm*1.25>v.widthMm)throw Error(`${v.name}：两个标签需互不重叠，且连同白边放在图片宽度内。`);
    if(v.angleCenter<5||v.angleCenter>45||v.angleRange<4||v.angleRange>24)throw Error(`${v.name}：过渡中心 5–45°，范围 4–24°。`);
    for(const key of ['wallCenterHeightMm','fadeStartHeightMm','revealHeightMm','blendDurationMs'])if(!Number.isFinite(v[key]))throw Error(`${v.name}：高度与过渡时长必须为数字。`);
    if(v.wallCenterHeightMm<300||v.wallCenterHeightMm>4000)throw Error(`${v.name}：墙图中心离地高度应为 300–4000 mm。`);
    if(v.revealHeightMm<200||v.fadeStartHeightMm>2500||v.fadeStartHeightMm-v.revealHeightMm<100)throw Error(`${v.name}：开始融合高度需至少比完全显现高度高 100 mm（支持 200–2500 mm）。`);
    if(v.blendDurationMs<200||v.blendDurationMs>2000)throw Error(`${v.name}：缓动时间应为 200–2000 ms。`);
    for(const key of ['leftTag','rightTag']){const id=v[key];if(!Number.isInteger(id)||id<0||id>586||tags.has(id))throw Error(`${v.name}：AprilTag ID 应为 0–586 且所有组不重复。`);tags.add(id);}
    return Object.fromEntries(['id','name','enabled','imageA','imageB','widthMm','heightMm','tagSizeMm','tagGapMm','tagSeparationMm','leftTag','rightTag','angleCenter','angleRange','wallCenterHeightMm','fadeStartHeightMm','revealHeightMm','blendDurationMs'].map(key=>[key,v[key]]));
  });
  return {schemaVersion:1,title:value.title,cameraFov:value.cameraFov,items};
}
export function photoGeometry(item){
  const diameter=Math.max(item.widthMm,item.heightMm);
  return {diameter,x:(item.widthMm-diameter)/2,y:(item.heightMm-diameter)/2};
}
export function tagCorners(item,side){
  const s=item.tagSizeMm,cx=item.widthMm/2+(side==='left'?-1:1)*item.tagSeparationMm/2,y=(item.heightMm+photoGeometry(item).diameter)/2+item.tagGapMm;
  return [[cx-s/2,y],[cx+s/2,y],[cx+s/2,y+s],[cx-s/2,y+s]];
}
