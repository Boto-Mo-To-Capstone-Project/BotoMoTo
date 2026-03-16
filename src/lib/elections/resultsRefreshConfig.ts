export type ElectionResultsRefreshType = "polling" | "sse";

export interface ElectionResultsRefreshConfig {
  refreshType: ElectionResultsRefreshType;
  pollingSeconds: number;
}

const DEFAULT_REFRESH_TYPE: ElectionResultsRefreshType = "polling";
const DEFAULT_POLLING_SECONDS = 10;

export function getElectionResultsRefreshConfig(): ElectionResultsRefreshConfig {
  const rawRefreshType = (process.env.ELECTION_RESULTS_REFRESH_TYPE || DEFAULT_REFRESH_TYPE).toLowerCase();
  const refreshType: ElectionResultsRefreshType = rawRefreshType === "sse" ? "sse" : "polling";

  const parsedPollingSeconds = Number.parseInt(process.env.POLLING_SECONDS || "", 10);
  const pollingSeconds = Number.isFinite(parsedPollingSeconds) && parsedPollingSeconds > 0
    ? parsedPollingSeconds
    : DEFAULT_POLLING_SECONDS;

  return { refreshType, pollingSeconds };
}
