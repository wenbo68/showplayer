// server/lib/anilist.ts
import fetch from "node-fetch";

interface AniListPage {
  Page: {
    media: Array<{
      id: number;
      title: { userPreferred: string };
      description: string;
      coverImage: { extraLarge: string };
      episodes?: number;
      startDate?: { year?: number; month?: number; day?: number };
    }>;
    pageInfo: { hasNextPage: boolean };
  };
}

const ANILIST_URL = "https://graphql.anilist.co";

export async function fetchAniListAnime(page = 1) {
  const query = `
    query ($page: Int) {
      Page(page: $page, perPage: 50) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          title { userPreferred }
          description(asHtml: false)
          coverImage { extraLarge }
          episodes
          startDate { year month day }
        }
        pageInfo { hasNextPage }
      }
    }
  `;
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { page } }),
  });
  const json = (await res.json()) as AniListPage; // assert type
  return json.Page;
}

export async function fetchPopularAnime(page = 1) {
  const query = `
    query ($page: Int) {
      Page(page: $page, perPage: 50) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          title {
            userPreferred
          }
          description(asHtml: false)
          coverImage {
            extraLarge
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `;
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { page } }),
  });
  const json = (await res.json()) as AniListPage; // assert type
  return json.Page;
}
