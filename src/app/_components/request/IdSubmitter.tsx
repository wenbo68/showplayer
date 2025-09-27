// ~/app/_components/user/IdSubmitter.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '~/trpc/react';
import { TRPCClientError } from '@trpc/client';
import Link from 'next/link';
import { IoIosArrowDown } from 'react-icons/io';
import { useSessionStorageState } from '~/app/_hooks/sessionStorageHooks';
import type { FindTmdbIdByTitleResult } from '~/server/utils/tmdbApiUtils';
import { MediaBadge } from '../media/MediaBadge';
import { tagClassMap } from '../media/MediaPopup';

// Sub-component to display search results in a table
const FindResults = ({
  results,
  onSelect,
  isSubmittingId,
}: {
  results: FindTmdbIdByTitleResult[];
  onSelect: (id: number) => void;
  isSubmittingId: number | null;
}) => {
  const [selectedItem, setSelectedItem] =
    useState<FindTmdbIdByTitleResult | null>(null);

  if (results.length === 0) {
    return (
      <div className="w-full rounded bg-gray-800 p-4">
        <p>No results found for your query.</p>
      </div>
    );
  }

  const handleRowClick = (item: FindTmdbIdByTitleResult) => {
    setSelectedItem(item);
  };

  const handleClosePopup = () => {
    setSelectedItem(null);
  };

  const handleSubmit = () => {
    if (selectedItem) {
      onSelect(selectedItem.tmdbId);
      // Optionally close the popup after submission
      // handleClosePopup();
    }
  };

  const releaseDate = selectedItem?.releaseDate
    ? new Date(selectedItem.releaseDate).toLocaleDateString('ja-JP')
    : 'N/A';

  return (
    <>
      {/* Table Display */}
      <div className="max-h-[75vh] overflow-y-auto overflow-x-auto rounded bg-gray-800 px-4 py-2 scrollbar-thin">
        <table className="w-full text-left text-xs font-semibold">
          <thead>
            <tr>
              <th className="p-2">Title</th>
              <th className="p-2">Released</th>
              <th className="p-2">TMDB ID</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item) => (
              <tr
                key={item.tmdbId}
                onClick={() => handleRowClick(item)}
                className="cursor-pointer border-t border-gray-700 transition-colors hover:bg-gray-900 hover:text-blue-400"
              >
                <td className="p-2">{item.title}</td>
                <td className="p-2">
                  {item.releaseDate
                    ? new Date(item.releaseDate).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </td>
                <td className="p-2">{item.tmdbId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popup / Modal */}
      {selectedItem && (
        <div
          // This is the backdrop, clicking it closes the modal
          onClick={handleClosePopup}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
        >
          <div
            // This is the modal content, clicking it does NOT close the modal
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-[90vw] sm:max-w-lg scorllbar-thin flex-col gap-4 rounded-lg bg-gray-900 p-6 shadow-xl"
          >
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-bold text-gray-300">
                {selectedItem.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {/** release date */}
                {releaseDate && (
                  <MediaBadge className={tagClassMap['released']}>
                    Released: {releaseDate}
                  </MediaBadge>
                )}
                <MediaBadge className={tagClassMap['order']}>
                  Tmdb ID: {selectedItem.tmdbId}
                </MediaBadge>
              </div>
            </div>
            <p className="text-sm md:text-base font-medium overflow-y-auto max-h-[75vh]">
              {selectedItem.overview || 'No overview available.'}
            </p>
            <button
              onClick={handleSubmit}
              disabled={isSubmittingId === selectedItem.tmdbId}
              className="mt-auto w-full rounded-lg bg-blue-600 p-2.5 font-semibold text-gray-300 transition hover:bg-blue-500 disabled:cursor-not-allowed"
            >
              {isSubmittingId === selectedItem.tmdbId ? 'Submitting' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default function IdSubmitter() {
  const [titleInput, setTitleInput] = useState('');
  const [tmdbIdInput, setTmdbIdInput] = useState('');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [showInfo, setShowInfo] = useSessionStorageState(
    'showSubmitInfo',
    true
  );
  const [findOrSubmit, setFindOrSubmit] = useState<'find' | 'submit'>('find');
  const [isFindDropdownOpen, setIsFindDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const [submittingRowId, setSubmittingRowId] = useState<number | null>(null);

  const findSubmitDropdownRef = useRef<HTMLDivElement>(null);
  const mediaTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Effect to handle "clicking away" for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        findSubmitDropdownRef.current &&
        !findSubmitDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFindDropdownOpen(false);
      }
      if (
        mediaTypeDropdownRef.current &&
        !mediaTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const utils = api.useUtils();
  const submitTmdbIdMutation = api.user.submitTmdbId.useMutation({
    onSuccess: (data) => {
      utils.user.getUserSubmissions.invalidate();
      switch (data.status) {
        case 'exists':
          const media = data.mediaInfo;
          const isReleased = media.releaseDate
            ? new Date(media.releaseDate) <= new Date()
            : false;
          let availabilityMsg = '';
          if (!isReleased) {
            availabilityMsg = 'Not Yet Released';
          } else {
            const hasSources = media.availabilityCount > 0;
            if (mediaType === 'movie') {
              availabilityMsg = hasSources
                ? 'Available without ads'
                : 'Available with ads';
            } else {
              availabilityMsg =
                `${media.airedEpisodeCount} episodes available` +
                (hasSources ? ` (${media.availabilityCount} without ads)` : '');
            }
          }
          setMessage({
            text: `Media already exists. Release Date: ${
              data.mediaInfo.releaseDate ?? 'N/A'
            }. Availability: ${availabilityMsg}`,
            isError: false,
          });
          break;
        case 'processed':
          setMessage({ text: 'Admin submission processed.', isError: false });
          break;
        case 'submitted':
          setMessage({
            text: 'Submission successful! It will be processed shortly.',
            isError: false,
          });
          break;
      }
    },
    onError: (error) => {
      if (error instanceof TRPCClientError) {
        setMessage({ text: error.message, isError: true });
      } else {
        setMessage({ text: 'An unknown error occurred.', isError: true });
      }
    },
    onSettled: () => {
      setSubmittingRowId(null);
    },
  });

  const {
    data: searchResults,
    refetch: findByTitle,
    isFetching: isFinding,
    isError: isFindError,
    error: findError,
  } = api.user.findTmdbByTitle.useQuery(
    { title: titleInput, type: mediaType, limit: 10 },
    { enabled: false, retry: false }
  );

  const handleSubmitOrFind = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (findOrSubmit === 'find') {
      if (!titleInput.trim()) {
        setMessage({ text: 'Please enter a title to search.', isError: true });
        return;
      }
      findByTitle();
    } else {
      const tmdbId = Number(tmdbIdInput);
      if (isNaN(tmdbId) || tmdbId <= 0) {
        setMessage({ text: 'Please enter a valid TMDB ID.', isError: true });
        return;
      }
      submitTmdbIdMutation.mutate({ tmdbId, type: mediaType });
    }
  };

  const handleSelectAndSubmit = (tmdbId: number) => {
    setSubmittingRowId(tmdbId);
    setMessage(null);
    submitTmdbIdMutation.mutate({ tmdbId, type: mediaType });
  };

  const findOrSubmitOptions = [
    { label: 'Find', value: 'find' as const },
    { label: 'Submit', value: 'submit' as const },
  ];
  const mediaTypeOptions = [
    { label: 'Movie', value: 'movie' as const },
    { label: 'TV', value: 'tv' as const },
  ];

  const isLoading =
    (findOrSubmit === 'find' && isFinding) ||
    (findOrSubmit === 'submit' && submitTmdbIdMutation.isPending);
  const buttonText =
    findOrSubmit === 'find'
      ? isFinding
        ? 'Finding'
        : 'Find'
      : submitTmdbIdMutation.isPending
      ? 'Submitting'
      : 'Submit';

  return (
    <form
      onSubmit={handleSubmitOrFind}
      className="basis-0 flex-grow flex flex-col gap-4"
    >
      <div
        onClick={() => setShowInfo(!showInfo)}
        className="flex cursor-pointer items-center gap-2"
      >
        <div className="font-bold text-gray-300">ADD NEW MEDIA</div>
        <div className={`flex items-center justify-center`}>
          <IoIosArrowDown size={20} />
        </div>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        {showInfo && (
          <div className="rounded bg-gray-800 p-4">
            <p>
              - User requests are processed once every 5 minutes. There are 2
              ways to request:
            </p>
            <p>
              - 1: Select Find, select movie/tv, enter the title, and click Find
              button. In the list of results, find your media, click it, and
              click submit.
            </p>
            <p>
              - 2: Select Submit, select movie/tv, enter the tmdb id, and click
              Submit button.
            </p>
            <p className="">
              - To find the tmdb id, search the media in{' '}
              <Link
                href="https://www.themoviedb.org"
                className="text-blue-400 cursor-pointer underline"
              >
                tmdb
              </Link>
              . The tmdb id is in the url.
            </p>
            <p className="">
              - For example, if the tmdb url is{' '}
              <Link
                href="https://www.themoviedb.org/tv/1396-breaking-bad"
                className="text-blue-400 cursor-pointer underline"
              >
                www.themoviedb.org/tv/1396-breaking-bad
              </Link>
              , the tmdb id is 1396, and the media type is tv.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 md:flex-row">
          <div className="flex flex-grow gap-2">
            {/* Find/Submit Dropdown */}
            <div
              ref={findSubmitDropdownRef}
              className="relative flex-grow sm:grow-0 sm:w-32"
            >
              <button
                type="button"
                onClick={() => setIsFindDropdownOpen((prev) => !prev)}
                className="w-full flex cursor-pointer items-center justify-between rounded bg-gray-800 px-3 py-2 text-xs font-semibold"
              >
                <span>{findOrSubmit === 'find' ? 'Find' : 'Submit'}</span>
                <IoIosArrowDown size={20} />
              </button>
              {isFindDropdownOpen && (
                <div className="absolute top-full z-10 mt-2 w-full rounded bg-gray-800 p-2">
                  {findOrSubmitOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFindOrSubmit(option.value);
                        setIsFindDropdownOpen(false);
                      }}
                      className={`w-full text-xs font-semibold rounded p-2 text-left hover:bg-gray-900 hover:text-blue-400 ${
                        findOrSubmit === option.value ? 'text-blue-400' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Media Type Dropdown */}
            <div
              ref={mediaTypeDropdownRef}
              className="relative flex-grow sm:grow-0 sm:w-32"
            >
              <button
                type="button"
                onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                className="w-full flex cursor-pointer items-center justify-between rounded bg-gray-800 px-3 py-2 text-xs font-semibold"
              >
                <span>{mediaType === 'movie' ? 'Movie' : 'TV'}</span>
                <IoIosArrowDown size={20} />
              </button>
              {isTypeDropdownOpen && (
                <div className="absolute top-full z-10 mt-2 w-full rounded bg-gray-800 p-2">
                  {mediaTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setMediaType(option.value);
                        setIsTypeDropdownOpen(false);
                      }}
                      className={`w-full text-xs font-semibold rounded p-2 text-left hover:bg-gray-900 hover:text-blue-400 ${
                        mediaType === option.value ? 'text-blue-400' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title or TMDB ID Input */}
            <div className="hidden sm:block flex-grow">
              {findOrSubmit === 'find' ? (
                <input
                  type="text"
                  placeholder="Enter title..."
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full rounded bg-gray-800 px-3 py-2 outline-none"
                />
              ) : (
                <input
                  type="number"
                  placeholder="Enter tmdb id..."
                  value={tmdbIdInput}
                  onChange={(e) => setTmdbIdInput(e.target.value)}
                  className="w-full rounded bg-gray-800 px-3 py-2 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              )}
            </div>
          </div>
          <div className="sm:hidden flex-grow">
            {findOrSubmit === 'find' ? (
              <input
                type="text"
                placeholder="Enter title..."
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full rounded bg-gray-800 px-3 py-2 outline-none"
              />
            ) : (
              <input
                type="number"
                placeholder="Enter tmdb id..."
                value={tmdbIdInput}
                onChange={(e) => setTmdbIdInput(e.target.value)}
                className="w-full rounded bg-gray-800 px-3 py-2 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="min-w-32 rounded bg-blue-600 px-4 py-2 font-semibold text-gray-300 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-800"
          >
            {buttonText}
          </button>
        </div>

        {/* Message Display Area */}
        {message && (
          <div className="w-full rounded bg-gray-800 p-4">
            <p className={message.isError ? 'text-red-400' : 'text-green-400'}>
              {message.text}
            </p>
          </div>
        )}

        {/* Search Results Display Area */}
        {findOrSubmit === 'find' && isFindError && (
          <div className="w-full rounded bg-gray-800 p-4">
            <p className="text-red-400">
              Error: {findError?.message ?? 'An unknown error occurred.'}
            </p>
          </div>
        )}

        {findOrSubmit === 'find' && searchResults && (
          <FindResults
            results={searchResults}
            onSelect={handleSelectAndSubmit}
            isSubmittingId={submittingRowId}
          />
        )}
      </div>
    </form>
  );
}
