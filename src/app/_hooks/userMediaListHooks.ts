'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { api } from '~/trpc/react';
import type { UserList } from '~/type';

export function useIsMediaInUserList(
  pageMediaIds: string[],
  mediaId: string,
  listType: UserList
) {
  const { data: session } = useSession();

  // useMemo ensures the mediaIds array reference is stable, preventing unnecessary query refetches.
  const stableMediaIds = useMemo(
    () => ({ mediaIds: pageMediaIds }),
    [pageMediaIds]
  );

  const { data: result } = api.user.getUserDetailsForMediaList.useQuery(
    stableMediaIds,
    {
      // use select so that MediaButton will only rerender when the list status for this media changes
      select: (data) => data.get(mediaId)?.includes(listType) ?? false,
      // Only enable the query if a user is logged in
      // The '!!' converts the session object (or null) to a boolean
      enabled: !!session?.user,
    }
  );
  return result;
}
