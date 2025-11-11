# Carbon Copy Document Simulator - Final Specification v1.0
## Ready for Engineering Implementation

---

## Executive Summary

This specification defines a private UXP plugin for Photoshop 27.0 that transforms modern PSD layouts into authentic 1940s-1950s carbon copy documents. The plugin generates multiple carbon copies (1-5) in a single run using preset-driven automation with deterministic randomness.

**Key Characteristics:**
- Headless UXP command plugin (no panel UI in v0.1)
- Non-destructive workflow preserving all originals
- Modular architecture for testability
- Range-based effects with seeded PRNG for reproducibility
- JSON configuration for version control
- Batch folder processing with persistent folder handles
- RGB color mode only (v0.1)

**Implementation Timeline:** ~3 weeks (M0-M6)

---

## 1. Core Objectives

### Primary Goals
- Rapidly validate concept through headless UXP plugin
- Preserve originals in protected group for all operations
- Use layer naming rules for detection (no OCR or content analysis)
- Use JSON presets stored on disk for reproducible styles
- Support RGB color mode with extensibility for Grayscale/CMYK later
- Enable folder-level batch processing for multiple PSDs
- Accept user-supplied textures without programmatic scaling
- Operate reliably within Photoshop 27.0 UXP API constraints

### Randomness Policy
**The plugin uses a seeded PRNG (mulberry32 algorithm) for all random number generation.**
- No calls to `Math.random()` after seeding
- Same seed produces identical results across runs
- In batch mode: seed + document name hash = unique but deterministic per document
- This ensures reproducible results for historical documentation accuracy

### Selection Policy
**Process visible-only layers that match naming rules.**
- Hidden layers are automatically excluded (provides simple on/off control)
- Gives users intuitive way to exclude content without renaming
- Matching layers in hidden groups are also excluded

### Constraints and Exclusions (v0.1)
- **Artboards:** Not supported. Use single-page documents with standard layer stack
- **Smart Objects:** Will be rasterized (no smart filter preservation in v0.1)
- **Color modes:** RGB primary. CMYK/Grayscale converted temporarily (lossy)
- **Procedural noise:** No Perlin/simplex generation. Use Add Noise filter + gradient fills + textures
- **Generative AI:** No Firefly/Harmonize integration (not scriptable)

---

## 2. Project Architecture

### File Structure

```
carbon-copy-simulator/
├── manifest.json                    # UXP plugin manifest
├── main.js                          # Entry point and command registration
├── core/
│   ├── engine.js                    # Main processing pipeline
│   ├── layers.js                    # Layer detection and manipulation
│   ├── effects.js                   # Effect implementations
│   ├── config.js                    # Configuration loader and validator
│   ├── prng.js                      # Seeded PRNG (mulberry32)
│   └── export.js                    # File I/O and export functions
├── presets/
│   ├── default.json                 # Balanced preset
│   ├── 1947-military.json          # USAAF/Edwards AFB style
│   ├── 1960s-office.json           # Office memo style
│   └── faded-fifth-copy.json       # Heavily degraded
├── textures/
│   ├── README.txt                   # Texture requirements documentation
│   └── [user-provided files]       # Paper grain, streak patterns
├── config.json                      # Main configuration file
└── docs/
    ├── README.md                    # Installation and basic usage
    ├── USAGE.md                     # Detailed usage guide
    └── TEST_PLAN.md                 # Testing procedures
```

### UXP Plugin Manifest (manifest.json)

```json
{
  "id": "com.benrossi.carboncopysimulator",
  "name": "Carbon Copy Simulator",
  "version": "0.1.0",
  "host": {
    "app": "PS",
    "minVersion": "27.0.0"
  },
  "entrypoints": [
    {
      "type": "command",
      "id": "runCarbonCopy",
      "label": "Run Carbon Copy Simulation"
    }
  ],
  "requiredPermissions": [
    "localFileSystem",
    "launchProcess"
  ]
}
```

---

## 3. Configuration System

### Main Configuration (config.json)

Located in plugin root directory, editable by user between runs.

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
  
  "preset": "presets/1947-military.json",
  
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

### Configuration Notes

**Folder Selection:**
- `promptForInputFolder: true` - User selects folder via UXP picker on first run
- `useLastFolders: true` - Plugin stores folder token and rehydrates on subsequent runs
- Tokens stored in plugin data folder (`folder_tokens.json`)
- Falls back to picker if token invalid or missing

**Seed Strategy:**
- `"documentHash"` - Combine seed + document name hash (unique per document, deterministic)
- `"fixed"` - Use seed as-is for all documents (identical randomness across batch)
- Recommended: `"documentHash"` for natural variation while maintaining reproducibility

**Layer Processing:**
- `visibleOnly: true` - Only process visible layers (hidden layers excluded)
- Provides intuitive control: hide layer to exclude from processing
- Matching layers in hidden groups are also excluded

**Texture Verification:**
- `verifyResolution: true` - Warns if texture resolution differs significantly from document
- `verifyAspectRatio: true` - Warns if texture aspect ratio doesn't match 8.5×11
- No automatic scaling in v0.1 (use native texture size, tile if needed)
- `scalingPercentFuture: 100` - Hook for future scaling feature

**State Management:**
- `trackLayerIDs: true` - Monitor original layer IDs to prevent accidental modification
- `restoreStateOnError: true` - Restore document state if processing fails

### Preset File Schema

