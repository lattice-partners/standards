---
name: utility-ui-options-toggle
description: Build three UI variants of a screen or component so the team can compare and pick a direction.
---

# UI options toggle

Only run this when the user explicitly asks to explore multiple UI directions at once:

1. Clarify the screen or component and constraints (Lattice Design unless
   opted out, mobile, light/dark if applicable).
2. Produce **three distinct variants** with different layout, hierarchy, or
   density - not color-only tweaks.
3. Prefer a side-by-side or toggleable preview the human can click through
   (browser, canvas, or local dev route).
4. Keep copy and data realistic. Cover loading and empty states if relevant.
5. Do not merge a variant into the codebase until the human picks one.

Variants should honor `frontend-ux` and `lattice-design` (when not opted out).
