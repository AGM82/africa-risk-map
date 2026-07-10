import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "@/test/axe";
import { Button } from "./button";

describe("Button", () => {
  it("renders its children as an accessible button", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("has data-slot=button and defaults to the default variant/size", () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole("button", { name: "Default" });
    expect(button).toHaveAttribute("data-slot", "button");
  });

  it("supports the disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });

  it("merges a custom className with its defaults", () => {
    render(<Button className="custom-class">Styled</Button>);
    expect(screen.getByRole("button", { name: "Styled" }).className).toContain("custom-class");
  });

  it("renders non-default variants and sizes without error", () => {
    render(
      <Button variant="outline" size="lg">
        Outline
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Outline" })).toBeInTheDocument();
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(<Button>Accessible button</Button>);
    await expectNoA11yViolations(container);
  });
});
