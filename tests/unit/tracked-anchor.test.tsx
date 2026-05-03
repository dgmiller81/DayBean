import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TrackedAnchor } from "@/components/business/TrackedAnchor";

describe("TrackedAnchor", () => {
  it("carries data-track-cat and target=_blank", () => {
    const { container } = render(
      <TrackedAnchor href="https://x.test" cat="business" onTrack={async () => {}}>
        hi
      </TrackedAnchor>
    );
    const a = container.querySelector("a")!;
    expect(a.getAttribute("data-track-cat")).toBe("business");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toContain("noopener");
  });

  it("calls onTrack on click", () => {
    const spy = vi.fn(async () => {});
    const { container } = render(
      <TrackedAnchor href="https://x.test" cat="personal" onTrack={spy}>
        hi
      </TrackedAnchor>
    );
    fireEvent.click(container.querySelector("a")!);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
