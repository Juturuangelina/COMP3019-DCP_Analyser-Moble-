/*export function history(posts: { date: Date; active: boolean }[]): string[] {
  // Implement per specification
  // Return the ordered list of "month, year" strings sorted from most recent to oldes
  // consider only active posts

  return [];
}*/

export async function history(
  posts: { date: Date; active: boolean }[],
): Promise<{ month: number; year: number; count: number }[]> {
  return posts
    .filter((p) => p.active)
    .reduce(
      (acc, post) => {
        const month = post.date.getMonth() + 1;
        const year = post.date.getFullYear();
        const existing = acc.find((h) => h.month === month && h.year === year);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ month, year, count: 1 });
        }
        return acc;
      },
      [] as { month: number; year: number; count: number }[],
    )
    .sort((a, b) => b.year - a.year || b.month - a.month);
}
