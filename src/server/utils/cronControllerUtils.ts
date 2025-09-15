// This is a simple in-memory flag. It's shared across all requests
// because Node.js modules are cached and live for the lifetime of the server process.

let isStopRequested = false;

/**
 * Sets the flag to request a stop.
 */
export function requestCronStop() {
  console.log('[requestCronStop] Cron stop requested.');
  isStopRequested = true;
}

/**
 * Checks if a stop has been requested.
 */
export function isCronStopping(): boolean {
  return isStopRequested;
}

/**
 * Resets the flag, allowing the next cron job to run.
 */
export function resetCronStopFlag() {
  console.log('[resetCronStopFlag] Cron stop reset.');
  isStopRequested = false;
}
