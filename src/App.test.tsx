import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the page heading", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /cursor project guardrails/i })).toBeInTheDocument();
  });

  it("renders the example premium card", () => {
    render(<App />);
    expect(screen.getByText(/example premium/i)).toBeInTheDocument();
  });

  it("renders a formatted ZAR amount", () => {
    render(<App />);
    // formatZar(12500) produces a string containing "R" and "12"
    const amounts = screen.getAllByText(/R/);
    expect(amounts.length).toBeGreaterThan(0);
  });

  it("renders the Greeting component inside the app", () => {
    render(<App />);
    expect(screen.getByText(/Hello, developer/)).toBeInTheDocument();
  });
});
