import {emptyCatalog,validateCatalog} from './catalog.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function authorized(request,env){
  if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<24)return false;
  const supplied=request.headers.get('Authorization')||'';
  if(supplied.length>300)return false;
  const [a,b]=await Promise.all([supplied,`Bearer ${env.ADMIN_TOKEN}`].map(v=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))));
  const aa=new Uint8Array(a),bb=new Uint8Array(b);let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0;
}
async function limitedBody(request,limit){
  if(Number(request.headers.get('Content-Length'))>limit)throw Object.assign(Error('文件过大'),{status:413});
  if(!request.body)return new Uint8Array();
  const reader=request.body.getReader(),chunks=[];let length=0;
  while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Object.assign(Error('文件过大'),{status:413});}chunks.push(value);}
  const result=new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
function imageType(bytes){
  if(bytes.length>12&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return ['image/jpeg','jpg'];
  if(bytes.length>24&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return ['image/png','png'];
  const text=new TextDecoder().decode(bytes.slice(0,12));if(text.startsWith('RIFF')&&text.endsWith('WEBP'))return ['image/webp','webp'];return null;
}
export async function handle(request,env){
  const url=new URL(request.url),route=url.pathname;
  if(route.startsWith('/api/')){
    if(request.method==='OPTIONS')return json({error:'仅允许同源请求'},403);
    if(route==='/api/catalog'&&request.method==='GET'){
      const row=await env.DB.prepare('SELECT revision, config, updated_at FROM exhibition WHERE id = 1').first();
      return json({revision:row?.revision||0,config:row?validateCatalog(JSON.parse(row.config)):emptyCatalog(),updatedAt:row?.updated_at||null});
    }
    if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<24)return json({error:'后台尚未配置管理员密钥，请设置 ADMIN_TOKEN（至少 24 字符）。'},503);
    if(!await authorized(request,env))return json({error:'管理员密钥无效或未登录。'},401);
    const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return json({error:'不允许跨站修改。'},403);
    if(route==='/api/admin/session'&&request.method==='GET')return json({authenticated:true});
    if(route==='/api/admin/images'&&request.method==='POST'){
      const bytes=await limitedBody(request,5*1024*1024),type=imageType(bytes);
      if(!type)return json({error:'仅支持 PNG、JPEG 或 WebP 图片。'},415);
      const name=`${crypto.randomUUID()}.${type[1]}`;
      await env.IMAGES.put(name,bytes,{httpMetadata:{contentType:type[0]},customMetadata:{uploadedAt:new Date().toISOString()}});
      return json({url:`/media/${name}`},201);
    }
    if(route==='/api/admin/catalog'&&request.method==='PUT'){
      let input,config;try{input=JSON.parse(new TextDecoder().decode(await limitedBody(request,128*1024)));config=validateCatalog(input.config);}catch(error){return json({error:error.message},error.status||400);}
      if(!Number.isInteger(input.revision)||input.revision<0)return json({error:'缺少配置版本，请重新加载。'},400);
      const images=[...new Set(config.items.flatMap(i=>[i.imageA,i.imageB]))];
      const exists=await Promise.all(images.map(path=>env.IMAGES.head(path.slice('/media/'.length))));
      if(exists.some(x=>!x))return json({error:'配置中的图片不存在，请重新上传。'},400);
      const result=await env.DB.prepare('UPDATE exhibition SET config = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1 AND revision = ?').bind(JSON.stringify(config),input.revision).run();
      if(result.meta.changes!==1)return json({error:'配置已被其他编辑更新。请先备份当前内容，再重新加载服务器版本。'},409);
      return json({revision:input.revision+1,config});
    }
    return json({error:'接口不存在'},404);
  }
  if(route.startsWith('/media/')){
    if(request.method!=='GET'&&request.method!=='HEAD')return new Response(null,{status:405});
    if(!/^\/media\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(route))return new Response(null,{status:404});
    const object=await env.IMAGES.get(route.slice(7));if(!object)return new Response(null,{status:404});
    const headers=new Headers({'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});object.writeHttpMetadata(headers);headers.set('ETag',object.httpEtag);
    return new Response(request.method==='HEAD'?null:object.body,{headers});
  }
  return env.ASSETS.fetch(request);
}
export default {async fetch(request,env){try{return await handle(request,env);}catch(error){console.error('Request failed',error?.message);return json({error:'服务暂时不可用，请检查数据库、存储绑定和迁移状态。'},error?.status||500);}}};
