import { api } from '~/trpc/server';
import { auth } from '~/server/auth';

export default async function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="py-2 flex flex-col justify-center gap-8 sm:gap-9 md:gap-10 lg:gap-11 xl:gap-12">
      {children}
    </section>
  );
}
