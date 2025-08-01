'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export function VideoPlayer({ src }: { src?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (Hls.isSupported() && videoRef.current && src) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
    }
  }, [src]);

  if (!src) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center text-white">
        Source URL not found.
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      className="w-full aspect-video rounded bg-black"
    />
  );
}
