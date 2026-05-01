import { useDecode } from "@/state/DecodeContext";
import { motion } from "framer-motion";
import { Smile, Flame, CloudRain, Trophy, Sparkles, Filter } from "lucide-react";
import type { Emotion } from "@/shared/types";

const FILTERS: { key: Emotion | "all"; label: string; icon: typeof Filter }[] = [
  { key: "all", label: "All Signals", icon: Filter },
  { key: "humor", label: "Humor", icon: Smile },
  { key: "outrage", label: "Outrage", icon: Flame },
  { key: "sadness", label: "Mourning", icon: CloudRain },
  { key: "pride", label: "Pride", icon: Trophy },
  { key: "curiosity", label: "Curiosity", icon: Sparkles },
];

export function EmotionFilter() {
  const { emotionFilter, setEmotionFilter } = useDecode();
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 glass rounded-xl">
      {FILTERS.map(f => {
        const Icon = f.icon;
        const active = emotionFilter === f.key;
        return (
          <button
            key={f.key}
            onClick={() => setEmotionFilter(f.key)}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {active && (
              <motion.div
                layoutId="emo-filter"
                className="absolute inset-0 rounded-lg"
                style={{
                  background: f.key === "all"
                    ? "hsl(var(--primary) / 0.15)"
                    : `hsl(var(--emo-${f.key}) / 0.18)`,
                  border: `1px solid ${f.key === "all" ? "hsl(var(--primary) / 0.4)" : `hsl(var(--emo-${f.key}) / 0.5)`}`,
                }}
                transition={{ type: "spring", duration: 0.4 }}
              />
            )}
            <Icon className="h-3.5 w-3.5 relative z-10"/>
            <span className="relative z-10">{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}
