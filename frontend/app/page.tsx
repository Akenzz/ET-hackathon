"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { LocateFixed, Map as MapIcon, LayoutDashboard } from "lucide-react";
import Header from "@/components/Header";
import AqiLegend from "@/components/AqiLegend";
import StationPanel from "@/components/StationPanel";
import ChatWidget from "@/components/ChatWidget";
import ErrorNotice from "@/components/ErrorNotice";
import Dashboard from "@/components/Dashboard";
import { getStations, getLatestReading } from "@/lib/api";
import { findNearestStation, getBrowserLocation, INDIA_CENTER, INDIA_DEFAULT_ZOOM } from "@/lib/geo";
import { getStoredRole, storeRole, type UserRole } from "@/lib/role";
import { isLiveStation } from "@/lib/liveStations";
import type { Station, LatestReading } from "@/lib/types";

const AqiMap = dynamic(() => import("@/components/AqiMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-bg-elevated" />,
});

const STATION_ZOOM = 12;
const POLL_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 60_000;

type View = "dashboard" | "map";

export default function Home() {
  const [stations, setStations] = useState<Station[]>([]);
  const [readings, setReadings] = useState<Record<string, LatestReading>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingStations, setLoadingStations] = useState(true);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [staleReadings, setStaleReadings] = useState(false);

  const [mapCenter, setMapCenter] = useState<[number, number]>(INDIA_CENTER);
  const [mapZoom, setMapZoom] = useState(INDIA_DEFAULT_ZOOM);
  const [nearestDistanceKm, setNearestDistanceKm] = useState<number | null>(null);
  const [locating, setLocating] = useState(true);

  const [view, setView] = useState<View>("dashboard");
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    setRole(getStoredRole());
  }, []);

  function handleSelectRole(r: UserRole) {
    setRole(r);
    storeRole(r);
  }

  const refreshReadings = useCallback(async (stationList: Station[]) => {
    const entries = await Promise.all(
      stationList.map(async (s) => {
        try {
          return [s.station_id, await getLatestReading(s.station_id)] as const;
        } catch {
          return [s.station_id, undefined] as const;
        }
      })
    );
    const successCount = entries.filter(([, reading]) => reading).length;
    setReadings((prev) => {
      const next = { ...prev };
      for (const [id, reading] of entries) {
        if (reading) next[id] = reading;
      }
      return next;
    });
    setStaleReadings(successCount === 0 && stationList.length > 0);
    setLastUpdated(new Date());
  }, []);

  const locateNearest = useCallback(async (stationList: Station[]) => {
    setLocating(true);
    const pos = await getBrowserLocation();
    if (pos && stationList.length > 0) {
      const nearest = findNearestStation(pos.lat, pos.lon, stationList);
      if (nearest) {
        setMapCenter([nearest.station.lat, nearest.station.lon]);
        setMapZoom(STATION_ZOOM);
        setNearestDistanceKm(nearest.distanceKm);
      }
    } else {
      setMapCenter(INDIA_CENTER);
      setMapZoom(INDIA_DEFAULT_ZOOM);
      setNearestDistanceKm(null);
    }
    setLocating(false);
  }, []);

  const loadStations = useCallback(() => {
    setLoadingStations(true);
    setStationsError(null);
    getStations()
      .then(async (list) => {
        setStations(list);
        await refreshReadings(list);
        await locateNearest(list);
      })
      .catch(() => setStationsError("Couldn't load monitoring stations. Check the API connection and try again."))
      .finally(() => setLoadingStations(false));
  }, [refreshReadings, locateNearest]);

  useEffect(() => {
    loadStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stations.length === 0) return;
    const id = setInterval(() => refreshReadings(stations), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [stations, refreshReadings]);

  const selectedStation = useMemo(
    () => stations.find((s) => s.station_id === selectedId) ?? null,
    [stations, selectedId]
  );

  const liveStationCount = useMemo(
    () => stations.filter((s) => isLiveStation(s.station_id)).length,
    [stations]
  );

  function resetToIndiaView() {
    setMapCenter(INDIA_CENTER);
    setMapZoom(INDIA_DEFAULT_ZOOM);
    setSelectedId(null);
  }

  function handleExplore(stationId?: string) {
    if (stationId) {
      const s = stations.find((x) => x.station_id === stationId);
      if (s) {
        setSelectedId(stationId);
        setMapCenter([s.lat, s.lon]);
        setMapZoom(STATION_ZOOM);
      }
    }
    setView("map");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header lastUpdated={lastUpdated} liveStationCount={liveStationCount} totalStationCount={stations.length} />

      {view === "dashboard" ? (
        <Dashboard
          stations={stations}
          readings={readings}
          loading={loadingStations}
          role={role}
          onSelectRole={handleSelectRole}
          onExplore={handleExplore}
        />
      ) : (
        <>
          {staleReadings && (
            <div className="px-4 pt-3">
              <ErrorNotice
                message="Live readings haven't updated recently — showing the last known values."
                onRetry={() => refreshReadings(stations)}
                compact
              />
            </div>
          )}

          <main className="relative flex flex-1 overflow-hidden">
            <div className="relative flex-1">
              {loadingStations ? (
                <div className="flex h-full w-full items-center justify-center bg-bg-elevated">
                  <p className="text-sm text-fg-faint">Loading stations…</p>
                </div>
              ) : stationsError ? (
                <div className="flex h-full w-full items-center justify-center bg-bg-elevated p-6">
                  <div className="w-full max-w-sm">
                    <ErrorNotice message={stationsError} onRetry={loadStations} />
                  </div>
                </div>
              ) : (
                <AqiMap
                  stations={stations}
                  readings={readings}
                  selectedStationId={selectedId}
                  onSelectStation={setSelectedId}
                  center={mapCenter}
                  zoom={mapZoom}
                />
              )}

              <div className="pointer-events-none absolute bottom-4 left-4 z-500 flex items-end gap-3">
                <div className="pointer-events-auto">
                  <AqiLegend />
                </div>
              </div>

              <div className="pointer-events-none absolute right-4 top-4 z-500 flex flex-col items-end gap-2">
                {!locating && nearestDistanceKm !== null && (
                  <div className="pointer-events-auto rounded-lg border border-border bg-bg-elevated/90 px-3 py-1.5 text-[11px] text-fg-muted backdrop-blur-sm">
                    Nearest station: {nearestDistanceKm.toFixed(1)} km away
                  </div>
                )}
                <button
                  onClick={() => locateNearest(stations)}
                  disabled={locating || stations.length === 0}
                  className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated/90 px-3 py-1.5 text-[11px] text-fg-muted backdrop-blur-sm transition-colors hover:text-fg disabled:opacity-50"
                >
                  <LocateFixed size={12} />
                  {locating ? "Locating…" : "Locate me"}
                </button>
                <button
                  onClick={resetToIndiaView}
                  className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated/90 px-3 py-1.5 text-[11px] text-fg-muted backdrop-blur-sm transition-colors hover:text-fg"
                >
                  <MapIcon size={12} />
                  All-India view
                </button>
                <button
                  onClick={() => setView("dashboard")}
                  className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated/90 px-3 py-1.5 text-[11px] text-fg-muted backdrop-blur-sm transition-colors hover:text-fg"
                >
                  <LayoutDashboard size={12} />
                  Dashboard
                </button>
              </div>
            </div>

            {selectedStation && (
              <div className="w-95 shrink-0">
                <StationPanel
                  station={selectedStation}
                  reading={readings[selectedStation.station_id]}
                  role={role ?? "citizen"}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            )}
          </main>
        </>
      )}

      <ChatWidget stationId={selectedId} stationName={selectedStation?.name} />
    </div>
  );
}