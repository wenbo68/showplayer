'use client';

import { useMemo } from 'react';
import { api } from '~/trpc/react';
import type { UserList } from '~/type';

export function useIsMediaInUserList(
  pageMediaIds: string[],
  mediaId: string,
  listType: UserList
) {
  // useMemo ensures the mediaIds array reference is stable, preventing unnecessary query refetches.
  const stableMediaIds = useMemo(
    () => ({ mediaIds: pageMediaIds }),
    [pageMediaIds]
  );

  const { data: result } = api.media.getUserDetailsForMediaList.useQuery(
    stableMediaIds,
    {
      // use select so that MediaButton will only rerender when the list status for this media changes
      select: (data) => data.get(mediaId)?.includes(listType) ?? false,
    }
  );
  return result;
}
