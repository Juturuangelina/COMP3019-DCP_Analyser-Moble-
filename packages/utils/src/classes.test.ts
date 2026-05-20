import { expect, test } from "vitest";
import { cx } from "./classes.js";

test("classes correctly combines classes", () => {
  expect(cx("a", "b", "c")).toBe("a b c");
  expect(cx("a", null, undefined)).toBe("a");
  expect(cx("a", { b: true, c: false, d: null })).toBe("a b");
});
