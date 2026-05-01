import { useDecode } from "@/state/DecodeContext";
import { Clock, Zap, Target, Activity } from "lucide-react";
import { EMOTION_LABEL } from "@/ingestion/mockData";

function fmtCountdown(min: number) {
  if (min <= 0) return "00:00";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

export function ContextSidebar() {
  const { selectedTrend, trends, governorateById } = useDecode();
  const focus = selectedTrend ?? trends[0];
  const gov = governorateById(focus.governorateId);

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-3 p-4 border-r border-white/5">
      <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">CONTEXT VARIABLES</div>

      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono text-muted-foreground">ACTIVE SIGNAL</div>
            <div className="font-semibold text-sm leading-snug mt-0.5">{focus.title}</div>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 shrink-0">
            {focus.phase.toUpperCase()}
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-mono">{gov?.name} · {focus.hashtag}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Zap} label="VELOCITY" value={`${focus.velocity}%`} accent="cyan"/>
        <Stat icon={Target} label="GRAVITY" value={`${focus.gravity}`} accent={focus.gravity > 75 ? "magma" : "cyan"}/>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono text-muted-foreground">ACTION WINDOW</div>
          <Clock className="h-3.5 w-3.5 text-muted-foreground"/>
        </div>
        <div className={`font-mono text-3xl font-bold mt-1 tabular-nums ${focus.actionWindowMinutes === 0 ? "text-magma" : "text-foreground"}`}>
          {fmtCountdown(focus.actionWindowMinutes)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {focus.actionWindowMinutes === 0 ? "Window closed — restraint protocol" : "Until saturation"}
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono text-muted-foreground">DOMINANT EMOTION</div>
          <Activity className="h-3.5 w-3.5 text-muted-foreground"/>
        </div>
        <div className="text-sm font-semibold capitalize">{EMOTION_LABEL[focus.dominantEmotion]}</div>
        <div className="mt-2 space-y-1.5">
          {focus.emotionSplit.slice(0, 3).map(e => (
            <div key={e.emotion} className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-16 capitalize text-muted-foreground">{e.emotion}</span>
              <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${e.pct}%`, background: `hsl(var(--emo-${e.emotion}))` }}
                />
              </div>
              <span className="tabular-nums w-8 text-right">{e.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Clock; label: string; value: string; accent: "cyan" | "magma" }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${accent === "magma" ? "text-magma" : "text-primary"}`}/>
        <div className="text-[10px] font-mono text-muted-foreground">{label}</div>
      </div>
      <div className={`font-mono text-2xl font-bold mt-1 ${accent === "magma" ? "text-magma" : "text-primary"}`}>{value}</div>
    </div>
  );
}
