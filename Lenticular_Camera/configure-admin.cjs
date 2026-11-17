// Create a local key once; upload it through stdin, never command-line arguments.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const filename=path.join(__dirname,'.dev.vars');
if(!fs.existsSync(filename))fs.writeFileSync(filename,`ADMIN_TOKEN=${crypto.randomBytes(32).toString('base64url')}\n`,{mode:0o600});
const token=fs.readFileSync(filename,'utf8').match(/^ADMIN_TOKEN=(.+)$/m)?.[1]?.trim();
if(!token||token.length<24)throw Error('Invalid local administrator token');
fs.writeFileSync(path.join(__dirname,'ADMIN_ACCESS.md'),`# Administrator access\n\nUse this key on the Cloudflare admin page. Keep this file local; it is gitignored.\n\n${token}\n`,{mode:0o600});
if(process.argv.includes('--remote')){
  const cli=path.join(__dirname,'node_modules','wrangler','bin','wrangler.js');
  const child=spawn(process.execPath,[cli,'secret','put','ADMIN_TOKEN'],{cwd:__dirname,stdio:['pipe','inherit','inherit']});child.stdin.end(token+'\n');child.on('exit',code=>{process.exitCode=code||0;});
}else console.log('Administrator key prepared in gitignored ADMIN_ACCESS.md (key not printed).');
