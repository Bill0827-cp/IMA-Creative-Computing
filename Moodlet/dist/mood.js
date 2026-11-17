export const moods = {
 joy: {label:'Happy',icon:'☀',words:/\b(happy|joy|excited|wonderful|amazing|won|win|laughed|laugh|proud|celebrate|great|love|grateful|thankful)\b/gi,idea:'a joyful yellow face with sparkling eyes and a big warm smile, hugging a tiny golden star'},
 calm: {label:'Calm',icon:'☁',words:/\b(calm|peaceful|relaxed|quiet|rest|peace|gentle|cozy|slow|relief|relieved|content|walk|tea)\b/gi,idea:'a peaceful yellow face with closed smiling eyes, holding a small green leaf'},
 sad: {label:'Low',icon:'☂',words:/\b(sad|lonely|cry|cried|crying|miss|missing|down|hurt|disappointed|unhappy|heartbroken|lost)\b/gi,idea:'a tender blue face with watery eyes and a small soft frown, hugging a tiny rain cloud'},
 tired: {label:'Drained',icon:'☾',words:/\b(tired|exhausted|drained|sleepy|burnt|burned|overwhelmed|deadline|stress|stressed|busy|long day|anxious|worried|nervous)\b/gi,idea:'a sleepy yellow face with drooping eyelids, resting on a fluffy little cloud'},
 mixed: {label:'Mixed',icon:'✧',words:/\b(mixed|bittersweet|confused|unsure|strange|uncertain)\b/gi,idea:'a thoughtful yellow face with a small soft smile, holding a tiny cloud'},
 frustrated: {label:'Frustrated',icon:'ϟ',words:/\b(angry|frustrated|annoyed|irritated|furious|unfair|rage)\b/gi,idea:'a cute orange face with furrowed eyebrows and puffed cheeks, a tiny steam cloud above its head'}
};
export function inferMood(text){
 const normalized=text.replace(/\b(?:not|never|wasn't|isn't|don't feel|didn't feel)\s+(?:very\s+|really\s+|so\s+)?(happy|excited|great|calm|relaxed|sad|tired|angry)\b/gi,(_,w)=>/happy|excited|great|calm|relaxed/i.test(w)?' sad ':' calm ');
 const ranked=Object.entries(moods).map(([id,m])=>[id,(normalized.match(m.words)||[]).length]).sort((a,b)=>b[1]-a[1]);
 if(!ranked[0][1] || (ranked[1][1] && ranked[0][1]===ranked[1][1])) return 'mixed';
 return ranked[0][0];
}
export function imageURL(prediction){let output=prediction?.output; const candidate=Array.isArray(output)?output[0]:output;if(typeof candidate!=='string')return null;try{const url=new URL(candidate);return url.protocol==='https:'?url.href:null;}catch{return null;}}
