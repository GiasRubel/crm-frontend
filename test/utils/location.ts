import { vi } from "vitest";

/**
 * The app navigates by assigning `window.location.href` (login/logout leave the
 * SPA entirely). jsdom refuses real navigation, so capture the assignment.
 * Returns the spy plus a restore function.
 */
export function captureLocationHref() {
  const original = Object.getOwnPropertyDescriptor(window, "location");
  const assign = vi.fn();

  Object.defineProperty(window, "location", {
    configurable: true,
    value: new Proxy(window.location, {
      set(target, prop, value) {
        if (prop === "href") {
          assign(value);
          return true;
        }
        return Reflect.set(target, prop, value);
      },
      get(target, prop) {
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }),
  });

  const restore = () => {
    if (original) Object.defineProperty(window, "location", original);
  };

  return { assign, restore };
}
