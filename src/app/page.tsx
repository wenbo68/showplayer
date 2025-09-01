import { api, HydrateClient } from '~/trpc/server';
import TmdbAdmin from './_components/TmdbAdmin';
import RankedList from './_components/media/RankedList';
import SearchBar from './_components/search/SearchBar';

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center p-4 gap-8">
        <TmdbAdmin />

        {/* Always display search and filter controls */}
        <SearchBar />

        {/* 1. Trending List */}
        <RankedList
          viewMode="preview"
          mediaType="trending"
          // viewAllLink="/trending"
        />

        {/* 2. Top Rated Movies List */}
        <RankedList
          viewMode="preview"
          mediaType="top mv"
          // viewAllLink="/top/movie"
        />

        {/* 3. Top Rated TV List */}
        <RankedList
          viewMode="preview"
          mediaType="top tv"
          // viewAllLink="/top/tv"
        />
      </main>
    </HydrateClient>
  );
}
