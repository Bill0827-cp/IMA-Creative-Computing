import {moods,inferMood,imageURL} from './mood.js';
const $=id=>document.getElementById(id);
const endpoint='https://itp-ima-replicate-proxy.web.app/api/create_n_get';
let selected='mixed',busy=false,currentURL=null;
const samples={joy:'Today I finally finished the project I had been working on all week. My friends cheered me on and we celebrated with ice cream. I feel proud and grateful for these little wins.',calm:'I took a slow walk this morning, made a cup of tea, and watched the rain from my window. For once, I felt peaceful and content with doing less.',tired:'It was such a long day. Between deadlines and a busy commute I felt completely drained. I am tired, and all I want is a soft blanket and some sleep.'};
$('date').textContent=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date());
function chooseMood(id){selected=id;$('prompt').value=moods[id].idea;document.querySelectorAll('.chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mood===id)));}
for(const [id,mood]of Object.entries(moods)){const b=document.createElement('button');b.type='button';b.className='chip';b.dataset.mood=id;b.textContent=`${mood.icon} ${mood.label}`;b.setAttribute('aria-pressed',String(id===selected));b.onclick=()=>chooseMood(id);$('moods').append(b);}
function update(){const text=$('diary').value;$('count').textContent=`${text.length.toLocaleString()} / 3,000`;$('generate').disabled=busy||!text.trim()||!$('prompt').value.trim();}
$('diary').addEventListener('input',()=>{chooseMood(inferMood($('diary').value));update();});$('prompt').addEventListener('input',update);
function sample(id){if(busy)return;$('diary').value=samples[id];chooseMood(id);update();$('diary').focus();}
$('sample').onclick=()=>sample(['joy','calm','tired'][Math.floor(Math.random()*3)]);
document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{sample(b.dataset.example);$('studio').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
$('settingsButton').onclick=()=>$('settings').showModal();
function setBusy(value){busy=value;$('loader').hidden=!value;$('artboard').setAttribute('aria-busy',String(value));$('diary').disabled=value;$('prompt').disabled=value;$('sample').disabled=value;document.querySelectorAll('.chip,[data-example]').forEach(b=>b.disabled=value);$('again').disabled=value;update();$('generate').innerHTML=value?'Creating your emoji…':'<span>✧</span> Make my emoji <span>↗</span>';}
function status(message,error=false){$('status').textContent=message;$('status').className=error?'error':'';}
async function generate(){
 if(busy||!$('diary').value.trim()||!$('prompt').value.trim())return;
 const mood=selected;setBusy(true);status('');$('resultActions').hidden=true;
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),180000);
 try{
  const token=$('token').value.trim();const headers={'Content-Type':'application/json'};if(token)headers.Authorization=`Bearer ${token}`;
  const response=await fetch(endpoint,{method:'POST',headers,signal:controller.signal,body:JSON.stringify({version:'fofr/sdxl-emoji:dee76b5afde21b0f01ed7925f0665b7e879c50ee718c5f78a9d38e04d523cc5e',input:{prompt:`A TOK emoji of ${$('prompt').value.trim()}. One expressive emoji, glossy 3D Apple emoji aesthetic, centered, isolated on a plain white background, no text, no letters.`,negative_prompt:'text, watermark, letters, multiple faces, collage, photorealistic',width:1024,height:1024,num_outputs:1,num_inference_steps:30,guidance_scale:7.5}})});
  if(response.status===401||response.status===403)throw new Error('This request needs a valid NYU token. Open Connection to add or refresh yours.');
  if(response.status===429)throw new Error('The generation quota has been reached. Try later or add a valid NYU token in Connection.');
  let prediction;try{prediction=await response.json();}catch{throw new Error('The service returned an unreadable response. Please try again later.');}
  if(!response.ok)throw new Error(`The generation service could not complete this request (${response.status}). Please try again later.`);
  if(prediction.error)throw new Error(typeof prediction.error==='string'?prediction.error:'The model could not generate this emoji. Try a different idea.');
  const url=imageURL(prediction);if(!url)throw new Error(prediction.status==='processing'||prediction.status==='starting'?'The model is still warming up. No image was returned. Please try again in a moment.':'No image came back. Try a simpler emoji idea or check your connection token.');
  await new Promise((resolve,reject)=>{const img=$('generatedImage');img.onload=resolve;img.onerror=()=>reject(new Error('Your emoji was generated, but the image could not load. Please try again.'));img.src=url;});
  currentURL=url;$('generatedImage').hidden=false;$('previewFace').hidden=true;document.querySelectorAll('.orbit').forEach(e=>e.hidden=true);$('artLabel').hidden=true;$('resultBadge').textContent='ONE OF A KIND';$('resultEyebrow').textContent='A LITTLE PIECE OF YOUR DAY';$('resultTitle').textContent=`A little ${moods[mood].label.toLowerCase()}. A little you.`;$('resultDescription').textContent='A feeling, turned into something you can keep.';$('resultActions').hidden=false;status('Your emoji is ready. Download it before you leave this tab.');
 }catch(error){status(error.name==='AbortError'?'This is taking longer than expected. Please try again in a moment.':error.message,true);if(currentURL)$('resultActions').hidden=false;}
 finally{clearTimeout(timeout);setBusy(false);}
}
$('generate').onclick=generate;$('again').onclick=generate;
$('download').onclick=async()=>{if(!currentURL)return;const button=$('download');button.disabled=true;try{const response=await fetch(currentURL);if(!response.ok)throw new Error();const blob=await response.blob();if(!blob.type.startsWith('image/'))throw new Error();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`moodlet-${new Date().toISOString().slice(0,10)}.${blob.type.includes('webp')?'webp':blob.type.includes('jpeg')?'jpg':'png'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch{status('Download unavailable. Open the original image to save it.');const a=document.createElement('a');a.href=currentURL;a.target='_blank';a.rel='noopener noreferrer';a.textContent=' Open original image ↗';$('status').append(a);}finally{button.disabled=false;}};
