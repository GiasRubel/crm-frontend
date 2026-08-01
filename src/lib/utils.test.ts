import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins plain class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, null, "", "c")).toBe("a c");
  });

  it("supports clsx object and array syntax", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });

  it("resolves conflicting tailwind utilities in favour of the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm text-red-500", "text-blue-500")).toBe("text-sm text-blue-500");
  });

  it("keeps non-conflicting utilities from the same family", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("lets a conditional override win", () => {
    const isActive = true;
    expect(cn("bg-white", isActive && "bg-black")).toBe("bg-black");
  });

  it("returns an empty string with no arguments", () => {
    expect(cn()).toBe("");
  });
});
