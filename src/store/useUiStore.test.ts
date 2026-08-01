import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "./useUiStore";

// Zustand stores are module singletons — state leaks between tests unless reset.
const initial = useUiStore.getState();

beforeEach(() => {
  useUiStore.setState(initial, true);
});

describe("useUiStore", () => {
  it("starts with the sidebar open", () => {
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  it("toggleSidebar flips the flag", () => {
    act(() => useUiStore.getState().toggleSidebar());
    expect(useUiStore.getState().sidebarOpen).toBe(false);

    act(() => useUiStore.getState().toggleSidebar());
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  it("setSidebarOpen sets an explicit value and is idempotent", () => {
    act(() => useUiStore.getState().setSidebarOpen(false));
    expect(useUiStore.getState().sidebarOpen).toBe(false);

    act(() => useUiStore.getState().setSidebarOpen(false));
    expect(useUiStore.getState().sidebarOpen).toBe(false);

    act(() => useUiStore.getState().setSidebarOpen(true));
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  it("notifies subscribers on change", () => {
    const listener = vi.fn();
    const unsubscribe = useUiStore.subscribe(listener);

    act(() => useUiStore.getState().toggleSidebar());
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    act(() => useUiStore.getState().toggleSidebar());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps state isolated once reset between tests", () => {
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });
});

afterEach(() => {
  useUiStore.setState(initial, true);
});
