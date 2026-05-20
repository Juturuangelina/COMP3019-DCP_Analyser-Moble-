// import { posts, type Post } from "../components/data";
/*
export async function tags(posts: { tags: string; active: boolean }[]) {
  // TODO: Implement per specification
  return [];
}
*/

export async function tags(
  posts: { tags: string; active: boolean }[],
): Promise<{ name: string; count: number }[]> {
  return posts
    .filter((p) => p.active)
    .flatMap((p) => p.tags.split(",").map((t) => t.trim()))
    .reduce(
      (acc, tag) => {
        const existing = acc.find((t) => t.name === tag);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ name: tag, count: 1 });
        }
        return acc;
      },
      [] as { name: string; count: number }[],
    );
}