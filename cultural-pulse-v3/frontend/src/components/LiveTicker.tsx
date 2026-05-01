import { useDecode } from "@/state/DecodeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Radio } from "lucide-react";

const sourceColor: Record<string, string> = {
  TikTok: "text-magma",
  X: "text-primary",
  Facebook: "text-emotion-sadness",
  Instagram: "text-emotion-pride",
  Google: "text-amber",
};

export function LiveTicker() {
  const { ticker } = useDecode();
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 glass-strong border-t border-white/10">
      <div className="flex items-center px-4 py-2.5 gap-4 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] tracking-[0.25em] text-muted-foreground">
          <Radio className="h-3.5 w-3.5 text-primary animate-pulse"/>
          LIVE FEED
          <span className="text-primary">●</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="flex gap-8 animate-[ticker_45s_linear_infinite]">
            {[...ticker, ...ticker].map((t, i) => (
              <div key={`${t.id}-${i}`} className="flex items-center gap-2 font-mono text-xs whitespace-nowrap">
                <span className="text-muted-foreground">{t.time}</span>
                <span className={`font-semibold ${sourceColor[t.source] ?? "text-foreground"}`}>{t.source}</span>
                <span className="text-foreground/80">{t.message}</span>
              </div>
            ))}
          </div>
        </div>
        <AnimatePresence>
          <motion.div
            key={ticker[0]?.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="shrink-0 font-mono text-[10px] text-muted-foreground"
          >
            +{ticker.length} events
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
