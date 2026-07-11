"use client";

import { useMemo } from "react";
import MapGL, { Layer, Source } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { POI_FIXTURE_POINTS, TERRITORY_GEOJSON } from "@/lib/territory/fixtures";
import { riskCategoryMatchExpression } from "@/lib/territory/colors";
import type { TerritoryRecord } from "@/lib/territory/types";

const AFRICA_VIEW = {
  longitude: 20,
  latitude: 0,
  zoom: 2.6,
} as const;

export const DEFAULT_MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type PoiKey = "airports" | "health" | "places";

type PoiToggles = Readonly<Record<PoiKey, boolean>>;

type MapCanvasProps = Readonly<{
  territories: readonly TerritoryRecord[];
  filteredIds: ReadonlySet<string>;
  selectedId: string | null;
  poi: PoiToggles;
  onSelectTerritory: (id: string) => void;
}>;

export function MapCanvas({
  territories,
  filteredIds,
  selectedId,
  poi,
  onSelectTerritory,
}: MapCanvasProps) {
  const choropleth = useMemo(() => {
    const byId = new globalThis.Map(territories.map((t) => [t.id, t] as const));
    return {
      type: "FeatureCollection" as const,
      features: TERRITORY_GEOJSON.features.map((feature) => {
        const id = String(feature.properties.territoryId);
        const terr = byId.get(id);
        const matched = filteredIds.has(id);
        return {
          type: "Feature" as const,
          properties: {
            territoryId: id,
            label: String(feature.properties.label),
            riskCategory: terr?.riskCategory ?? String(feature.properties.riskCategory),
            selected: id === selectedId,
            matched,
          },
          geometry: feature.geometry,
        };
      }),
    };
  }, [territories, filteredIds, selectedId]);

  const poiData = useMemo(() => {
    const allowed = new Set<PoiKey>();
    if (poi.airports) {
      allowed.add("airports");
    }
    if (poi.health) {
      allowed.add("health");
    }
    if (poi.places) {
      allowed.add("places");
    }
    return {
      type: "FeatureCollection" as const,
      features: POI_FIXTURE_POINTS.features.filter((f) => {
        const layer = f.properties.layer;
        return layer === "airports" || layer === "health" || layer === "places"
          ? allowed.has(layer)
          : false;
      }),
    };
  }, [poi]);

  function handleClick(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    const rawProps = feature?.properties;
    if (!rawProps) {
      return;
    }
    const props = rawProps as Record<string, unknown>;
    if (props.matched !== true) {
      return;
    }
    const rawId = props.territoryId;
    if (typeof rawId === "string") {
      onSelectTerritory(rawId);
    }
  }

  return (
    <MapGL
      initialViewState={AFRICA_VIEW}
      mapStyle={DEFAULT_MAP_STYLE}
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={["territory-fill"]}
      onClick={handleClick}
      reuseMaps
    >
      <Source id="territories" type="geojson" data={choropleth}>
        <Layer
          id="territory-fill"
          type="fill"
          paint={{
            "fill-color": [
              "case",
              ["boolean", ["get", "matched"], false],
              riskCategoryMatchExpression(),
              "#3a3a3a",
            ] as never,
            "fill-opacity": ["case", ["boolean", ["get", "matched"], false], 0.65, 0.12] as never,
          }}
        />
        <Layer
          id="territory-outline"
          type="line"
          paint={{
            "line-color": "#ffffff",
            "line-width": ["case", ["boolean", ["get", "selected"], false], 2.5, 0.8],
          }}
        />
      </Source>
      <Source id="poi" type="geojson" data={poiData}>
        <Layer
          id="poi-circle"
          type="circle"
          paint={{
            "circle-radius": 5,
            "circle-color": "#f5f5f5",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#111111",
          }}
        />
      </Source>
    </MapGL>
  );
}
