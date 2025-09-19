'use client';

import { api } from '~/trpc/react';
import { FaHeart } from 'react-icons/fa6';
import { useState } from 'react';
import { useIsMediaInUserList } from '~/app/_hooks/userMediaListHooks';
// import type { UserList } from '~/type';
import { useSession } from 'next-auth/react';
import type { UserList } from '~/server/db/schema';

export function AddToUserListButton({
  pageMediaIds,
  mediaId,
  listType,
}: {
  pageMediaIds: string[];
  mediaId: string;
  listType: UserList;
}) {
  const { data: session } = useSession(); // 2. Get user's session status
  const isInUserList = useIsMediaInUserList(pageMediaIds, mediaId, 'saved');
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const utils = api.useUtils();
  const updateMediaInUserList = api.user.updateMediaInUserList.useMutation({
    onMutate: async ({ mediaId, listType, desiredState }) => {
      // 1. Cancel ongoing refetches to prevent overwriting our optimistic update
      await utils.user.getUserDetailsForMediaList.cancel({
        mediaIds: pageMediaIds,
      });

      // 2. Snapshot the previous data
      const oldUserDetails = utils.user.getUserDetailsForMediaList.getData({
        mediaIds: pageMediaIds,
      });

      // 3. Optimistically update the cache
      if (oldUserDetails) {
        const newUserDetails = new Map(oldUserDetails);
        const oldUserDetail = newUserDetails.get(mediaId) ?? [];
        const newUserDetail = desiredState
          ? [...new Set([...oldUserDetail, listType])] // Add to list
          : oldUserDetail.filter((list) => list !== listType); // Remove from list
        newUserDetails.set(mediaId, newUserDetail);
        utils.user.getUserDetailsForMediaList.setData(
          { mediaIds: pageMediaIds },
          newUserDetails
        );
      }

      return { oldUserDetails };
    },
    // 4. On error, roll back to the previous data
    onError: (err, variables, context) => {
      if (context?.oldUserDetails) {
        utils.user.getUserDetailsForMediaList.setData(
          { mediaIds: pageMediaIds },
          context.oldUserDetails
        );
      }
    },
    // 5. After mutation settles, invalidate the cache to refetch from the server
    onSettled: () => {
      utils.user.getUserDetailsForMediaList.invalidate({
        mediaIds: pageMediaIds,
      });
    },
  });

  // For now we only have a 'saved' list for users
  if (listType !== 'saved') return null;

  const handleClick = () => {
    // 3. Check for a session inside the click handler
    if (session?.user) {
      // If logged in, perform the mutation
      setButtonDisabled(true);
      updateMediaInUserList.mutate({
        mediaId: mediaId,
        listType: listType,
        desiredState: !isInUserList,
      });
      setTimeout(() => setButtonDisabled(false), 500);
    } else {
      // If not logged in, show an alert
      alert('Need to login');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={buttonDisabled}
      className={`cursor-pointer rounded-lg p-3 text-gray-300 transition-colors ${
        isInUserList
          ? 'bg-pink-700 hover:bg-pink-600'
          : 'bg-gray-700 hover:bg-gray-600'
      }`}
      aria-label={isInUserList ? 'Remove from saved' : 'Add to saved'}
      title={
        session?.user
          ? isInUserList
            ? 'Remove from saved'
            : 'Add to saved'
          : 'Log in to save'
      }
    >
      <FaHeart />
    </button>
  );
}
