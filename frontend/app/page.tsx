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
import MapErrorBoundary from "@/components/MapErrorBoundary";
import IntroWalkthrough from "@/components/IntroWalkthrough";
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
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
  const [nearestDistanceKm, setNearestDistanceKm] = useState<number | null>(null);
  const [locating, setLocating] = useState(true);

  const [view, setView] = useState<View>("dashboard");
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRole(getStoredRole());
      setRoleChecked(true);
    }, 0);

    return () => window.clearTimeout(timer);
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
    void (async () => {
      await Promise.resolve();
      setLoadingStations(true);
      setStationsError(null);
      try {
        const list = await getStations();
        setStations(list);
        await refreshReadings(list);
        await locateNearest(list);
      } catch {
        setStationsError("Couldn't load monitoring stations. Check the API connection and try again.");
      } finally {
        setLoadingStations(false);
      }
    })();
  }, [refreshReadings, locateNearest]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

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

          <main className="grid flex-1 gap-4 overflow-hidden px-4 py-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-6">
            <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-3xl border border-border/80 bg-bg-elevated/75 p-4 shadow-xl backdrop-blur-xl">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">Operations panel</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-fg">
                  {selectedStation ? selectedStation.name : "Map view"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-fg-faint">
                  {selectedStation
                    ? "The right panel is now anchored to station detail for the selected location."
                    : "The right panel is reserved for the live map until you pick a station."}
                </p>
              </div>

              {!locating && nearestDistanceKm !== null && (
                <div className="rounded-2xl border border-border/80 bg-bg-elevated-2/70 px-3 py-3 text-sm text-fg-muted">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">Nearest station</p>
                  <p className="font-data-readout mt-1 text-base text-fg">{nearestDistanceKm.toFixed(1)} km away</p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => locateNearest(stations)}
                  disabled={locating || stations.length === 0}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-bg-elevated-2 px-3 py-2.5 text-[11px] text-fg-muted transition-colors hover:border-teal/40 hover:text-fg disabled:opacity-50"
                >
                  <LocateFixed size={12} />
                  {locating ? "Locating…" : "Locate me"}
                </button>
                <button
                  onClick={resetToIndiaView}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-bg-elevated-2 px-3 py-2.5 text-[11px] text-fg-muted transition-colors hover:border-teal/40 hover:text-fg"
                >
                  <MapIcon size={12} />
                  All-India view
                </button>
                <button
                  onClick={() => setView("dashboard")}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-bg-elevated-2 px-3 py-2.5 text-[11px] text-fg-muted transition-colors hover:border-teal/40 hover:text-fg"
                >
                  <LayoutDashboard size={12} />
                  Dashboard
                </button>
              </div>

              <div className="rounded-2xl border border-border/80 bg-bg-elevated-2/70 p-3">
                <AqiLegend />
              </div>

              {staleReadings && (
                <ErrorNotice
                  message="Live readings haven't updated recently — showing the last known values."
                  onRetry={() => refreshReadings(stations)}
                  compact
                />
              )}
            </aside>

            {/* Map now stays mounted regardless of selection — the station
                panel docks on top of it as an overlay instead of replacing
                it, so context (position, other markers) is never lost. */}
            <section className="relative min-h-0 overflow-hidden rounded-3xl border border-border/80 bg-bg-elevated/70 shadow-2xl backdrop-blur-xl">
              {loadingStations ? (
                <div className="flex h-full min-h-[28rem] w-full items-center justify-center bg-bg-elevated">
                  <p className="text-sm text-fg-faint">Loading stations…</p>
                </div>
              ) : stationsError ? (
                <div className="flex h-full min-h-[28rem] w-full items-center justify-center bg-bg-elevated p-6">
                  <div className="w-full max-w-sm">
                    <ErrorNotice message={stationsError} onRetry={loadStations} />
                  </div>
                </div>
              ) : (
                <div className="relative h-full min-h-[28rem] w-full">
                  {/* Map stays mounted (state preserved) but is visually
                      hidden while a station is selected, so switching back
                      is instant with no re-fetch/reflow. */}
                  <div className={(selectedStation ? "invisible " : "") + "h-full w-full"}>
                    <MapErrorBoundary
                      key={mapInstanceKey}
                      onError={() => setMapInstanceKey((k) => k + 1)}
                    >
                      <AqiMap
                        stations={stations}
                        readings={readings}
                        selectedStationId={selectedId}
                        onSelectStation={setSelectedId}
                        center={mapCenter}
                        zoom={mapZoom}
                      />
                    </MapErrorBoundary>
                  </div>

                  {!selectedStation && (
                    <div className="pointer-events-none absolute right-4 top-4 z-500 flex flex-col items-end gap-2">
                      <div className="pointer-events-auto rounded-full border border-border/80 bg-bg-elevated/90 px-3 py-1.5 text-[11px] text-fg-muted backdrop-blur-xl shadow-lg">
                        Map ready
                      </div>
                    </div>
                  )}

                  {selectedStation && (
                    <div className="absolute inset-0 z-500">
                      <StationPanel
                        key={selectedStation.station_id}
                        station={selectedStation}
                        reading={readings[selectedStation.station_id]}
                        role={role ?? "citizen"}
                        onClose={() => setSelectedId(null)}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          </main>
        </>
      )}

      <ChatWidget
        key={selectedId ?? "no-station"}
        stationId={selectedId}
        stationName={selectedStation?.name}
      />
      {roleChecked && !role && (
        <IntroWalkthrough onComplete={(r) => handleSelectRole(r)} />
      )}
    </div>
  );
}