// app/_contexts/MediaPopupContext.tsx

'use client';

import { createContext, useState, useContext, type ReactNode } from 'react';
import type { ListMedia } from '~/type';
import { MediaPopup } from '../_components/media/MediaPopup';

interface MediaPopupContextType {
  // Change the function signature
  openPopup: (pageMediaIds: string[], media: ListMedia) => void;
}

const MediaPopupContext = createContext<MediaPopupContextType | undefined>(
  undefined
);

export function MediaPopupProvider({ children }: { children: ReactNode }) {
  const [selectedMedia, setSelectedMedia] = useState<ListMedia | null>(null);
  // Also store the media IDs for the current page context
  const [pageMediaIds, setPageMediaIds] = useState<string[]>([]);

  const openPopup = (ids: string[], media: ListMedia) => {
    setSelectedMedia(media);
    setPageMediaIds(ids);
  };

  const closePopup = () => {
    setSelectedMedia(null);
    setPageMediaIds([]); // Clear the IDs on close
  };

  return (
    <MediaPopupContext.Provider value={{ openPopup }}>
      {children}
      {selectedMedia && (
        <MediaPopup
          pageMediaIds={pageMediaIds}
          mediaDetail={selectedMedia}
          onClose={closePopup}
        />
      )}
    </MediaPopupContext.Provider>
  );
}

// ... useMediaPopup hook remains the same for now, but we'll call its method differently
export function useMediaPopup() {
  const context = useContext(MediaPopupContext);
  if (context === undefined) {
    throw new Error('useMediaPopup must be used within a MediaPopupProvider');
  }
  return context;
}
