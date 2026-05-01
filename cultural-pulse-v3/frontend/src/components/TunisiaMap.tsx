import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { motion } from "framer-motion";
import { useDecode } from "@/state/DecodeContext";
import { GEO_NAME_TO_ID } from "@/ingestion/mockData";
import type { Trend } from "@/shared/types";
import { useNavigate } from "react-router-dom";

const GEO_URL = "/data/tunisia-governorates.geojson";

function pinColor(t: Trend) {
  if (t.safety === "TOXIC") return "hsl(var(--magma))";
  if (t.safety === "RESTRAINT") return "hsl(var(--amber))";
  return "hsl(var(--primary))";
}

export function TunisiaMap() {
  const { trends, emotionFilter, setSelectedTrendId, selectedTrendId } = useDecode();
  const navigate = useNavigate();

  const visibleTrends = emotionFilter === "all"
    ? trends
    : trends.filter(t => t.dominantEmotion === emotionFilter);
  const highlightGovs = new Set(visibleTrends.map(t => t.governorateId));

  return (
    <div className="relative w-full h-full grid-bg rounded-2xl overflow-hidden glass">
      {/* Atmospheric overlays */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background)/0.7)_100%)]" />
      <div className="absolute top-4 left-4 z-10 font-mono text-[10px] tracking-[0.3em] text-muted-foreground">
        TUNISIA · 24 GOVERNORATES · LIVE
      </div>
      <div className="absolute top-4 right-4 z-10 font-mono text-[10px] text-muted-foreground flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"/>
        SCANNING
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [9.5, 34.4], scale: 2800 }}
        width={800}
        height={700}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const name = geo.properties.shapeName as string;
              const govId = GEO_NAME_TO_ID[name];
              const highlighted = !govId || highlightGovs.has(govId);
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: {
                      fill: highlighted ? "hsl(var(--surface-elevated))" : "hsl(var(--surface) / 0.4)",
                      stroke: "hsl(var(--primary) / 0.35)",
                      strokeWidth: 0.6,
                      outline: "none",
                      transition: "all 0.4s",
                    },
                    hover: {
                      fill: "hsl(var(--primary) / 0.12)",
                      stroke: "hsl(var(--primary))",
                      strokeWidth: 1,
                      outline: "none",
                    },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Pins as absolutely-positioned overlays using approximate centroids.
          We place them via percentage based on the projection bbox: lng 7.5–11.6, lat 30.2–37.6. */}
      <div className="absolute inset-0 pointer-events-none">
        {visibleTrends.map(t => {
          const g = lookupGov(t.governorateId);
          const lat = g?.lat ?? 0;
          const lng = g?.lng ?? 0;
          // Match the projection bounds (geoMercator center [9.5, 34.4], scale 2800, 800x700).
          // We compute approximate pixel positions inline to align with the SVG.
          const pos = projectApprox(lng, lat);
          const isSel = selectedTrendId === t.id;
          return (
            <motion.button
              key={t.id}
              layoutId={`pin-${t.id}`}
              onClick={() => {
                setSelectedTrendId(t.id);
                navigate("/intelligence");
              }}
              className="absolute pointer-events-auto group"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -100%)" }}
              whileHover={{ scale: 1.15 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full animate-pulse-ring"
                  style={{ background: pinColor(t), opacity: 0.5 }}
                />
                <div
                  className="relative h-3 w-3 rounded-full border-2 border-background"
                  style={{
                    background: pinColor(t),
                    boxShadow: `0 0 12px ${pinColor(t)}, 0 0 24px ${pinColor(t)}`,
                  }}
                />
                <div
                  className={`absolute left-1/2 -translate-x-1/2 -translate-y-2 -top-2 -mt-1 whitespace-nowrap font-mono text-[10px] px-2 py-1 rounded-md glass-strong opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                    isSel ? "opacity-100" : ""
                  }`}
                >
                  <div className="font-semibold text-foreground">{t.hashtag}</div>
                  <div className="text-muted-foreground">v {t.velocity}% · g {t.gravity}</div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

import { GOVERNORATES } from "@/ingestion/mockData";
function lookupGov(id: string) {
  return GOVERNORATES.find(g => g.id === id);
}

// Project (lng,lat) into a percentage of the SVG box.
// The geoMercator with center [9.5, 34.4] and scale 2800 in an 800x700 box maps
// approximately: lng 7.5 -> 5%, lng 11.6 -> 95%; lat 30.2 -> 95%, lat 37.6 -> 5%.
// This linear approximation is good enough for pin placement on a country map.
function projectApprox(lng: number, lat: number) {
  const x = ((lng - 7.5) / (11.6 - 7.5)) * 90 + 5;
  const y = ((37.6 - lat) / (37.6 - 30.2)) * 90 + 5;
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
}
