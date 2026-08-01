import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The theme provider keeps its current value in a module-scoped external store,
 * so tests must re-import both modules to get a clean starting state — a plain
 * `localStorage.clear()` would leave the cached value behind.
 */
async function mountToggle(className?: string) {
  vi.resetModules();
  const { ThemeProvider } = await import("@/providers/theme-provider");
  const { ThemeToggle } = await import("./ThemeToggle");

  render(
    <ThemeProvider>
      <ThemeToggle className={className} />
    </ThemeProvider>,
  );

  return { user: userEvent.setup() };
}

const appliedTheme = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
});

describe("ThemeToggle", () => {
  it("starts in light mode with a label describing the action, not the state", async () => {
    await mountToggle();
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
  });

  it("switches to dark on click and updates the label", async () => {
    const { user } = await mountToggle();

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
    expect(appliedTheme()).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("persists the choice so a reload keeps the theme", async () => {
    const { user } = await mountToggle();
    await user.click(screen.getByRole("button"));
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("toggles back to light", async () => {
    const { user } = await mountToggle();

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));

    expect(appliedTheme()).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
  });

  it("restores a previously stored dark theme on mount", async () => {
    localStorage.setItem("theme", "dark");
    await mountToggle();

    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });

  it("reads the pre-hydration class when localStorage is empty", async () => {
    document.documentElement.classList.add("dark");
    await mountToggle();

    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });

  it("accepts extra class names without dropping its own styling", async () => {
    await mountToggle("ml-4");
    const button = screen.getByRole("button");

    expect(button).toHaveClass("ml-4");
    expect(button).toHaveClass("rounded-full");
  });

  it("exposes a title matching the accessible label", async () => {
    await mountToggle();
    expect(screen.getByRole("button")).toHaveAttribute("title", "Switch to dark theme");
  });
});
