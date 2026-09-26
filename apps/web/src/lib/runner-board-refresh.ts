/** Ask the open runner workspace to show Available and reload the board. */
export const RUNNER_BOARD_REFRESH_EVENT = "gracerun-refresh-available-board";

export function requestRunnerBoardRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RUNNER_BOARD_REFRESH_EVENT));
}
