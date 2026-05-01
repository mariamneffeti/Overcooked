import type { Governorate, Trend, SignalTick, Emotion, LifecyclePoint } from "@/shared/types";

// Approximate centroids for the 24 Tunisian governorates (lng, lat).
export const GOVERNORATES: Governorate[] = [
  { id: "TN-11", name: "Tunis",       lat: 36.8065, lng: 10.1815 },
  { id: "TN-12", name: "Ariana",      lat: 36.8625, lng: 10.1956 },
  { id: "TN-13", name: "Ben Arous",   lat: 36.7472, lng: 10.2280 },
  { id: "TN-14", name: "Manouba",     lat: 36.8101, lng: 10.0956 },
  { id: "TN-21", name: "Nabeul",      lat: 36.4513, lng: 10.7357 },
  { id: "TN-22", name: "Zaghouan",    lat: 36.4029, lng: 10.1429 },
  { id: "TN-23", name: "Bizerte",     lat: 37.2744, lng: 9.8739  },
  { id: "TN-31", name: "Béja",        lat: 36.7256, lng: 9.1817  },
  { id: "TN-32", name: "Jendouba",    lat: 36.5011, lng: 8.7803  },
  { id: "TN-33", name: "El Kef",      lat: 36.1742, lng: 8.7050  },
  { id: "TN-34", name: "Siliana",     lat: 36.0844, lng: 9.3708  },
  { id: "TN-41", name: "Kairouan",    lat: 35.6781, lng: 10.0963 },
  { id: "TN-42", name: "Kasserine",   lat: 35.1676, lng: 8.8365  },
  { id: "TN-43", name: "Sidi Bouzid", lat: 35.0382, lng: 9.4858  },
  { id: "TN-51", name: "Sousse",      lat: 35.8256, lng: 10.6411 },
  { id: "TN-52", name: "Monastir",    lat: 35.7780, lng: 10.8262 },
  { id: "TN-53", name: "Mahdia",      lat: 35.5047, lng: 11.0622 },
  { id: "TN-61", name: "Sfax",        lat: 34.7406, lng: 10.7603 },
  { id: "TN-71", name: "Gafsa",       lat: 34.4250, lng: 8.7842  },
  { id: "TN-72", name: "Tozeur",      lat: 33.9197, lng: 8.1335  },
  { id: "TN-73", name: "Kébili",      lat: 33.7044, lng: 8.9690  },
  { id: "TN-81", name: "Gabès",       lat: 33.8815, lng: 10.0982 },
  { id: "TN-82", name: "Médenine",    lat: 33.3548, lng: 10.5055 },
  { id: "TN-83", name: "Tataouine",   lat: 32.9297, lng: 10.4518 },
];

// Match GeoJSON shapeName -> our id (the geojson uses display names like "Tunis", "Kébili", etc.)
export const GEO_NAME_TO_ID: Record<string, string> = Object.fromEntries(
  GOVERNORATES.map(g => [g.name, g.id])
);

const hours = ["00:00","02:00","04:00","06:00","08:00","10:00","12:00","14:00","16:00","18:00","20:00","22:00"];

function mkLifecycle(peakAt: number, base: number, intensity: number, predict: boolean = true): LifecyclePoint[] {
  return hours.map((t, i) => {
    const h = base + intensity * Math.exp(-Math.pow((i - peakAt) / 2.2, 2));
    const noise = (Math.sin(i * 1.7) + 1) * 6;
    const point: LifecyclePoint = { t, historical: Math.round(h + noise) };
    if (predict && i >= peakAt - 1) {
      point.predicted = Math.round(h + noise + (i > peakAt ? 8 + i * 2 : 0));
    }
    return point;
  });
}

function emotionSplit(dominant: Emotion, dominantPct: number) {
  const others: Emotion[] = (["humor","outrage","sadness","pride","curiosity"] as Emotion[]).filter(e => e !== dominant);
  const remaining = 100 - dominantPct;
  const share = remaining / others.length;
  return [
    { emotion: dominant, pct: dominantPct },
    ...others.map((e, i) => ({ emotion: e, pct: Math.round(share + (i % 2 === 0 ? 2 : -2)) })),
  ];
}

