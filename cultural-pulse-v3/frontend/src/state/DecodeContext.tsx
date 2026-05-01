import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { TRENDS, TRIGGER_TICKER_SEED, GOVERNORATES } from "@/ingestion/mockData";
import { computeContextAlerts } from "@/ai-core/strategist";
import type { Emotion, SignalTick, Trend, ContextAlert, Governorate } from "@/shared/types";

type Ctx = {
  trends: Trend[];
  governorates: Governorate[];
  selectedTrendId: string | null;
  setSelectedTrendId: (id: string | null) => void;
  emotionFilter: Emotion | "all";
  setEmotionFilter: (e: Emotion | "all") => void;
  ticker: SignalTick[];
  alerts: ContextAlert[];
  selectedTrend: Trend | null;
  governorateById: (id: string) => Governorate | undefined;
};

const DecodeContext = createContext<Ctx | null>(null);

const SOURCES: SignalTick["source"][] = ["TikTok", "X", "Facebook", "Instagram", "Google"];
const EMOTIONS: Emotion[] = ["humor", "outrage", "sadness", "pride", "curiosity"];

const SAMPLE_MESSAGES = [
  "Velocity surge detected on", "New cluster forming near", "Sentiment pivot on",
  "Reach +24% in last 5m on", "Cross-platform mirror of", "Creator amplification spike on",
];

export function DecodeProvider({ children }: { children: ReactNode }) {
  const [selectedTrendId, setSelectedTrendId] = useState<string | null>(null);
  const [emotionFilter, setEmotionFilter] = useState<Emotion | "all">("all");
  const [ticker, setTicker] = useState<SignalTick[]>(TRIGGER_TICKER_SEED);

  const alerts = useMemo(() => computeContextAlerts(TRENDS), []);

  // Mark conflicting trends as TOXIC based on alerts
  const trends = useMemo(() => {
    const toxicIds = new Set(alerts.map(a => a.conflictingTrendId));
    return TRENDS.map(t => ({
      ...t,
      safety: toxicIds.has(t.id) ? "TOXIC" : t.safety,
    })) as Trend[];
  }, [alerts]);

  const selectedTrend = useMemo(
    () => trends.find(t => t.id === selectedTrendId) ?? null,
    [trends, selectedTrendId]
  );

  // Simulated WebSocket: push a new tick every ~3.5s
  useEffect(() => {
    const interval = setInterval(() => {
      const trend = TRENDS[Math.floor(Math.random() * TRENDS.length)];
      const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];
      const msg = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];
      const now = new Date();
      const tick: SignalTick = {
        id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        time: `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`,
        source,
        message: `${msg} ${trend.hashtag}`,
        emotion: trend.dominantEmotion,
      };
      setTicker(prev => [tick, ...prev].slice(0, 24));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const governorateById = (id: string) => GOVERNORATES.find(g => g.id === id);

  return (
    <DecodeContext.Provider
      value={{
        trends,
        governorates: GOVERNORATES,
        selectedTrendId,
        setSelectedTrendId,
        emotionFilter,
        setEmotionFilter,
        ticker,
        alerts,
        selectedTrend,
        governorateById,
      }}
    >
      {children}
    </DecodeContext.Provider>
  );
}

export function useDecode() {
  const ctx = useContext(DecodeContext);
  if (!ctx) throw new Error("useDecode must be used within DecodeProvider");
  return ctx;
}
