// frontend/src/App.jsx
import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

//  add this line
const NGROK_HEADERS = { 'ngrok-skip-browser-warning': 'true' };


export default function App() {
  const [question, setQuestion] = useState(
    "Does my policy cover accidental hospitalization for parents aged 60?"
  );
  const [answer, setAnswer] = useState("");
  const [videoId, setVideoId] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [health, setHealth] = useState("checking…");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/health`, { headers: NGROK_HEADERS });
        const ct = r.headers.get("content-type") || "";
        const txt = await r.text();
        let j;
        if (ct.includes("application/json")) j = JSON.parse(txt);
        setHealth(j?.ok ? "connected" : `non-json: ${txt.slice(0,80)}`);
      } catch (e) {
        setHealth(`error: ${e.message}`);
      }
    })();
  }, []);

  function speak(text) {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  async function ask() {
    try {
      setAnswer("");
      setVideoId(null);
      setVideoUrl(null);
      setError("");
      setStatus("creating…");

      const resp = await fetch(`${API}/api/chat`, {
  			method: "POST",
  			headers: { "Content-Type": "application/json", ...NGROK_HEADERS },
  			body: JSON.stringify({ text: question }),
		});


      const ct = resp.headers.get("content-type") || "";
      const txt = await resp.text();
      let json;
      if (ct.includes("application/json")) json = JSON.parse(txt);
      else throw new Error(`/api/chat returned non-JSON: ${txt.slice(0,200)}`);

      if (!resp.ok) throw json;

      setAnswer(json.answer_text || "");
      if (json.answer_text) speak(json.answer_text);

      if (json.videoId) {
        setVideoId(json.videoId);
        setStatus("processing…");
        poll(json.videoId);
      } else {
        setStatus("no videoId from server");
      }
    } catch (e) {
      setError(e?.detail || e?.error || e?.message || JSON.stringify(e));
      setStatus("error");
    }
  }

  async function poll(id) {
    for (let i = 0; i < 120; i++) {
      try {
        const r = await fetch(`${API}/api/video-status?videoId=${id}`, { headers: NGROK_HEADERS });
        const ct = r.headers.get("content-type") || "";
        const txt = await r.text();

        let j;
        if (ct.includes("application/json")) j = JSON.parse(txt);
        else {
          // This is the error you saw: HTML returned instead of JSON
          setError(`video-status non-JSON (status ${r.status}): ${txt.slice(0,200)}`);
          setStatus("error");
          return;
        }

        const st = j.status || j?.data?.status;
        if (st === "completed" || st === "done" || st === "succeeded") {
          const url =
            j.video_url ||
            j?.data?.video_url ||
            j.result_url ||
            (j.outputs && j.outputs[0] && j.outputs[0].url);

          if (url) {
            setVideoUrl(url);
            setStatus("completed");
            return;
          }
          setStatus("completed (no url)");
          setError("Completed but no video_url in response.");
          return;
        }

        if (st === "failed" || st === "error") {
          setStatus("error");
          setError(JSON.stringify(j));
          return;
        }
      } catch (err) {
        setStatus("error");
        setError(err?.message || String(err));
        return;
      }
      await new Promise((res) => setTimeout(res, 3000));
    }
    setStatus("timeout");
    setError("Timed out waiting for video.");
  }

  return (
    <div style={{ padding: 24, fontFamily: "Inter, system-ui, Arial" }}>
      <h2>Insurance Agent Avatar (Hybrid)</h2>
      <p>API base: <code>{API}</code> — health: <b>{health}</b></p>

      <textarea
        rows={3}
        style={{ width: "100%", marginBottom: 8 }}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={ask}>Ask</button>
        <span>Status: {status}</span>
      </div>

      {answer && (
        <div style={{ marginBottom: 12 }}>
          <b>Answer:</b>
          <div>{answer}</div>
        </div>
      )}

      {videoId && !videoUrl && <div>Video ID: {videoId}</div>}

      {error && (
        <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{error}</pre>
      )}

      {videoUrl && (
        <div>
          <h4>Polished Video</h4>
          <video src={videoUrl} controls autoPlay width="640" />
          <p>
            <a href={videoUrl} target="_blank" rel="noreferrer">
              Open video in new tab
            </a>
          </p>
        </div>
      )}

      <hr style={{ marginTop: 24 }} />
      <small>
        Disclaimer: AI assistant. For official advice and claims, contact
        support.
      </small>
    </div>
  );
}