export const TRENDS: Trend[] = [
  {
    id: "trend-songa",
    title: "Balti drops 'Yasmine' — viral chorus loop",
    hashtag: "#YasmineChallenge",
    category: "Music",
    governorateId: "TN-11",
    velocity: 87,
    gravity: 42,
    phase: "Rising",
    dominantEmotion: "humor",
    emotionSplit: emotionSplit("humor", 58),
    trigger: {
      source: "TikTok",
      actor: "@chedlimkd (1.2M followers)",
      description: "Creator posted a sketch lip-syncing the chorus; remixed 9.4k times in 6h.",
      detectedAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
    },
    lifecycle: mkLifecycle(7, 20, 75),
    searchVolume: 184_000,
    reach: 3_400_000,
    actionWindowMinutes: 210,
    safety: "TOXIC", // gets flagged due to cross-correlation with tragedy trend
  },
  {
    id: "trend-accident",
    title: "Tragic Sfax–Gabès highway accident, 7 victims",
    hashtag: "#GabèsAccident",
    category: "Tragedy",
    governorateId: "TN-61",
    velocity: 94,
    gravity: 96,
    phase: "Peak",
    dominantEmotion: "sadness",
    emotionSplit: emotionSplit("sadness", 64),
    trigger: {
      source: "X",
      actor: "Mosaïque FM (verified)",
      description: "Breaking thread shared 28k times. National mourning sentiment dominant.",
      detectedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    },
    lifecycle: mkLifecycle(8, 30, 92),
    searchVolume: 412_000,
    reach: 6_800_000,
    actionWindowMinutes: 0,
    safety: "RESTRAINT",
  },
  {
    id: "trend-cab",
    title: "Eagles of Carthage qualify — fan euphoria",
    hashtag: "#DimaTounes",
    category: "Sports",
    governorateId: "TN-13",
    velocity: 71,
    gravity: 55,
    phase: "Rising",
    dominantEmotion: "pride",
    emotionSplit: emotionSplit("pride", 61),
    trigger: {
      source: "Facebook",
      actor: "FTF official page",
      description: "Last-minute goal clip resurfaced; 240k shares within 2 hours.",
      detectedAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
    },
    lifecycle: mkLifecycle(9, 22, 60),
    searchVolume: 96_000,
    reach: 1_900_000,
    actionWindowMinutes: 320,
    safety: "SAFE",
  },
  {
    id: "trend-fuel",
    title: "Fuel price hike rumor sparks anger",
    hashtag: "#TunisieRevolte",
    category: "Politics",
    governorateId: "TN-42",
    velocity: 78,
    gravity: 81,
    phase: "Rising",
    dominantEmotion: "outrage",
    emotionSplit: emotionSplit("outrage", 67),
    trigger: {
      source: "X",
      actor: "Anonymous leaked memo",
      description: "Screenshot of alleged ministry note; 14k retweets, hostile sentiment.",
      detectedAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
    },
    lifecycle: mkLifecycle(8, 18, 68),
    searchVolume: 142_000,
    reach: 2_600_000,
    actionWindowMinutes: 95,
    safety: "TOXIC",
  },
  {
    id: "trend-djerba",
    title: "Djerba sunset reels trend across Maghreb",
    hashtag: "#DjerbaGoldenHour",
    category: "Lifestyle",
    governorateId: "TN-82",
    velocity: 52,
    gravity: 28,
    phase: "Rising",
    dominantEmotion: "curiosity",
    emotionSplit: emotionSplit("curiosity", 49),
    trigger: {
      source: "Instagram",
      actor: "@discovertunisia (510k)",
      description: "Reel pinned to Explore in 4 MENA countries simultaneously.",
      detectedAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
    },
    lifecycle: mkLifecycle(6, 14, 42),
    searchVolume: 58_000,
    reach: 1_100_000,
    actionWindowMinutes: 480,
    safety: "SAFE",
  },
  {
    id: "trend-comedy",
    title: "Lotfi Abdelli stand-up clip reignites",
    hashtag: "#AbdelliMood",
    category: "Comedy",
    governorateId: "TN-51",
    velocity: 64,
    gravity: 35,
    phase: "Rising",
    dominantEmotion: "humor",
    emotionSplit: emotionSplit("humor", 55),
    trigger: {
      source: "TikTok",
      actor: "Compilation account @tnlaughs",
      description: "5-year-old joke recut with subtitles, hit 2.1M views overnight.",
      detectedAt: new Date(Date.now() - 7 * 3600_000).toISOString(),
    },
    lifecycle: mkLifecycle(7, 16, 50),
    searchVolume: 73_000,
    reach: 1_400_000,
    actionWindowMinutes: 260,
    safety: "TOXIC",
  },
  {
    id: "trend-kairouan",
    title: "Kairouan heritage week launches",
    hashtag: "#KairouanWeek",
    category: "News",
    governorateId: "TN-41",
    velocity: 41,
    gravity: 30,
    phase: "Emerging",
    dominantEmotion: "pride",
    emotionSplit: emotionSplit("pride", 52),
    trigger: {
      source: "Facebook",
      actor: "Ministry of Culture",
      description: "Official launch event reshared by 38 cultural pages.",
      detectedAt: new Date(Date.now() - 12 * 3600_000).toISOString(),
    },
    lifecycle: mkLifecycle(5, 10, 35),
    searchVolume: 21_000,
    reach: 380_000,
    actionWindowMinutes: 540,
    safety: "SAFE",
  },
  {
    id: "trend-bizerte",
    title: "Bizerte port strike disrupts shipping",
    hashtag: "#BizertePort",
    category: "News",
    governorateId: "TN-23",
    velocity: 58,
    gravity: 62,
    phase: "Rising",
    dominantEmotion: "outrage",
    emotionSplit: emotionSplit("outrage", 51),
    trigger: {
      source: "X",
      actor: "Reuters MENA bureau",
      description: "Wire story picked up by 14 local outlets within 90 minutes.",
      detectedAt: new Date(Date.now() - 9 * 3600_000).toISOString(),
    },
    lifecycle: mkLifecycle(7, 12, 48),
    searchVolume: 64_000,
    reach: 920_000,
    actionWindowMinutes: 180,
    safety: "RESTRAINT",
  },
];

