import { within } from "@testing-library/react";

/**
 * The page forms render `<label>Text</label><Input/>` as siblings without a
 * `htmlFor`/`id` pair, so Testing Library's `getByLabelText` cannot resolve
 * them (a real accessibility gap — screen readers can't associate them either).
 * Until the markup is fixed, locate the control by walking up from its label.
 *
 * Prefer `getByLabelText` for any form that IS wired up correctly.
 */
export function fieldByLabel(
  container: HTMLElement,
  label: string | RegExp,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const labelEl = within(container)
    .getAllByText(label, { selector: "label" })
    .at(0);

  if (!labelEl) throw new Error(`No label matching ${label}`);

  // Walk up until an ancestor also contains the control.
  let node: HTMLElement | null = labelEl.parentElement;
  while (node) {
    const control = node.querySelector("input, textarea, select");
    if (control) return control as HTMLInputElement;
    node = node.parentElement;
  }

  throw new Error(`No form control found near the label ${label}`);
}
