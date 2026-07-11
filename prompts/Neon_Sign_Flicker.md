Build this 5-layer neon sign scene with an animated electrical flicker in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `10`-second, `30` fps comp named `Neon Sign Flicker`; the doubled glow, soft halo, and textured wall reproduce the classic practical-neon workflow entirely from generated layers.

Create these layers in top-to-bottom order:

1. NEON TUBE
- Type: Text Layer
- Text: `OPEN LATE`
- Font: `Arial-BoldMT`
- Font Size: `180`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[0.940, 0.980, 1.000]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Transform:
  - Position: `[430, 455]`
  - Opacity expression: `posterizeTime(12); var f = wiggle(9, 16); Math.max(38, Math.min(100, f));`
- Effects in order:
  - Turbulent Displace
    - Displacement: `Turbulent Smoother`
    - Amount: `2`
    - Size: `18`
    - Complexity: `1`
    - Evolution expression: `time * 80`
    - Pinning: `Pin All`
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `20%`
    - Glow Radius: `18`
    - Glow Intensity: `2.2`
    - Glow Operation: `Add`
    - Glow Colors: `A & B Colors`
    - Color A: `[0.020, 0.820, 1.000, 1]`
    - Color B: `[0.760, 0.080, 1.000, 1]`
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `35%`
    - Glow Radius: `65`
    - Glow Intensity: `0.9`
    - Glow Operation: `Add`

2. NEON HALO
- Type: Text Layer
- Text: `OPEN LATE`
- Font: `Arial-BoldMT`
- Font Size: `180`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[0.020, 0.780, 1.000]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Blend Mode: Screen
- Transform:
  - Position: `[430, 455]`
  - Opacity expression: `posterizeTime(12); var f = wiggle(9, 10); Math.max(30, Math.min(75, f));`
- Effects in order:
  - Gaussian Blur
    - Blurriness: `32`
    - Blur Dimensions: `Horizontal and Vertical`
    - Repeat Edge Pixels: `On`
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `15%`
    - Glow Radius: `120`
    - Glow Intensity: `1.4`
    - Glow Operation: `Add`

3. NEON FRAME
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[960, 540]`
- Contents: one rounded rectangle group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size: `[1320, 430]`
    - Roundness: `42`
  - Stroke (`ADBE Vector Graphic - Stroke`)
    - Color: `[0.760, 0.080, 1.000, 1]`
    - Stroke Width: `7`
    - Opacity: `100%`
- Effects in order:
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `20%`
    - Glow Radius: `38`
    - Glow Intensity: `1.5`
    - Glow Operation: `Add`

4. WALL TEXTURE
- Type: Solid Layer
- Solid Color: `#31303A`
- Size: full comp
- Blend Mode: Soft Light
- Transform:
  - Opacity: `34%`
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Rocky`
    - Contrast: `180`
    - Brightness: `-35`
    - Scale: `85`
    - Complexity: `3`
    - Evolution expression: `time * 3`
  - Gaussian Blur
    - Blurriness: `1.5`
    - Repeat Edge Pixels: `On`

5. PLASTER WALL
- Type: Solid Layer
- Solid Color: `#16151C`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - Gradient Ramp
    - Start of Ramp: `[960, 420]`
    - Start Color: `[0.145, 0.120, 0.175, 1]`
    - End of Ramp: `[960, 1080]`
    - End Color: `[0.018, 0.014, 0.028, 1]`
    - Ramp Shape: `Radial Ramp`
    - Ramp Scatter: `3`
  - Noise
    - Amount of Noise: `2%`
