import { BackButton } from '../_components/BackButton';

export default async function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 text-center">
      <BackButton />
      {children}
    </section>
  );
}