```json
{
  "name": "1947 Military Carbon",
  "description": "USAAF/Edwards AFB documentation style",
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
    },
    {
      "copyNumber": 3,
      "description": "Third carbon - pink sheet",
      "opacity": {
        "base": 0.60,
        "range": [0.58, 0.62]
      },
      "blur": {
        "type": "gaussian",
        "radiusRange": [0.6, 0.8]
      },
      "noise": {
        "amountRange": [3.5, 4.5],
        "distribution": "gaussian",
        "monochromatic": true
      },
      "paperColor": "fff0f5",
      "carbonColor": "22242a"
    },
    {
      "copyNumber": 4,
      "description": "Fourth carbon - blue sheet",
      "opacity": {
        "base": 0.50,
        "range": [0.48, 0.52]
      },
      "blur": {
        "type": "gaussian",
        "radiusRange": [0.7, 0.9]
      },
      "noise": {
        "amountRange": [4.0, 5.0],
        "distribution": "gaussian",
        "monochromatic": true
      },
      "paperColor": "f0f8ff",
      "carbonColor": "2a2d35"
    },
    {
      "copyNumber": 5,
      "description": "Fifth carbon - last copy",
      "opacity": {
        "base": 0.45,
        "range": [0.43, 0.47]
      },
      "blur": {
        "type": "gaussian",
        "radiusRange": [0.8, 1.0]
      },
      "noise": {
        "amountRange": [4.5, 5.5],
        "distribution": "gaussian",
        "monochromatic": true
      },
      "paperColor": "f5f5f0",
      "carbonColor": "2d303a"
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
  ],
  
  "v02Features": {
    "motionBlur": {
      "enabled": false,
      "angleRange": [-30, -20],
      "distanceRange": [2, 6]
    },
    "edgeFray": {
      "enabled": false,
      "amountRange": [1, 3]
    },
    "unevenPressure": {
      "enabled": false,
      "gradientType": "radial",
      "intensityRange": [0.05, 0.15]
    },
    "paperTone": {
      "enabled": false,
      "color": "f6f0e2",
      "opacity": 6,
      "blendMode": "multiply"
    }
  }
}
```

---

## 4. Development Milestones

### Milestone Overview

| Milestone | Description | Duration | v0.1 | v0.2 |
|-----------|-------------|----------|------|------|
| M0 | Scaffold: manifest, config, logging, PRNG, folder persistence | 2-3 days | ✓ | - |
| M1 | Layer selection, duplication, scaffold creation, state management | 2-3 days | ✓ | - |
| M2 | Core effects: blur, noise, opacity, gradient streaks | 3-4 days | ✓ | - |
| M3 | Texture overlays, paper backgrounds | 2-3 days | ✓ | - |
| M4 | Reverse bleed integration | 2-3 days | ✓ | - |
| M5 | Export engine, batch processing | 3-4 days | ✓ | - |
| M6 | Testing, validation, seed reproducibility | 2-3 days | ✓ | - |
| M7 | Advanced effects: motion blur, edge fray | - | - | ✓ |
| M8 | Paper tone, pressure zones | - | - | ✓ |
| M9 | UXP panel UI (optional) | - | - | ✓ |

**Total v0.1 Duration:** ~16-23 days (~3 weeks)

### v0.1 Feature Set

**Included:**
- ✓ UXP plugin structure with command registration
- ✓ JSON config and preset loading with type validation
- ✓ Persistent folder handles (store tokens, rehydrate on launch)
- ✓ Seeded PRNG (mulberry32) for deterministic randomness
- ✓ Layer name-based filtering (smart detection, visible-only)
- ✓ Non-destructive scaffold with layer ID tracking
- ✓ State management (save/restore in try/finally blocks)
- ✓ Generate N copies in single run (1-5)
- ✓ Core effects: Gaussian blur, noise, opacity variation
- ✓ Gradient fill layers for directional streaks (no pre-made textures required)
- ✓ Reverse bleed-through (vertical offset with X jitter)
- ✓ Paper background with color and texture overlay
- ✓ Auto-export PSD and PNG with ICC profile logging
- ✓ Batch folder processing with seed + document hash
- ✓ RGB color mode support with conversion warnings
- ✓ Comprehensive logging to plugin data folder

**Deferred to v0.2:**
- ⚙ Motion blur (directional carbon streaking)
- ⚙ Edge fray effects
- ⚙ Uneven pressure zone masks
- ⚙ Paper tone overlay layer
- ⚙ CMYK and Grayscale round-trip support
- ⚙ UXP panel UI
- ⚙ Real-time preview
- ⚙ Async yielding for large documents (add only if needed)

---

## 5. Processing Pipeline

### High-Level Flow

```
1. Plugin Command Invoked
   ├─ Load config.json with type validation
   ├─ Load preset file
   ├─ Initialize seeded PRNG (mulberry32)
   └─ Validate configuration

2. Folder Selection (Batch Mode)
   ├─ Check for persistent folder token
   ├─ Rehydrate folder if token valid
   └─ Prompt user if token missing/invalid

3. Processing Loop
   ├─ Single mode: Process active document
   └─ Batch mode: Process folder of PSDs
   
4. For Each Document:
   ├─ Save document state (active doc, selections, visibility)
   ├─ Wrap in executeAsModal + try/finally
   ├─ Pre-flight validation
   ├─ Color mode check/conversion
   ├─ Layer identification (visible + name matching)
   ├─ Track original layer IDs
   ├─ Create scaffold structure
   ├─ Generate N copies in loop
   ├─ Export results (log ICC profile names)
   ├─ Restore document state
   └─ Log results

5. Post-Processing
   ├─ Save folder tokens for next run
   ├─ Generate summary report
   └─ Display completion message
```

### Detailed Processing (core/engine.js)

