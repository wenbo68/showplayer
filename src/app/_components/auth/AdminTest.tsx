'use client';

import { useState } from 'react';
// import { env } from '~/env';
import { api } from '~/trpc/react';

export default function TmdbAdmin() {
  const [fetchLimit, setFetchLimit] = useState(50);
  const [topLimit, setTopLimit] = useState(100);
  // const [mvTmdbId, setMvTmdbId] = useState('');
  // const [tvTmdbId, setTvTmdbId] = useState('');
  // const [season, setSeason] = useState('');
  // const [episode, setEpisode] = useState('');

  // --- 1. Add new state for the ratings refresh limit ---
  const [ratingsLimit, setRatingsLimit] = useState(100);

  // --- 1. Add new state for the submission form ---
  const [submissionTmdbId, setSubmissionTmdbId] = useState('');
  const [submissionType, setSubmissionType] = useState<'movie' | 'tv'>('movie');
  const [submissionResult, setSubmissionResult] = useState('');

  const fetchOriginsMutation = api.media.fetchOrigins.useMutation();
  const fetchGenresMutation = api.media.fetchGenres.useMutation();

  const fetchTmdbListsMutation = api.cron.fetchTmdbLists.useMutation();
  const fetchTmdbTopMutation = api.media.fetchTmdbTopRated.useMutation();

  // --- 2. Add new mutation hooks for the cron procedures ---
  const updatePopularityMutation = api.cron.updatePopularity.useMutation();
  const updateRatingsMutation = api.cron.updateRatings.useMutation();

  // const populateDetailsMutation =
  //   api.media.populateMissingMediaDetails.useMutation();
  const dailySrcFetchMutation = api.cron.fetchSrc.useMutation();

  // const fetchMvSrcMutation = api.media.fetchAndInsertMvSrc.useMutation();
  // const insertEpisodeMutation = api.media.insertSeasonAndEpisode.useMutation();
  // const fetchTvSrcMutation = api.media.fetchAndInsertTvSrc.useMutation();

  const updateDenormFieldsMutation = api.cron.updateDenormFields.useMutation();

  // --- 2. Add the new useMutation hook ---
  const submitTmdbIdMutation = api.user.submitTmdbId.useMutation();

  // --- 1. Add the new useMutation hook ---
  const upsertUserSubmittedIdsMutation =
    api.cron.processUserSubmissions.useMutation();

  const updateAllChangedMediaMutation =
    api.cron.updateAllChangedMedia.useMutation();

  const runCronMutation = api.cron.runCron.useMutation();

  const handleFetchOrigins = () => {
    fetchOriginsMutation.mutate(undefined, {
      onSuccess: (data) => console.log('Fetch origins:', data),
      onError: (err) => console.log('Error:', err),
    });
  };
  const handleFetchGenres = () => {
    fetchGenresMutation.mutate(undefined, {
      onSuccess: (data) => console.log('Fetch genres:', data),
      onError: (err) => console.error('Error:', err),
    });
  };
  const handleFetchTmdbLists = () => {
    fetchTmdbListsMutation.mutate(
      { limit: fetchLimit },
      {
        onSuccess: (data) => console.log('Fetched:', data),
        onError: (err) => console.error('Error:', err),
      }
    );
  };
  const handleFetchTmdbTop = () => {
    fetchTmdbTopMutation.mutate(
      { limit: topLimit },
      {
        onSuccess: (data) => console.log('Fetched:', data),
        onError: (err) => console.error('Error:', err),
      }
    );
  };
  // --- 3. Add new handlers for the cron procedures ---
  const handleUpdatePopularity = (mediaType: 'movie' | 'tv') => {
    // NOTE: This can take a long time to run!
    updatePopularityMutation.mutate(
      {
        // cronSecret:
        //   'd23b4a9f9d009dcf28bd69cdbb2815819379db2702dc96251bd72f2dfa1c9d4e',
        mediaType: mediaType,
      },
      {
        onSuccess: (data) =>
          console.log(`Sync ${mediaType} popularity complete:`, data),
        onError: (err) =>
          console.error(`Error syncing ${mediaType} popularity:`, err),
      }
    );
  };
  const handleUpdateRatings = () => {
    // NOTE: This can also take a long time to run!
    updateRatingsMutation.mutate(
      {
        // cronSecret:
        //   'd23b4a9f9d009dcf28bd69cdbb2815819379db2702dc96251bd72f2dfa1c9d4e',
        limit: ratingsLimit,
      },
      {
        onSuccess: (data) => console.log('Refresh ratings complete:', data),
        onError: (err) => console.error('Error refreshing ratings:', err),
      }
    );
  };
  // const handlePopulateDetails = () => {
  //   populateDetailsMutation.mutate(undefined, {
  //     onSuccess: () => console.log('Populated details'),
  //     onError: (err) => console.error('Error populating details: ', err),
  //   });
  // };
  const handleDailySrcFetch = () => {
    dailySrcFetchMutation.mutate(
      {
        // cronSecret:
        //   'd23b4a9f9d009dcf28bd69cdbb2815819379db2702dc96251bd72f2dfa1c9d4e',
      },
      {
        onSuccess: () => console.log('Daily src fetch finished'),
        onError: (err) => console.error('Error fetching daily src: ', err),
      }
    );
  };
  // const handleFetchMvSrc = () => {
  //   fetchMvSrcMutation.mutate(
  //     { tmdbId: Number(mvTmdbId) },
  //     {
  //       onSuccess: (data) => console.log('Fetched source:', data),
  //       onError: (err) => console.error('Error fetching source:', err),
  //     }
  //   );
  // };
  // const handleInsertEpisode = () => {
  //   insertEpisodeMutation.mutate(
  //     {
  //       tmdbId: Number(tvTmdbId),
  //       season: Number(season),
  //       episode: Number(episode),
  //     },
  //     {
  //       onSuccess: (data) => console.log('Fetched TV source:', data),
  //       onError: (err) => console.error('Error fetching TV source:', err),
  //     }
  //   );
  // };
  // const handleFetchTvSrc = () => {
  //   fetchTvSrcMutation.mutate(
  //     {
  //       tmdbId: Number(tvTmdbId),
  //       season: Number(season),
  //       episode: Number(episode),
  //     },
  //     {
  //       onSuccess: (data) => console.log('Fetched TV source:', data),
  //       onError: (err) => console.error('Error fetching TV source:', err),
  //     }
  //   );
  // };

  // --- 2. Add the new handler function ---
  const handleUpdateDenormFields = () => {
    // NOTE: This is a very long-running job!
    updateDenormFieldsMutation.mutate(
      {
        cronSecret:
          'd23b4a9f9d009dcf28bd69cdbb2815819379db2702dc96251bd72f2dfa1c9d4e',
      },
      {
        onSuccess: (data) =>
          console.log('Update denormalized fields complete:', data),
        onError: (err) =>
          console.error('Error updating denormalized fields:', err),
      }
    );
  };

  // --- 3. Add the new handler function ---
  const handleSubmitTmdbId = () => {
    if (!submissionTmdbId) return;
    setSubmissionResult(''); // Clear previous results

    submitTmdbIdMutation.mutate(
      {
        tmdbId: Number(submissionTmdbId),
        type: submissionType,
      },
      {
        onSuccess: (data) => {
          console.log('Submission successful:', data);
          // Provide detailed feedback in the UI
          if (data.status === 'exists') {
            setSubmissionResult(
              `Media already exists. Release date: ${
                data.mediaInfo.releaseDate
                  ? new Date(data.mediaInfo.releaseDate).toLocaleDateString(
                      'ja-JP',
                      {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                      }
                    )
                  : 'N/A'
              }. Availability: ${
                submissionType === 'movie'
                  ? `${
                      data.mediaInfo.availabilityCount > 0
                        ? 'Available'
                        : 'Not Available'
                    }`
                  : `${data.mediaInfo.availabilityCount}/${data.mediaInfo.airedEpisodeCount}`
              }`
            );
          } else if (data.status === 'processed') {
            setSubmissionResult(
              'Admin submission successful. Media is being processed now.'
            );
          } else if (data.status === 'submitted') {
            setSubmissionResult(
              'Submission successful. It will be processed by the next daily cron job.'
            );
          }
        },
        onError: (err) => {
          console.error('Submission error:', err);
          setSubmissionResult(`Error: ${err.message}`);
        },
      }
    );
  };

  // --- 2. Add the new handler function ---
  const handleUpsertUserSubmittedIds = () => {
    // NOTE: This can be a very long-running job!
    upsertUserSubmittedIdsMutation.mutate(undefined, {
      onSuccess: (data) => {
        console.log(`upsert success`);
      },
      onError: (err) => {
        console.error('Error processing user submissions:', err);
      },
    });
  };

  const handleUpdateAllChangedMedia = () => {
    updateAllChangedMediaMutation.mutate(undefined, {
      onSuccess: (data) => {
        console.log(`[handleUpdateAllChangedMedia] update done.`);
      },
      onError: (err) => {
        console.error(`[handleUpdateAllChangedMedia] error: `, err);
      },
    });
  };

  const handleRunCron = () => {
    runCronMutation.mutate(
      {},
      {
        onSuccess: (data) => {
          console.log(`All cron job done`);
        },
        onError: (err) => {
          console.error(err);
        },
      }
    );
  };

  return (
    <section className="flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleFetchOrigins}
          disabled={fetchOriginsMutation.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:hover:bg-red-500"
        >
          {fetchOriginsMutation.isPending
            ? 'Fetching origins...'
            : 'Fetch origins'}
        </button>
        {fetchOriginsMutation.error && (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Error: {fetchOriginsMutation.error.message}
          </p>
        )}
        <button
          onClick={handleFetchGenres}
          disabled={fetchGenresMutation.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:hover:bg-red-500"
        >
          {fetchGenresMutation.isPending
            ? 'Fetching genres...'
            : 'Fetch genres'}
        </button>
        {fetchGenresMutation.error && (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Error: {fetchGenresMutation.error.message}
          </p>
        )}

        <hr className="w-full my-4 border-gray-300 dark:border-gray-700" />

        <input
          type="number"
          placeholder="Fetch Limit"
          value={fetchLimit}
          onChange={(e) => setFetchLimit(Number(e.target.value))}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <button
          onClick={handleFetchTmdbLists}
          disabled={fetchTmdbListsMutation.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 dark:hover:bg-green-500"
        >
          {fetchTmdbListsMutation.isPending
            ? 'Fetching...'
            : 'Fetch tmdb lists'}
        </button>
        {fetchTmdbListsMutation.error && (
          <p className="text-red-600 dark:text-red-400">
            Error: {fetchTmdbListsMutation.error.message}
          </p>
        )}
        <input
          type="number"
          placeholder="Top Rated Limit"
          value={topLimit}
          onChange={(e) => setTopLimit(Number(e.target.value))}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <button
          onClick={handleFetchTmdbTop}
          disabled={fetchTmdbTopMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-500"
        >
          {fetchTmdbTopMutation.isPending ? 'Fetching...' : 'Fetch Top Rated'}
        </button>
        {fetchTmdbTopMutation.error && (
          <p className="text-red-600 dark:text-red-400">
            Error: {fetchTmdbTopMutation.error.message}
          </p>
        )}

        <hr className="w-full my-4 border-gray-300 dark:border-gray-700" />

        {/* --- 4. Add new JSX for the cron job buttons --- */}
        <div className="flex flex-col items-center gap-2 w-full">
          <h3 className="font-semibold text-gray-400">Cron Jobs</h3>
          <div className="flex gap-2 w-60">
            <button
              onClick={() => handleUpdatePopularity('movie')}
              disabled={updatePopularityMutation.isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded w-full hover:bg-purple-700 disabled:opacity-50"
            >
              {updatePopularityMutation.isPending
                ? 'Updating...'
                : 'Update MV Popularity'}
            </button>
            <button
              onClick={() => handleUpdatePopularity('tv')}
              disabled={updatePopularityMutation.isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded w-full hover:bg-purple-700 disabled:opacity-50"
            >
              {updatePopularityMutation.isPending
                ? 'Updating...'
                : 'Update TV Popularity'}
            </button>
          </div>
          {updatePopularityMutation.error && (
            <p className="text-red-400 mt-2">
              Error: {updatePopularityMutation.error.message}
            </p>
          )}

          <input
            type="number"
            placeholder="Ratings Refresh Limit"
            value={ratingsLimit}
            onChange={(e) => setRatingsLimit(Number(e.target.value))}
            className="mt-2 px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-700"
          />
          <button
            onClick={handleUpdateRatings}
            disabled={updateRatingsMutation.isPending}
            className="px-4 py-2 bg-teal-600 text-white rounded w-60 hover:bg-teal-700 disabled:opacity-50"
          >
            {updateRatingsMutation.isPending
              ? 'Refreshing...'
              : 'Refresh Ratings'}
          </button>
          {updateRatingsMutation.error && (
            <p className="text-red-400 mt-2">
              Error: {updateRatingsMutation.error.message}
            </p>
          )}

          <button
            onClick={handleUpdateDenormFields}
            disabled={updateDenormFieldsMutation.isPending}
            className="px-4 py-2 bg-orange-600 text-white rounded w-60 hover:bg-orange-700 disabled:opacity-50"
          >
            {updateDenormFieldsMutation.isPending
              ? 'Updating All Metrics...'
              : 'Update Denormalized Fields'}
          </button>
          {updateDenormFieldsMutation.error && (
            <p className="text-red-400 mt-2">
              Error: {updateDenormFieldsMutation.error.message}
            </p>
          )}

          <button
            onClick={handleUpdateAllChangedMedia}
            disabled={updateAllChangedMediaMutation.isPending}
            className="px-4 py-2 bg-orange-600 text-white rounded w-60 hover:bg-orange-700 disabled:opacity-50"
          >
            {updateAllChangedMediaMutation.isPending
              ? 'Updating changed media...'
              : 'Update all changed media'}
          </button>
          {updateAllChangedMediaMutation.error && (
            <p className="text-red-400 mt-2">
              Error: {updateAllChangedMediaMutation.error.message}
            </p>
          )}
        </div>

        <hr className="w-full my-4 border-gray-300 dark:border-gray-700" />

        {/* <button
          onClick={handlePopulateDetails}
          disabled={populateDetailsMutation.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:hover:bg-red-500"
        >
          {populateDetailsMutation.isPending
            ? 'Populating...'
            : 'Populate media details'}
        </button>
        {populateDetailsMutation.error && (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Error: {populateDetailsMutation.error.message}
          </p>
        )} */}
        <button
          onClick={handleDailySrcFetch}
          disabled={dailySrcFetchMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-500"
        >
          {dailySrcFetchMutation.isPending ? 'Fetching...' : 'Daily src fetch'}
        </button>
        {dailySrcFetchMutation.error && (
          <p className="text-red-600 dark:text-red-400">
            Error: {dailySrcFetchMutation.error.message}
          </p>
        )}
      </div>

      {/* <hr className="w-full my-4 border-gray-300 dark:border-gray-700" /> */}

      {/* <div className="flex flex-col items-center gap-2">
        <input
          type="number"
          placeholder="Movie TMDB ID"
          value={mvTmdbId}
          onChange={(e) => setMvTmdbId(e.target.value)}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <button
          onClick={handleFetchMvSrc}
          disabled={fetchMvSrcMutation.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded w-60 hover:bg-green-700 dark:hover:bg-green-500"
        >
          {fetchMvSrcMutation.isPending
            ? 'Fetching Source...'
            : 'Fetch Movie Source'}
        </button>
        {fetchMvSrcMutation.error && (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Error: {fetchMvSrcMutation.error.message}
          </p>
        )}
      </div> */}

      {/* <hr className="w-full my-4 border-gray-300 dark:border-gray-700" />

      <div className="flex flex-col items-center gap-2">
        <input
          type="number"
          placeholder="TV Show TMDB ID"
          value={tvTmdbId}
          onChange={(e) => setTvTmdbId(e.target.value)}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <input
          type="number"
          placeholder="Season Number"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <input
          type="number"
          placeholder="Episode Number"
          value={episode}
          onChange={(e) => setEpisode(e.target.value)}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <div className="flex gap-2 w-60">
          <button
            onClick={handleInsertEpisode}
            disabled={insertEpisodeMutation.isPending}
            className="px-4 py-2 bg-purple-600 text-white rounded flex-1 hover:bg-purple-700 dark:hover:bg-purple-500"
          >
            {insertEpisodeMutation.isPending
              ? 'Inserting...'
              : 'Insert Episode'}
          </button>
        </div>
        {insertEpisodeMutation.error && (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Error: {insertEpisodeMutation.error.message}
          </p>
        )}
      </div> */}

      <hr className="w-full my-4 border-gray-300 dark:border-gray-700" />

      {/* --- 4. Add the new JSX section for User Submissions --- */}
      <div className="flex flex-col items-center gap-2 w-full">
        <h3 className="font-semibold text-gray-400">User Submission</h3>
        <input
          type="number"
          placeholder="TMDB ID to Submit"
          value={submissionTmdbId}
          onChange={(e) => setSubmissionTmdbId(e.target.value)}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-700"
        />
        <select
          value={submissionType}
          onChange={(e) => setSubmissionType(e.target.value as 'movie' | 'tv')}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-700"
        >
          <option value="movie">Movie</option>
          <option value="tv">TV Show</option>
        </select>
        <button
          onClick={handleSubmitTmdbId}
          disabled={submitTmdbIdMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded w-60 hover:bg-blue-700 disabled:opacity-50"
        >
          {submitTmdbIdMutation.isPending ? 'Submitting...' : 'Submit ID'}
        </button>

        {/* Display success or error messages */}
        {submitTmdbIdMutation.error && (
          <p className="text-red-400 mt-2">
            Error: {submitTmdbIdMutation.error.message}
          </p>
        )}
        {submissionResult && (
          <p className="text-green-400 mt-2 text-center">{submissionResult}</p>
        )}

        {/* --- 3. Add the new button to the JSX --- */}
        <button
          onClick={handleUpsertUserSubmittedIds}
          disabled={upsertUserSubmittedIdsMutation.isPending}
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded w-60 hover:bg-indigo-700 disabled:opacity-50"
        >
          {upsertUserSubmittedIdsMutation.isPending
            ? 'Processing...'
            : 'Process User Submissions'}
        </button>
        {upsertUserSubmittedIdsMutation.error && (
          <p className="text-red-400 mt-2">
            Error: {upsertUserSubmittedIdsMutation.error.message}
          </p>
        )}
      </div>

      <hr className="w-full my-4 border-gray-300 dark:border-gray-700" />

      <button
        onClick={handleRunCron}
        disabled={runCronMutation.isPending}
        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded w-60 hover:bg-indigo-700 disabled:opacity-50"
      >
        {runCronMutation.isPending ? 'Running...' : 'Run all cron jobs'}
      </button>
      {runCronMutation.error && (
        <p className="text-red-400 mt-2">
          Error: {runCronMutation.error.message}
        </p>
      )}
    </section>
  );
}
