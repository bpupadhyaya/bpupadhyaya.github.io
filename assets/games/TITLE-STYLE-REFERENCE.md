# 3D category title style (reference, 2026-10-14)
The gallery cards at the bottom of each World Heritage Games module (`assets/games/whg-<app>-shot1.jpg`, the left-most card) carry the
owner-approved fancy 3D butter-yellow category heading ("Drum Music of the World" etc.). Only the heading text differs from the app screenshot.
Full recipe and reference images: dotfiles `global-memory/whg-title-style-3d-yellow.md`; code: world-heritage-games `tools/ops/retitle-card-shots.py`.
Short form (crisp version, owner-approved 2026-10-14): EB Garamond 800, 40-layer smooth extrusion `#f6cf45` -> `#9c7208`, navy `#0a1a5e` outline, glossy cream-to-yellow face, rendered at 3x.  The images here (`*-shot1.jpg`) were regenerated with the crisp version on 2026-10-14 (heading only).
Regenerate: `python3 ~/coding_common/pvt/world-heritage-games/tools/ops/retitle-card-shots.py` (idempotent only from the original screenshots in git history).

## HTML headings (module cards)
The module heading `h3.whg-title` text is wrapped in `<span class="whg-t3d">` (index.html). `.whg-t3d` in style.css = glossy gradient face (`background-clip:text`)
+ 8 chained `drop-shadow()` steps in em units (amber extrusion `#f6cf45` -> `#9c7208`, 0.021em x 0.029em per step) + navy `#0a1a5e` edge + soft shadow. Chained drop-shadows need >= ~1px steps (sub-pixel steps vanish).
The app icon stays outside the span so it is not extruded.