```javascript
async function processDocument(doc, config, preset) {
  // CRITICAL: Save state before any operations
  const savedState = {
    activeDocument: app.activeDocument,
    activeLayers: [...doc.activeLayers],
    historyState: doc.activeHistoryState,
    layerVisibility: captureLayerVisibility(doc)
  };
  
  try {
    return await executeAsModal(async () => {
      // 1. VALIDATION
      const validation = validateDocument(doc, config);
      if (validation.errors.length > 0) {
        throw new Error(validation.errors.join('; '));
      }
      logWarnings(validation.warnings);
      
      // 2. COLOR MODE
      convertColorModeIfNeeded(doc, config);
      
      // 3. LAYER IDENTIFICATION (visible-only + name matching)
      const targetLayers = identifyTargetLayers(doc, config.layerRules);
      const excludedLayers = identifyExcludedLayers(doc, config.layerRules);
      
      if (targetLayers.length === 0) {
        throw new Error("No visible layers match processing rules");
      }
      
      logger.info(`Found ${targetLayers.length} layers to process`);
      
      // 4. TRACK ORIGINAL LAYER IDs
      const originalLayerIDs = targetLayers.map(l => l.id);
      
      // 5. SCAFFOLD CREATION
      const scaffold = await createScaffold(doc, config.copyGeneration.nCopies);
      
      // 6. PRESERVE ORIGINALS
      await moveLayersToGroup(targetLayers, scaffold.originalGroup);
      scaffold.originalGroup.visible = false;
      await moveLayersToGroup(excludedLayers, scaffold.unprocessedGroup);
      
      // 7. INITIALIZE PRNG
      const docSeed = calculateDocumentSeed(doc, config);
      const rng = mulberry32(docSeed);
      logger.info(`Using seed: ${docSeed}`);
      
      // 8. GENERATE COPIES
      const copyNumbers = config.copyGeneration.generateCopies;
      for (const copyNum of copyNumbers) {
        logger.info(`Generating copy ${copyNum}...`);
        
        const copySettings = preset.copySettings.find(s => s.copyNumber === copyNum);
        const copyGroup = scaffold.copiesGroups[copyNum - 1];
        
        // Create paper background
        await createPaperBackground(doc, copySettings, copyGroup, preset.textures);
        
        // Process each target layer for this copy
        for (const origLayer of targetLayers) {
          await processLayerForCopy(
            doc,
            origLayer,
            copySettings,
            copyNum,
            rng,
            copyGroup
          );
        }
        
        // Add imperfections (gradient streaks)
        await createImperfectionsLayer(
          doc,
          preset.globalEffects.imperfections,
          copyNum,
          rng,
          copyGroup
        );
        
        // Add reverse bleed-through
        if (preset.globalEffects.reverseBleed.enabled) {
          await createReverseBleed(
            doc,
            copyGroup,
            preset.globalEffects.reverseBleed,
            copyNum,
            rng
          );
        }
        
        await organizeCopyGroup(copyGroup);
      }
      
      // 9. VERIFY ORIGINALS UNCHANGED
      verifyOriginalLayerIDs(doc, originalLayerIDs);
      
      // 10. EXPORT
      if (config.export.enabled) {
        for (const copyNum of copyNumbers) {
          await exportCopy(doc, copyNum, config.export);
        }
      }
      
      // 11. SAVE MASTER PSD
      await doc.save();
      
      return {
        success: true,
        copiesGenerated: copyNumbers.length,
        layersProcessed: targetLayers.length
      };
      
    }, { commandName: "Carbon Copy Simulation" });
    
  } catch (err) {
    logger.error(`Processing failed: ${err.message}`);
    throw err;
    
  } finally {
    // CRITICAL: Restore state even on error
    if (config.workflow.restoreStateOnError) {
      await restoreDocumentState(doc, savedState);
    }
  }
}
```

---

## 6. Core Implementation Details

### M0: Scaffold, Configuration, and PRNG

#### Seeded PRNG (core/prng.js)

```javascript
/**
 * Mulberry32 PRNG
 * Fast, high-quality, seedable random number generator
 * @param {number} seed - Integer seed value
 * @returns {function} - Function that returns random float [0, 1)
 */
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Create seeded random utilities
 */
function createSeededRandom(seed) {
  const rng = mulberry32(seed);
  
  return {
    next: () => rng(),
    range: (min, max) => min + rng() * (max - min),
    integer: (min, max) => Math.floor(min + rng() * (max - min + 1))
  };
}

/**
 * Calculate document-specific seed
 */
function calculateDocumentSeed(doc, config) {
  const baseSeed = config.copyGeneration.randomSeed;
  
  if (config.copyGeneration.seedStrategy === "fixed") {
    return baseSeed;
  }
  
  // Strategy: documentHash
  // Combine base seed with hash of document name
  const docHash = hashString(doc.name);
  return baseSeed + docHash;
}

/**
 * Simple string hash function
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

module.exports = { mulberry32, createSeededRandom, calculateDocumentSeed };
```

#### Folder Persistence (core/config.js)

