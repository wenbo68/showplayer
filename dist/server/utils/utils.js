// runs items in each batch together in a single bulk
export async function runItemsInEachBatchInBulk(items, batchSize, processFn) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        console.log(`[runItemsInEachBatchInBulk] progress: ${i + batch.length}/${items.length}`);
        await processFn(batch);
    }
    // console.log('Finished processing all batches.');
}
// runs items in each batch concurrently
export async function runItemsInEachBatchConcurrently(items, batchSize, processFn) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(processFn));
    }
}
