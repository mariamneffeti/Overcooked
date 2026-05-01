export type Emotion = "humor" | "outrage" | "sadness" | "pride" | "curiosity";
export type Phase = "Emerging" | "Rising" | "Peak" | "Declining";
export type SafetyVerdict = "SAFE" | "TOXIC" | "RESTRAINT";

export interface Governorate {
  id: string;       // ISO TN-XX
  name: string;     // Display name
  lat: number;
  lng: number;
}

export interface LifecyclePoint {
  t: string;        // hour label, e.g. "14:00"
  historical?: number;
  predicted?: number;
}

export interface EmotionSplit {
  emotion: Emotion;
  pct: number;     // 0-100
}

export interface Trend {
  id: string;
  title: string;
  hashtag: string;
  category: "Music" | "Politics" | "Sports" | "News" | "Comedy" | "Tragedy" | "Lifestyle";
  governorateId: string;
  velocity: number;       // 0-100, growth velocity %
  gravity: number;        // 0-100, emotional weight
  phase: Phase;
  dominantEmotion: Emotion;
  emotionSplit: EmotionSplit[];
  trigger: {
    source: string;       // "TikTok", "X", "Facebook"
    actor: string;        // who/what triggered
    description: string;
    detectedAt: string;   // ISO
  };
  lifecycle: LifecyclePoint[];
  searchVolume: number;
  reach: number;
  actionWindowMinutes: number; // minutes left to act
  safety: SafetyVerdict;
}

export interface SignalTick {
  id: string;
  time: string;
  source: "TikTok" | "X" | "Facebook" | "Instagram" | "Google";
  message: string;
  emotion: Emotion;
}

export interface ContextAlert {
  id: string;
  conflictingTrendId: string;  // the "happy" trend to avoid
  dominantTrendId: string;     // the high-gravity tragic trend
  riskLevel: "HIGH" | "CRITICAL";
  reason: string;
  recommendation: string;
}
