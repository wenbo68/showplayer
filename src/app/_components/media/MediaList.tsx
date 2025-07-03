"use client";

import React from "react";
import { MediaCard } from "./MediaCard";
import { api } from "~/trpc/react";

interface MediaListProps {
  type?: "show" | "movie" | "anime";
}

export const MediaList: React.FC<MediaListProps> = ({ type }) => {
  const { data, isLoading, error } = api.media.list.useQuery({ type });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!data?.length) return <p>No {type || "media"} found.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {data.map((m) => (
        <MediaCard key={m.id} data={m} />
      ))}
    </div>
  );
};
