const {spawn,spawnSync}=require('node:child_process'),path=require('node:path');
const build=spawnSync(process.execPath,[path.join(__dirname,'build.cjs')],{cwd:__dirname,stdio:'inherit'});
if(build.status!==0)process.exit(build.status||1);
const child=spawn(process.execPath,[path.join(__dirname,'node_modules','wrangler','bin','wrangler.js'),'dev','--port',process.argv[2]||'8787'],{cwd:__dirname,stdio:'inherit'});
child.on('exit',code=>{process.exitCode=code||0;});
