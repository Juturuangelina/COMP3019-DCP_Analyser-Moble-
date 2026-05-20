import { expect, test } from "vitest";
import { history } from "./history";

test("returns empty array if no history are provides", async () => {
  await expect(await history([])).toEqual([]);
});

test("returns sorted counts by year and month", async () => {
  await expect(
    await history([
      { date: new Date("01 Jan 2022"), active: true },
      { date: new Date("08 Jan 2022"), active: true },
      { date: new Date("07 Jan 2022"), active: true },
      { date: new Date("07 Mar 2020"), active: true },
      { date: new Date("07 Apr 2020"), active: true },
      { date: new Date("07 May 2024"), active: true },
      { date: new Date("01 Jan 2012"), active: false },
    ]),
  ).toEqual([
    { month: 5, year: 2024, count: 1 },
    { month: 1, year: 2022, count: 3 },
    { month: 4, year: 2020, count: 1 },
    { month: 3, year: 2020, count: 1 },
  ]);
});
