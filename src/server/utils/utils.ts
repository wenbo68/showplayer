// runs items in each batch together in a single bulk
export async function runItemsInEachBatchInBulk<T>(
  items: T[],
  batchSize: number,
  processFn: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
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
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processFn));
  }
}
