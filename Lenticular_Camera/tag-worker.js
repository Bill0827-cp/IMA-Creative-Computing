importScripts('vendor/apriltag/tag-families.js','vendor/apriltag/apriltag_wasm.js','vendor/apriltag/apriltag-wasm-wrapper.js');
const factory=AprilTagWasm;
AprilTagWasm=()=>factory({locateFile:name=>new URL('vendor/apriltag/'+name,self.location.href).href});
console.log=()=>{};
let detector=null;
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      detector=new AprilTagDetector();await detector.initialize();
      if(detector.setupDetector('tag36h11',0)!==0)throw Error('AprilTag 初始化失败');
      detector.setParameters({quadDecimate:1,refineEdges:true,decodeSharpening:.25});postMessage({id:data.id,ok:true});
    }else if(data.type==='detect'){
      if(!detector)throw Error('检测器尚未就绪');
      const detections=detector.detect(new Uint8Array(data.gray),data.width,data.height);postMessage({id:data.id,detections});
    }
  }catch(error){postMessage({id:data.id,error:error.message});}
};
