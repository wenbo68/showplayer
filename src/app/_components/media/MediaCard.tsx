"use client";

import React from "react";
import Image from "next/image";
import type { Media } from "~/type";

interface MediaCardProps {
  data: Media;
}

export const MediaCard: React.FC<MediaCardProps> = ({ data }) => (
  <div className="border rounded-lg p-4 shadow">
    <Image
      src={data.imageUrl}
      alt={data.title}
      width={300}
      height={180}
      className="rounded"
    />
    <h3 className="mt-2 font-semibold">{data.title}</h3>
    <p className="text-sm text-gray-600">{data.type}</p>
    <p className="text-gray-700">{data.description.substring(0, 100)}…</p>
  </div>
);
