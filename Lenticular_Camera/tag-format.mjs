import {circularPhoto} from './circular-photo.mjs';
import {photoGeometry} from './catalog.mjs';
export function tagGrid(family,id){
  if(!Number.isInteger(id)||id<0||id>=family.codes.length)throw Error('标签 ID 无效');
  const grid=Array.from({length:10},()=>Array(10).fill(1));
  for(let y=1;y<9;y++)for(let x=1;x<9;x++)grid[y][x]=0;
  const code=BigInt('0x'+family.codes[id]);
  family.bits.forEach(([x,y],i)=>{grid[y+1][x+1]=Number((code>>BigInt(35-i))&1n);});return grid;
}
export function tagSVG(family,id){
  const grid=tagGrid(family,id);let cells='';for(let y=0;y<10;y++)for(let x=0;x<10;x++)if(!grid[y][x])cells+=`<rect x="${x}" y="${y}" width="1" height="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" shape-rendering="crispEdges"><rect width="10" height="10" fill="white"/><g fill="black">${cells}</g></svg>`;
}
export const escapeXML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function layoutSVG(item,family,imageData,imageWidth=item.widthMm,imageHeight=item.heightMm){
  const {diameter}=photoGeometry(item);
  const margin=20,w=diameter+margin*2,h=diameter+item.tagGapMm+item.tagSizeMm*1.25+margin*2+12,s=item.tagSizeMm;
  const circleX=margin+diameter/2,circleY=margin+diameter/2,radius=diameter/2;
  const tags=['left','right'].map((side,i)=>{
    const id=item[side+'Tag'],x=margin+diameter/2+(i?1:-1)*item.tagSeparationMm/2-s*.625,y=margin+diameter+item.tagGapMm-s/8;
    return `<svg x="${x}" y="${y}" width="${s*1.25}" height="${s*1.25}" viewBox="0 0 10 10">${tagSVG(family,id).replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg><text x="${x+s*.625}" y="${y+s*1.25+6}" text-anchor="middle" font-size="4">${side.toUpperCase()} · ${id} ↑</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><defs><clipPath id="wall-photo-circle" clipPathUnits="userSpaceOnUse"><circle cx="${circleX}" cy="${circleY}" r="${radius}"/></clipPath></defs><rect width="${w}" height="${h}" fill="white"/><text x="20" y="12" font-size="5">${escapeXML(item.name)} · 100% / actual size</text><g transform="translate(${margin} ${margin})">${circularPhoto(imageData,imageWidth,imageHeight,diameter)}</g>${tags}<path d="M 20 ${h-6} h 50" stroke="black" stroke-width=".4"/><text x="75" y="${h-5}" font-size="4">50 mm</text></svg>`;
}
