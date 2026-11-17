(() => {
const moods = {
 joy: {label:'Happy',icon:'☀',words:/\b(happy|joy|excited|wonderful|amazing|won|win|laughed|laugh|proud|celebrate|great|love|grateful|thankful)\b/gi,idea:'a joyful yellow face with sparkling eyes and a big warm smile, hugging a tiny golden star'},
 calm: {label:'Calm',icon:'☁',words:/\b(calm|peaceful|relaxed|quiet|rest|peace|gentle|cozy|slow|relief|relieved|content|walk|tea)\b/gi,idea:'a peaceful yellow face with closed smiling eyes, holding a small green leaf'},
 sad: {label:'Low',icon:'☂',words:/\b(sad|lonely|cry|cried|crying|miss|missing|down|hurt|disappointed|unhappy|heartbroken|lost)\b/gi,idea:'a tender blue face with watery eyes and a small soft frown, hugging a tiny rain cloud'},
 tired: {label:'Drained',icon:'☾',words:/\b(tired|exhausted|drained|sleepy|burnt|burned|overwhelmed|deadline|stress|stressed|busy|long day|anxious|worried|nervous)\b/gi,idea:'a sleepy yellow face with drooping eyelids, resting on a fluffy little cloud'},
 mixed: {label:'Mixed',icon:'✧',words:/\b(mixed|bittersweet|confused|unsure|strange|uncertain)\b/gi,idea:'a thoughtful yellow face with a small soft smile, holding a tiny cloud'},
 frustrated: {label:'Frustrated',icon:'ϟ',words:/\b(angry|frustrated|annoyed|irritated|furious|unfair|rage)\b/gi,idea:'a cute orange face with furrowed eyebrows and puffed cheeks, a tiny steam cloud above its head'}
};
function inferMood(text){
 const normalized=text.replace(/\b(?:not|never|wasn't|isn't|don't feel|didn't feel)\s+(?:very\s+|really\s+|so\s+)?(happy|excited|great|calm|relaxed|sad|tired|angry)\b/gi,(_,w)=>/happy|excited|great|calm|relaxed/i.test(w)?' sad ':' calm ');
 const ranked=Object.entries(moods).map(([id,m])=>[id,(normalized.match(m.words)||[]).length]).sort((a,b)=>b[1]-a[1]);
 if(!ranked[0][1] || (ranked[1][1] && ranked[0][1]===ranked[1][1])) return 'mixed';
 return ranked[0][0];
}
function imageURL(prediction){let output=prediction?.output; const candidate=Array.isArray(output)?output[0]:output;if(typeof candidate!=='string')return null;try{const url=new URL(candidate);return url.protocol==='https:'?url.href:null;}catch{return null;}}



const diary = document.getElementById('diary');
const button = document.getElementById('generate');
const result = document.getElementById('result');
const placeholder = document.getElementById('placeholder');
const emoji = document.getElementById('emoji');
const loading = document.getElementById('loading');
const status = document.getElementById('status');
let busy = false;
let currentEmoji = null;
let openedEntry = null;
function updateButton() { button.disabled = busy || !diary.value.trim(); document.getElementById('saveDiary').disabled = busy || !diary.value.trim(); document.querySelectorAll('.diary-entry').forEach(entry => entry.disabled = busy); }
diary.addEventListener('input', updateButton);
function showStatus(message, error = false) {
  status.textContent = message;
  status.className = error ? 'error' : '';
}
document.getElementById('diaryForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !diary.value.trim()) return;
  busy = true;
  diary.disabled = true;
  updateButton();
  button.textContent = 'Generating...';
  loading.hidden = false;
  placeholder.hidden = true;
  emoji.hidden = true;
  result.setAttribute('aria-busy', 'true');
  showStatus('');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);
  try {
    const mood = moods[inferMood(diary.value)];
    const data = {
      version: 'fofr/sdxl-emoji:dee76b5afde21b0f01ed7925f0665b7e879c50ee718c5f78a9d38e04d523cc5e',
      input: {
        prompt: 'A TOK emoji of ' + mood.idea + '. One expressive emoji, glossy 3D, centered on a plain white background, no text.',
        negative_prompt: 'text, watermark, letters, multiple faces, collage, photorealistic',
        width: 1024, height: 1024, num_outputs: 1,
        num_inference_steps: 30, guidance_scale: 7.5
      }
    };
    const response = await fetch('https://itp-ima-replicate-proxy.web.app/api/create_n_get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    if (response.status === 429) throw new Error('The image service has reached its usage limit. Please try again later.');
    if (response.status === 401 || response.status === 403) throw new Error('The image service is not allowing anonymous generation right now. Please try again later.');
    if (!response.ok) throw new Error('The image service is unavailable. Please try again later.');
    const prediction = await response.json();
    if (prediction.error) throw new Error('The model could not create an emoji. Please try again.');
    const url = imageURL(prediction);
    if (!url) throw new Error('No emoji was returned. Please try again in a moment.');
    await new Promise((resolve, reject) => {
      const image = new Image();
      const fail = () => { cleanup(); reject(new Error('The emoji could not load. Please try again.')); };
      const cleanup = () => { image.onload = null; image.onerror = null; controller.signal.removeEventListener('abort', fail); };
      image.onload = () => { cleanup(); resolve(); };
      image.onerror = fail;
      controller.signal.addEventListener('abort', fail, { once: true });
      if (controller.signal.aborted) { fail(); return; }
      image.src = url;
    });
    currentEmoji = { text: diary.value.trim(), source: url, data: null };
    emoji.src = url;
    emoji.hidden = false;
    showStatus('Your emoji is ready. Save diary to keep it with your entry.');
  } catch (error) {
    placeholder.hidden = false;
    showStatus(controller.signal.aborted ? 'This is taking longer than expected. Please try again.' : error instanceof TypeError ? 'Could not connect. Check your internet connection and try again.' : error.message, true);
  } finally {
    clearTimeout(timeout);
    busy = false;
    diary.disabled = false;
    loading.hidden = true;
    result.setAttribute('aria-busy', 'false');
    button.textContent = 'Generate emoji';
    updateButton();
  }
});

// Date-indexed local diary snapshots. Dates use the user's local timezone.
const storageKey = 'moodlet.diaries.v1';
const saveButton = document.getElementById('saveDiary');
const saveStatus = document.getElementById('saveStatus');
const dateFilter = document.getElementById('diaryDate');
const diaryList = document.getElementById('diaryList');
function localDate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function readDiaries() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries) || entries.some(entry => !entry || typeof entry.text !== 'string' || typeof entry.date !== 'string' || !Number.isFinite(Date.parse(entry.createdAt)))) {
    throw new Error('Invalid saved diary data');
  }
  return entries;
}
function saveMessage(message, error = false) {
  saveStatus.textContent = message;
  saveStatus.className = error ? 'note error' : 'note';
}
function renderDiaries() {
  diaryList.replaceChildren();
  try {
    const entries = readDiaries().filter(entry => !dateFilter.value || entry.date === dateFilter.value).sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-history';
      empty.textContent = dateFilter.value ? 'No diaries saved on this date.' : 'No saved diaries yet. Write an entry and click Save diary.';
      diaryList.append(empty);
    }
    for (const entry of entries) {
      const open = document.createElement('button');
      open.type = 'button'; open.className = 'diary-entry'; open.disabled = busy;
      const time = document.createElement('time');
      time.dateTime = entry.createdAt;
      time.textContent = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt)) + ' / Open diary';
      open.setAttribute('aria-label', 'Open diary from ' + time.textContent);
      if (validEmoji(entry.emoji)) {
        const thumbnail = document.createElement('img');
        thumbnail.src = entry.emoji;
        thumbnail.alt = 'Saved mood emoji';
        thumbnail.loading = 'lazy';
        open.append(thumbnail);
      } else {
        const empty = document.createElement('span');
        empty.className = 'no-emoji';
        empty.textContent = 'No emoji yet';
        open.append(empty);
      }
      open.append(time);
      open.addEventListener('click', () => {
        if (busy) return;
        let saved;
        try { saved = readDiaries(); } catch { saveMessage('Could not read saved diaries. Your current entry is unchanged.', true); return; }
        const unsaved = diary.value.trim() && (!saved.some(item => item.text === diary.value.trim()) || (currentEmoji && !saved.some(item => item.text === currentEmoji.text && item.emoji === currentEmoji.data)));
        if (unsaved && !window.confirm('Open this diary and replace your unsaved text? Choose Cancel to save your current entry first.')) return;
        diary.value = entry.text;
        openedEntry = entry.createdAt;
        currentEmoji = validEmoji(entry.emoji) ? { text: entry.text, source: entry.emoji, data: entry.emoji } : null;
        if (currentEmoji) {
          emoji.src = currentEmoji.data; emoji.hidden = false; placeholder.hidden = true;
        } else {
          emoji.hidden = true; emoji.removeAttribute('src'); placeholder.hidden = false;
        }
        showStatus(''); updateButton();
        saveMessage('Opened saved diary. Editing and saving creates a new entry for today.');
        diary.focus();
      });
      diaryList.append(open);
    }
  } catch {
    const error = document.createElement('p');
    error.textContent = 'Saved diaries could not be read. Browser storage may be unavailable. Existing data has not been changed.';
    diaryList.append(error);
  }
}
function validEmoji(value) {
  return typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}
