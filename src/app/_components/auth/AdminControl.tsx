// ~/app/_components/auth/CronAdmin.tsx

'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';

export default function CronAdmin() {
  const [tmdbListLimit, setTmdbListLimit] = useState(50);

  // --- Create a useMutation hook for each procedure ---
  const runCronMutation = api.cron.runCron.useMutation();
  const updateChangedMediaMutation =
    api.cron.updateAllChangedMedia.useMutation();
  const updatePopularityMutation = api.cron.updatePopularity.useMutation();
  const updateRatingsMutation = api.cron.updateRatings.useMutation();
  const processUserSubmissionsMutation =
    api.cron.processUserSubmissions.useMutation();
  const fetchTmdbListsMutation = api.cron.fetchTmdbLists.useMutation();
  const fetchSrcMutation = api.cron.fetchSrc.useMutation();
  const updateDenormFieldsMutation = api.cron.updateDenormFields.useMutation();

  // --- Create a handler for each mutation ---
  // A generic handler for simple mutations
  const createSimpleHandler = (mutation: any, name: string) => () => {
    mutation.mutate(undefined, {
      onSuccess: () =>
        alert(
          `Successfully triggered ${name} job. Check server logs for progress.`
        ),
      onError: (err: any) => alert(`Error triggering ${name}: ${err.message}`),
    });
  };

  const handleRunCron = () => {
    runCronMutation.mutate(
      { tmdbListLimit },
      {
        onSuccess: () =>
          alert(
            'Successfully triggered master cron sequence. Check server logs for progress.'
          ),
        onError: (err) => alert(`Error triggering master cron: ${err.message}`),
      }
    );
  };

  const handleFetchTmdbLists = () => {
    fetchTmdbListsMutation.mutate(
      { limit: tmdbListLimit },
      {
        onSuccess: () =>
          alert(
            'Successfully triggered fetchTmdbLists job. Check server logs for progress.'
          ),
        onError: (err) =>
          alert(`Error triggering fetchTmdbLists: ${err.message}`),
      }
    );
  };

  const jobs = [
    {
      name: '1. Update Changed Media',
      mutation: updateChangedMediaMutation,
      handler: createSimpleHandler(
        updateChangedMediaMutation,
        'Update Changed Media'
      ),
    },
    {
      name: '2. Update Popularity',
      mutation: updatePopularityMutation,
      handler: createSimpleHandler(
        updatePopularityMutation,
        'Update Popularity'
      ),
    },
    {
      name: '3. Update Ratings',
      mutation: updateRatingsMutation,
      handler: createSimpleHandler(updateRatingsMutation, 'Update Ratings'),
    },
    {
      name: '4. Process Submissions',
      mutation: processUserSubmissionsMutation,
      handler: createSimpleHandler(
        processUserSubmissionsMutation,
        'Process Submissions'
      ),
    },
    {
      name: '5. Fetch TMDb Lists',
      mutation: fetchTmdbListsMutation,
      handler: handleFetchTmdbLists,
      needsInput: true,
    },
    {
      name: '6. Fetch Sources',
      mutation: fetchSrcMutation,
      handler: createSimpleHandler(fetchSrcMutation, 'Fetch Sources'),
    },
    {
      name: '7. Update Denorm. Fields',
      mutation: updateDenormFieldsMutation,
      handler: createSimpleHandler(
        updateDenormFieldsMutation,
        'Update Denormalized Fields'
      ),
    },
  ];

  return (
    <section className="flex w-full max-w-md flex-col items-center justify-center rounded-lg border-2 border-dashed border-cyan-500 p-4">
      <h2 className="mb-4 text-lg font-bold text-cyan-500">
        Cron Job Controls
      </h2>

      {/* Master Control */}
      <div className="flex w-full flex-col items-center gap-2">
        <h3 className="font-semibold text-gray-400">Master Control</h3>
        <label htmlFor="tmdbListLimit" className="text-xs text-gray-500">
          TMDB List Limit (for step 5)
        </label>
        <input
          id="tmdbListLimit"
          type="number"
          value={tmdbListLimit}
          onChange={(e) => setTmdbListLimit(Number(e.target.value))}
          className="w-60 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300"
        />
        <button
          onClick={handleRunCron}
          disabled={runCronMutation.isPending}
          className="w-60 rounded bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {runCronMutation.isPending
            ? 'Running Sequence...'
            : 'Run Full Daily Sequence'}
        </button>
        {runCronMutation.error && (
          <p className="mt-2 text-red-400">
            Error: {runCronMutation.error.message}
          </p>
        )}
      </div>

      <hr className="my-4 w-full border-gray-700" />

      {/* Individual Step Controls */}
      <div className="flex w-full flex-col items-center gap-3">
        <h3 className="font-semibold text-gray-400">Individual Steps</h3>
        {jobs.map((job) => (
          <div key={job.name} className="flex flex-col items-center w-60">
            {job.needsInput && job.name.includes('Lists') && (
              <input
                type="number"
                value={tmdbListLimit}
                onChange={(e) => setTmdbListLimit(Number(e.target.value))}
                className="mb-2 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300"
              />
            )}
            <button
              onClick={job.handler}
              disabled={job.mutation.isPending}
              className="w-full rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {job.mutation.isPending ? 'Running...' : job.name}
            </button>
            {job.mutation.error && (
              <p className="mt-2 text-red-400">
                Error: {job.mutation.error.message}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
