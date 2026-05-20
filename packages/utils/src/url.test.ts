import { expect, test } from "vitest";
import { toUrlPath } from "./url.js";

test("converts path to URL-friendly format", () => {
  expect(toUrlPath("Hello World!")).toBe("hello-world");
  expect(toUrlPath("This is a test")).toBe("this-is-a-test");
  expect(toUrlPath("Multiple---hyphens")).toBe("multiple-hyphens");
  expect(toUrlPath("Leading and trailing hyphens-")).toBe(
    "leading-and-trailing-hyphens",
  );
  expect(toUrlPath("Special@#%characters")).toBe("special-characters");
  expect(toUrlPath("UPPERCASE and lowercase")).toBe("uppercase-and-lowercase");
  expect(toUrlPath("")).toBe("");
});
