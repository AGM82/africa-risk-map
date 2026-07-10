import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "@/test/axe";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

describe("Card", () => {
  it("renders children and defaults to size=default", () => {
    render(<Card data-testid="card">content</Card>);
    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-slot", "card");
    expect(card).toHaveAttribute("data-size", "default");
    expect(card).toHaveTextContent("content");
  });

  it("supports the sm size variant", () => {
    render(<Card data-testid="card" size="sm" />);
    expect(screen.getByTestId("card")).toHaveAttribute("data-size", "sm");
  });

  it("merges a custom className with its defaults", () => {
    render(<Card data-testid="card" className="custom-class" />);
    expect(screen.getByTestId("card").className).toContain("custom-class");
  });
});

describe("Card composition", () => {
  it("renders header, title, description, action, content, and footer together", () => {
    render(
      <Card>
        <CardHeader data-testid="header">
          <CardTitle>Plan</CardTitle>
          <CardDescription>Monthly subscription</CardDescription>
          <CardAction data-testid="action">Edit</CardAction>
        </CardHeader>
        <CardContent data-testid="content">Body content</CardContent>
        <CardFooter data-testid="footer">Footer content</CardFooter>
      </Card>,
    );

    expect(screen.getByTestId("header")).toHaveAttribute("data-slot", "card-header");
    expect(screen.getByText("Plan")).toHaveAttribute("data-slot", "card-title");
    expect(screen.getByText("Monthly subscription")).toHaveAttribute(
      "data-slot",
      "card-description",
    );
    expect(screen.getByTestId("action")).toHaveAttribute("data-slot", "card-action");
    expect(screen.getByTestId("content")).toHaveAttribute("data-slot", "card-content");
    expect(screen.getByTestId("footer")).toHaveAttribute("data-slot", "card-footer");
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>Monthly subscription</CardDescription>
          <CardAction>Edit</CardAction>
        </CardHeader>
        <CardContent>Body content</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>,
    );
    await expectNoA11yViolations(container);
  });
});