```javascript
const fs = require("uxp").storage.localFileSystem;

/**
 * Persistent folder handle management
 */
class FolderPersistence {
  constructor(config) {
    this.enabled = config.folderPersistence.enabled;
    this.tokenFile = config.folderPersistence.tokenFile;
  }
  
  async loadTokens() {
    try {
      const dataFolder = await fs.getDataFolder();
      const tokenFile = await dataFolder.getEntry(this.tokenFile);
      const contents = await tokenFile.read();
      return JSON.parse(contents);
    } catch (err) {
      // File doesn't exist or invalid JSON
      return { inputFolder: null, outputFolder: null };
    }
  }
  
  async saveTokens(tokens) {
    const dataFolder = await fs.getDataFolder();
    const tokenFile = await dataFolder.createFile(this.tokenFile, { overwrite: true });
    await tokenFile.write(JSON.stringify(tokens, null, 2));
  }
  
  async getInputFolder(promptUser = false) {
    if (!this.enabled) {
      return await fs.getFolder();
    }
    
    // Try to load persisted token
    const tokens = await this.loadTokens();
    
    if (tokens.inputFolder && !promptUser) {
      try {
        const folder = await fs.getEntryForPersistentToken(tokens.inputFolder);
        if (folder) {
          logger.info("Rehydrated input folder from token");
          return folder;
        }
      } catch (err) {
        logger.warn("Failed to rehydrate input folder, will prompt user");
      }
    }
    
    // Prompt user to select folder
    const folder = await fs.getFolder();
    const token = await fs.createPersistentToken(folder);
    
    tokens.inputFolder = token;
    await this.saveTokens(tokens);
    
    return folder;
  }
  
  async getOutputFolder(promptUser = false) {
    // Similar implementation to getInputFolder
    // ... code omitted for brevity
  }
}

module.exports = FolderPersistence;
```

#### Configuration Validation (core/config.js)

```javascript
function validateConfig(config) {
  const errors = [];
  
  // Type checks
  if (typeof config.copyGeneration.nCopies !== 'number') {
    errors.push("config.copyGeneration.nCopies must be a number");
  }
  
  if (typeof config.copyGeneration.randomSeed !== 'number') {
    errors.push("config.copyGeneration.randomSeed must be a number");
  }
  
  if (!Array.isArray(config.copyGeneration.generateCopies)) {
    errors.push("config.copyGeneration.generateCopies must be an array");
  }
  
  // Range checks
  if (config.copyGeneration.nCopies < 1 || config.copyGeneration.nCopies > 5) {
    errors.push("nCopies must be 1-5");
  }
  
  // Validate generateCopies array values
  for (const copyNum of config.copyGeneration.generateCopies) {
    if (typeof copyNum !== 'number' || copyNum < 1 || copyNum > 5) {
      errors.push(`Invalid copy number in generateCopies: ${copyNum}`);
    }
  }
  
  // Check processing mode
  const validModes = ['smart_detection', 'selected_layers', 'flatten_all'];
  if (!validModes.includes(config.layerRules.processingMode)) {
    errors.push(`Invalid processingMode: ${config.layerRules.processingMode}`);
  }
  
  if (errors.length > 0) {
    throw new Error("Configuration validation failed:\n" + errors.join('\n'));
  }
  
  return true;
}

function validatePreset(preset, config) {
  const errors = [];
  
  // Ensure preset has settings for all requested copies
  for (const copyNum of config.copyGeneration.generateCopies) {
    const setting = preset.copySettings.find(s => s.copyNumber === copyNum);
    if (!setting) {
      errors.push(`Preset missing settings for copy ${copyNum}`);
    }
  }
  
  // Validate texture paths if present
  if (preset.textures) {
    for (const texture of preset.textures) {
      if (!texture.path) {
        errors.push("Texture missing 'path' field");
      }
    }
  }
  
  if (errors.length > 0) {
    throw new Error("Preset validation failed:\n" + errors.join('\n'));
  }
  
  return true;
}
```

### M1: Layer Selection and Scaffold

#### Layer Identification with Visible-Only Filter (core/layers.js)

```javascript
/**
 * Identify target layers for processing
 * - Must match name rules
 * - Must be visible (if visibleOnly: true)
 * - Excludes layers in hidden groups
 */
function identifyTargetLayers(doc, rules) {
  const allLayers = getAllLayers(doc);
  const targets = [];
  
  for (const layer of allLayers) {
    // Check visibility first (if enabled)
    if (rules.visibleOnly && !isLayerEffectivelyVisible(layer)) {
      continue;
    }
    
    // Check naming rules
    if (shouldProcessLayer(layer, rules)) {
      targets.push(layer);
    }
  }
  
  logger.info(`Identified ${targets.length} target layers`);
  return targets;
}

/**
 * Check if layer is visible AND all parent groups are visible
 */
function isLayerEffectivelyVisible(layer) {
  if (!layer.visible) return false;
  
  // Check all parent groups
  let parent = layer.parent;
  while (parent && parent.typename === "LayerSet") {
    if (!parent.visible) return false;
    parent = parent.parent;
  }
  
  return true;
}

/**
 * Check if layer name matches processing rules
 */
function shouldProcessLayer(layer, rules) {
  const name = rules.caseSensitive ? layer.name : layer.name.toLowerCase();
  
  // Check skip conditions first (higher priority)
  for (const skipTerm of rules.skipIfContains) {
    const term = rules.caseSensitive ? skipTerm : skipTerm.toLowerCase();
    if (name.includes(term)) {
      logger.debug(`Skipping layer "${layer.name}" (matches skip rule: "${skipTerm}")`);
      return false;
    }
  }
  
  // Check process conditions
  for (const processTerm of rules.processIfContains) {
    const term = rules.caseSensitive ? processTerm : processTerm.toLowerCase();
    if (name.includes(term)) {
      logger.debug(`Processing layer "${layer.name}" (matches rule: "${processTerm}")`);
      return true;
    }
  }
  
  return false;
}
```

#### State Management (core/layers.js)

