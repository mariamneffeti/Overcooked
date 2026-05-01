import type { Trend, ContextAlert } from "@/shared/types";

/**
 * Cross-correlation engine.
 * If a high-gravity tragedy/outrage trend is dominant, any happy/commercial trend
 * is flagged TOXIC and a critical context alert is emitted.
 */
export function computeContextAlerts(trends: Trend[]): ContextAlert[] {
  const dominantHeavy = trends
    .filter(t => (t.dominantEmotion === "sadness" || t.dominantEmotion === "outrage") && t.gravity >= 75)
    .sort((a, b) => b.gravity - a.gravity)[0];

  if (!dominantHeavy) return [];

  const conflicting = trends.filter(t =>
    t.id !== dominantHeavy.id &&
    (t.dominantEmotion === "humor" || t.category === "Music" || t.category === "Comedy" || t.category === "Lifestyle") &&
    t.velocity >= 50
  );

  return conflicting.map(t => ({
    id: `alert-${t.id}`,
    conflictingTrendId: t.id,
    dominantTrendId: dominantHeavy.id,
    riskLevel: dominantHeavy.gravity >= 90 ? "CRITICAL" : "HIGH",
    reason: `Cross-correlation: '${dominantHeavy.title}' (gravity ${dominantHeavy.gravity}, dominant ${dominantHeavy.dominantEmotion}) overshadows national mood.`,
    recommendation: `Pause posting about '${t.title}'. Estimated brand backlash risk: ${dominantHeavy.gravity >= 90 ? "CRITICAL" : "HIGH"}. Resume after ${dominantHeavy.gravity >= 90 ? "24h" : "12h"}.`,
  }));
}

/**
 * Generate a context-aware AI strategic brief.
 * Tone shifts based on dominant emotion (creative for humor, professional for outrage/sadness).
 */
export function generateStrategicBrief(trend: Trend, alerts: ContextAlert[]): string {
  const blocked = alerts.find(a => a.conflictingTrendId === trend.id);

  if (blocked) {
    return `⚠ STRATEGIC HOLD — DO NOT ENGAGE.

The signal "${trend.title}" is rising (velocity ${trend.velocity}%), but national sentiment is currently dominated by a high-gravity event. Activating commercial messaging now will read as tone-deaf and trigger measurable brand backlash.

Recommendation:
• Hold all paid amplification on ${trend.hashtag} for the next 12–24 hours.
• Mute scheduled creator drops; do not boost UGC remixes.
• Re-evaluate at next sentiment scan. The window will reopen once gravity drops below 60.

Risk Profile: ${blocked.riskLevel}.
Confidence: 92%.`;
  }

  if (trend.dominantEmotion === "humor") {
    return `▸ CREATIVE GREEN LIGHT — RIDE THE WAVE.

"${trend.title}" is in ${trend.phase} phase with velocity ${trend.velocity}%. The dominant tone is humor (${trend.emotionSplit[0].pct}%), and the trigger originates from ${trend.trigger.actor} on ${trend.trigger.source}.

Play the move:
• Drop a short-form remix within ${Math.floor(trend.actionWindowMinutes / 60)}h ${trend.actionWindowMinutes % 60}m — this is the closing window before saturation.
• Lean into self-aware, quick-cut formats; 9:16 vertical, captions in Tunisian Arabic + French.
• Activate 2–3 mid-tier creators (50k–250k) over a single mega-influencer for 3.4× engagement lift.
• Avoid English-first phrasing — this trend is hyperlocal.

Action Window: ${trend.actionWindowMinutes} min.
Confidence: 88%.`;
  }

  if (trend.dominantEmotion === "pride") {
    return `▸ STRATEGIC AMPLIFICATION — ALIGN WITH NATIONAL SENTIMENT.

"${trend.title}" carries strong pride signals (${trend.emotionSplit[0].pct}%) and is gaining velocity in ${trend.phase} phase. This is a unifying moment — the audience is receptive but discerning.

Play the move:
• Lead with authentic, Tunisia-first creative; flag/colors are appropriate but avoid clichés.
• Co-sign, don't dominate — share the spotlight with community voices.
• Time the drop to peak window (next ${Math.floor(trend.actionWindowMinutes / 60)}h).

Confidence: 84%.`;
  }

  if (trend.dominantEmotion === "outrage") {
    return `▸ DEFENSIVE POSTURE — DO NOT MONETIZE.

"${trend.title}" is driven by outrage (${trend.emotionSplit[0].pct}%) with high gravity (${trend.gravity}). Any commercial or playful association will be perceived as exploitation.

Strategic stance:
• Suspend all promoted content tagged adjacent to ${trend.hashtag}.
• If brand voice is required, opt for a measured, neutral acknowledgment — never a sales call.
• Monitor for de-escalation; re-evaluate when velocity drops below 40%.

Risk: HIGH brand-safety exposure.
Confidence: 91%.`;
  }

  if (trend.dominantEmotion === "sadness") {
    return `▸ RESTRAINT PROTOCOL — NATIONAL MOURNING ACTIVE.

"${trend.title}" registers dominant sadness (${trend.emotionSplit[0].pct}%) and gravity ${trend.gravity}. Brand engagement of any commercial nature is contraindicated.

Strategic stance:
• Pause all scheduled campaigns nationwide for ${trend.gravity >= 90 ? "24h minimum" : "12h"}.
• If a public statement is necessary, keep it brief, sincere, and unbranded.
• Resume operations only after sentiment scan confirms gravity below 50.

Confidence: 95%.`;
  }

  // curiosity
  return `▸ EXPLORATORY OPPORTUNITY — TEST AND LEARN.

"${trend.title}" is in ${trend.phase} phase, driven by curiosity (${trend.emotionSplit[0].pct}%). The audience is open but not yet committed.

Play the move:
• Run two creative variants in parallel (informational vs. cinematic) over the next ${Math.floor(trend.actionWindowMinutes / 60)}h.
• Geotarget the originating governorate first, then expand based on engagement signals.
• Budget cap at 30% of typical campaign spend until trajectory is confirmed.

Confidence: 79%.`;
}
