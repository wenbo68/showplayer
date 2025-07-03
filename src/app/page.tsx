import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { MediaList } from "~/app/_components/media/MediaList";

export default async function Home() {
  // const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (session?.user) {
    void api.media.list.prefetch({ type: undefined });
  }

  return (
    <HydrateClient>
      <main className="p-8">
        <h1 className="text-4xl font-bold mb-6">All Media</h1>
        <MediaList />
      </main>
    </HydrateClient>
  );
}