```javascript
/**
 * Capture current document state for restoration
 */
function captureDocumentState(doc) {
  return {
    activeDocument: app.activeDocument,
    activeLayers: doc.activeLayers.map(l => ({ id: l.id, name: l.name })),
    historyState: doc.activeHistoryState,
    layerVisibility: captureLayerVisibility(doc)
  };
}

/**
 * Recursively capture layer visibility states
 */
function captureLayerVisibility(container) {
  const visibility = {};
  
  for (const layer of container.layers) {
    visibility[layer.id] = layer.visible;
    
    if (layer.typename === "LayerSet") {
      visibility[layer.id] = {
        visible: layer.visible,
        children: captureLayerVisibility(layer)
      };
    }
  }
  
  return visibility;
}

/**
 * Restore document state after processing or on error
 */
async function restoreDocumentState(doc, savedState) {
  try {
    // Restore active document
    app.activeDocument = savedState.activeDocument;
    
    // Restore layer visibility
    await restoreLayerVisibility(doc, savedState.layerVisibility);
    
    // Restore layer selection
    // Note: This is approximate, as layer IDs may have changed
    if (savedState.activeLayers.length > 0) {
      const layersToSelect = savedState.activeLayers
        .map(l => doc.layers.find(layer => layer.id === l.id))
        .filter(l => l !== null);
      
      if (layersToSelect.length > 0) {
        doc.activeLayers = layersToSelect;
      }
    }
    
    logger.info("Document state restored");
    
  } catch (err) {
    logger.warn(`Failed to fully restore document state: ${err.message}`);
  }
}

/**
 * Verify original layers haven't been modified
 */
function verifyOriginalLayerIDs(doc, originalIDs) {
  const originalGroup = doc.layerGroups.find(g => g.name === "ORIGINAL LAYERS");
  if (!originalGroup) {
    logger.warn("Original layers group not found");
    return false;
  }
  
  const currentIDs = getAllLayers(originalGroup).map(l => l.id);
  const missing = originalIDs.filter(id => !currentIDs.includes(id));
  
  if (missing.length > 0) {
    logger.error(`${missing.length} original layer(s) were modified or deleted!`);
    return false;
  }
  
  logger.info("Original layers verified intact");
  return true;
}
```

### M2: Core Effects

#### Layer Processing with Rasterization (core/effects.js)

**CRITICAL: All filters (Blur, Noise, Motion Blur) require raster layers.**

```javascript
async function processLayerForCopy(doc, origLayer, settings, copyNum, rng, targetGroup) {
  return await executeAsModal(async () => {
    // 1. Duplicate original layer
    const duplicate = await origLayer.duplicate();
    duplicate.name = `Text Copy ${copyNum} - ${origLayer.name}`;
    
    // 2. CRITICAL: Rasterize if not already raster
    // Filters require raster layers (not text, not smart objects)
    if (duplicate.kind !== "pixel") {
      logger.debug(`Rasterizing layer: ${duplicate.name}`);
      await duplicate.rasterize("entireLayer");
    }
    
    // 3. Apply color transformation
    await applyColorOverlay(duplicate, settings.carbonColor);
    
    // 4. Apply opacity (with range variation)
    const opacity = rng.range(
      settings.opacity.range[0] * 100,
      settings.opacity.range[1] * 100
    );
    duplicate.opacity = opacity;
    
    // 5. Apply Gaussian blur (with range variation)
    const blurRadius = rng.range(
      settings.blur.radiusRange[0],
      settings.blur.radiusRange[1]
    );
    await applyGaussianBlur(duplicate, blurRadius);
    
    // 6. Apply noise (with range variation)
    const noiseAmount = rng.range(
      settings.noise.amountRange[0],
      settings.noise.amountRange[1]
    );
    await applyNoise(duplicate, noiseAmount, settings.noise.monochromatic);
    
    // 7. Move to target group
    await duplicate.move(targetGroup);
    
    logger.debug(`Processed layer copy ${copyNum}: ${duplicate.name}`);
    return duplicate;
    
  }, { commandName: `Process Layer Copy ${copyNum}` });
}
```

#### Gradient Fill Streaks (core/effects.js)

**Gradient fill layers are created programmatically via batchPlay, then combined with noise for realistic carbon streaking. No pre-made texture files required.**

```javascript
async function createImperfectionsLayer(doc, settings, copyNum, rng, targetGroup) {
  if (!settings.enabled) return null;
  
  return await executeAsModal(async () => {
    // Create container group for imperfections
    const imperfGroup = targetGroup.layerSets.add({
      name: `Imperfections - Copy ${copyNum}`
    });
    imperfGroup.blendMode = settings.blendMode;
    imperfGroup.opacity = settings.layerOpacity;
    
    // Generate random vertical streaks using gradient fills
    const numStreaks = rng.integer(settings.streakCount[0], settings.streakCount[1]);
    
    for (let i = 0; i < numStreaks; i++) {
      const x = rng.range(0, doc.width.value);
      const angle = settings.streakAngleBase + rng.range(
        -settings.streakAngleVariation,
        settings.streakAngleVariation
      );
      const opacity = rng.range(settings.streakOpacity[0], settings.streakOpacity[1]);
      
      // Create gradient fill layer for this streak
      const streakLayer = await createGradientStreak(
        doc,
        imperfGroup,
        x,
        angle,
        opacity,
        i
      );
      
      // Apply noise to gradient for texture breakup
      // CRITICAL: Rasterize gradient fill before applying noise
      await streakLayer.rasterize("entireLayer");
      await applyNoise(streakLayer, 30, true); // Heavy noise for texture
    }
    
    logger.info(`Created ${numStreaks} gradient streak(s) for copy ${copyNum}`);
    return imperfGroup;
    
  }, { commandName: `Create Imperfections Copy ${copyNum}` });
}

/**
 * Create gradient fill layer for streak effect
 */
async function createGradientStreak(doc, parentGroup, xPosition, angle, opacity, index) {
  const { app } = require("photoshop");
  
  return await executeAsModal(async () => {
    // Create gradient fill layer via batchPlay
    const result = await app.batchPlay([{
      "_obj": "make",
      "_target": [{ "_ref": "contentLayer" }],
      "using": {
        "_obj": "contentLayer",
        "type": {
          "_obj": "gradientLayer",
          "gradient": {
            "_obj": "gradient",
            "name": `Streak ${index}`,
            "gradientForm": "customStops",
            "interpolation": 4096,
            "colors": [
              {
                "_obj": "colorStop",
                "color": {
                  "_obj": "RGBColor",
                  "red": 64,
                  "green": 64,
                  "blue": 64
                },
                "location": 0,
                "midpoint": 50
              },
              {
                "_obj": "colorStop",
                "color": {
                  "_obj": "RGBColor",
                  "red": 64,
                  "green": 64,
                  "blue": 64
                },
                "location": 4096,
                "midpoint": 50
              }
            ],
            "transparency": [
              {
                "_obj": "transferSpec",
                "opacity": { "_unit": "percentUnit", "_value": 0 },
                "location": 0,
                "midpoint": 50
              },
              {
                "_obj": "transferSpec",
                "opacity": { "_unit": "percentUnit", "_value": 100 },
                "location": 2048,
                "midpoint": 50
              },
              {
                "_obj": "transferSpec",
                "opacity": { "_unit": "percentUnit", "_value": 0 },
                "location": 4096,
                "midpoint": 50
              }
            ]
          },
          "angle": { "_unit": "angleUnit", "_value": angle },
          "scale": { "_unit": "percentUnit", "_value": 150 },
          "align": true
        }
      }
    }], {
      "synchronousExecution": true,
      "modalBehavior": "fail"
    });
    
    // Get reference to created layer
    const streakLayer = doc.activeLayers[0];
    streakLayer.name = `Streak ${index}`;
    streakLayer.opacity = opacity;
    
    // Move to imperfections group
    await streakLayer.move(parentGroup);
    
    return streakLayer;
    
  }, { commandName: `Create Gradient Streak ${index}` });
}
```

