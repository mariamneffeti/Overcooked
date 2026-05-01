import { useDecode } from "@/state/DecodeContext";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, TrendingUp, MapPin, Clock, Search, Users, Zap } from "lucide-react";
import { SignalLifecycle } from "@/components/SignalLifecycle";
import { EmotionRing, EmotionLegend } from "@/components/EmotionRing";

export default function Intelligence() {
  const { selectedTrend, trends, setSelectedTrendId, governorateById, alerts } = useDecode();
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedTrend) setSelectedTrendId(trends[0].id);
  }, [selectedTrend, trends, setSelectedTrendId]);

  const t = selectedTrend ?? trends[0];
  const gov = governorateById(t.governorateId);
  const blocked = alerts.find(a => a.conflictingTrendId === t.id);

  return (
    <div className="flex-1 p-4 pb-24 space-y-4">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4"/> Back to Radar
      </button>

      <motion.div layoutId={`pin-${t.id}`} className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-50" style={{ background: "var(--gradient-radial)" }}/>
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-start">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                {t.category.toUpperCase()}
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3"/> {gov?.name}
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                {t.phase.toUpperCase()}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-2 leading-tight">{t.title}</h1>
            <div className="font-mono text-sm text-primary mt-1">{t.hashtag}</div>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:min-w-[300px]">
            <Stat label="VELOCITY" value={`${t.velocity}%`} accent="cyan" icon={Zap}/>
            <Stat label="GRAVITY" value={`${t.gravity}`} accent={t.gravity > 75 ? "magma" : "cyan"} icon={TrendingUp}/>
            <Stat label="REACH" value={fmtNum(t.reach)} accent="cyan" icon={Eye}/>
          </div>
        </div>

        {blocked && (
          <div className="relative mt-4 p-4 rounded-xl border border-magma/40 bg-magma/10 flex items-start gap-3">
            <div className="h-8 w-8 rounded-md bg-magma/20 grid place-items-center shrink-0">
              <Clock className="h-4 w-4 text-magma"/>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-magma">CRITICAL CONTEXT ALERT · {blocked.riskLevel}</div>
              <div className="font-semibold mt-1">Strategic hold recommended on this signal.</div>
              <p className="text-sm text-muted-foreground mt-1">{blocked.reason}</p>
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <SectionHeader title="Trigger Analysis" subtitle="// origin_attribution"/>
            <div className="grid sm:grid-cols-[auto_1fr] gap-4 mt-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/30 grid place-items-center font-mono text-xs text-primary">
                {t.trigger.source.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-sm">Source: <span className="text-primary font-mono">{t.trigger.source}</span></div>
                <div className="text-sm text-muted-foreground">Actor: {t.trigger.actor}</div>
                <p className="text-sm mt-2 leading-relaxed">{t.trigger.description}</p>
                <div className="font-mono text-[10px] text-muted-foreground mt-2">
                  Detected {new Date(t.trigger.detectedAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
              <MiniStat icon={Search} label="Searches" value={fmtNum(t.searchVolume)}/>
              <MiniStat icon={Users} label="Reach" value={fmtNum(t.reach)}/>
              <MiniStat icon={Clock} label="Window" value={`${Math.floor(t.actionWindowMinutes/60)}h ${t.actionWindowMinutes%60}m`}/>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <SectionHeader title="Signal Lifecycle" subtitle="// historical_vs_predicted"/>
              <div className="flex items-center gap-3 font-mono text-[10px]">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary"/> Historical</div>
                <div className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-magma"/> AI Predicted</div>
              </div>
            </div>
            <div className="mt-4">
              <SignalLifecycle data={t.lifecycle}/>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 flex flex-col items-center">
          <SectionHeader title="Emotional Resonance" subtitle="// sentiment_decomposition"/>
          <div className="my-6">
            <EmotionRing split={t.emotionSplit} dominant={t.dominantEmotion} size={240}/>
          </div>
          <div className="w-full">
            <EmotionLegend split={t.emotionSplit}/>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground mr-2">Switch signal:</span>
        {trends.map(other => (
          <button
            key={other.id}
            onClick={() => setSelectedTrendId(other.id)}
            className={`font-mono text-[10px] px-2.5 py-1 rounded-md border transition-colors ${
              other.id === t.id
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:border-white/20"
            }`}
          >
            {other.hashtag}
          </button>
        ))}
      </div>
    </div>
  );
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n/1_000).toFixed(1)}k`;
  return `${n}`;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">{subtitle}</div>
      <h2 className="text-lg font-semibold mt-0.5">{title}</h2>
    </div>
  );
}

function Stat({ label, value, accent, icon: Icon }: { label: string; value: string; accent: "cyan" | "magma"; icon: typeof Eye }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${accent === "magma" ? "text-magma" : "text-primary"}`}/>
        <div className="font-mono text-[10px] text-muted-foreground">{label}</div>
      </div>
      <div className={`font-mono text-2xl font-bold mt-1 ${accent === "magma" ? "text-magma" : "text-primary"}`}>{value}</div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3"/>
        <div className="font-mono text-[10px]">{label}</div>
      </div>
      <div className="font-mono text-base font-semibold mt-0.5">{value}</div>
    </div>
  );
}
