// Forecast model validation metrics — these live outside the per-request API
// contract (Section 0) on purpose. RMSE is a corpus-level number Person B
// computes once during validation (forecast vs a naive persistence baseline
// on a held-out week), not something that varies per station request.
//
// Set real values in .env.local once B has them:
//   NEXT_PUBLIC_FORECAST_RMSE=18.4
//   NEXT_PUBLIC_PERSISTENCE_RMSE=27.1
// Until then this reports itself as pending so the engineer view never shows
// a fabricated number as if it were real.

export interface ModelMetrics {
  forecastRmse: number | null;
  persistenceRmse: number | null;
  isPending: boolean;
}

export function getModelMetrics(): ModelMetrics {
  const forecastRmse = process.env.NEXT_PUBLIC_FORECAST_RMSE
    ? Number(process.env.NEXT_PUBLIC_FORECAST_RMSE)
    : null;
  const persistenceRmse = process.env.NEXT_PUBLIC_PERSISTENCE_RMSE
    ? Number(process.env.NEXT_PUBLIC_PERSISTENCE_RMSE)
    : null;
  return {
    forecastRmse,
    persistenceRmse,
    isPending: forecastRmse === null || persistenceRmse === null,
  };
}