export const TRIGGER_TICKER_SEED: SignalTick[] = [
  { id: "s1", time: "14:02", source: "TikTok", message: "@chedlimkd remix passes 1M views", emotion: "humor" },
  { id: "s2", time: "14:03", source: "X", message: "Mosaïque FM thread now 28k shares", emotion: "sadness" },
  { id: "s3", time: "14:04", source: "Google", message: "+312% search 'Gabès accident'", emotion: "sadness" },
  { id: "s4", time: "14:05", source: "Facebook", message: "FTF post hits 240k reactions", emotion: "pride" },
  { id: "s5", time: "14:06", source: "X", message: "#TunisieRevolte trending #2", emotion: "outrage" },
  { id: "s6", time: "14:07", source: "Instagram", message: "Djerba reel cross-posted by 12 hubs", emotion: "curiosity" },
  { id: "s7", time: "14:08", source: "TikTok", message: "Abdelli compilation: +480k views/h", emotion: "humor" },
  { id: "s8", time: "14:09", source: "X", message: "Bizerte port keyword cluster +88%", emotion: "outrage" },
];

export const EMOTION_LABEL: Record<Emotion, string> = {
  humor: "Humor", outrage: "Outrage", sadness: "Sadness / Mourning", pride: "Pride", curiosity: "Curiosity",
};

export const EMOTION_HSL: Record<Emotion, string> = {
  humor: "var(--emo-humor)",
  outrage: "var(--emo-outrage)",
  sadness: "var(--emo-sadness)",
  pride: "var(--emo-pride)",
  curiosity: "var(--emo-curiosity)",
};
