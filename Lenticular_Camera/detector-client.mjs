export class Detector{
  constructor(){this.worker=new Worker(new URL('./tag-worker.js',import.meta.url));this.pending=new Map();this.id=0;this.worker.onmessage=({data})=>{const request=this.pending.get(data.id);if(!request)return;clearTimeout(request.timer);this.pending.delete(data.id);data.error?request.reject(Error(data.error)):request.resolve(data);};this.worker.onerror=event=>this.fail(Error(event.message||'AprilTag Worker 加载失败'));}
  fail(error){for(const request of this.pending.values()){clearTimeout(request.timer);request.reject(error);}this.pending.clear();}
  call(type,extra={},transfer=[]){return new Promise((resolve,reject)=>{const id=++this.id,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('AprilTag 检测超时，请重试'));},type==='init'?30000:8000);this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({id,type,...extra},transfer);});}
  init(){return this.call('init');}
  async detect(gray,width,height){return (await this.call('detect',{gray:gray.buffer,width,height},[gray.buffer])).detections;}
  close(){this.worker.terminate();this.fail(Error('识别已结束'));}
}
