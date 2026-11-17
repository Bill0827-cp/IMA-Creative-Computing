// Local-only integration test against wrangler dev; never mutates remote deployments.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {emptyCatalog,newItem} from './catalog.mjs';
const base='http://127.0.0.1:8787',token=(await fs.readFile(new URL('./.dev.vars',import.meta.url),'utf8')).match(/^ADMIN_TOKEN=(.+)$/m)[1].trim();
const auth={Authorization:`Bearer ${token}`},read=async(path,options)=>fetch(base+path,options);
for(const file of ['/','/admin.html','/tag-worker.js','/vendor/apriltag/apriltag_wasm.wasm','/vendor/apriltag/tag36h11.json'])assert.equal((await read(file)).status,200,file);
assert.equal((await read('/api/admin/session')).status,401);
assert.equal((await read('/api/admin/session',{headers:auth})).status,200);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aol8AAAAASUVORK5CYII=','base64');
const upload=await read('/api/admin/images',{method:'POST',headers:{...auth,'Content-Type':'image/png'},body:png});assert.equal(upload.status,201);const {url}=await upload.json();
const image=await read(url);assert.equal(image.status,200);assert.equal(image.headers.get('Content-Type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
const before=await (await read('/api/catalog')).json();
const item={...newItem(),name:'Integration fixture',imageA:url,imageB:url};
const publish=await read('/api/admin/catalog',{method:'PUT',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({revision:before.revision,config:{...emptyCatalog(),items:[item]}})});assert.equal(publish.status,200);const published=await publish.json();
const viewed=await (await read('/api/catalog')).json();assert.equal(viewed.config.items[0].name,'Integration fixture');
assert.equal((await read('/api/admin/catalog',{method:'PUT',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({revision:before.revision,config:emptyCatalog()})})).status,409);
const restore=await read('/api/admin/catalog',{method:'PUT',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({revision:published.revision,config:before.config})});assert.equal(restore.status,200);
console.log('PASS: local Cloudflare runtime serves assets, rejects unauthenticated access, stores/reads R2 images, publishes D1 configuration, rejects stale writes and restores original configuration');
