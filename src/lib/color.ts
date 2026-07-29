/*
 * One colour at N% opacity, for the inline styles Tailwind utilities can't reach —
 * SVG fills, boxShadow strings, values that come from data.
 *
 * The prototype wrote these as literal rgba(20,40,60,.16), which is the navy
 * copied rather than referenced: change the token and the literals stay behind.
 * Going through the custom property means both routes to the same colour —
 * `border-ink/16` and `tint('ink', 16)` — always agree.
 */
export const tint = (token: string, pct: number) =>
  `color-mix(in srgb, var(--color-${token}) ${pct}%, transparent)`

/** The token itself, unmodified. Saves spelling out the var() at call sites. */
export const token = (name: string) => `var(--color-${name})`
