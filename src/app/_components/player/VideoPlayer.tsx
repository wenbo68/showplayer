'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import type { Episode, Media } from '~/type';

interface Subtitle {
  lang: string;
  label: string;
  content: string;
  default: boolean;
}

interface VideoPlayerProps {
  movie?: Media;
  episode?: Episode;
  src?: string;
  subtitles?: Subtitle[];
}

interface TrackData {
  src: string;
  label: string;
  srcLang: string;
  default: boolean;
}

export function VideoPlayer({
  movie,
  episode,
  src,
  subtitles,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tracks, setTracks] = useState<TrackData[]>([]);

  // setup hls.js
  useEffect(() => {
    if (Hls.isSupported() && videoRef.current && src) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
    }
  }, [src]);

  // Effect for creating and cleaning up subtitle Blob URLs
  useEffect(() => {
    // If there are no subtitles, do nothing.
    if (!subtitles || subtitles.length === 0) {
      setTracks([]); // Clear any existing tracks
      return;
    }

    // Create a Blob URL for each subtitle string.
    const subtitleTracks = subtitles.map((subtitle) => {
      const blob = new Blob([subtitle.content], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);
      return {
        src: url,
        srcLang: subtitle.lang,
        label: subtitle.label,
        default: subtitle.default,
      };
    });
    setTracks(subtitleTracks);

    // IMPORTANT: Cleanup function to revoke the Blob URLs and prevent memory leaks.
    return () => {
      for (const track of subtitleTracks) {
        URL.revokeObjectURL(track.src);
      }
    };
  }, [subtitles]); // Rerun this effect if the subtitles prop changes

  const isReleased = movie
    ? movie.releaseDate
      ? new Date(movie.releaseDate) <= new Date()
      : false
    : episode?.airDate
    ? new Date(episode?.airDate) <= new Date()
    : false;

  if (!src) {
    return (
      <div className="aspect-video flex items-center justify-center">
        {isReleased ? `Not Yet Available.` : `Not Yet Released.`}
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      crossOrigin="anonymous"
      className="w-full aspect-video rounded bg-black"
    >
      {tracks.map((track, index) => (
        <track
          key={index}
          kind="subtitles"
          src={track.src}
          srcLang={track.srcLang}
          label={track.label}
          default={track.default}
        />
      ))}
    </video>
  );
}
