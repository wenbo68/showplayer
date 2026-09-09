'use client';

import type { Episode, Media } from '~/type';

interface VideoPlayerProps {
  movie?: Media;
  episode?: Episode;
  src: string;
}

export function VideoPlayer({ movie, episode, src }: VideoPlayerProps) {
  const isReleased = movie
    ? movie.releaseDate
      ? new Date(movie.releaseDate) <= new Date()
      : false
    : episode?.airDate
    ? new Date(episode?.airDate) <= new Date()
    : false;

  if (!isReleased) {
    return (
      <div className="aspect-video flex items-center justify-center">
        Not Yet Released.
      </div>
    );
  }

  return (
    <iframe
      src={src}
      className="w-full aspect-video rounded bg-black"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    ></iframe>
  );
}
