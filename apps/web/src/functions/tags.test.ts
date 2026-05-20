import { expect, test } from "vitest";
import { tags } from "./tags";

test("returns empty array if no posts are provides", async () => {
  await expect(await tags([])).toEqual([]);
});

test("returns tags with count", async () => {
  await expect(
    await tags([
      { tags: "A,B", active: true },
      { tags: "A,C", active: true },
      { tags: "C", active: true },
      {
        tags: "D",
        active: false,
      },
    ]),
  ).toEqual([
    { name: "A", count: 2 },
    { name: "B", count: 1 },
    { name: "C", count: 2 },
  ]);
});
