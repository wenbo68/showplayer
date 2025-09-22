export default async function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <section className="py-2 flex flex-col gap-4">{children}</section>;
}
