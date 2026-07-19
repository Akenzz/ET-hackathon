"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Station, LatestReading } from "@/lib/types";
import { getAqiColor } from "@/lib/aqi";

interface AqiMapProps {
  stations: Station[];
  readings: Record<string, LatestReading>;
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
  center: [number, number];
  zoom: number;
}

// Resolved hex equivalents of the theme tokens — SVG presentation
// attributes (stroke/fill set by Leaflet) can't resolve CSS custom
// properties, so these must be literal values, not var(--x).
const COLOR_CYAN = "#27E6EC";
const COLOR_NO_DATA = "#7FA6BE"; // --sky, used as the "no reading yet" stroke/fill

// Recenters/zooms the map whenever `center`/`zoom` change (e.g. once
// geolocation resolves, or the user hits "reset to India view") without
// remounting the whole map.
function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);
  return null;
}

export default function AqiMap({
  stations, readings, selectedStationId, onSelectStation, center, zoom,
}: AqiMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      style={{ background: "var(--navy)" }}
    >
      <TileLayer
        className="map-dark-tiles"
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo center={center} zoom={zoom} />
      <ZoomControl position="bottomright" />

      <MarkerClusterGroup chunkedLoading maxClusterRadius={50} spiderfyOnMaxZoom>
        {stations.map((station) => {
          const reading = readings[station.station_id];
          const hasReading = !!reading;
          const color = hasReading ? getAqiColor(reading.aqi) : COLOR_NO_DATA;
          const isSelected = station.station_id === selectedStationId;

          return (
            <CircleMarker
              key={station.station_id}
              center={[station.lat, station.lon]}
              radius={isSelected ? 14 : 9}
              pathOptions={{
                color: isSelected ? COLOR_CYAN : color,
                weight: isSelected ? 3 : 1.5,
                fillColor: color,
                fillOpacity: hasReading ? 0.85 : 0.25, // hollow-ish look for "no data" so it doesn't read as a real band
                dashArray: hasReading ? undefined : "3,3",
                className: isSelected ? "aqi-marker-selected" : undefined,
              }}
              eventHandlers={{ click: () => onSelectStation(station.station_id) }}
            >
              <Tooltip
                direction="top"
                offset={[0, -8]}
                opacity={1}
                className="!rounded-xl !border !border-border/70 !bg-bg-elevated-2 !text-fg !font-data-readout !text-xs !px-2.5 !py-1.5"
              >
                <span className="font-semibold">{station.name}</span>
                {" — " + station.city}
                {hasReading ? " · AQI " + reading.aqi : " · no data"}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}