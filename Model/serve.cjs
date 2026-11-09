// 无需安装依赖：在本文件夹运行 node serve.cjs，然后打开打印的网址。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'],
  '/style.css': ['style.css', 'text/css'], '/get_data.js': ['get_data.js', 'text/javascript'] };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = Object.hasOwn(files, pathname) ? files[pathname] : null;
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(__dirname, file[0]), (error, data) => {
    if (error) { res.writeHead(500); res.end('Unable to read file'); return; }
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    res.end(data);
  });
});
server.on('error', error => { console.error(`无法启动：${error.message}。可换一个端口：node serve.cjs 8001`); process.exitCode = 1; });
server.listen(Number(process.argv[2]) || 8000, '127.0.0.1', () => {
  console.log(`唇语采集页面：http://127.0.0.1:${server.address().port}`);
});
