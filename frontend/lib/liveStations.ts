// The 4 stations confirmed by the team lead as the real, end-to-end live
// set (Java readings + trained Prophet forecasts). Every other station
// stays on mock data permanently by design — training/serving all-India
// live is out of scope; this small real set proves the pipeline works.
export const LIVE_STATION_IDS: string[] = ["2553", "2554", "2556", "3715"];

export function isLiveStation(stationId: string): boolean {
  return LIVE_STATION_IDS.includes(stationId);
}