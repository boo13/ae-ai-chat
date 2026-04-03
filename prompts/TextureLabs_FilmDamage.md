Objective

Produce a faithful recreation spec for the After Effects film-damage setup described in the source material below.

Fidelity Rules

- Reconstruct only what is explicitly present in the source material.
- Do not improve, reinterpret, simplify, optimize, stylize, or modernize anything.
- Do not add missing settings from outside knowledge.
- Do not introduce extra layers, effects, expressions, parameters, controls, plugins, stock overlays, workflow suggestions, or assumptions.
- If a layer, effect, or parameter is clearly part of the setup but no explicit value is provided, retain it and mark the value as `not specified`.
- Preserve the exact layer order.
- Preserve the exact effect order within each layer.
- Preserve the exact expressions as written.
- Return only the recreation spec.
- Do not write implementation code.

Output Contract

Return the result in this structure:

1. `Project Settings`
2. `Layer Stack (top to bottom)`

For each layer, include:
- Layer name
- Layer type
- Layer comment if specified
- Blend mode if specified
- Transform settings if specified
- Effects in exact order
- All explicitly stated settings
- All explicitly stated expressions

Source Spec

Project Settings
- Resolution: `1920x1080 HD`
- Color Mode: `16-bit`

Global Requirements
- Return `10` total layers in the final stack.
- The first layer is the `TextureLabs` null.
- The remaining `9` layers are the film-damage treatment.
- Do not invent any 4K substitutions or alternate values.

Layer Stack (top to bottom)

1. TextureLabs
- Type: Null Layer
- Layer Comment: `Source: https://texturelabs.org/tutorials/film-damage/`

2. GATE WEAVE
- Type: Adjustment Layer
- Effect: Transform
  - Position expression: `x = wiggle(12, .5)[0]; y = wiggle(3, .15, 3, 4)[1]; [x, y]`
  - Scale: `101.5%`

3. GRAIN
- Type: Adjustment Layer
- Effect: Noise
  - Amount: `10%`
- Effect: Gaussian Blur
  - Blurriness: `6`
- Effect: Unsharp Mask
  - Amount: `300`
  - Radius: `3`

4. SCRATCHES
- Type: Solid Layer
- Blend Mode: Multiply
- Transform
  - Scale: `100% 2000%`
- Effect: Fractal Noise
  - Invert: `On`
  - Contrast: `200`
  - Brightness: `110`
  - Uniform Scaling: `Off`
  - Scale Width: `25`
  - Scale Height: `10000`
  - Evolution expression: `time * 200`
- Effect: Turbulent Displace
  - Amount: `10`
  - Amount expression: `wiggle(10, 5)`
  - Size: `50`
  - Size expression: `wiggle(10, 10)`
  - Complexity: `3`
  - Evolution expression: `time * 24`

5. BLOBS
- Type: Solid Layer
- Blend Mode: Multiply
- Effect: Fractal Noise
  - Fractal Type: `Dynamic`
  - Invert: `On`
  - Contrast: `1875`
  - Brightness: `880`
  - Scale: `200`
  - Random Seed expression: `time * 100`
- Effect: CC Toner
  - Midtones: `#2C5F4A`

6. DAMAGE
- Type: Solid Layer
- Blend Mode: Normal
- Effect: Fractal Noise
  - Contrast: `1000`
  - Brightness: `-460`
  - Uniform Scaling: `Off`
  - Scale Width: `300`
  - Scale Height: `500`
  - Scale Height expression: `wiggle(24, 400)`
  - Complexity: `not specified`
  - Random Seed expression: `time * 24`
- Effect: Extract
  - Black Point: `20`
  - Black Softness: `20`
- Effect: Fractal Noise
  - Contrast: `313`
  - Brightness: `40`
  - Scale: `50%`
  - Blending Mode: `Hard Light`
- Effect: CC Toner
  - Midtones: `#2FC35E`

7. DUST
- Type: Solid Layer
- Blend Mode: Normal
- Effect: Fractal Noise
  - Fractal Type: `Smeary`
  - Invert: `On`
  - Contrast: `3000`
  - Brightness: `-2925`
  - Scale: `200%`
  - Complexity: `3`
  - Sub Influence: `30%`
  - Sub Scaling: `50%`
  - Random Seed expression: `time * 24`
- Effect: Set Channels
  - Set Alpha to Source: `Luminance`
- Effect: Noise
  - Amount: `100%`
- Effect: Unsharp Mask
  - Amount: `200`
  - Radius: `2`
- Effect: Gaussian Blur
  - Blurriness: `3`

8. FLICKER
- Type: Adjustment Layer
- Effect: Exposure
  - Exposure expression: `wiggle(12, .1)`

9. COLOR CORRECTION
- Type: Adjustment Layer
- Effect: Glow
  - Glow Threshold: `50%`
  - Glow Radius: `500`
  - Glow Intensity: `0.2`
  - Glow Operation: `Screen`
- Effect: Channel Mixer
  - Blue-Green: `50`
  - Blue-Blue: `50`
- Effect: Lumetri Color
  - Creative > Look: `Cinespace 2383sRGB6bit`
  - Highlight Tint: `Light Blue/Cyan`
- Effect: CC Vignette
  - Amount: `50`
- Effect: Levels
  - Output Black: `2500`
  - Output White: `30000`

10. LIGHT LEAKS
- Type: Solid Layer
- Blend Mode: Screen
- Effect: Fractal Noise
  - Invert: `On`
  - Contrast: `60`
  - Brightness: `-30`
  - Uniform Scaling: `Off`
  - Scale Width: `4000`
  - Scale Height: `8000`
  - Complexity: `2`
  - Evolution expression: `time * 400`
- Effect: CC Toner
  - Tones: `Pentatone`
  - Midtones expression: `wiggle(5, 1)`
  - Darktones: `#313A4B`
- Effect: Fractal Noise
  - Brightness: `-20`
  - Uniform Scaling: `Off`
  - Scale Width: `3000`
  - Scale Height: `6000`
  - Complexity: `1`
  - Evolution expression: `time * 100`
