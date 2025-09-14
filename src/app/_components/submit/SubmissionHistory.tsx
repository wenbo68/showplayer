'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { IoIosArrowDown } from 'react-icons/io';
import { api } from '~/trpc/react';

export default function SubmissionHistory() {
  const { data: session } = useSession();
  const {
    data: submissions,
    // isLoading: isHistoryLoading,
    // isError: isHistoryError,
  } = api.user.getUserSubmissions.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const [showInfo, setShowInfo] = useState(false);

  // const statusColors: { [key: string]: string } = {
  //   pending: 'bg-yellow-500/20 text-yellow-300',
  //   success: 'bg-green-500/20 text-green-300',
  //   failure: 'bg-red-500/20 text-red-300',
  // };

  return (
    session?.user && (
      <div className="basis-0 flex-grow flex flex-col gap-4">
        <div
          onClick={() => setShowInfo(!showInfo)}
          className={`flex cursor-pointer gap-2 transition ${
            showInfo ? `text-blue-400` : `hover:text-blue-400`
          }`}
        >
          <div className="flex items-center justify-center font-bold">
            SUBMISSION HISTORY
          </div>
          <div className="flex items-center justify-center">
            <IoIosArrowDown size={20} />
          </div>
        </div>
        <div className="flex flex-col gap-4 text-sm">
          {/** fyi */}
          {showInfo && (
            <div className="p-4 bg-gray-800 rounded">
              <p>
                - The submission history shows your requests from the past 7
                days.
              </p>
              <p>- The submitted and processed columns show UTC timestamps.</p>
              <p>- Pending means the request is not yet processed.</p>
              <p>
                - Failure means the request media could not be found or added.
              </p>
              <p>
                - Success means the requested media is added. If the media
                doesn't show up in search, it doesn't have watchable sources
                yet. It will show up once at least 1 source is available.
              </p>
            </div>
          )}
          {/** table */}
          <div className="max-h-[50vh] overflow-y-auto overflow-x-auto rounded bg-gray-800 px-4 py-2 scrollbar-thin">
            {/* {isHistoryLoading && <p>Loading history...</p>}
            {isHistoryError && (
              <p className="text-red-400">Failed to load history.</p>
            )} */}
            {submissions && submissions.length === 0 && (
              <p>No submissions found.</p>
            )}
            {submissions && submissions.length > 0 && (
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="">
                    <th className="p-2">Type</th>
                    <th className="p-2">ID</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Submitted</th>
                    <th className="p-2">Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id} className={`border-t border-gray-700`}>
                      <td className="p-2 capitalize">{sub.mediaType}</td>
                      <td className="p-2">{sub.tmdbId}</td>
                      <td className="p-2">
                        <span
                        // className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        //   statusColors[sub.status] ?? 'bg-gray-600'
                        // }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-2">
                        {new Date(sub.createdAt).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                        })}
                      </td>
                      <td className="p-2">
                        {sub.processedAt
                          ? new Date(sub.processedAt).toLocaleDateString(
                              'ja-JP',
                              {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: 'numeric',
                              }
                            )
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )
  );
}
