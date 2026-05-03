import { describe, expect, it } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/primitives/ThemeToggle";

describe("ThemeToggle", () => {
  it("starts at the initial theme and flips on click", () => {
    const { getByRole } = render(<ThemeToggle initial="light" />);
    expect(document.documentElement.dataset.theme).toBe("light");
    fireEvent.click(getByRole("button"));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
