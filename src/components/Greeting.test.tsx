import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "@/test/axe";
import { Greeting } from "./Greeting";

describe("Greeting", () => {
  it("renders the provided name", () => {
    render(<Greeting name="Ada" />);
    expect(screen.getByText(/Hello, Ada/)).toBeInTheDocument();
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(<Greeting name="Ada" />);
    await expectNoA11yViolations(container);
  });

  it("renders the Get started button", () => {
    render(<Greeting name="Ada" />);
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("button is not disabled by default", () => {
    render(<Greeting name="Ada" />);
    expect(screen.getByRole("button", { name: /get started/i })).not.toBeDisabled();
  });
});