### M4: Reverse Bleed-Through

**Implementation with vertical offset preference and rasterization before transforms.**

```javascript
async function createReverseBleed(doc, copyGroup, settings, copyNum, rng) {
  if (!settings.enabled) return null;
  
  return await executeAsModal(async () => {
    // Get all text layers from copy group (excluding background, imperfections)
    const textLayers = copyGroup.layers.filter(l => 
      l.name.startsWith("Text Copy") && l.kind === "pixel"
    );
    
    if (textLayers.length === 0) {
      logger.warn("No text layers found for reverse bleed");
      return null;
    }
    
    // Merge copies of text layers
    const mergedLayer = await mergeLayers(textLayers, true); // duplicate before merge
    mergedLayer.name = `Reverse Bleed - Copy ${copyNum}`;
    
    // CRITICAL: Ensure layer is rasterized before transform
    if (mergedLayer.kind !== "pixel") {
      await mergedLayer.rasterize("entireLayer");
    }
    
    // Flip horizontal
    await mergedLayer.flip("horizontal");
    
    // Apply offset - prefer vertical with slight X jitter
    let offsetX, offsetY;
    
    if (settings.offsetMode === "vertical") {
      // Vertical-biased offset (realistic for paper strike-through)
      offsetX = rng.range(settings.offsetX[0], settings.offsetX[1]);
      offsetY = rng.range(settings.offsetY[0], settings.offsetY[1]);
    } else {
      // Random offset (legacy support)
      offsetX = rng.range(settings.offsetX[0], settings.offsetX[1]);
      offsetY = rng.range(settings.offsetY[0], settings.offsetY[1]);
    }
    
    await mergedLayer.translate(offsetX, offsetY);
    
    // Set low opacity
    const opacity = rng.range(
      settings.opacityRange[0] * 100,
      settings.opacityRange[1] * 100
    );
    mergedLayer.opacity = opacity;
    
    // Additional blur for depth effect
    if (settings.additionalBlur > 0) {
      await applyGaussianBlur(mergedLayer, settings.additionalBlur);
    }
    
    // Position above background but below main text
    await moveAboveBackground(mergedLayer, copyGroup);
    
    logger.info(`Created reverse bleed for copy ${copyNum}`);
    return mergedLayer;
    
  }, { commandName: `Create Reverse Bleed Copy ${copyNum}` });
}
```

### M5: Export System with ICC Profile Logging

```javascript
async function exportCopy(doc, copyNum, exportSettings) {
  if (!exportSettings.enabled) return;
  
  // Generate filename
  const baseFilename = doc.name.replace(/\.psd$/i, '');
  const filename = exportSettings.namingPattern
    .replace('{filename}', baseFilename)
    .replace('{n:02d}', copyNum.toString().padStart(2, '0'))
    .replace('{n}', copyNum.toString())
    .replace('{suffix}', exportSettings.suffix);
  
  for (const format of exportSettings.formats) {
    const fullFilename = filename.replace('{ext}', format.toLowerCase());
    
    if (format === 'PNG') {
      await exportPNG(doc, copyNum, fullFilename, exportSettings);
    } else if (format === 'PSD') {
      await exportPSD(doc, copyNum, fullFilename, exportSettings);
    }
  }
}

async function exportPNG(doc, copyNum, filename, settings) {
  return await executeAsModal(async () => {
    // Duplicate document for export
    const exportDoc = await doc.duplicate(`export_copy_${copyNum}_temp`);
    
    try {
      // Isolate target copy
      await isolateCopyGroup(exportDoc, copyNum);
      
      // Flatten
      await exportDoc.flatten();
      
      // Get ICC profile information BEFORE export
      let profileName = "none";
      try {
        if (exportDoc.colorProfileName) {
          profileName = exportDoc.colorProfileName;
        }
      } catch (err) {
        logger.warn("Could not read color profile name");
      }
      
      // Export as PNG
      const outputPath = `${doc.path}/${filename}`;
      
      try {
        await exportDoc.saveAs.png(outputPath, {
          compression: 9,
          interlaced: false,
          embedColorProfile: settings.embedICC
        }, true);
        
        // Log successful export with profile information
        if (settings.logProfileName) {
          logger.info(`Exported ${filename} with ICC profile: ${profileName}`);
        }
        
      } catch (err) {
        if (settings.embedICC && err.message.includes("profile")) {
          // Fallback: export without ICC if embedding fails
          logger.warn(`ICC embedding failed for ${filename}, exporting without profile`);
          
          await exportDoc.saveAs.png(outputPath, {
            compression: 9,
            interlaced: false,
            embedColorProfile: false
          }, true);
          
          logger.info(`Exported ${filename} without ICC profile (fallback)`);
        } else {
          throw err;
        }
      }
      
    } finally {
      // Always close export document
      await exportDoc.close("saveChanges");
    }
    
  }, { commandName: `Export Copy ${copyNum} PNG` });
}
```

