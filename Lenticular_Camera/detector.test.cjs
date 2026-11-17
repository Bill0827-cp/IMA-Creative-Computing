// Run the real browser-built WASM inside a minimal web-like VM, without a camera.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
  const {tagGrid}=await import('./tag-format.mjs'),family=require('./vendor/apriltag/tag36h11.json'),dir=path.join(__dirname,'vendor/apriltag');
  const scope={window:{},document:{currentScript:{src:'http://localhost/vendor/apriltag/apriltag_wasm.js'}},console:{log(){},warn(){},error:console.error},WebAssembly,TextDecoder,TextEncoder,URL,performance,setTimeout,clearTimeout,wasmBytes:fs.readFileSync(path.join(dir,'apriltag_wasm.wasm'))};scope.self=scope;vm.createContext(scope);
  for(const file of ['tag-families.js','apriltag_wasm.js','apriltag-wasm-wrapper.js'])vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),scope,{filename:file});
  scope.fetch=async()=>new Response(scope.wasmBytes,{headers:{'Content-Type':'application/wasm'}});
  await vm.runInContext('var detector=new AprilTagDetector();detector.initialize()',scope);
  vm.runInContext("detector.setupDetector('tag36h11',0);detector.setParameters({quadDecimate:1});",scope);
  for(const id of [0,1,37,586]){
    const grid=tagGrid(family,id),width=320,height=320,gray=new Uint8Array(width*height).fill(255),cell=20,offset=60;
    for(let y=0;y<10;y++)for(let x=0;x<10;x++)for(let dy=0;dy<cell;dy++)for(let dx=0;dx<cell;dx++)gray[(offset+y*cell+dy)*width+offset+x*cell+dx]=grid[y][x]*255;
    scope.testGray=gray;const detections=vm.runInContext('detector.detect(testGray,320,320)',scope);assert.equal(detections.length,1);assert.equal(detections[0].id,id);const c=detections[0].corners;
    // Canonical ordering must match our board geometry, never sort by screen x/y.
    assert.ok(c[0].x<160&&c[0].y>160,'p0 is bottom-left');assert.ok(c[3].x<160&&c[3].y<160,'p3 is top-left');
  }
  vm.runInContext('detector.cleanup()',scope);console.log('PASS: real WASM decodes generated tag36h11 IDs 0/1/37/586 with verified canonical corner order');
})().catch(error=>{console.error(error);process.exitCode=1;});
