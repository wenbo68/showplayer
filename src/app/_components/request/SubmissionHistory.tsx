'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { IoIosArrowDown } from 'react-icons/io';
import { useSessionStorageState } from '~/app/_hooks/sessionStorageHooks';
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

  const [showInfo, setShowInfo] = useSessionStorageState(
    'showSubmitHistInfo',
    true
  );

  return (
    <div className="basis-0 flex-grow flex flex-col gap-4">
      <div
        onClick={() => setShowInfo(!showInfo)}
        className={`flex cursor-pointer gap-2 transition ${
          showInfo ? `text-blue-400` : `hover:text-blue-400`
        }`}
      >
        <div className="text-gray-300 flex items-center justify-center font-bold">
          REQUEST HISTORY
        </div>
        <div className="flex items-center justify-center">
          <IoIosArrowDown size={20} />
        </div>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        {/** fyi */}
        {showInfo && (
          <div className="p-4 bg-gray-800 rounded">
            <p>
              - This request history shows your requests from the past 7 days.
              There are 3 statuses:
            </p>
            <p>- 1: Pending means the request is not yet processed.</p>
            <p>
              - 2: Failure means the request media could not be found or added.
            </p>
            <p>
              - 3: Success means the requested media was added. However, the
              media can only be watched with ads until Showplayer finds/adds
              sources without ads.
            </p>
            <p>
              - Showplayer starts finding/adding sources without ads for all new
              media at 11:59PM UTC daily.
            </p>
          </div>
        )}

        {/** table */}
        <div className="max-h-[75vh] overflow-y-auto overflow-x-auto rounded bg-gray-800 px-4 py-2 scrollbar-thin">
          {submissions && submissions.length === 0 && <p>No requests found.</p>}
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
                    <td className="p-2 whitespace-nowrap">{sub.status} </td>
                    <td className="p-2 whitespace-nowrap">
                      {/* --- CORRECTED FORMATTING --- */}
                      {new Date(sub.createdAt).toLocaleString('ja-JP', {
                        timeZone: 'UTC', // Display in UTC
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: false, // Use 24-hour format
                      })}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {sub.processedAt
                        ? new Date(sub.processedAt).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: false,
                          })
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
  );
}
