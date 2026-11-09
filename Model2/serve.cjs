// Run: node Model2/serve.cjs [port]. No npm install needed.
// 【本地服务器】这个文件由 Node.js 执行，不在浏览器里执行，也不负责训练。http 建服务器，fs 读文件，path 拼接路径。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
// 路由白名单：浏览器请求路径 → 磁盘文件和 MIME 类型。只发送列出的文件，不任意暴露整个目录。
const routes = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/hand-features.js': ['hand-features.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
// 每收到一个 HTTP 请求就调用这个函数。req 是请求；res 是要返回给浏览器的响应。
const server = http.createServer((req, res) => {
// 取 URL 的 pathname 查表，查询参数不参与文件路径；没有合法路由就返回404。
  const route = routes[new URL(req.url, 'http://localhost').pathname];
  if (!Array.isArray(route)) { res.writeHead(404); res.end('Not found'); return; }
// __dirname 是当前脚本所在目录，所以在项目根目录或别的目录启动都能找到网页文件。读取是异步的。
  fs.readFile(path.join(__dirname, route[0]), (error, data) => {
    if (error) { res.writeHead(500); res.end('Unable to read file'); return; }
// 200表示成功；Content-Type 告诉浏览器如何解析文件；UTF-8支持中文；no-store 避免开发时缓存旧版本。
    res.writeHead(200, { 'Content-Type': `${route[1]}; charset=utf-8`, 'Cache-Control': 'no-store' }); res.end(data);
  });
});
// 监听错误，例如8002端口被占用。process.exitCode=1 表示进程出现错误。
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
// process.argv[2] 是命令行传入的端口；不传默认8002。127.0.0.1只监听本机。终端关闭后服务停止，网页就可能报连接被拒绝。
server.listen(Number(process.argv[2]) || 8002, '127.0.0.1', () => console.log(`Teaching Studio: http://127.0.0.1:${server.address().port}`));
