import { isCronStopping } from './cronControllerUtils';

// runs items in each batch together in a single bulk
export async function runItemsInEachBatchInBulk<T>(
  items: T[],
  batchSize: number,
  processFn: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    if (isCronStopping()) {
      console.log(`[runItemsInEachBatchInBulk] ======= Stopped =======`);
      return; // Exit the function
    }
    const batch = items.slice(i, i + batchSize);
    console.log(
      `[runItemsInEachBatchInBulk] progress: ${i + batch.length}/${
        items.length
      }`
    );
    await processFn(batch);
  }
  // console.log('Finished processing all batches.');
}

// runs items in each batch concurrently
export async function runItemsInEachBatchConcurrently<T>(
  items: T[],
  batchSize: number,
  processFn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    if (isCronStopping()) {
      console.log(`[runItemsInEachBatchConcurrently] ======= Stopped =======.`);
      return; // Exit the function
    }
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processFn));
  }
}

/**
 * A helper function to check if a string contains only standard Latin/ASCII characters.
 * This is effective at filtering out titles in scripts like Cyrillic, Japanese, Korean, etc.
 * @param text The string to test.
 * @returns `true` if the string is likely Latin-based, `false` otherwise.
 */
export function isLatinBased(text: string | undefined | null): boolean {
  if (!text) return true; // Assume empty or null titles are acceptable
  // This regex tests for any characters NOT in the standard ASCII range.
  // If it finds such a character, .test() is true, so we invert it to return false.
  return !/[^\x00-\x7F]/.test(text);
}

/**
 * A wrapper that executes an async job function only if a stop has not been requested.
 * It handles the repetitive logging, error catching, and cancellation checks.
 * @param name The name of the job for logging purposes.
 * @param jobFn The async function to execute.
 * @returns boolean indicating if the sequence should continue.
 */
export async function runCancellableJob(
  name: string,
  jobFn: () => Promise<any>
): Promise<boolean> {
  // 1. Check the stop flag BEFORE starting the job.
  if (isCronStopping()) {
    console.log(`======= ======= Stopped =======. SKIPPING: ${name} =======`);
    return false; // Signal to stop the sequence
  }

  console.log(`======= Starting: ${name} =======`);
  try {
    await jobFn();
  } catch (error) {
    console.error(`[runCron] Step '${name}' failed. Error: `, error);
  }

  // Return true to signal that the main sequence can continue.
  return true;
}