---

## 7. Testing Strategy

### Test Plan (docs/TEST_PLAN.md)

#### Functional Tests

**Test 1: Single Document, Single Copy**
- Input: simple_document.psd (2 text layers)
- Config: Generate copy 3 only, seed 12345
- Expected: One copy group, 2 processed layers, exports successful
- Validate: Opacity ~60%, blur ~0.7px, paper color #fff0f5 (pink)
- Validate: Seed reproducibility (run twice, compare outputs)

**Test 2: Single Document, Multiple Copies**
- Input: simple_document.psd
- Config: Generate copies 1, 3, 5, seed 67890
- Expected: Three copy groups created
- Validate: Progressive degradation (copy 5 most faded)
- Validate: Each copy has unique randomness

**Test 3: Batch Processing with Document Hash**
- Input: 3 PSD files with different names
- Config: Generate copy 2, seed 11111, seedStrategy "documentHash"
- Expected: 3 documents processed, each with different randomness
- Validate: Same filename produces identical results across runs
- Validate: Different filenames produce different results

**Test 4: Visible-Only Layer Processing**
- Input: Document with 5 text layers (3 visible, 2 hidden)
- Config: visibleOnly: true
- Expected: Only 3 visible layers processed
- Action: Hide 1 more layer, re-run
- Expected: Only 2 layers processed

**Test 5: Layer Name Filtering**
- Input: complex_document.psd with layers: "Body Text", "Signature - Smith", "Stamp RED"
- Config: processIfContains: ["body", "text"], skipIfContains: ["signature", "stamp"]
- Expected: "Body Text" processed, others skipped
- Validate: Unprocessed group contains signature and stamp

**Test 6: State Restoration on Error**
- Input: Document with locked layer matching process rules
- Config: restoreStateOnError: true
- Expected: Error thrown, document state restored to pre-run condition
- Validate: Active layers, visibility unchanged

**Test 7: Gradient Streak Generation**
- Input: simple_document.psd
- Config: imperfections.enabled: true, streakCount: [4, 6]
- Expected: 4-6 gradient fill layers created, rasterized, noised
- Validate: Streaks are near-vertical (angle ~90°±5°)

**Test 8: Reverse Bleed with Vertical Offset**
- Input: simple_document.psd
- Config: reverseBleed.enabled: true, offsetMode: "vertical"
- Expected: Reverse bleed layer created, offset primarily Y-axis
- Validate: offsetY > offsetX in magnitude

**Test 9: ICC Profile Handling**
- Input: Document with embedded ICC profile
- Config: export.embedICC: true, export.logProfileName: true
- Expected: PNG exported with profile, log shows profile name
- Test variant: Document without profile
- Expected: Warning logged, export continues

**Test 10: Folder Persistence**
- Run 1: Select input folder via picker
- Run 2: Plugin rehydrates folder automatically (no picker)
- Run 3: Delete token file, plugin prompts for folder
- Validate: Token stored in pluginData folder

#### Edge Case Tests

**Test 11: No Matching Layers**
- Input: Document with no visible layers matching rules
- Expected: Error "No visible layers match processing rules"
- Validate: Original document unchanged

**Test 12: Smart Object Handling**
- Input: Document with text as Smart Object
- Expected: Smart Object duplicated, duplicate rasterized, processed
- Validate: Original Smart Object in ORIGINAL LAYERS group unchanged

**Test 13: Texture File Missing**
- Input: simple_document.psd
- Preset: References non-existent texture file
- Expected: Warning logged, processing continues without texture
- Validate: Output created successfully

**Test 14: Texture Resolution Mismatch**
- Input: 300 DPI document
- Texture: 150 DPI texture file
- Config: verifyResolution: true
- Expected: Warning logged about resolution mismatch
- Validate: Texture still applied (native size)

**Test 15: CMYK Conversion**
- Input: CMYK document
- Config: convertIfNeeded: true, warnOnConversion: true
- Expected: Warning logged, converted to RGB, processed, warning about lossy conversion
- Validate: Output in RGB mode

#### Reproducibility Tests

**Test 16: Seed Consistency**
- Input: same_document.psd
- Config: seed 99999, generate copy 3
- Run 1: Record exact opacity, blur, noise values for each layer
- Run 2: Same config, compare values
- Expected: Bit-identical values (within floating-point precision)

**Test 17: Document Hash Variation**
- Input: doc_A.psd, doc_B.psd (identical content, different names)
- Config: seed 11111, seedStrategy "documentHash"
- Expected: Different random values for each document
- Expected: Each document individually reproducible

---

## 8. Usage Examples

