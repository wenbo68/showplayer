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
    <section className="py-2 flex flex-col justify-center gap-8">
      <SearchBar filterOptions={filterOptions} showOrder={true} />
      <ActiveLabels filterOptions={filterOptions} />
      {children}
    </section>
  );
}
