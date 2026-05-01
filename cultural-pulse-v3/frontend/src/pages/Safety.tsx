import { useDecode } from "@/state/DecodeContext";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Safety() {
  const { trends, alerts, setSelectedTrendId } = useDecode();
  const navigate = useNavigate();

  const sorted = [...trends].sort((a, b) => {
    const order = { TOXIC: 0, RESTRAINT: 1, SAFE: 2 } as const;
    return order[a.safety] - order[b.safety] || b.gravity - a.gravity;
  });

  const dominantHeavy = trends
    .filter(t => (t.dominantEmotion === "sadness" || t.dominantEmotion === "outrage") && t.gravity >= 75)
    .sort((a, b) => b.gravity - a.gravity)[0];

  return (
    <div className="flex-1 p-4 pb-24 space-y-4">
      <div>
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// SAFETY_RADAR</div>
        <h1 className="text-3xl font-bold tracking-tight">Cross-Correlation <span className="text-gradient-magma">Safety Advisory</span></h1>
        <p className="text-sm text-muted-foreground mt-1">Brand-safety verdicts derived from multi-signal correlation. Toxic signals are blocked when conflicting with dominant national sentiment.</p>
      </div>

      {/* Critical Context Alerts */}
      {alerts.length > 0 && dominantHeavy && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl p-6 overflow-hidden border border-magma/40 glow-magma"
          style={{ background: "linear-gradient(135deg, hsl(var(--magma) / 0.15), hsl(var(--background)))" }}
        >
          <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none"/>
          <div className="relative flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-magma/20 border border-magma/40 grid place-items-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-magma"/>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] tracking-[0.3em] text-magma">CRITICAL CONTEXT ALERT</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-magma/20 text-magma border border-magma/40">
                  RISK: {alerts[0].riskLevel}
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1 leading-tight">
                National sentiment is dominated by "<span className="text-magma">{dominantHeavy.title}</span>".
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                Cross-correlation engine has detected {alerts.length} active signal{alerts.length > 1 ? "s" : ""} that conflict with the prevailing mood (gravity {dominantHeavy.gravity}, dominant {dominantHeavy.dominantEmotion}). Posting commercial/playful content now will likely trigger brand backlash.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {alerts.map(a => {
                  const t = trends.find(tr => tr.id === a.conflictingTrendId)!;
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setSelectedTrendId(t.id); navigate("/strategist"); }}
                      className="font-mono text-[10px] px-2.5 py-1 rounded-md bg-magma/10 border border-magma/40 text-magma hover:bg-magma/20 transition-colors flex items-center gap-1.5"
                    >
                      DO NOT POST · {t.hashtag}
                      <ArrowRight className="h-3 w-3"/>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Ranked safety list */}
      <div className="grid md:grid-cols-2 gap-3">
        {sorted.map((t, i) => {
          const Icon = t.safety === "SAFE" ? ShieldCheck : t.safety === "RESTRAINT" ? ShieldAlert : ShieldX;
          const color = t.safety === "SAFE" ? "primary" : t.safety === "RESTRAINT" ? "amber" : "magma";
          const colorVar = color === "primary" ? "var(--primary)" : color === "amber" ? "var(--amber)" : "var(--magma)";
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass glass-hover rounded-2xl p-5 relative overflow-hidden"
              style={{ borderColor: `hsl(${colorVar} / 0.3)` }}
            >
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full pointer-events-none" style={{ background: `hsl(${colorVar} / 0.08)`, filter: "blur(20px)" }}/>
              <div className="relative flex items-start gap-3">
                <div
                  className="h-10 w-10 rounded-lg grid place-items-center shrink-0 border"
                  style={{ background: `hsl(${colorVar} / 0.12)`, borderColor: `hsl(${colorVar} / 0.4)`, color: `hsl(${colorVar})` }}
                >
                  <Icon className="h-5 w-5"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-mono text-[10px] px-2 py-0.5 rounded border"
                      style={{ color: `hsl(${colorVar})`, borderColor: `hsl(${colorVar} / 0.5)`, background: `hsl(${colorVar} / 0.1)` }}
                    >
                      {t.safety}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{t.category}</span>
                  </div>
                  <div className="font-semibold mt-1.5 leading-snug">{t.title}</div>
                  <div className="font-mono text-[11px] text-primary mt-0.5">{t.hashtag}</div>

                  <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10px]">
                    <Metric label="VEL" value={`${t.velocity}%`}/>
                    <Metric label="GRV" value={`${t.gravity}`}/>
                    <Metric label="EMO" value={t.dominantEmotion}/>
                  </div>

                  {t.safety === "TOXIC" && (
                    <div className="mt-3 text-xs text-magma/90 leading-relaxed">
                      ⚠ Conflict detected with dominant national sentiment. Strategic hold advised.
                    </div>
                  )}
                  {t.safety === "RESTRAINT" && (
                    <div className="mt-3 text-xs text-amber/90 leading-relaxed">
                      Restraint protocol active. Avoid commercial overlays.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/5 border border-white/5 px-2 py-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground capitalize tabular-nums">{value}</div>
    </div>
  );
}
