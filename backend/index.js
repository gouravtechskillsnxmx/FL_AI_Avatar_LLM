// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { embedText, vectorSearch } = require('./vector');
const { callLLMwithRAG } = require('./llm');

const PORT = process.env.PORT || 4000;
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_AVATAR_ID = process.env.HEYGEN_AVATAR_ID;
const HEYGEN_VOICE_ID = process.env.HEYGEN_VOICE_ID;
const HEYGEN_BASE = "https://api.heygen.com";

const app = express();
function heygenHeaders() {
  return {
    Authorization: `Bearer ${process.env.HEYGEN_API_KEY}`,
    "Content-Type": "application/json",
  };
}

app.use(cors({
  origin: ['http://localhost:5173', 'https://853c4364eaa9.ngrok-free.app'], // your frontend URLs
  credentials: true
}))
app.use(bodyParser.json());

function headers(){
  return { "X-Api-Key": HEYGEN_API_KEY, "Content-Type":"application/json" };
}

app.get('/api/health', (_,res)=>res.json({ok:true}));

app.post('/api/chat', async (req,res)=>{
  try{
    const { text } = req.body;
    const emb = await embedText(text);
    const hits = await vectorSearch(emb,3);
    const llm = await callLLMwithRAG(text,hits);
    const body = {
      title: "Insurance Agent Reply",
      video_inputs:[{
        character:{type:"avatar", avatar_id:HEYGEN_AVATAR_ID},
        voice:{type:"text", voice_id:HEYGEN_VOICE_ID, input_text:llm.answer_text},
        background:{type:"color", value:"#ffffff"}
      }],
      dimension:{width:1280,height:720}
    };
    const r = await axios.post(HEYGEN_BASE+"/v2/video/generate", body, {headers:headers()});
    const videoId = r.data?.video_id || r.data?.data?.video_id;
    res.json({answer_text: llm.answer_text, sources: llm.sources, videoId});
  }catch(e){
    res.status(500).json({error:'server_error', detail: e?.response?.data||e.message});
  }
});

app.get('/api/video-status', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId required' });

  try {
    const url = `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`;
    const r = await axios.get(url, { headers: heygenHeaders() });
    const raw = r.data;

    const status =
      raw?.status || raw?.data?.status || raw?.result?.status;

    const videoUrl =
      raw?.video_url || raw?.data?.video_url || raw?.result_url ||
      raw?.result?.video_url || (raw?.outputs && raw?.outputs[0]?.url);

    // return raw so we can see the failure reason/message
    return res.json({
      status: status || 'unknown',
      video_url: videoUrl || null,
      raw
    });
  } catch (e) {
    return res.status(500).json({
      error: 'status_failed',
      detail: e?.response?.data || e.message,
    });
  }
});


app.listen(PORT, ()=>console.log("Backend on "+PORT));
