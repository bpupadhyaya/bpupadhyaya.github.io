# 3D category title style (reference, 2026-10-14)
The gallery cards at the bottom of each World Heritage Games module (`assets/games/whg-<app>-shot1.jpg`, the left-most card) carry the
owner-approved fancy 3D butter-yellow category heading ("Drum Music of the World" etc.). Only the heading text differs from the app screenshot.
Full recipe and reference images: dotfiles `global-memory/whg-title-style-3d-yellow.md`; code: world-heritage-games `tools/ops/retitle-card-shots.py`.
Short form: EB Garamond 800, 11-layer extrusion `#f6cf45` -> `#9c7208`, navy `#0a1a5e` outline, glossy cream-to-yellow face.
Regenerate: `python3 ~/coding_common/pvt/world-heritage-games/tools/ops/retitle-card-shots.py` (idempotent only from the original screenshots in git history).
