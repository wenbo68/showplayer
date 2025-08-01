// // app/anime/[id]/[[...episode]]/page.tsx
// import { api } from '~/trpc/server'; // Adjust this import path to your tRPC server client setup
// import { notFound } from 'next/navigation';
// import Link from 'next/link';

// interface AnimePageProps {
//   params: {
//     slug: string[]; // This will be an array like ['some-id'] or ['some-id', 'some-episode']
//   };
// }

// export default async function AnimePage({ params }: AnimePageProps) {
//   const { slug } = await params;

//   const idParam = slug[0]; // The first segment is the media ID

//   // --- 1. Validate Media ID from URL ---
//   if (!idParam) {
//     notFound(); // If no ID is provided, consider it a 404
//   }

//   // --- 2. Fetch Media Details from your tRPC procedure ---
//   let mediaInfo;
//   try {
//     mediaInfo = await api.media.fetchAnilistMediaById({ id: idParam });
//     if (!mediaInfo) {
//       throw new Error(`Media with ID ${idParam} not found`);
//     }
//   } catch (error) {
//     console.error('Failed to fetch media details:', error);
//     // If the media is not found or an error occurs during fetch, show a 404 page
//     notFound();
//   }

//   // --- 3. Determine Current Episode Number ---
//   let episode: number = 1; // Default to episode 1 if not specified in URL

//   if (slug[1]) {
//     const parsedEpisode = parseInt(slug[1], 10);
//     // Ensure the parsed episode is a valid number and at least 1
//     if (!isNaN(parsedEpisode) && parsedEpisode >= 1) {
//       episode = parsedEpisode;
//     } else {
//       // Handle invalid episode numbers in URL (e.g., /anime/id/abc)
//       console.warn(
//         `Invalid episode number in URL: ${slug[1]}. Defaulting to 1.`
//       );
//       // You could also redirect to /anime/id/1 here if desired
//     }
//   }

//   // --- 4. Validate Current Episode against Total Episodes ---
//   if (episode > mediaInfo.episodes) {
//     // If the requested episode is beyond the total available,
//     // default to the last valid episode or episode 1 if no episodes.
//     console.warn(
//       `Requested episode ${episode} is out of bounds for ${mediaInfo.episodes} episodes. Adjusting.`
//     );
//     episode = mediaInfo.episodes > 0 ? mediaInfo.episodes : 1;
//   }

//   // --- 5. Construct Video Player Source URL ---
//   // Use media.anilistId for the video player if videasy.net expects the Anilist ID (which is a number)
//   // Otherwise, if it expects your database string ID, use `media.id`.
//   const videoPlayerBaseId = mediaInfo.anilistId; // Or media.id if your videasy.net player uses your internal string ID
//   const videoSrc = `https://vidjoy.pro/embed/tv/${videoPlayerBaseId}${
//     mediaInfo.type === 'MOVIE' ? '' : `/${episode}`
//   }`;

//   // --- 6. Generate Episode List for Navigation ---
//   const episodeList = Array.from(
//     { length: mediaInfo.episodes },
//     (_, i) => i + 1
//   );

//   return (
//     <div className="container mx-auto p-4 max-w-4xl">
//       <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
//         {mediaInfo.title}
//       </h1>
//       {mediaInfo.description && (
//         <p
//           className="text-base md:text-lg text-gray-700 mb-6"
//           dangerouslySetInnerHTML={{ __html: mediaInfo.description }}
//         ></p>
//       )}

//       {/* Video Player Embed */}
//       <div
//         style={{
//           position: 'relative',
//           paddingBottom: '56.25%',
//           height: 0,
//           marginBottom: '2rem',
//           borderRadius: '8px',
//           overflow: 'hidden',
//         }}
//       >
//         <iframe
//           src={videoSrc}
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             width: '100%',
//             height: '100%',
//             border: 'none',
//           }}
//           frameBorder="0"
//           allowFullScreen
//           title={`${mediaInfo.title} - Episode ${episode}`}
//           loading="lazy" // Improve performance by lazy loading iframe
//         ></iframe>
//       </div>

//       {/* Episode List */}
//       <h2 className="text-2xl font-semibold mb-3 text-gray-800">Episodes</h2>
//       <div className="flex flex-wrap gap-2 mb-8">
//         {episodeList.map((ep) => (
//           <Link
//             key={ep}
//             href={`/anime/${idParam}/${ep}`} // Link to the specific episode
//             className={`px-4 py-2 rounded-md transition-colors duration-200 ${
//               ep === episode
//                 ? 'bg-blue-600 text-white font-semibold shadow-md' // Highlight active episode
//                 : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
//             }`}
//           >
//             {ep}
//           </Link>
//         ))}
//       </div>

//       {/* Optional: Display other media details */}
//       <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
//         <h3 className="text-xl font-semibold mb-3 text-gray-800">Details</h3>
//         <p className="text-gray-700 mb-2">
//           <span className="font-medium">Type:</span> {mediaInfo.type}
//         </p>
//         <p className="text-gray-700 mb-2">
//           <span className="font-medium">Total Episodes:</span>{' '}
//           {mediaInfo.episodes}
//         </p>
//         {mediaInfo.imageUrl && (
//           <div className="mt-4">
//             <img
//               src={mediaInfo.imageUrl}
//               alt={mediaInfo.title}
//               className="w-full max-w-[150px] h-auto rounded-lg shadow-sm"
//             />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