async function getEmojiData() {
  if (!currentEmoji || currentEmoji.text !== diary.value.trim()) return null;
  if (validEmoji(currentEmoji.data)) return currentEmoji.data;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(currentEmoji.source, { signal: controller.signal });
    if (!response.ok) throw new Error('Image download failed');
    const blob = await response.blob();
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) throw new Error('Invalid image format');
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Image could not be read'));
      reader.readAsDataURL(blob);
    });
    if (!validEmoji(data)) throw new Error('Invalid image data');
    currentEmoji.data = data;
    return data;
  } finally { clearTimeout(timeout); }
}
saveButton.addEventListener('click', async () => {
  if (busy || !diary.value.trim()) return;
  busy = true; diary.disabled = true; updateButton();
  saveButton.textContent = 'Saving...';
  try {
    // Store the actual image bytes, never an expiring Replicate URL.
    const imageData = await getEmojiData();
    const entries = readDiaries();
    const now = new Date();
    const text = diary.value.trim();
    const existing = entries.find(entry => entry.createdAt === openedEntry && entry.text === text)
      || entries.find(entry => entry.date === localDate(now) && entry.text === text);
    if (existing) {
      if (imageData) existing.emoji = imageData;
      openedEntry = existing.createdAt;
      dateFilter.value = existing.date;
    } else {
      const entry = { text, date: localDate(now), createdAt: now.toISOString(), emoji: imageData };
      entries.push(entry);
      openedEntry = entry.createdAt;
      dateFilter.value = entry.date;
    }
    localStorage.setItem(storageKey, JSON.stringify(entries));
    saveMessage(imageData ? 'Diary and emoji saved in this browser.' : 'Diary saved. Generate an emoji and save again to add it.');
    renderDiaries();
  } catch {
    saveMessage('Could not save the diary and emoji. Image access or browser storage may be unavailable or full. Your entry is still here; please try again.', true);
  } finally {
    busy = false; diary.disabled = false; updateButton();
    saveButton.textContent = 'Save diary & emoji';
  }
});
dateFilter.value = localDate(new Date());
dateFilter.addEventListener('change', renderDiaries);
diary.addEventListener('input', () => {
  saveMessage('');
  if (currentEmoji && currentEmoji.text !== diary.value.trim()) {
    currentEmoji = null; emoji.hidden = true; emoji.removeAttribute('src'); placeholder.hidden = false; showStatus('');
  }
});
window.addEventListener('storage', event => { if (event.key === storageKey || event.key === null) renderDiaries(); });
renderDiaries();

updateButton();
})();
