const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function backgroundPalette(pixels,width,height){
  const bins=Array.from({length:24},()=>({count:0,hue:0}));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    // Broad border areas favor the scene's background over central subjects.
    if(x>width*.22&&x<width*.78&&y>height*.22&&y<height*.78)continue;
    const i=(y*width+x)*4,r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;
    if(pixels[i+3]<128||d<.1||l<.08||l>.88)continue;
    let hue=(max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4)*60;
    const bin=bins[Math.min(23,Math.floor(hue/15))];bin.count++;bin.hue+=hue;
  }
  const ranked=bins.filter(b=>b.count).sort((a,b)=>b.count-a.count);
  const hues=[];
  for(const b of ranked){const hue=b.hue/b.count;if(hues.every(h=>Math.min(Math.abs(h-hue),360-Math.abs(h-hue))>28))hues.push(hue);if(hues.length===3)break;}
  if(!hues.length)hues.push(225);
  const base=hues[0];while(hues.length<3)hues.push((base+(hues.length===1?30:330))%360);
  return hues.map((h,i)=>`hsl(${Math.round(h)}, ${[72,68,66][i]}%, ${[43,59,65][i]}%)`);
}
export function circularPhoto(data,width,height,size,palette=null,expanded=false){
  const scale=size*.98/Math.hypot(width,height),w=width*scale,h=height*scale,href=escape(data);
  const x=(size-w)/2,y=(size-h)/2;
  // Extend only the outermost pixels; keep the background's center registered
  // with the foreground so recognisable objects never appear at a second scale.
  const pad=size*.08,edgeX=Math.min(1,width),edgeY=Math.min(1,height);
  const columns=[[-pad,x+pad,0,edgeX],[x,w,0,width],[x+w,x+pad,width-edgeX,edgeX]];
  const rows=[[-pad,y+pad,0,edgeY],[y,h,0,height],[y+h,y+pad,height-edgeY,edgeY]];
  const extension=rows.flatMap(([dy,dh,sy,sh])=>columns.map(([dx,dw,sx,sw])=>
    `<svg x="${dx}" y="${dy}" width="${dw}" height="${dh}" viewBox="${sx} ${sy} ${sw} ${sh}" preserveAspectRatio="none" overflow="hidden"><use xlink:href="#photo-source"/></svg>`)).join('');
  const colorDefs=palette?`<linearGradient id="dream-base" x2=".7" y2="1"><stop stop-color="${escape(palette[0])}"/><stop offset="1" stop-color="${escape(palette[1])}"/></linearGradient><radialGradient id="dream-glow"><stop stop-color="${escape(palette[2])}" stop-opacity=".85"/><stop offset="1" stop-color="${escape(palette[2])}" stop-opacity="0"/></radialGradient><radialGradient id="dream-light"><stop stop-color="${escape(palette[1])}" stop-opacity=".75"/><stop offset="1" stop-color="${escape(palette[1])}" stop-opacity="0"/></radialGradient>`:'';
  const background=palette?`<rect width="${size}" height="${size}" fill="url(#dream-base)"/><ellipse cx="${size*.18}" cy="${size*.7}" rx="${size*.7}" ry="${size*.65}" fill="url(#dream-glow)"/><ellipse cx="${size*.85}" cy="${size*.18}" rx="${size*.65}" ry="${size*.6}" fill="url(#dream-light)"/>`:`<g filter="url(#photo-extend)">${extension}</g>`;
  // Smooth opacity ramps meet the background with zero opacity at every edge.
  // Separate axes multiply at corners, leaving the center completely sharp.
  const stops=[[0,0],[.03,.08],[.07,.35],[.12,.75],[.18,1],[.82,1],[.88,.75],[.93,.35],[.97,.08],[1,0]]
    .map(([offset,opacity])=>`<stop offset="${offset}" stop-color="white" stop-opacity="${opacity}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      ${colorDefs}
      <image id="photo-source" width="${width}" height="${height}" xlink:href="${href}"/>
      <clipPath id="photo-disc"><circle cx="${size/2}" cy="${size/2}" r="${size/2}"/></clipPath>
      <filter id="photo-extend" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${size*(expanded?.025:.012)}"/></filter>
      <linearGradient id="photo-fade-x" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient>
      <linearGradient id="photo-fade-y" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>
      <mask id="photo-mask-x" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#photo-fade-x)"/></mask>
      <mask id="photo-mask-y" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#photo-fade-y)"/></mask>
    </defs>
    <g clip-path="url(#photo-disc)">
      ${expanded?`<image x="${-size*.12}" y="${-size*.12}" width="${size*1.24}" height="${size*1.24}" preserveAspectRatio="xMidYMid slice" filter="url(#photo-extend)" xlink:href="${href}"/>`:background}
      <g mask="url(#photo-mask-x)"><image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" mask="url(#photo-mask-y)" xlink:href="${href}"/></g>
    </g>
  </svg>`;
}
export async function loadPhoto(source,{dreamy=false}={}){
  const response=await fetch(source);if(!response.ok)throw Error('无法读取图片');
  const blob=await response.blob();
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
  const image=new Image();image.src=data;await image.decode();
  let palette=null;
  if(dreamy){const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,64,64);palette=backgroundPalette(ctx.getImageData(0,0,64,64).data,64,64);}
  return {data,width:image.naturalWidth,height:image.naturalHeight,palette};
}
