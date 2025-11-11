# Carbon Copy Simulator - Detailed Usage Guide

## Table of Contents

1. [Layer Naming Conventions](#layer-naming-conventions)
2. [Configuration Reference](#configuration-reference)
3. [Preset System](#preset-system)
4. [Workflow Examples](#workflow-examples)
5. [Advanced Configuration](#advanced-configuration)
6. [Texture System](#texture-system)
7. [Export Options](#export-options)
8. [Batch Processing](#batch-processing)
9. [Understanding the Results](#understanding-the-results)
10. [Tips and Best Practices](#tips-and-best-practices)

---

## Layer Naming Conventions

### Layers to Process

The plugin identifies layers to process based on name matching. Include these keywords in layer names:

- `body` - Main document body text
- `text` - General text content
- `typed` - Typed content
- `content` - Any content to process
- `memo` - Memo or note content

**Examples:**
- ✅ "Body Text"
- ✅ "Main Content Layer"
- ✅ "Typed Memo 1"
- ✅ "content_layer_01"

### Layers to Exclude

Layers with these keywords are moved to UNPROCESSED group:

- `signature` - Signatures
- `sig` - Abbreviated signature
- `stamp` - Stamps or seals
- `seal` - Official seals
- `letterhead` - Letterhead graphics
- `logo` - Company logos
- `header` - Header graphics
- `form` - Form fields or backgrounds

**Examples:**
- ✅ "Signature Block"
- ✅ "Company Logo"
- ✅ "Letterhead Header"
- ✅ "Official Stamp"

### Case Sensitivity

By default, name matching is **case-insensitive**. You can enable case-sensitive matching in config.json:

```json
{
  "layerRules": {
    "caseSensitive": true
  }
}
```

### Visibility Rules

By default, only **visible layers** are processed. Hidden layers are ignored. To process all matching layers regardless of visibility:

```json
{
  "layerRules": {
    "visibleOnly": false
  }
}
```

**Note:** Layers inside hidden groups are considered hidden even if the layer itself is visible.

---

## Configuration Reference

### Complete config.json Structure

```json
{
  "version": "1.0",
  "mode": "single",

  "batch": {
    "promptForInputFolder": true,
    "promptForOutputFolder": true,
    "useLastFolders": true,
    "includeSubfolders": false,
    "filePattern": "*.psd",
    "continueOnError": true,
    "closeAfterProcessing": true
  },

  "preset": "presets/default.json",

  "copyGeneration": {
    "nCopies": 3,
    "generateCopies": [1, 2, 3],
    "randomSeed": 20251111,
    "seedStrategy": "documentHash"
  },

  "layerRules": {
    "processingMode": "smart_detection",
    "processIfContains": ["body", "text", "typed", "content", "memo"],
    "skipIfContains": ["signature", "sig", "stamp", "seal", "letterhead", "logo", "header", "form"],
    "caseSensitive": false,
    "visibleOnly": true
  },

  "workflow": {
    "preserveOriginals": true,
    "createScaffold": true,
    "nonDestructive": true,
    "trackLayerIDs": true,
    "restoreStateOnError": true
  },

  "colorMode": {
    "preferred": "RGB",
    "convertIfNeeded": true,
    "convertBack": false,
    "warnOnConversion": true
  },

  "textures": {
    "verifyResolution": true,
    "verifyAspectRatio": true,
    "scaling": "native",
    "scalingPercentFuture": 100
  },

  "export": {
    "enabled": true,
    "formats": ["PNG", "PSD"],
    "embedICC": true,
    "logProfileName": true,
    "appendCopyIndex": true,
    "namingPattern": "{filename}_copy{n:02d}{suffix}.{ext}",
    "suffix": "_carbon"
  },

  "logging": {
    "enabled": true,
    "logFile": "carbon_copy_log.txt",
    "verbosity": "info",
    "logFolder": "pluginData",
    "maxLogSize": 1048576,
    "includeTimings": false
  },

  "folderPersistence": {
    "enabled": true,
    "tokenFile": "folder_tokens.json"
  }
}
```

### Key Configuration Options

#### copyGeneration

- **nCopies** (1-5): Total number of copies defined in preset
- **generateCopies** (array): Which copies to actually generate
  - Example: `[1, 3]` generates only copies 1 and 3, skipping 2
- **randomSeed** (integer): Base seed for random number generator
  - Same seed = identical results (reproducible)
- **seedStrategy** ("fixed" or "documentHash"):
  - "fixed": Same seed for all documents
  - "documentHash": Seed varies per document name (different results per file)

#### Seed Strategy Examples

**Fixed Seed - Same results for all documents:**
```json
{
  "randomSeed": 12345,
  "seedStrategy": "fixed"
}
```

**Document Hash - Different results per document:**
```json
{
  "randomSeed": 20251111,
  "seedStrategy": "documentHash"
}
```
Result: `seed = 20251111 + hash("document_name.psd")`

---

## Preset System

### Preset Structure

Presets define the visual characteristics of each carbon copy.

**Complete Preset Example:**

```json
{
  "name": "Default Carbon Copy",
  "description": "Balanced carbon copy settings for general use",
  "version": "1.0",

  "copySettings": [
    {
      "copyNumber": 1,
      "description": "First carbon - onionskin sheet",
      "opacity": {
        "base": 0.80,
        "range": [0.78, 0.82]
      },
      "blur": {
        "type": "gaussian",
        "radiusRange": [0.4, 0.6]
      },
      "noise": {
        "amountRange": [1.5, 2.5],
        "distribution": "gaussian",
        "monochromatic": true
      },
      "paperColor": "faf8f0",
      "carbonColor": "1a1d24"
    },
    {
      "copyNumber": 2,
      "description": "Second carbon - yellow sheet",
      "opacity": {
        "base": 0.70,
        "range": [0.68, 0.72]
      },
      "blur": {
        "type": "gaussian",
        "radiusRange": [0.5, 0.7]
      },
      "noise": {
        "amountRange": [2.5, 3.5],
        "distribution": "gaussian",
        "monochromatic": true
      },
      "paperColor": "fefce6",
      "carbonColor": "1a1d24"
    }
  ],

  "globalEffects": {
    "imperfections": {
      "enabled": true,
      "method": "gradientFill",
      "streakCount": [3, 5],
      "streakAngleBase": 90,
      "streakAngleVariation": 5,
      "streakOpacity": [8, 20],
      "blendMode": "multiply",
      "layerOpacity": 12
    },
    "reverseBleed": {
      "enabled": true,
      "opacityRange": [0.05, 0.08],
      "offsetMode": "vertical",
      "offsetX": [-2, 2],
      "offsetY": [1, 3],
      "additionalBlur": 0.3
    }
  },

  "textures": [
    {
      "name": "paper_grain",
      "path": "textures/paper_onionskin.png",
      "blendMode": "softLight",
      "opacity": 30,
      "applyToLayers": ["background"]
    }
  ]
}
```

### Creating Custom Presets

1. **Copy default preset:**
   ```bash
   cp presets/default.json presets/my_preset.json
   ```

2. **Edit settings:**
   - Adjust opacity ranges for lighter/darker copies
   - Modify blur ranges for sharper/softer text
   - Change noise amounts for grainier/smoother texture
   - Update paper colors (hex values without #)
   - Change carbon colors for different ink tones

3. **Update config.json:**
   ```json
   {
     "preset": "presets/my_preset.json"
   }
   ```

### Preset Tips

**For lighter copies:**
- Increase opacity: `"range": [0.85, 0.90]`
- Reduce blur: `"radiusRange": [0.3, 0.5]`
- Reduce noise: `"amountRange": [1.0, 2.0]`

**For heavier degradation:**
- Decrease opacity: `"range": [0.50, 0.60]`
- Increase blur: `"radiusRange": [0.8, 1.2]`
- Increase noise: `"amountRange": [4.0, 6.0]`

**For vintage look:**
- Use sepia tones: `"carbonColor": "3d2817"`
- Use aged paper: `"paperColor": "f0e6d2"`
- Increase imperfections streaks: `"streakCount": [5, 8]`

---

## Workflow Examples

### Example 1: Basic Typed Memo

**Document Structure:**
```
Layers:
  - Body Text
  - Date Header
  - Company Logo (exclude)
  - Signature (exclude)
```

**Steps:**
1. Ensure "Body Text" and "Date Header" are visible
2. Plugin auto-detects "Body Text"
3. "Company Logo" and "Signature" move to UNPROCESSED
4. Run plugin
5. Get 3 carbon copies with realistic degradation

### Example 2: Multi-Page Form Processing

**Scenario:** Process 50 filled-out forms

**Config:**
```json
{
  "mode": "batch",
  "batch": {
    "promptForInputFolder": true,
    "promptForOutputFolder": true,
    "continueOnError": true
  },
  "export": {
    "enabled": true,
    "formats": ["PNG"]
  }
}
```

**Steps:**
1. Place all 50 PSDs in a folder
2. Run plugin
3. Select input folder
4. Select output folder
5. Wait for batch completion
6. Review log file for any errors

### Example 3: Reproducible Test Results

**Use Case:** Generate identical results for testing

**Config:**
```json
{
  "copyGeneration": {
    "randomSeed": 12345,
    "seedStrategy": "fixed"
  }
}
```

**Result:** Every run produces identical blur, noise, and streak patterns.

### Example 4: Unique Results Per Document

**Use Case:** Batch processing with unique variation per document

**Config:**
```json
{
  "copyGeneration": {
    "randomSeed": 20251111,
    "seedStrategy": "documentHash"
  }
}
```

**Result:** Each document gets unique effects based on its filename.

---

## Advanced Configuration

### Custom Layer Processing Rules

**Add custom keywords:**
```json
{
  "layerRules": {
    "processIfContains": ["body", "text", "paragraph", "entry", "field"],
    "skipIfContains": ["signature", "logo", "watermark", "footer"]
  }
}
```

### Processing Modes

```json
{
  "layerRules": {
    "processingMode": "smart_detection"
  }
}
```

Options:
- **smart_detection** - Use name-based filtering (recommended)
- **selected_layers** - Process only selected layers (future)
- **flatten_all** - Flatten entire document (future)

### Selective Copy Generation

**Generate only copies 1 and 3:**
```json
{
  "copyGeneration": {
    "nCopies": 5,
    "generateCopies": [1, 3]
  }
}
```

**Why?** Faster processing, smaller file size, or specific copy requirements.

---

## Texture System

### Adding Paper Textures

1. **Prepare Texture Files:**
   - Format: PNG, TIF, or PSD
   - Resolution: Match document DPI (typically 300 DPI)
   - Size: 2550×3300px for 8.5×11" at 300 DPI
   - Color: RGB mode

2. **Place in textures/ folder:**
   ```
   textures/
     ├── paper_onionskin.png
     ├── paper_yellow.png
     └── paper_aged.png
   ```

3. **Configure in preset:**
   ```json
   {
     "textures": [
       {
         "name": "paper_grain",
         "path": "textures/paper_onionskin.png",
         "blendMode": "softLight",
         "opacity": 30,
         "applyToLayers": ["background"]
       }
     ]
   }
   ```

### Texture Configuration Options

- **name**: Descriptive name (appears in layer name)
- **path**: Relative path from plugin folder
- **blendMode**: "softLight", "overlay", "multiply", "screen", "hardLight"
- **opacity**: 0-100 (percentage)
- **applyToLayers**:
  - `["background"]` - Apply to background only
  - `["all"]` - Apply to all layers
  - `[1, 2, 3]` - Apply to specific copy numbers

### Multiple Textures

Apply different textures to different copies:

```json
{
  "textures": [
    {
      "name": "fine_grain",
      "path": "textures/paper_onionskin.png",
      "blendMode": "softLight",
      "opacity": 25,
      "applyToLayers": [1]
    },
    {
      "name": "heavy_grain",
      "path": "textures/paper_aged.png",
      "blendMode": "multiply",
      "opacity": 40,
      "applyToLayers": [3, 4, 5]
    }
  ]
}
```

### Texture Warnings

Plugin logs warnings if:
- Texture resolution differs >50 DPI from document
- Texture aspect ratio differs significantly from document
- Texture file not found (processing continues without texture)

---

## Export Options

### Export Configuration

```json
{
  "export": {
    "enabled": true,
    "formats": ["PNG", "PSD"],
    "embedICC": true,
    "logProfileName": true,
    "appendCopyIndex": true,
    "namingPattern": "{filename}_copy{n:02d}{suffix}.{ext}",
    "suffix": "_carbon"
  }
}
```

### Naming Pattern Variables

- `{filename}` - Original filename without extension
- `{n}` - Copy number (1, 2, 3)
- `{n:02d}` - Zero-padded copy number (01, 02, 03)
- `{suffix}` - Custom suffix from config
- `{ext}` - File extension (png, psd)

**Example Results:**
```
memo_report_copy01_carbon.png
memo_report_copy02_carbon.png
memo_report_copy03_carbon.png
```

### ICC Profile Handling

**Embed ICC profiles:**
```json
{
  "export": {
    "embedICC": true,
    "logProfileName": true
  }
}
```

**Log output:**
```
Exported memo_report_copy01_carbon.png with ICC profile: sRGB IEC61966-2.1
```

---

## Batch Processing

### Batch Configuration

```json
{
  "mode": "batch",
  "batch": {
    "promptForInputFolder": true,
    "promptForOutputFolder": true,
    "useLastFolders": true,
    "includeSubfolders": false,
    "filePattern": "*.psd",
    "continueOnError": true,
    "closeAfterProcessing": true
  }
}
```

### Folder Persistence

**useLastFolders: true**
- Plugin remembers last selected folders
- Stored in `pluginData/folder_tokens.json`
- Skip folder prompts on subsequent runs

**How it works:**
1. First run: Select folders
2. Folders saved as persistent tokens
3. Next run: Folders auto-selected
4. Set `promptForInputFolder: true` to change folders

### Error Handling

**continueOnError: true**
- Batch continues if one document fails
- Errors logged to file
- Summary shows successful vs failed

**continueOnError: false**
- Batch stops on first error
- Useful for debugging issues

---

## Understanding the Results

### Document Structure After Processing

```
COPY 3
  ├── Text Copy 3 - Body Text
  ├── Text Copy 3 - Date Header
  ├── Reverse Bleed - Copy 3
  ├── Imperfections - Copy 3
  │   ├── Streak 0
  │   ├── Streak 1
  │   └── Streak 2
  ├── Texture Overlay (if configured)
  └── Paper Background

COPY 2
  └── (same structure)

COPY 1
  └── (same structure)

UNPROCESSED
  ├── Company Logo
  └── Signature

ORIGINAL LAYERS (hidden)
  ├── Body Text (untouched)
  ├── Date Header (untouched)
  ├── Company Logo (original)
  └── Signature (original)
```

### Layer Effects Applied

**Text Layers:**
- Duplicated from originals
- Rasterized (if Smart Object or Text)
- Color overlay (carbon color)
- Opacity variation
- Gaussian blur
- Monochromatic noise

**Imperfections:**
- Gradient fill layers
- Vertical streaks with angle variation
- Noise texture applied
- Multiply blend mode
- Low opacity (8-20%)

**Reverse Bleed:**
- Merged copy of all text layers
- Horizontally flipped
- Vertical offset with horizontal jitter
- Very low opacity (5-8%)
- Additional blur for depth

**Paper Background:**
- Solid color fill
- Optional texture overlay
- Positioned at bottom of copy group

---

## Tips and Best Practices

### Document Preparation

✅ **Do:**
- Save document before running plugin
- Use RGB color mode
- Name layers descriptively
- Organize layers into groups if complex
- Keep text on separate layers

❌ **Don't:**
- Use artboards (not supported in v0.1)
- Leave document unsaved (export may fail)
- Use exclusively hidden layers
- Mix critical and decorative elements in one layer

### Performance Optimization

**For large batches:**
```json
{
  "batch": {
    "closeAfterProcessing": true
  },
  "logging": {
    "verbosity": "warn"
  }
}
```

**For testing:**
```json
{
  "copyGeneration": {
    "generateCopies": [1]
  },
  "export": {
    "enabled": false
  }
}
```

### Troubleshooting Workflow

1. **Enable debug logging:**
   ```json
   {"logging": {"verbosity": "debug"}}
   ```

2. **Check log file:**
   `pluginData/carbon_copy_log.txt`

3. **Test with simple document:**
   - Single text layer named "body text"
   - RGB mode
   - Saved document

4. **Verify layer names match rules**

5. **Check console for UXP errors**

### Quality Control

**For professional output:**
- Use high-resolution textures (300 DPI)
- Match texture aspect ratio to document
- Test presets on sample documents first
- Review exports at 100% zoom
- Check ICC profile embedding

**For fast iteration:**
- Disable export during testing
- Generate single copy only
- Reduce logging verbosity
- Use smaller documents for testing

---

## Additional Resources

- See `carbon_copy_simulator_spec_v1.0.md` for technical specification
- See `DEVELOPMENT_PLAN.md` for implementation details
- See `TEST_PLAN.md` for testing procedures
- Check `config.json` comments for inline documentation
- Review `presets/default.json` for reference settings

---

## Known Limitations (v0.1)

1. **No artboard support** - Use single-page documents only
2. **Smart Objects rasterized** - Cannot preserve smart filters
3. **No texture scaling** - Textures used at native size
4. **No UI panel** - Command-based execution only
5. **RGB mode required** - CMYK/Grayscale converted with warning
6. **No undo integration** - Use File > Revert to restore
7. **No progress indicators** - Processing happens without visual feedback

See DEVELOPMENT_PLAN.md for features planned for v0.2.
