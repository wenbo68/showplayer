'use client';

export default function Backdrop({
  backdropUrl,
}: {
  backdropUrl: string | null;
}) {
  return (
    backdropUrl && (
      <div
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/w1280${backdropUrl})`,
        }}
        className="absolute inset-0 bg-cover bg-center -z-10 brightness-18"
      />
    )
  );
}
