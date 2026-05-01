import { motion } from "framer-motion";
import type { Emotion, EmotionSplit } from "@/shared/types";
import { EMOTION_LABEL } from "@/ingestion/mockData";

const EMO_COLOR: Record<Emotion, string> = {
  humor: "hsl(var(--emo-humor))",
  outrage: "hsl(var(--emo-outrage))",
  sadness: "hsl(var(--emo-sadness))",
  pride: "hsl(var(--emo-pride))",
  curiosity: "hsl(var(--emo-curiosity))",
};

export function EmotionRing({ split, dominant, size = 220 }: { split: EmotionSplit[]; dominant: Emotion; size?: number; }) {
  const stroke = 14;
  const r = (size - stroke) / 2 - 6;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer rotating ring with glow */}
      <div
        className="absolute inset-0 rounded-full animate-spin-slow"
        style={{
          background: `conic-gradient(from 0deg, ${EMO_COLOR[dominant]}, transparent 30%, ${EMO_COLOR[dominant]} 60%, transparent 90%)`,
          filter: "blur(8px)",
          opacity: 0.5,
        }}
      />
      <svg width={size} height={size} className="relative">
        <defs>
          <filter id="emo-glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={c} cy={c} r={r} stroke="hsl(var(--border) / 0.6)" strokeWidth={stroke} fill="none"/>
        {split.map((s, i) => {
          const len = (s.pct / 100) * circumference;
          const seg = (
            <motion.circle
              key={s.emotion}
              cx={c}
              cy={c}
              r={r}
              stroke={EMO_COLOR[s.emotion]}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${len} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${c} ${c})`}
              filter={s.emotion === dominant ? "url(#emo-glow)" : undefined}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${len} ${circumference}` }}
              transition={{ duration: 0.9, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ opacity: s.emotion === dominant ? 1 : 0.55 }}
            />
          );
          offset += len + 4;
          return seg;
        })}
      </svg>

      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">DOMINANT</div>
          <div className="text-2xl font-bold capitalize mt-1" style={{ color: EMO_COLOR[dominant] }}>
            {dominant}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{split[0]?.pct}% resonance</div>
        </div>
      </div>
    </div>
  );
}

export function EmotionLegend({ split }: { split: EmotionSplit[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {split.map(s => (
        <div key={s.emotion} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: EMO_COLOR[s.emotion], boxShadow: `0 0 8px ${EMO_COLOR[s.emotion]}` }} />
          <span className="text-muted-foreground">{EMOTION_LABEL[s.emotion]}</span>
          <span className="ml-auto font-mono tabular-nums">{s.pct}%</span>
        </div>
      ))}
    </div>
  );
}
