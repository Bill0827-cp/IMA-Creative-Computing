const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
  const out=path.join(__dirname,'dist');await fs.mkdir(out,{recursive:true});
  const files=['index.html','app.js','viewer.css','style.css','admin.html','admin.js','admin.css','circular-photo.mjs','catalog.mjs','core.js','tag-format.mjs','tag-pose.mjs','detector-client.mjs','tag-worker.js'];
  for(const file of files)await fs.copyFile(path.join(__dirname,file),path.join(out,file));
  await fs.cp(path.join(__dirname,'vendor'),path.join(out,'vendor'),{recursive:true});
  console.log('Built viewer, administration and local AprilTag runtime to dist/');
})().catch(error=>{console.error(error);process.exitCode=1;});
