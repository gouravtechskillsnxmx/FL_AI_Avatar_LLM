// backend/vector.js
function fakeEmbed(text){
  const v = new Array(64).fill(0);
  for(let i=0;i<text.length;i++) v[i%64]+=text.charCodeAt(i)%7;
  const n = Math.sqrt(v.reduce((s,x)=>s+x*x,0))||1;
  return v.map(x=>x/n);
}
function cos(a,b){let s=0; for(let i=0;i<a.length;i++) s+=a[i]*b[i]; return s;}
const DOCS=[
  {id:"policy-123", text:"Accidental hospitalization covered up to INR 5,00,000 within 30 days."},
  {id:"faq-7", text:"To file claim, submit via portal or call 1800."}
];
const INDEX=DOCS.map(d=>({...d, embedding:fakeEmbed(d.text)}));
async function embedText(t){return fakeEmbed(t);}
async function vectorSearch(e,topK){return INDEX.map(r=>({id:r.id,snippet:r.text,score:cos(e,r.embedding)})).sort((a,b)=>b.score-a.score).slice(0,topK);}
module.exports={embedText, vectorSearch};
