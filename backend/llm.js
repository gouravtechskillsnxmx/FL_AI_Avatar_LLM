// backend/llm.js
const axios=require('axios');
const OPENAI_KEY=process.env.OPENAI_API_KEY;
const MODEL=process.env.OPENAI_MODEL||"gpt-4o-mini";
async function callLLMwithRAG(q,hits){
  const context=hits.map(h=>`[${h.id}] ${h.snippet}`).join("\n");
  if(!OPENAI_KEY){return {answer_text:(hits[0]?hits[0].snippet+" ["+hits[0].id+"]":"I don't know"), sources:hits.map(h=>h.id)};}
  try{
    const resp=await axios.post("https://api.openai.com/v1/chat/completions",{model:MODEL,messages:[{role:"system",content:"You are an insurance agent. Use docs only."},{role:"user",content:`Docs:\n${context}\nQ:${q}`}],temperature:0.2},{headers:{Authorization:`Bearer ${OPENAI_KEY}`}});
    const ans=resp.data.choices[0].message.content.trim();
    return {answer_text:ans, sources:hits.map(h=>h.id)};
  }catch(e){return {answer_text:hits[0]?hits[0].snippet:"I don't know", sources:hits.map(h=>h.id)};}
}
module.exports={callLLMwithRAG};
