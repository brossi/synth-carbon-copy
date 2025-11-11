Texture Requirements for Carbon Copy Simulator
================================================

TEXTURE SPECIFICATIONS:
-----------------------
- Format: PNG, TIF, PSD (any Photoshop-compatible raster format)
- Resolution: Match document DPI for best results (typically 300 DPI)
- Size: 2550×3300px for 8.5×11 at 300 DPI
- Color Mode: RGB (will be converted if needed)
- Content: Paper grain, streak patterns, aged paper texture

RECOMMENDED TEXTURES:
---------------------
- paper_onionskin.png - Fine grain for copy 1
- paper_yellow.png - Coarser grain for copy 2
- paper_aged.png - Heavy grain for copies 4-5

IMPORTANT NOTES:
----------------
v0.1 uses native texture size. For best results, prepare textures
at target document dimensions.

If texture resolution differs significantly from document, a warning
will be logged but processing will continue.

Place your texture files in this directory and reference them in
preset files using relative paths like "textures/paper_grain.png"
