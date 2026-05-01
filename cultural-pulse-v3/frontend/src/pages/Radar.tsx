import { TunisiaMap } from "@/components/TunisiaMap";
import { EmotionFilter } from "@/components/EmotionFilter";
import { useDecode } from "@/state/DecodeContext";
import { motion } from "framer-motion";
import { ArrowUpRight, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Radar() {
  const { trends, emotionFilter, setSelectedTrendId } = useDecode();
  const navigate = useNavigate();

  const filtered = emotionFilter === "all"
    ? trends
    : trends.filter(t => t.dominantEmotion === emotionFilter);

  const sorted = [...filtered].sort((a, b) => b.velocity - a.velocity);

  return (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 p-4 pb-24">
      <div className="space-y-4 min-h-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// TACTICAL_RADAR</div>
            <h1 className="text-3xl font-bold tracking-tight">Tunisia <span className="text-gradient-cyan">Live Signal Map</span></h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time trend triangulation across 24 governorates. Click a pin to launch the Intelligence Dossier.</p>
          </div>
          <EmotionFilter/>
        </div>

        <div className="h-[640px]">
          <TunisiaMap/>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// LIVE_SIGNALS</div>
          <div className="font-mono text-[10px] text-muted-foreground tabular-nums">{sorted.length} active</div>
        </div>

        <div className="space-y-2.5">
          {sorted.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => { setSelectedTrendId(t.id); navigate("/intelligence"); }}
              className="w-full text-left glass glass-hover rounded-xl p-4 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                      {t.category}
                    </span>
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded border"
                      style={{
                        color: t.safety === "TOXIC" ? "hsl(var(--magma))" : t.safety === "RESTRAINT" ? "hsl(var(--amber))" : "hsl(var(--primary))",
                        borderColor: t.safety === "TOXIC" ? "hsl(var(--magma) / 0.5)" : t.safety === "RESTRAINT" ? "hsl(var(--amber) / 0.5)" : "hsl(var(--primary) / 0.5)",
                        background: t.safety === "TOXIC" ? "hsl(var(--magma) / 0.1)" : t.safety === "RESTRAINT" ? "hsl(var(--amber) / 0.1)" : "hsl(var(--primary) / 0.1)",
                      }}
                    >
                      {t.safety}
                    </span>
                  </div>
                  <div className="font-semibold text-sm leading-snug mt-1.5">{t.title}</div>
                  <div className="font-mono text-[11px] text-muted-foreground mt-1">{t.hashtag}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"/>
              </div>
              <div className="flex items-center gap-4 mt-3 font-mono text-[10px]">
                <div className="flex items-center gap-1 text-primary">
                  <Activity className="h-3 w-3"/> v {t.velocity}%
                </div>
                <div className="text-muted-foreground">g {t.gravity}</div>
                <div className="ml-auto text-muted-foreground capitalize">{t.dominantEmotion}</div>
              </div>
              <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${t.velocity}%` }}
                  transition={{ duration: 0.8, delay: i * 0.04 }}
                  className="h-full rounded-full"
                  style={{
                    background: t.safety === "TOXIC"
                      ? "linear-gradient(90deg, hsl(var(--magma)), hsl(var(--magma-glow)))"
                      : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-glow)))",
                  }}
                />
              </div>
            </motion.button>
          ))}
        </div>
      </aside>
    </div>
  );
}
