"use client";

import React from "react";

import { MediaDetail } from "~/app/_components/media/MediaDetail";

interface Props {
  params: { type: string; id: string };
}

export default function DetailPage({ params }: Props) {
  return (
    <main className="p-8">
      <MediaDetail id={params.id} />
    </main>
  );
}
