"use client";

import React from "react";
import Image from "next/image";
import { api } from "~/trpc/react";

interface MediaDetailProps {
  id: string;
}

export const MediaDetail: React.FC<MediaDetailProps> = ({ id }) => {
  const { data, isLoading, error } = api.media.byId.useQuery({ id });
  if (isLoading) return <p>Loading…</p>;
  if (error || !data) return <p>Not found.</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <Image
        src={data.imageUrl}
        alt={data.title}
        width={600}
        height={360}
        className="rounded"
      />
      <h1 className="mt-4 text-2xl font-bold">{data.title}</h1>
      <p className="text-sm text-gray-500">{data.type}</p>
      <p className="mt-2">{data.description}</p>
    </div>
  );
};
