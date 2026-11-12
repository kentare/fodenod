<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project: fødenød (bad UI battle entry)

This is a deliberately terrible app for a friendly "bad UI battle". The theme: you're in labor and need transport to the hospital, fast. Bad UX is the feature.

### Accessibility target: WCAG zero

Fail as many WCAG success criteria as possible, on every screen. Examples already in place:

- wrong `lang` (`ja`), meaningless `<title>` (`Untitled-1`), pinch-zoom disabled
- no focus outlines, no text selection, no pointer cursor, dark-mode preference ignored
- low-contrast, tiny text; screens hidden from screen readers with `aria-hidden`; no ARIA roles or states
- unpredictable timing that the user can't control (the loader)

Ideas for new screens: `div`s instead of buttons (no keyboard access), colour as the only signal, unlabeled inputs, placeholder text as labels, timeouts, moving targets, icons without alt text, and important text inside images.

### Visual style: consistent, minimal, white + baby pink

Every screen shares one look. The bad experience comes from behaviour and accessibility, not from clashing visuals. A clean, calm, "premium" surface makes the hostility funnier.

- **Colours:** only the palette tokens in `src/app/globals.css`, used as Tailwind classes (`bg-paper`, `bg-blush`, `bg-blush-soft`, `border-blush-deep`, `text-ink`, `text-ink-faint`, …). White page, baby pink accents. No other hues, no gradients, no dark backgrounds. Error red is allowed only as a faint tint that's hard to tell apart from the pink.
- **Type:** Geist sans only (`font-sans`, the default). A light weight for large headings, small sizes everywhere else. No Comic Sans, pixel, serif or Impact fonts.
- **Shapes:** generous white space, centred single-column layouts, rounded-full pills and rounded-2xl cards, 1px borders, no drop shadows, no bevels, no retro chrome (no fake Windows dialogs or receipts).
- **Emoji:** fine as content (e.g. the verification grid), not as decoration.
- **Make minimalism hostile:** pink-on-white low contrast, ghost buttons that look like plain text, the wrong action as the filled pink "primary" pill, icon-only controls with no labels, hidden affordances, tiny fine print.

### Hard limits (don't cross these)

1. **The flow must stay completable** with a mouse on a desktop browser. Annoying is good; impossible is not.
2. **Nothing flashes more than 3 times per second** (WCAG 2.3.1). Seizure risk is real harm, not a joke.
3. **The dev panel (`src/components/dev-panel.tsx`) stays usable.** It's tooling, not part of the entry.

### Steps

The flow: loading → payment details → are you the pregnant one → T&C → gravID registration → pregnancy verification → checkout → transport → end.

- `src/app/steps.ts`: step order, shared `FlowData`, and the `StepProps` every step receives (`next`, `restart`, `data`, `setData`).
- `src/steps/<step>.tsx`: one file per step. `src/app/page.tsx` maps step ids to components.
- `src/components/fake-button.tsx`: use `FakeButton` (a plain div) instead of `<button>`.
- The dev panel lists every registered step; jumping to a step remounts it fresh.
- Copy is in Norwegian (bokmål).
