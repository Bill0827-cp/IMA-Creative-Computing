// node serve.cjs [port]; optional trusted HTTPS: TLS_CERT=... TLS_KEY=...
const http=require('node:http'),https=require('node:https'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,port=Number(process.argv[2])||3010;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const handler=(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));const relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end();return;}if(!['index.html','style.css','app.js','core.js','ar.html','ar.js'].includes(relative)){res.writeHead(404);res.end('Not found');return;}fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(err?'Not found':data);});}catch{res.writeHead(400);res.end('Bad request');}};
const secure=process.env.TLS_CERT&&process.env.TLS_KEY;
const server=secure?https.createServer({cert:fs.readFileSync(process.env.TLS_CERT),key:fs.readFileSync(process.env.TLS_KEY)},handler):http.createServer(handler);
server.listen(port,'0.0.0.0',()=>console.log(`Lenticular Camera: ${secure?'https':'http'}://localhost:${port}\nPhone camera requires a trusted HTTPS URL. See README.md.`));
