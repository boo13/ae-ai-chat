Build this 10-layer film-damage treatment in the active composition. Respond with an AI Action and run it immediately.

Source: TextureLabs film-damage tutorial (https://texturelabs.org/tutorials/film-damage/). Designed for a 1920×1080, 16-bit comp — build into whatever comp is active.

Create these layers in top-to-bottom order:

1. TextureLabs
- Type: Null Layer
- Layer Comment: `Source: https://texturelabs.org/tutorials/film-damage/`

2. GATE WEAVE
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Transform
    - Uniform Scale: `On`
    - Scale Height: `101.5`
    - Position expression: `x = wiggle(12, .5)[0]; y = wiggle(3, .15, 3, 4)[1]; [x, y]`

3. GRAIN
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Noise
    - Amount of Noise: `10%`
  - Gaussian Blur
    - Blurriness: `6`
  - Unsharp Mask
    - Amount: `300`
    - Radius: `3`

4. SCRATCHES
- Type: Solid Layer
- Blend Mode: Multiply
- Transform:
  - Scale: `100%, 2000%`
- Effects in order:
  - Fractal Noise
    - Invert: `On`
    - Contrast: `200`
    - Brightness: `110`
    - Uniform Scaling: `Off`
    - Scale Width: `25`
    - Scale Height: `10000`
    - Evolution expression: `time * 200`
  - Turbulent Displace
    - Amount: `10`
    - Amount expression: `wiggle(10, 5)`
    - Size: `50`
    - Size expression: `wiggle(10, 10)`
    - Complexity: `3`
    - Evolution expression: `time * 24`

5. BLOBS
- Type: Solid Layer
- Blend Mode: Multiply
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Dynamic`
    - Invert: `On`
    - Contrast: `1875`
    - Brightness: `880`
    - Scale: `200`
    - Random Seed expression: `time * 100`
  - CC Toner
    - Midtones: `#2C5F4A`

6. DAMAGE
- Type: Solid Layer
- Blend Mode: Normal
- Effects in order:
  - Fractal Noise
    - Contrast: `1000`
    - Brightness: `-460`
    - Uniform Scaling: `Off`
    - Scale Width: `300`
    - Scale Height: `500`
    - Scale Height expression: `wiggle(24, 400)`
    - Random Seed expression: `time * 24`
  - Extract
    - Black Point: `20`
    - Black Softness: `20`
  - Fractal Noise
    - Contrast: `313`
    - Brightness: `40`
    - Scale: `50`
    - Blending Mode: `Hard Light`
  - CC Toner
    - Midtones: `#2FC35E`

7. DUST
- Type: Solid Layer
- Blend Mode: Normal
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Smeary`
    - Invert: `On`
    - Contrast: `3000`
    - Brightness: `-2925`
    - Scale: `200`
    - Complexity: `3`
    - Sub Influence: `30%`
    - Sub Scaling: `50%`
    - Random Seed expression: `time * 24`
  - Set Channels
    - Set Alpha to Source: `Luminance`
  - Noise
    - Amount of Noise: `100%`
  - Unsharp Mask
    - Amount: `200`
    - Radius: `2`
  - Gaussian Blur
    - Blurriness: `3`

8. FLICKER
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Exposure
    - Exposure expression: `wiggle(12, .1)`

9. COLOR CORRECTION
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Glow
    - Glow Threshold: `50%`
    - Glow Radius: `500`
    - Glow Intensity: `0.2`
    - Glow Operation: `Screen`
  - Channel Mixer
    - Blue-Green: `50`
    - Blue-Blue: `50`
  - Lumetri Color
    - Creative Look: `Cinespace 2383sRGB6bit`
    - Highlight Tint: `Light Blue/Cyan`
  - CC Vignette
    - Amount: `50`
  - Levels
    - Output Black: `2500`
    - Output White: `30000`

10. LIGHT LEAKS
- Type: Solid Layer
- Blend Mode: Screen
- Effects in order:
  - Fractal Noise
    - Invert: `On`
    - Contrast: `60`
    - Brightness: `-30`
    - Uniform Scaling: `Off`
    - Scale Width: `4000`
    - Scale Height: `8000`
    - Complexity: `2`
    - Evolution expression: `time * 400`
  - CC Toner
    - Tones: `Pentatone`
    - Midtones expression: `wiggle(5, 1)`
    - Darktones: `#313A4B`
  - Fractal Noise
    - Brightness: `-20`
    - Uniform Scaling: `Off`
    - Scale Width: `3000`
    - Scale Height: `6000`
    - Complexity: `1`
    - Evolution expression: `time * 100`
