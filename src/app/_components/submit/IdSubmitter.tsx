// ~/app/_components/user/IdSubmitter.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '~/trpc/react';
import { TRPCClientError } from '@trpc/client';
import Link from 'next/link';
import { IoIosArrowDown } from 'react-icons/io';

export default function IdSubmitter() {
  const { data: session } = useSession();

  // --- START: UTC TIMER LOGIC ---

  // 1. Add state to hold the current UTC time as a Date object.
  const [utcTime, setUtcTime] = useState(new Date());

  // 2. Set up an effect to update the time every minute.
  useEffect(() => {
    // Set an interval to create a new Date object every 60 seconds.
    const timerId = setInterval(() => {
      setUtcTime(new Date());
    }, 60000); // 60000 milliseconds = 1 minute

    // Cleanup function: This runs when the component unmounts to prevent memory leaks.
    return () => {
      clearInterval(timerId);
    };
  }, []); // The empty array [] ensures this effect runs only once when the component mounts.

  // 3. Format the Date object into the desired string format.
  const year = utcTime.getUTCFullYear();
  // getUTCMonth() is 0-indexed (0=Jan), so we add 1.
  const month = String(utcTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcTime.getUTCDate()).padStart(2, '0');
  const hours = String(utcTime.getUTCHours()).padStart(2, '0');
  const minutes = String(utcTime.getUTCMinutes()).padStart(2, '0');

  const formattedUtcTime = `${year}/${month}/${day} ${hours}:${minutes}`;

  const [tmdbIdInput, setTmdbIdInput] = useState('');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [showInfo, setShowInfo] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
        setIsDropdownOpen(false);
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
          const mediaInfo = data.mediaInfo;
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
            }. Availability: ${
              data.mediaInfo.availabilityCount <= 0
                ? 'not available yet'
                : mediaType === 'tv'
                ? `${data.mediaInfo.availabilityCount}/${data.mediaInfo.airedEpisodeCount}`
                : 'available'
            }`,
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

    // 1. Check if user is logged in
    if (!session?.user) {
      alert('You must be logged in to submit an ID.');
      return;
    }

    // 2. If logged in, call the mutation
    const tmdbId = Number(tmdbIdInput);
    if (isNaN(tmdbId) || tmdbId <= 0) {
      setMessage({ text: 'Please enter a valid TMDB ID.', isError: true });
      return;
    }

    submitTmdbIdMutation.mutate({ tmdbId, type: mediaType });
  };

  const mediaTypeOptions: { label: string; input: 'movie' | 'tv' }[] = [
    { label: 'Movie', input: 'movie' },
    { label: 'TV', input: 'tv' },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="basis-0 flex-grow flex flex-col gap-3"
    >
      <div
        onClick={() => setShowInfo(!showInfo)}
        className={`flex cursor-pointer gap-2 transition ${
          showInfo ? `text-blue-400` : `hover:text-blue-400`
        }`}
      >
        <div className="flex items-center justify-center font-bold">
          REQUEST NEW MEDIA
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
            <p className="">
              - User requests are processed together at around 12am to 1am UTC
              everyday.
            </p>
            <p className="">- Current UTC time: {formattedUtcTime}</p>
          </div>
        )}
        {session?.user ? (
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex gap-2 flex-grow">
              {/** media type selector */}
              <div
                ref={containerRef}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="relative flex justify-between rounded bg-gray-800 cursor-pointer text-xs font-semibold"
              >
                <div className="w-12 pl-3 flex items-center justify-center">
                  {mediaType === 'movie' ? 'Movie' : 'TV'}
                </div>
                <div className="p-2">
                  <IoIosArrowDown size={20} />
                </div>
                {/** dropdown */}
                {isDropdownOpen && (
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
              {/** tmdb id input */}
              <input
                type="number"
                placeholder="Enter tmdb id..."
                value={tmdbIdInput}
                onChange={(e) => setTmdbIdInput(e.target.value)}
                className="flex-grow rounded bg-gray-800 px-3 py-2 outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {/** submit button */}
            <button
              type="submit"
              disabled={submitTmdbIdMutation.isPending}
              className="min-w-32 rounded bg-blue-600 px-4 py-2 font-semibold text-gray-300 transition hover:bg-blue-500"
            >
              {submitTmdbIdMutation.isPending ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        ) : (
          <p className="rounded text-sm bg-gray-800 px-4 py-2 ">
            Please{' '}
            <Link
              href="/api/auth/signin"
              className="underline text-blue-400 cursor-pointer"
            >
              login
            </Link>{' '}
            to request a media.
          </p>
        )}

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
