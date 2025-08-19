'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';

export default function TmdbAdmin() {
  const [trendingLimit, setTrendingLimit] = useState(50);
  const [mvTmdbId, setMvTmdbId] = useState('');
  const [tvTmdbId, setTvTmdbId] = useState('');
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');

  const fetchGenresMutation = api.media.fetchGenres.useMutation();
  const fetchTmdbTrendingMutation = api.media.fetchTmdbTrending.useMutation();
  const populateDetailsMutation = api.media.populateMediaDetails.useMutation();
  const dailySrcFetchMutation = api.media.mediaSrcFetch.useMutation();
  const fetchMvSrcMutation = api.media.fetchAndInsertMvSrc.useMutation();
  const insertEpisodeMutation = api.media.insertSeasonAndEpisode.useMutation();
  const fetchTvSrcMutation = api.media.fetchAndInsertTvSrc.useMutation();

  const handleFetchGenres = () => {
    fetchGenresMutation.mutate(undefined, {
      onSuccess: (data) => console.log('Fetch genres:', data),
      onError: (err) => console.error('Error:', err),
    });
  };
  const handleFetchTmdbTrending = () => {
    fetchTmdbTrendingMutation.mutate(
      { limit: trendingLimit },
      {
        onSuccess: (data) => console.log('Fetched:', data),
        onError: (err) => console.error('Error:', err),
      }
    );
  };
  const handlePopulateDetails = () => {
    populateDetailsMutation.mutate(undefined, {
      onSuccess: () => console.log('Populated details'),
      onError: (err) => console.error('Error populating details: ', err),
    });
  };
  const handleDailySrcFetch = () => {
    dailySrcFetchMutation.mutate(undefined, {
      onSuccess: () => console.log('Daily src fetch finished'),
      onError: (err) => console.error('Error fetching daily src: ', err),
    });
  };
  const handleFetchMvSrc = () => {
    fetchMvSrcMutation.mutate(
      { tmdbId: Number(mvTmdbId) },
      {
        onSuccess: (data) => console.log('Fetched source:', data),
        onError: (err) => console.error('Error fetching source:', err),
      }
    );
  };
  const handleInsertEpisode = () => {
    insertEpisodeMutation.mutate(
      {
        tmdbId: Number(tvTmdbId),
        season: Number(season),
        episode: Number(episode),
      },
      {
        onSuccess: (data) => console.log('Fetched TV source:', data),
        onError: (err) => console.error('Error fetching TV source:', err),
      }
    );
  };
  const handleFetchTvSrc = () => {
    fetchTvSrcMutation.mutate(
      {
        tmdbId: Number(tvTmdbId),
        season: Number(season),
        episode: Number(episode),
      },
      {
        onSuccess: (data) => console.log('Fetched TV source:', data),
        onError: (err) => console.error('Error fetching TV source:', err),
      }
    );
  };

  return (
    <section className="flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <input
          type="number"
          placeholder="Trending Limit"
          value={trendingLimit}
          onChange={(e) => setTrendingLimit(Number(e.target.value))}
          className="px-3 py-2 border rounded w-60 text-black"
        />
        <button
          onClick={handleFetchGenres}
          disabled={fetchGenresMutation.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          {fetchGenresMutation.isPending
            ? 'Fetching genres...'
            : 'Fetch genres'}
        </button>
        {fetchGenresMutation.error && (
          <p className="text-red-500 mt-2">
            Error: {fetchGenresMutation.error.message}
          </p>
        )}
        <button
          onClick={handleFetchTmdbTrending}
          disabled={fetchTmdbTrendingMutation.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          {fetchTmdbTrendingMutation.isPending
            ? 'Fetching...'
            : 'Fetch TMDB Trending'}
        </button>
        {fetchTmdbTrendingMutation.error && (
          <p className="text-red-500">
            Error: {fetchTmdbTrendingMutation.error.message}
          </p>
        )}
        <button
          onClick={handlePopulateDetails}
          disabled={populateDetailsMutation.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          {populateDetailsMutation.isPending
            ? 'Populating...'
            : 'Populate media details'}
        </button>
        {populateDetailsMutation.error && (
          <p className="text-red-500 mt-2">
            Error: {populateDetailsMutation.error.message}
          </p>
        )}
        <button
          onClick={handleDailySrcFetch}
          disabled={dailySrcFetchMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {dailySrcFetchMutation.isPending ? 'Fetching...' : 'Daily src fetch'}
        </button>
        {dailySrcFetchMutation.error && (
          <p className="text-red-500">
            Error: {dailySrcFetchMutation.error.message}
          </p>
        )}
      </div>

      <hr className="w-full my-4" />

      <div className="flex flex-col items-center gap-2">
        <input
          type="number"
          placeholder="Movie TMDB ID"
          value={mvTmdbId}
          onChange={(e) => setMvTmdbId(e.target.value)}
          className="px-3 py-2 border rounded w-60 text-black"
        />
        <button
          onClick={handleFetchMvSrc}
          disabled={fetchMvSrcMutation.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded w-60"
        >
          {fetchMvSrcMutation.isPending
            ? 'Fetching Source...'
            : 'Fetch Movie Source'}
        </button>
        {fetchMvSrcMutation.error && (
          <p className="text-red-500 mt-2">
            Error: {fetchMvSrcMutation.error.message}
          </p>
        )}
      </div>

      <hr className="w-full my-4" />

      <div className="flex flex-col items-center gap-2">
        <input
          type="number"
          placeholder="TV Show TMDB ID"
          value={tvTmdbId}
          onChange={(e) => setTvTmdbId(e.target.value)}
          className="px-3 py-2 border rounded w-60 text-black"
        />
        <input
          type="number"
          placeholder="Season Number"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="px-3 py-2 border rounded w-60 text-black"
        />
        <input
          type="number"
          placeholder="Episode Number"
          value={episode}
          onChange={(e) => setEpisode(e.target.value)}
          className="px-3 py-2 border rounded w-60 text-black"
        />
        <div className="flex gap-2">
          <button
            onClick={handleInsertEpisode}
            disabled={insertEpisodeMutation.isPending}
            className="px-4 py-2 bg-purple-600 text-white rounded flex-1"
          >
            {insertEpisodeMutation.isPending
              ? 'Inserting...'
              : 'Insert Episode'}
          </button>
          <button
            onClick={handleFetchTvSrc}
            disabled={fetchTvSrcMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded flex-1"
          >
            {fetchTvSrcMutation.isPending
              ? 'Fetching Source...'
              : 'Fetch TV Source'}
          </button>
        </div>
        {insertEpisodeMutation.error && (
          <p className="text-red-500 mt-2">
            Error: {insertEpisodeMutation.error.message}
          </p>
        )}
        {fetchTvSrcMutation.error && (
          <p className="text-red-500 mt-2">
            Error: {fetchTvSrcMutation.error.message}
          </p>
        )}
      </div>
    </section>
  );
}
