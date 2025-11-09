import { api } from '~/trpc/server';
import SearchBar from '../_components/search/searchbar/SearchBar';
import ActiveLabels from '../_components/search/label/ActiveLabels';

export default async function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const filterOptions = await api.media.getFilterOptions(); // Or pass them down differently

  return (
    <section className="flex flex-col justify-center gap-8 sm:gap-9 md:gap-10 lg:gap-11 xl:gap-12">
      <span className="bg-gray-800 rounded p-2 text-gray-300 text-center text-sm font-medium">
        2025/11/09: The ad-free options no longer work. Please use options with
        popups instead. Thank you for your continued support.
      </span>
      <SearchBar filterOptions={filterOptions} showOrder={true} />
      <ActiveLabels filterOptions={filterOptions} />
      {children}
    </section>
  );
}
