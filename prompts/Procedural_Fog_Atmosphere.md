Build this 5-layer procedural twilight fog scene in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `12`-second, `30` fps comp named `Procedural Fog Atmosphere`; layered fractal fields at different scales create depth while a simple silhouette makes the atmospheric motion easy to read.

Create these layers in top-to-bottom order:

1. ATMOSPHERIC VIGNETTE
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - CC Vignette
    - Amount: `62`
    - Angle of View: `58`
    - Center: `[960, 520]`
    - Pin Highlights: `22`

2. FOG NEAR
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `46%`
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Dynamic`
    - Noise Type: `Soft Linear`
    - Contrast: `145`
    - Brightness: `-28`
    - Uniform Scaling: `Off`
    - Scale Width: `420`
    - Scale Height: `145`
    - Complexity: `4`
    - Offset Turbulence expression: `var p = value; [p[0] + time * 42, p[1] - time * 7];`
    - Evolution expression: `time * 28`
  - Turbulent Displace
    - Displacement: `Turbulent Smoother`
    - Amount: `22`
    - Size: `210`
    - Complexity: `2`
    - Evolution expression: `time * 18`
    - Pinning: `Pin All`
  - Tint
    - Map Black To: `[0.000, 0.010, 0.020, 1]`
    - Map White To: `[0.520, 0.780, 0.820, 1]`
    - Amount to Tint: `100%`
  - Gaussian Blur
    - Blurriness: `24`
    - Repeat Edge Pixels: `On`

3. FOG FAR
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `32%`
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Cloudy`
    - Contrast: `120`
    - Brightness: `-18`
    - Uniform Scaling: `Off`
    - Scale Width: `650`
    - Scale Height: `230`
    - Complexity: `3`
    - Offset Turbulence expression: `var p = value; [p[0] - time * 18, p[1] + time * 3];`
    - Evolution expression: `time * 10`
  - Tint
    - Map Black To: `[0.000, 0.000, 0.015, 1]`
    - Map White To: `[0.340, 0.500, 0.650, 1]`
    - Amount to Tint: `100%`
  - Gaussian Blur
    - Blurriness: `48`
    - Repeat Edge Pixels: `On`

4. MOUNTAIN SILHOUETTE
- Type: Shape Layer
- Blend Mode: Normal
- Transform:
  - Position: `[0, 0]`
- Contents: one group built with `ADBE Vector Group`
  - Path (`ADBE Vector Shape - Group` and `ADBE Vector Shape`): create a closed polygon with vertices `[[-100, 1080], [-100, 810], [260, 690], [530, 790], [880, 610], [1210, 760], [1540, 640], [2020, 830], [2020, 1080]]`, zero in tangents, and zero out tangents
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.018, 0.035, 0.060, 1]`
    - Opacity: `100%`

5. TWILIGHT SKY
- Type: Solid Layer
- Solid Color: `#11182B`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - Gradient Ramp
    - Start of Ramp: `[960, 0]`
    - Start Color: `[0.025, 0.045, 0.110, 1]`
    - End of Ramp: `[960, 1080]`
    - End Color: `[0.280, 0.120, 0.180, 1]`
    - Ramp Shape: `Linear Ramp`
    - Ramp Scatter: `4`
