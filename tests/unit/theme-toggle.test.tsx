import { describe, expect, it } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { ThemeToggle } from "@/components/primitives/ThemeToggle";

describe("ThemeToggle", () => {
  it("starts at the initial theme and switches via menu", () => {
    render(<ThemeToggle initial="light" />);
    expect(document.documentElement.dataset.theme).toBe("light");
    fireEvent.click(screen.getByRole("button", { name: /theme: light/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Forest" }));
    expect(document.documentElement.dataset.theme).toBe("forest");
  });

  it("offers 5 theme options", () => {
    render(<ThemeToggle initial="dark" />);
    fireEvent.click(screen.getByRole("button", { name: /theme: dark/i }));
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(5);
  });
});
