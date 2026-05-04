import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Badge, BadgeRow } from "@/components/business/Badge";

describe("Badge", () => {
  it("renders the label and the className", () => {
    const { container } = render(
      <Badge badge={{ className: "b-model", label: "Model" }} />,
    );
    const span = container.querySelector("span")!;
    expect(span.className).toContain("b-model");
    expect(span.textContent).toBe("Model");
  });
});

describe("BadgeRow", () => {
  it("returns null for empty badges", () => {
    const { container } = render(<BadgeRow badges={[]} />);
    expect(container.firstChild).toBeNull();
  });
  it("renders each badge", () => {
    const { container } = render(
      <BadgeRow
        badges={[
          { className: "b-product", label: "Product" },
          { className: "tag", label: "Microsoft" },
        ]}
      />,
    );
    expect(container.querySelectorAll(".badge")).toHaveLength(2);
  });
});
