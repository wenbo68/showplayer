"use client";

import React from "react";

import { MediaList } from "~/app/_components/media/MediaList";

interface Props {
  params: { type: string };
}

export default function TypePage({ params }: Props) {
  const type = params.type as "show" | "movie" | "anime";
  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold mb-6">
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </h1>
      <MediaList type={type} />
    </main>
  );
}
