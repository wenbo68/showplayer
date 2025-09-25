// ~/app/_components/user/IdSubmitter.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '~/trpc/react';
import { TRPCClientError } from '@trpc/client';
import Link from 'next/link';
import { IoIosArrowDown } from 'react-icons/io';
import { useSessionStorageState } from '~/app/_hooks/sessionStorageHooks';

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

  const containerRef = useRef<HTMLDivElement>(null);
  // Effect to handle "clicking away"
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsTypeDropdownOpen(false);
        // setWrittenText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const utils = api.useUtils();
  const submitTmdbIdMutation = api.user.submitTmdbId.useMutation({
    onSuccess: (data) => {
      // fetch client cache to update submissionHistory
      utils.user.getUserSubmissions.invalidate();
      // Handle the different success statuses from your tRPC procedure
      switch (data.status) {
        case 'exists':
          const media = data.mediaInfo;
          const isReleased = media.releaseDate
            ? new Date(media.releaseDate) <= new Date()
            : false;
          let availabilityMsg: string = '';
          if (!isReleased) availabilityMsg = 'Not Released';
          else if (mediaType === 'movie') {
            if (media.availabilityCount <= 0)
              availabilityMsg = 'Available with ads';
            else availabilityMsg = 'Available without Ads';
          } else {
            if (media.availabilityCount <= 0)
              availabilityMsg = `${media.airedEpisodeCount} Episodes Available with ads`;
            else
              availabilityMsg = `${media.airedEpisodeCount} Episodes: ${media.availabilityCount} available without Ads`;
          }
          setMessage({
            text: `Media already exists. Release date: ${
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
            }. Availability: ${availabilityMsg}`,
            isError: false,
          });
          break;
        case 'processed':
          setMessage({
            text: 'Admin submission processed.',
            isError: false,
          });
          break;
        case 'submitted':
          setMessage({
            text: 'Submission successful! All submissions will be processed overnight.',
            isError: false,
          });
          break;
      }
    },
    onError: (error) => {
      // Handle tRPC errors, including the rate-limiting one
      if (error instanceof TRPCClientError) {
        setMessage({ text: error.message, isError: true });
      } else {
        setMessage({ text: 'An unknown error occurred.', isError: true });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const tmdbId = Number(tmdbIdInput);
    if (isNaN(tmdbId) || tmdbId <= 0) {
      setMessage({ text: 'Please enter a valid TMDB ID.', isError: true });
      return;
    }

    submitTmdbIdMutation.mutate({ tmdbId, type: mediaType });
  };

  const findOrSubmitOptions: { label: string; input: 'find' | 'submit' }[] = [
    { label: 'Find', input: 'find' },
    { label: 'Submit', input: 'submit' },
  ];
  const mediaTypeOptions: { label: string; input: 'movie' | 'tv' }[] = [
    { label: 'Movie', input: 'movie' },
    { label: 'TV', input: 'tv' },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="basis-0 flex-grow flex flex-col gap-2"
    >
      <div
        onClick={() => setShowInfo(!showInfo)}
        className={`flex cursor-pointer gap-2`}
      >
        <div className="text-gray-300 flex items-center justify-center font-bold">
          ADD NEW MEDIA
        </div>
        <div className="flex items-center justify-center">
          <IoIosArrowDown size={20} />
        </div>
      </div>
      <div className="flex flex-col gap-4 text-sm">
        {/** fyi */}
        {showInfo && (
          <div className="p-4 bg-gray-800 rounded">
            <p className="">
              - User requests are processed once every 5 minutes.
            </p>
            <p className="">
              - To request a new media, please select its type (movie or tv) and
              enter its tmdb id.
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
            {/* <p className="">
              - You can request 3 new media per day. The timer resets at 12am
              UTC.
            </p> */}
            {/* <p className="">- Current UTC time: {formattedUtcTime}</p> */}
          </div>
        )}
        {/** choose find OR submit */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex gap-2 flex-grow">
            <div
              ref={containerRef}
              onClick={() => setIsFindDropdownOpen(!isFindDropdownOpen)}
              className="relative flex justify-between rounded bg-gray-800 cursor-pointer text-xs font-semibold"
            >
              <div className="w-12 pl-3 flex items-center justify-center">
                {findOrSubmit === 'find' ? 'Find' : 'Submit'}
              </div>
              <div className="p-2">
                <IoIosArrowDown size={20} />
              </div>
              {/** dropdown */}
              {isFindDropdownOpen && (
                <div className="absolute z-10 bottom-full mb-2 w-full flex flex-col bg-gray-800 rounded p-2 max-h-96 overflow-y-auto scrollbar-thin">
                  {findOrSubmitOptions.map((option) => (
                    <button
                      key={option.input}
                      onClick={() => setFindOrSubmit(option.input)}
                      className={`w-full text-start p-2 rounded cursor-pointer hover:text-blue-400 hover:bg-gray-900 ${
                        findOrSubmit === option.input ? 'text-blue-400' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/** media type selector */}
            <div
              ref={containerRef}
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className="relative flex justify-between rounded bg-gray-800 cursor-pointer text-xs font-semibold"
            >
              <div className="w-12 pl-3 flex items-center justify-center">
                {mediaType === 'movie' ? 'Movie' : 'TV'}
              </div>
              <div className="p-2">
                <IoIosArrowDown size={20} />
              </div>
              {/** dropdown */}
              {isTypeDropdownOpen && (
                <div className="absolute z-10 bottom-full mb-2 w-full flex flex-col bg-gray-800 rounded p-2 max-h-96 overflow-y-auto scrollbar-thin">
                  {mediaTypeOptions.map((option) => (
                    <button
                      key={option.input}
                      onClick={() => setMediaType(option.input)}
                      className={`w-full text-start p-2 rounded cursor-pointer hover:text-blue-400 hover:bg-gray-900 ${
                        mediaType === option.input ? 'text-blue-400' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/** title input OR tmdb id input */}
            {findOrSubmit === 'find' ? (
              <input
                type="text"
                placeholder="Enter title..."
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="flex-grow rounded bg-gray-800 px-3 py-2 outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            ) : (
              <input
                type="number"
                placeholder="Enter tmdb id..."
                value={tmdbIdInput}
                onChange={(e) => setTmdbIdInput(e.target.value)}
                className="flex-grow rounded bg-gray-800 px-3 py-2 outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            )}
          </div>
          {/** find button OR submit button */}
          <button
            type="submit"
            disabled={submitTmdbIdMutation.isPending}
            className="min-w-32 rounded bg-blue-600 px-4 py-2 font-semibold text-gray-300 transition hover:bg-blue-500"
          >
            {submitTmdbIdMutation.isPending ? 'Submitting...' : 'Submit'}
          </button>
        </div>
        {/** find result table OR submit message */}
        {message && (
          <div className="w-full p-4 bg-gray-800 rounded">
            <p
              className={`${
                message.isError ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
