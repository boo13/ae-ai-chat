Build this 5-layer rain-on-glass night scene in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `12`-second, `30` fps comp named `Rain On Glass`; two depth-separated rain passes sit over defocused city bokeh to simulate looking through a wet window without footage.

Create these layers in top-to-bottom order:

1. DROPS NEAR
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Effects in order:
  - CC Rainfall
    - Drops: `1150`
    - Size: `7`
    - Scene Depth: `2200`
    - Speed: `5200`
    - Wind: `-180`
    - Variation % (Wind): `35%`
    - Spread: `10`
    - Color: `[0.720, 0.860, 1.000, 1]`
    - Opacity: `58%`
    - Influence %: `88%`
    - Spread Width: `190`
    - Spread Height: `24`
    - Transfer Mode: `Lighten`
    - Composite With Original: `Off`
    - Appearance: `Refracting`
    - Ground Level %: `100%`
    - Embed Depth %: `100%`
    - Random Seed: `17`
  - Gaussian Blur
    - Blurriness: `1.2`
    - Repeat Edge Pixels: `On`

2. DROPS FAR
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `68%`
- Effects in order:
  - CC Rainfall
    - Drops: `4200`
    - Size: `2.5`
    - Scene Depth: `5200`
    - Speed: `3000`
    - Wind: `-90`
    - Variation % (Wind): `50%`
    - Spread: `6`
    - Color: `[0.500, 0.700, 1.000, 1]`
    - Opacity: `34%`
    - Influence %: `78%`
    - Spread Width: `145`
    - Spread Height: `12`
    - Transfer Mode: `Lighten`
    - Composite With Original: `Off`
    - Appearance: `Soft Solid`
    - Ground Level %: `100%`
    - Embed Depth %: `100%`
    - Random Seed: `43`

3. GLASS SOFTEN
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Gaussian Blur
    - Blurriness: `16`
    - Blur Dimensions: `Horizontal and Vertical`
    - Repeat Edge Pixels: `On`
  - CC Vignette
    - Amount: `68`
    - Angle of View: `62`
    - Center: `[960, 520]`
    - Pin Highlights: `35`

4. BOKEH LIGHTS
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[0, 0]`
  - Opacity: `82%`
- Contents: create six separate ellipse groups, each using `ADBE Vector Group`, `ADBE Vector Shape - Ellipse`, and `ADBE Vector Graphic - Fill`
  - Ellipse 1: Size `[230, 230]`, Position `[320, 360]`, Fill Color `[1.000, 0.260, 0.100, 1]`
  - Ellipse 2: Size `[160, 160]`, Position `[690, 720]`, Fill Color `[1.000, 0.680, 0.120, 1]`
  - Ellipse 3: Size `[280, 280]`, Position `[1110, 330]`, Fill Color `[0.100, 0.650, 1.000, 1]`
  - Ellipse 4: Size `[190, 190]`, Position `[1510, 680]`, Fill Color `[0.780, 0.120, 0.950, 1]`
  - Ellipse 5: Size `[120, 120]`, Position `[1760, 250]`, Fill Color `[0.100, 0.900, 0.760, 1]`
  - Ellipse 6: Size `[210, 210]`, Position `[220, 900]`, Fill Color `[0.950, 0.120, 0.260, 1]`
- Effects in order:
  - Gaussian Blur
    - Blurriness: `48`
    - Repeat Edge Pixels: `On`
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `30%`
    - Glow Radius: `90`
    - Glow Intensity: `1.1`
    - Glow Operation: `Add`

5. NIGHT STREET
- Type: Solid Layer
- Solid Color: `#07111F`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - 4-Color Gradient
    - Point 1: `[0, 0]`
    - Color 1: `[0.010, 0.025, 0.060, 1]`
    - Point 2: `[1920, 0]`
    - Color 2: `[0.055, 0.020, 0.090, 1]`
    - Point 3: `[0, 1080]`
    - Color 3: `[0.010, 0.090, 0.120, 1]`
    - Point 4: `[1920, 1080]`
    - Color 4: `[0.020, 0.025, 0.050, 1]`
    - Blend: `72`
    - Jitter: `4`
