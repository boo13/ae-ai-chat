Build this polished 6-layer broadcast lower-third and animate it on, hold it, and animate it off at the current playhead. Respond with an AI Action and run it immediately.

Use the active `1920x1080` comp, or create a `10`-second, `30` fps comp if none is active; the staggered panels, restrained typography, and overshooting accent create a reusable broadcast-style graphic.

Let `t0` be the current comp time and create these layers in top-to-bottom order:

1. NAME
- Type: Text Layer
- Text: `JORDAN LEE`
- Font: `Arial-BoldMT`
- Font Size: `58`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[0.965, 0.975, 0.985]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Transform:
  - Position keyframes: `[180, 920]` at `t0`, `[180, 825]` at `t0 + 0.38s`
  - Opacity keyframes: `0%` at `t0`, `100%` at `t0 + 0.24s`
- Ease the landing keyframe with `setTemporalEaseAtKey`, influence `75` - one `KeyframeEase` per side because Position is spatial.

2. ROLE
- Type: Text Layer
- Text: `DESIGN DIRECTOR`
- Font: `ArialMT`
- Font Size: `28`
- Tracking: `120`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[0.200, 0.900, 1.000]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Transform:
  - Position keyframes: `[180, 960]` at `t0 + 0.08s`, `[180, 892]` at `t0 + 0.48s`
  - Opacity keyframes: `0%` at `t0 + 0.08s`, `100%` at `t0 + 0.34s`
- Ease the landing keyframe with `setTemporalEaseAtKey`, influence `75` - one `KeyframeEase` per side because Position is spatial.

3. ACCENT LINE
- Type: Shape Layer
- Contents: one group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size: `[14, 152]`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.200, 0.900, 1.000, 1]`
- Transform:
  - Position: `[140, 855]`
  - Scale keyframes: `[100, 0]` at `t0`, `[100, 112]` at `t0 + 0.28s`, `[100, 100]` at `t0 + 0.42s`, `[100, 100]` at `t0 + 4.35s`, `[100, 0]` at `t0 + 4.60s`
- Ease the landing and exit keyframes with `setTemporalEaseAtKey`, influence `75` - two `KeyframeEase` objects per incoming and outgoing array because Scale is 2-D and non-spatial.

4. GLASS PANEL
- Type: Shape Layer
- Contents: one rounded rectangle group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size: `[820, 190]`
    - Roundness: `22`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.030, 0.055, 0.090, 1]`
    - Opacity: `92%`
- Transform:
  - Position keyframes: `[-430, 855]` at `t0`, `[510, 855]` at `t0 + 0.40s`, `[510, 855]` at `t0 + 4.40s`, `[-430, 855]` at `t0 + 4.80s`
  - Opacity keyframes: `0%` at `t0`, `100%` at `t0 + 0.18s`
- Effects in order:
  - Drop Shadow
    - Shadow Color: `[0, 0, 0, 1]`
    - Opacity: `45%`
    - Direction: `135`
    - Distance: `18`
    - Softness: `36`
    - Shadow Only: `Off`
  - CC Light Sweep
    - Direction: `25`
    - Shape: `Smooth`
    - Width: `55`
    - Sweep Intensity: `18`
    - Edge Intensity: `35`
    - Edge Thickness: `4`
    - Light Color: `[0.85, 0.95, 1.0, 1]`
    - Center keyframes: `[60, 855]` at `t0 + 0.55s`, `[1050, 855]` at `t0 + 1.25s`
- Ease the landing and exit keyframes with `setTemporalEaseAtKey`, influence `75` - one `KeyframeEase` per side because Position is spatial.

5. ID BUG
- Type: Shape Layer
- Contents: one group built with `ADBE Vector Group`
  - Ellipse Path (`ADBE Vector Shape - Ellipse`)
    - Size: `[92, 92]`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.784, 0.290, 0.141, 1]`
    - Opacity: `100%`
- Transform:
  - Position: `[865, 855]`
  - Scale keyframes: `[0, 0]` at `t0 + 0.18s`, `[118, 118]` at `t0 + 0.48s`, `[100, 100]` at `t0 + 0.62s`, `[100, 100]` at `t0 + 4.35s`, `[0, 0]` at `t0 + 4.60s`
  - Rotation keyframes: `-90` at `t0 + 0.18s`, `0` at `t0 + 0.62s`
- Ease the landing and exit Scale keyframes and the landing Rotation keyframe with `setTemporalEaseAtKey`, influence `75` - two `KeyframeEase` objects per Scale array and one per Rotation value dimension.

6. PANEL SHADOW
- Type: Shape Layer
- Blend Mode: Multiply
- Contents: one rounded rectangle group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size: `[850, 210]`
    - Roundness: `28`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0, 0, 0, 1]`
    - Opacity: `36%`
- Transform:
  - Position keyframes: `[-430, 870]` at `t0`, `[520, 870]` at `t0 + 0.46s`, `[520, 870]` at `t0 + 4.40s`, `[-430, 870]` at `t0 + 4.80s`
- Effects in order:
  - Gaussian Blur
    - Blurriness: `28`
    - Repeat Edge Pixels: `On`
- Ease the landing and exit keyframes with `setTemporalEaseAtKey`, influence `75` - one `KeyframeEase` per side because Position is spatial.

Add exit Opacity keyframes to `NAME` and `ROLE`: `100%` at `t0 + 4.30s` and `0%` at `t0 + 4.55s`. If the comp ends before `t0 + 5s`, skip the exit keyframes.

Build notes:

- Set each shape/effect property's values immediately after its `addProperty` call; stale sibling references throw "Object is invalid".
- When easing keyframes, pass one `KeyframeEase` per value dimension; spatial properties (Position, Anchor Point) take exactly one per side (`prop.isSpatial`).
- ES3 only (`var`, no arrows/template literals), ASCII only, one `app.beginUndoGroup`/`app.endUndoGroup` around all changes.
