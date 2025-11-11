# Carbon Copy Simulator - Documentation

## Overview

Carbon Copy Simulator is a Photoshop UXP plugin that generates realistic simulated carbon copies from typed documents. It creates multiple progressively degraded copies with authentic carbon paper effects including blur, noise, gradient streaks, reverse bleed-through, and paper backgrounds.

**Version:** 0.1.0
**Photoshop Compatibility:** v27.0.0+
**Platform:** UXP Plugin (Manifest v5)

---

## Features

### v0.1 Core Features

- **Non-Destructive Workflow** - Original layers preserved in hidden group
- **Deterministic Randomness** - Seeded PRNG for reproducible results
- **Smart Layer Detection** - Name-based filtering with skip rules
- **Progressive Degradation** - 1-5 copies with increasing blur, noise, fading
- **Realistic Effects:**
  - Gaussian blur (0.4-1.0px range)
  - Monochromatic noise (1.5-5.5% range)
  - Opacity variation per copy
  - Gradient fill streaks (vertical imperfections)
  - Reverse bleed-through (vertical offset with horizontal jitter)
  - Paper background colors (onionskin, yellow, pink, blue, gray)
  - Optional texture overlays (paper grain, aged texture)
- **Batch Processing** - Process entire folders of PSDs
- **Flexible Export** - PNG and PSD formats with ICC profile logging
- **Comprehensive Logging** - File-based logging with severity levels

---

## Installation

### Requirements

- Adobe Photoshop v27.0.0 or later
- UXP Plugin support enabled

### Installation Steps

1. **Download the Plugin**
   - Clone or download this repository
   - Navigate to the plugin directory

2. **Load into Photoshop**
   - Open Photoshop
   - Go to `Plugins > UXP Developer Tool`
   - Click "Add Plugin..."
   - Navigate to the plugin directory containing `manifest.json`
   - Select the plugin folder

3. **Load the Plugin**
   - In UXP Developer Tool, find "Carbon Copy Simulator"
   - Click "Load" button
   - The plugin will now be available in Photoshop

4. **Verify Installation**
   - Go to `Plugins` menu
   - Look for "Run Carbon Copy Simulation" command
   - If present, installation is successful

---

## Quick Start

### Single Document Processing

1. **Prepare Your Document**
   - Open a PSD with typed text layers
   - Name text layers with keywords: "body", "text", "typed", "content", or "memo"
   - Name layers to exclude with: "signature", "stamp", "seal", "letterhead", or "logo"
   - Ensure document is in RGB mode
   - Save your document

2. **Configure Settings** (Optional)
   - Edit `config.json` in the plugin directory
   - Default settings generate 3 copies: Copy 1, Copy 2, Copy 3
   - Default preset: `presets/default.json`

3. **Run the Plugin**
   - Go to `Plugins > Run Carbon Copy Simulation`
   - Wait for processing to complete
   - Check results in document layers

4. **Review Output**
   - Document structure:
     ```
     COPY 3
       - Text Copy 3 layers
       - Imperfections
       - Paper Background
     COPY 2
       - Text Copy 2 layers
       - Imperfections
       - Paper Background
     COPY 1
       - Text Copy 1 layers
       - Imperfections
       - Paper Background
     UNPROCESSED
       - Excluded layers (signatures, logos, etc.)
     ORIGINAL LAYERS (hidden)
       - Your original layers (preserved, untouched)
     ```

5. **Check Exports** (if enabled)
   - PNG files: `{filename}_copy01_carbon.png`, `{filename}_copy02_carbon.png`, etc.
   - PSD files: `{filename}_copy01_carbon.psd`, etc.
   - Location: Same folder as source document (or specified output folder)

### Batch Processing

1. **Configure Batch Settings**
   - Edit `config.json`:
     ```json
     {
       "mode": "batch",
       "batch": {
         "promptForInputFolder": true,
         "promptForOutputFolder": true,
         "continueOnError": true
       }
     }
     ```

2. **Prepare Input Folder**
   - Place all PSD files in a folder
   - Ensure all documents follow layer naming conventions

3. **Run Batch Processing**
   - Go to `Plugins > Run Carbon Copy Simulation`
   - Select input folder when prompted
   - Select output folder when prompted
   - Processing runs automatically

4. **Review Results**
   - Check log file: `pluginData/carbon_copy_log.txt`
   - Review batch summary in alert dialog
   - Verify exported files in output folder

---

## Configuration Overview

### Main Config File: `config.json`

**Key Settings:**

- `mode`: "single" or "batch"
- `copyGeneration.nCopies`: Total copies (1-5)
- `copyGeneration.generateCopies`: Which copies to create [1, 2, 3]
- `copyGeneration.randomSeed`: Base seed for PRNG (20251111)
- `preset`: Path to preset file ("presets/default.json")
- `export.enabled`: Enable/disable auto-export
- `export.formats`: ["PNG", "PSD"]
- `logging.enabled`: Enable file logging
- `logging.verbosity`: "debug", "info", "warn", "error"

### Preset File: `presets/default.json`

**Per-Copy Settings:**

Each copy has:
- `opacity.range`: [min, max] opacity variation
- `blur.radiusRange`: [min, max] blur radius in pixels
- `noise.amountRange`: [min, max] noise percentage
- `paperColor`: Hex color for background (e.g., "faf8f0")
- `carbonColor`: Hex color for text (e.g., "1a1d24")

**Global Effects:**

- `imperfections`: Gradient streak settings
- `reverseBleed`: Bleed-through effect settings
- `textures`: Optional texture overlays

---

## Troubleshooting

### Common Issues

**"No active document" error**
- Solution: Open a PSD file before running the plugin

**"No visible layers match processing rules" error**
- Solution: Rename text layers to include keywords: "body", "text", "typed", "content", "memo"
- Check that layers are visible (not hidden)

**"Document must be in RGB mode" error**
- Solution: Convert document to RGB (`Image > Mode > RGB Color`)
- Or enable `colorMode.convertIfNeeded: true` in config.json

**Export fails**
- Solution: Save your document before running plugin
- Check that output folder has write permissions

**Colors look wrong**
- This was a bug in early versions (fixed in current version)
- Ensure you're using the latest plugin version

### Debug Mode

Enable detailed logging:

```json
{
  "logging": {
    "enabled": true,
    "verbosity": "debug"
  }
}
```

Check log file at: `pluginData/carbon_copy_log.txt`

---

## Limitations (v0.1)

- **Artboards not supported** - Use single-page documents
- **Smart Objects rasterized** - No smart filter preservation
- **RGB primary mode** - CMYK/Grayscale converted with warning
- **No texture scaling** - Textures used at native resolution
- **No UI panel** - Command-based execution only
- **No real-time preview** - Results appear after processing

See DEVELOPMENT_PLAN.md for features planned for v0.2.

---

## Next Steps

- Read [USAGE.md](USAGE.md) for detailed usage guide
- Read [TEST_PLAN.md](TEST_PLAN.md) for testing procedures
- Review `config.json` and `presets/default.json` to customize settings
- Check specification: `carbon_copy_simulator_spec_v1.0.md`

---

## Support

For issues, feature requests, or contributions:
- Check the GitHub repository
- Review the specification document
- Examine log files for errors

---

## License

See LICENSE file for details.
