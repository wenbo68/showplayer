// Entry point for the daily maintenance job, run by GitHub Actions
// (see .github/workflows/daily-cron.yml) or locally with `pnpm cron [job] [tmdbListLimit]`.
//
// Jobs:
//   all              full daily sequence (default)
//   userSubmissions  process pending user submissions + refresh denorm fields
//   <step name>      run a single step: changedMedia | popularity | ratings | tmdbLists | submissions | denorm

import {
  populateMediaUsingTmdbLists,
  processUserSubmissions,
  updateAllChangedMedia,
  updateAllPopularity,
  updateDenormFieldsForMediaList,
  updateRatings,
} from '~/server/utils/cronUtils';
import { requestCronStop } from '~/server/utils/cronControllerUtils';

type Step = { name: string; fn: () => Promise<unknown> };

const DEFAULT_TMDB_LIST_LIMIT = 50;

const steps = (tmdbListLimit: number): Record<string, Step> => ({
  changedMedia: { name: 'update changed media', fn: updateAllChangedMedia },
  popularity: { name: 'update popularity', fn: updateAllPopularity },
  ratings: { name: 'update ratings', fn: updateRatings },
  submissions: { name: 'process user submissions', fn: processUserSubmissions },
  tmdbLists: {
    name: 'fetch tmdb lists',
    fn: () => populateMediaUsingTmdbLists(tmdbListLimit),
  },
  denorm: {
    name: 'update denorm fields',
    fn: () => updateDenormFieldsForMediaList('all'),
  },
});

const sequences: Record<string, string[]> = {
  all: ['changedMedia', 'popularity', 'ratings', 'tmdbLists', 'denorm'],
  userSubmissions: ['submissions', 'denorm'],
};

function resolveSteps(job: string, tmdbListLimit: number): Step[] {
  const table = steps(tmdbListLimit);
  const keys = sequences[job] ?? (table[job] ? [job] : undefined);
  if (!keys) {
    throw new Error(
      `Unknown job "${job}". Use one of: ${[
        ...Object.keys(sequences),
        ...Object.keys(table),
      ].join(', ')}`
    );
  }
  return keys.map((k) => table[k]!);
}

async function main() {
  const job = process.argv[2] ?? 'all';
  const tmdbListLimit = Number(process.argv[3] ?? DEFAULT_TMDB_LIST_LIMIT);
  if (!Number.isInteger(tmdbListLimit) || tmdbListLimit < 1) {
    throw new Error(`tmdbListLimit must be a positive integer, got "${process.argv[3]}"`);
  }

  // A cancelled GitHub Actions run sends SIGTERM. Ask the job to stop at its
  // next checkpoint so the current batch is written before we exit.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      console.log(`[run-cron] ${signal} received, stopping at next checkpoint...`);
      requestCronStop();
    });
  }

  const started = Date.now();
  console.log(`[run-cron] job=${job} tmdbListLimit=${tmdbListLimit}`);

  let failed = 0;
  for (const step of resolveSteps(job, tmdbListLimit)) {
    console.log(`======= Starting: ${step.name} =======`);
    try {
      await step.fn();
    } catch (error) {
      failed += 1;
      console.error(`[run-cron] Step '${step.name}' failed:`, error);
    }
    console.log(`======= Done: ${step.name} =======`);
  }

  const minutes = ((Date.now() - started) / 60_000).toFixed(1);
  console.log(`======= All steps done in ${minutes} min (${failed} failed) =======`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('[run-cron] fatal:', error);
  process.exit(1);
});
