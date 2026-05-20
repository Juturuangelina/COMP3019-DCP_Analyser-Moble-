import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { Button } from "./button.js";

test("renders name", async () => {
  const { getByText } = render(<Button>Hello</Button>);
  await expect.element(getByText("Hello")).toBeInTheDocument();
});

test("can click", async () => {
  const spy = vi.fn();
  const { getByText } = render(<Button onClick={spy}>Clicker</Button>);
  const button = getByText("Clicker");

  expect(spy).not.toHaveBeenCalled();

  await button.click();

  expect(spy).toHaveBeenCalled();
});
