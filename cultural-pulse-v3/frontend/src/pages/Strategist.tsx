import { useDecode } from "@/state/DecodeContext";
import { generateStrategicBrief } from "@/ai-core/strategist";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RotateCw, Copy, Check } from "lucide-react";

export default function Strategist() {
  const { trends, selectedTrend, setSelectedTrendId, alerts } = useDecode();
  const t = selectedTrend ?? trends[0];

  const fullBrief = useMemo(() => generateStrategicBrief(t, alerts), [t, alerts]);

  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  // Typewriter effect
  useEffect(() => {
    setTyped("");
    setDone(false);
    if (timer.current) window.clearInterval(timer.current);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += Math.random() < 0.5 ? 2 : 3;
      if (i >= fullBrief.length) {
        setTyped(fullBrief);
        setDone(true);
        if (timer.current) window.clearInterval(timer.current);
      } else {
        setTyped(fullBrief.slice(0, i));
      }
    }, 18);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [fullBrief]);

  const blocked = alerts.find(a => a.conflictingTrendId === t.id);
  const tone = blocked
    ? { label: "RESTRAINT", color: "hsl(var(--magma))" }
    : t.dominantEmotion === "humor"
      ? { label: "CREATIVE", color: "hsl(var(--emo-humor))" }
      : t.dominantEmotion === "outrage"
        ? { label: "DEFENSIVE", color: "hsl(var(--emo-outrage))" }
        : t.dominantEmotion === "sadness"
          ? { label: "RESTRAINT", color: "hsl(var(--emo-sadness))" }
          : t.dominantEmotion === "pride"
            ? { label: "ALIGNED", color: "hsl(var(--emo-pride))" }
            : { label: "EXPLORATORY", color: "hsl(var(--emo-curiosity))" };

  const onCopy = async () => {
    await navigator.clipboard.writeText(fullBrief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 p-4 pb-24 space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// AI_STRATEGIST</div>
          <h1 className="text-3xl font-bold tracking-tight">Strategic <span className="text-gradient-cyan">Brief Generator</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Context-aware, tone-variable strategy synthesized from live signal data.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={t.id}
            onChange={e => setSelectedTrendId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/50"
          >
            {trends.map(tr => (
              <option key={tr.id} value={tr.id} className="bg-background">
                {tr.hashtag}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="glass rounded-2xl p-6 relative overflow-hidden min-h-[520px]">
          <div className="absolute inset-0 pointer-events-none opacity-50 grid-bg"/>
          <div className="relative">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/30 grid place-items-center">
                  <Sparkles className="h-4 w-4 text-primary"/>
                </div>
                <div>
                  <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">AI STRATEGIC BRIEF</div>
                  <div className="text-sm font-semibold">{t.title}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[10px] px-2 py-1 rounded border"
                  style={{ color: tone.color, borderColor: `${tone.color}80`, background: `${tone.color}1a` }}
                >
                  TONE · {tone.label}
                </span>
                <button
                  onClick={onCopy}
                  disabled={!done}
                  className="font-mono text-[10px] px-2.5 py-1.5 rounded-md border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  {copied ? <><Check className="h-3 w-3"/> Copied</> : <><Copy className="h-3 w-3"/> Copy</>}
                </button>
                <button
                  onClick={() => setSelectedTrendId(t.id)}
                  className="font-mono text-[10px] px-2.5 py-1.5 rounded-md border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors flex items-center gap-1.5"
                >
                  <RotateCw className="h-3 w-3"/> Regenerate
                </button>
              </div>
            </div>

            <div className="mt-6 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">
              <span>{typed}</span>
              {!done && <span className="caret"/>}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="glass rounded-2xl p-5">
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// CONTEXT_SNAPSHOT</div>
            <div className="mt-3 space-y-2 text-sm">
              <Row k="Signal" v={t.hashtag}/>
              <Row k="Phase" v={t.phase}/>
              <Row k="Velocity" v={`${t.velocity}%`}/>
              <Row k="Gravity" v={`${t.gravity}`}/>
              <Row k="Dominant emotion" v={t.dominantEmotion}/>
              <Row k="Action window" v={t.actionWindowMinutes === 0 ? "CLOSED" : `${Math.floor(t.actionWindowMinutes/60)}h ${t.actionWindowMinutes%60}m`}/>
              <Row k="Safety verdict" v={t.safety}/>
            </div>
          </div>

          {blocked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5 border-magma/40"
              style={{ borderColor: "hsl(var(--magma) / 0.4)" }}
            >
              <div className="font-mono text-[10px] tracking-[0.3em] text-magma">// CONTEXT_OVERRIDE</div>
              <div className="mt-2 text-sm leading-relaxed">{blocked.recommendation}</div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-xs">{k}</span>
      <span className="font-mono text-xs capitalize">{v}</span>
    </div>
  );
}
