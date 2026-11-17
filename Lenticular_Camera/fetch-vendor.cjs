// Reproducible, pinned public dependencies; run only when intentionally updating vendor assets.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const revision='4359086c430e44342098a464c359aacf00cf6bc8';
async function main(){
  const dir=path.join(__dirname,'vendor','apriltag');await fs.mkdir(dir,{recursive:true});
  const files=['js/apriltag_wasm.js','js/apriltag_wasm.wasm','js/apriltag-wasm-wrapper.js','js/tag-families.js','LICENSE','NOTICE'];
  const manifest={repository:'https://github.com/AliAlimohamad/apriltag-js',revision,files:{}};
  for(const file of files){const response=await fetch(`https://raw.githubusercontent.com/AliAlimohamad/apriltag-js/${revision}/${file}`);if(!response.ok)throw Error(file+': '+response.status);const buffer=Buffer.from(await response.arrayBuffer());const name=path.basename(file);await fs.writeFile(path.join(dir,name),buffer);manifest.files[name]={bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex')};}
  const sourceURL='https://raw.githubusercontent.com/AprilRobotics/apriltag/v3.4.3/tag36h11.c';
  const response=await fetch(sourceURL);if(!response.ok)throw Error('Tag family fetch failed');const source=await response.text();
  const codes=[...source.matchAll(/0x([0-9a-f]+)UL/g)].map(m=>m[1]);
  const bits=Array.from({length:36},(_,i)=>{const x=source.match(new RegExp('bit_x\\['+i+'\\] = (\\d+)')),y=source.match(new RegExp('bit_y\\['+i+'\\] = (\\d+)'));if(!x||!y)throw Error('Missing bit position');return [+x[1],+y[1]];});
  if(codes.length!==587)throw Error('Unexpected family size '+codes.length);
  await fs.writeFile(path.join(dir,'tag36h11.json'),JSON.stringify({family:'tag36h11',source:sourceURL,codes,bits}));
  await fs.writeFile(path.join(dir,'tag36h11-LICENSE.txt'),source.slice(0,source.indexOf('#include')));
  await fs.writeFile(path.join(dir,'provenance.json'),JSON.stringify(manifest,null,2));
  console.log('Vendored detector and 587 tag codes:',Object.entries(manifest.files).map(([n,v])=>`${n} ${v.bytes} bytes`).join(', '));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