### Example 1: Process Current Document, Generate 3 Copies

```json
{
  "mode": "single",
  "preset": "presets/1947-military.json",
  "copyGeneration": {
    "generateCopies": [1, 2, 3],
    "randomSeed": 20251115,
    "seedStrategy": "fixed"
  }
}
```

**Steps:**
1. Open Incident_Report.psd
2. Plugins → Carbon Copy Simulator → Run
3. Wait ~30 seconds
4. Review results: 3 copy groups + exports

**Output:**
- Incident_Report.psd (master with all copies)
- Incident_Report_copy01_carbon.png/psd
- Incident_Report_copy02_carbon.png/psd
- Incident_Report_copy03_carbon.png/psd

### Example 2: Batch Process Folder

```json
{
  "mode": "batch",
  "batch": {
    "promptForInputFolder": true,
    "useLastFolders": true
  },
  "copyGeneration": {
    "generateCopies": [2, 4],
    "randomSeed": 20251115,
    "seedStrategy": "documentHash"
  }
}
```

**First run:** User selects folder
**Subsequent runs:** Folder rehydrated from token

**Output:** Each document gets copy 2 and copy 4, all exported

---

## 9. Troubleshooting

### Common Issues

**"No visible layers match processing rules"**
- Cause: All matching layers are hidden
- Solution: Make target layers visible OR disable visibleOnly filter
- Check: Use verbosity: "debug" to see layer evaluation

**"Texture file not found"**
- Cause: Preset references missing texture
- Solution: Place texture in textures/ folder OR disable texture in preset
- Note: Processing continues without texture (warning logged)

**"Failed to rehydrate folder"**
- Cause: Folder moved/deleted since last run OR permissions changed
- Solution: Plugin will prompt for folder automatically
- Manual fix: Delete folder_tokens.json to force re-selection

**Smart Object rasterization warning**
- Cause: Layer is Smart Object, requires rasterization for filters
- Expected: Duplicate is rasterized (original preserved)
- No action needed unless you need editable Smart Object in copy

**ICC profile embedding failed**
- Cause: Document has no color profile OR profile incompatible with PNG
- Automatic fallback: Exports without profile
- Check log: Profile name logged as "none" or actual profile name

**Batch processing slower than expected**
- Cause: Large documents (>500MB) OR high DPI (>600)
- Expected: 30-60s per document at 300 DPI
- Optimization: Process at 300 DPI, upscale later if needed

---

## 10. Appendix

### Ready for Engineering Checklist

**Configuration & Architecture:**
- ☑ UXP manifest.json structure defined
- ☑ Modular file organization specified
- ☑ Config.json schema with type validation
- ☑ Preset file schema defined
- ☑ No hard-coded file paths (uses folder pickers)

**Randomness & Reproducibility:**
- ☑ Seeded PRNG (mulberry32) implementation provided
- ☑ No Math.random() usage after seeding
- ☑ Document hash strategy for batch variation

**Layer Processing:**
- ☑ Visible-only filtering specified
- ☑ Name-based selection rules
- ☑ Rasterization before all filter operations
- ☑ Layer ID tracking for original verification

**State Management:**
- ☑ Save/restore in try/finally blocks
- ☑ Restore on error enabled
- ☑ executeAsModal wrapping specified

**Effects Implementation:**
- ☑ Gradient fill layers for streaks (no external textures required)
- ☑ Add Noise requires raster layer documented
- ☑ Reverse bleed with vertical offset preference
- ☑ Texture overlay with native sizing

**Export & Persistence:**
- ☑ ICC profile logging specified
- ☑ Graceful fallback for missing profiles
- ☑ Persistent folder tokens documented
- ☑ Folder rehydration strategy

**Testing:**
- ☑ Seed reproducibility tests
- ☑ Document hash variation tests
- ☑ Visible-only processing tests
- ☑ State restoration tests
- ☑ Failure path tests (missing textures, locked layers)

**Exclusions Documented:**
- ☑ Artboards not supported
- ☑ Smart Objects will be rasterized
- ☑ RGB only (CMYK conversion lossy)
- ☑ No procedural Perlin noise
- ☑ No Generative AI integration

### Performance Expectations

| Document Type | Resolution | Layers | Est. Time |
|---------------|-----------|--------|-----------|
| Simple (2-3 layers) | 300 DPI | 2-3 | 15-25s |
| Medium (5-7 layers) | 300 DPI | 5-7 | 30-45s |
| Complex (10+ layers) | 300 DPI | 10+ | 45-75s |
| High-res (same complexity) | 600 DPI | 5-7 | 60-120s |

**Acceptable for v0.1:** 30-90 seconds per document
**Optimization deferred to v0.2:** Async yielding, proxy preview

### Critical Implementation Notes

1. **All filters require raster layers** - Check layer.kind before applying blur/noise
2. **Gradient fills must be rasterized** - Before applying Add Noise filter
3. **Transforms require rasterization** - Before flip/rotate operations
4. **Folder tokens are UXP-specific** - Use createPersistentToken/getEntryForPersistentToken
5. **State restoration is mandatory** - Use try/finally for all processing functions
6. **ICC profiles may fail silently** - Log gracefully and continue
7. **Document hash ensures variation** - Different filenames = different randomness
8. **Visible-only is default** - Hidden layers automatically excluded

---

## END OF SPECIFICATION

**Document Version:** 1.0 (Final)
**Date:** 2025-01-15
**Status:** Ready for Engineering Implementation
**Target Platform:** Photoshop 27.0 UXP
**Estimated Implementation:** ~3 weeks (M0-M6)

---

This specification incorporates all feedback, decisions, and technical constraints. Implementation can begin immediately.
