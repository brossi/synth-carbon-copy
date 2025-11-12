# UXP API Fixes Required for Carbon Copy Simulator

## Status: Partial fixes committed, remaining work documented

### Commits Applied:
- `d427507`: Fix critical UXP API issues: constants and restoreDocumentState
- `19e7514`: Fix createTextLayer to use proper options object
- `236139e`: Simplify text layer creation using DOM API
- `0631f9f`: Add automatic default text layer creation
- `07d6f94`: Fix logger file creation and handling
- `b7b0067`: Add required apiVersion to manifest for proper plugin loading
- `1d777ad`: Fix circular dependency causing plugin load failure
- `1082e1d`: Fix manifest.json for UXP manifest v5 compatibility

---

## ✅ COMPLETED FIXES

### 1. Manifest v5 Compatibility
- **File**: `manifest.json`
- **Fixed**: Added `data.apiVersion: 2` to host configuration
- **Fixed**: Changed requiredPermissions from array to object format
- **Fixed**: Set minVersion to "23.3.0"

### 2. Constants Usage
- **Files**: `core/engine.js`, `core/effects.js`
- **Fixed**: Imported `constants` module
- **Fixed**: `DocumentMode.RGBColorMode` instead of string "RGBColorMode"
- **Fixed**: `ChangeMode.RGBColorMode` for changeMode() calls
- **Fixed**: All blend modes now use `constants.BlendMode.*` (MULTIPLY, SOFTLIGHT, etc.)

### 3. Circular Dependency in Logger
- **File**: `core/config.js`
- **Fixed**: Added `safeLog()` wrapper to prevent logger usage before initialization

### 4. Logger File Creation
- **File**: `core/logger.js`
- **Fixed**: Proper getEntry() then createFile() pattern
- **Fixed**: Wrapped file.read() in try-catch for empty files

### 5. restoreDocumentState Removal
- **File**: `core/engine.js`
- **Fixed**: Removed finally block that tried to set activeLayers (readonly property)
- **Fixed**: Removed savedState capture (no longer needed)
- **Fixed**: Removed imports of captureDocumentState and restoreDocumentState

---

## 🔴 CRITICAL FIXES STILL NEEDED

### 1. Layer.name is READONLY - Cannot Set After Creation
**Impact**: HIGH - Affects many files

**Problem**: Throughout the codebase, code creates layers then sets `.name` property:
```javascript
const layer = await doc.createLayer();
layer.name = "My Layer";  // ❌ FAILS - name is readonly
```

**Solution**: Pass name during creation:
```javascript
const layer = await doc.createLayer({ name: "My Layer" });  // ✅ CORRECT
```

**Files Affected**:
- `core/layers.js`:
  - Line 332: `textLayer.name = text_body_${i + 1}` in createDefaultTextLayers()
  - Line 141: createLayerGroup() calls need {name} in options
  - Line 144: createLayerGroup() calls need {name} in options
  - Line 136: createLayerGroup() calls need {name} in options

- `core/effects.js`:
  - Line 294: createLayerGroup() for imperfections group
  - Line 377: createLayer() for texture layer (if used)
  - Any other layer creation without name in options

**Fix Pattern**:
```javascript
// OLD (broken):
const group = await doc.createLayerGroup();
group.name = "My Group";

// NEW (correct):
const group = await doc.createLayerGroup({ name: "My Group" });

// OLD (broken):
const textLayer = await doc.createTextLayer({ contents: "text" });
textLayer.name = "text_body_1";

// NEW (correct):
const textLayer = await doc.createTextLayer({
  name: "text_body_1",
  contents: "text",
  fontSize: 14,
  position: { x: 100, y: 100 }
});
```

---

### 2. Export saveAs Methods Need Entry Objects
**Impact**: HIGH - Export will completely fail

**Problem**: Code tries to create files then pass them to saveAs:
```javascript
const pngFile = await folder.createFile("file.png");
await doc.saveAs.png(pngFile);  // May work but wrong pattern
```

**Solution**: Use `fs.getFileForSaving()` which returns Entry objects:
```javascript
const fs = require('uxp').storage.localFileSystem;
const pngFile = await fs.getFileForSaving("file.png", { types: ["png"] });
if (pngFile) {
  await doc.saveAs.png(pngFile);
}
```

**Files Affected**:
- `core/export.js`:
  - Line 65: `await folder.createFile(filename)` should use getFileForSaving
  - Line 68: `await exportDoc.saveAs.png(outputFile)` - verify Entry object passed
  - Line 133: Similar issue for PSD export
  - Line 223: Output folder handling in single document export

**Fix Pattern**:
```javascript
// In export.js exportCopy function:

const fs = require('uxp').storage.localFileSystem;

// For PNG export:
if (exportConfig.formats.includes("PNG")) {
  const pngFile = await fs.getFileForSaving(filename + ".png");
  if (pngFile) {
    await exportDoc.saveAs.png(pngFile);
  }
}

// For PSD export:
if (exportConfig.formats.includes("PSD")) {
  const psdFile = await fs.getFileForSaving(filename + ".psd");
  if (psdFile) {
    await exportDoc.saveAs.psd(psdFile);
  }
}
```

**Note**: User will need to select save location each time. Consider using folder.createFile() for batch operations if supported.

---

### 3. doc.layerGroups Does Not Exist
**Impact**: MEDIUM - Affects layer group finding

**Problem**: Code tries to access `doc.layerGroups`:
```javascript
const groups = [...doc.layerGroups].find(g => g.name === "COPY 1");  // ❌ layerGroups undefined
```

**Solution**: Filter doc.layers by kind:
```javascript
const groups = doc.layers.filter(l => l.kind === constants.LayerKind.GROUP);
const copyGroup = groups.find(g => g.name === "COPY 1");
```

**Files Affected**:
- `core/layers.js`:
  - Line 272: `[...doc.layerGroups].find(g => g.name === "ORIGINAL LAYERS")`

- `core/export.js`:
  - Line 20: `[...exportDoc.layerGroups].find(g => g.name.startsWith("COPY"))`

**Fix Pattern**:
```javascript
// OLD:
const originalGroup = doc.layerGroups ?
  [...doc.layerGroups].find(g => g.name === "ORIGINAL LAYERS") :
  null;

// NEW:
const groups = doc.layers.filter(l => l.kind === constants.LayerKind.GROUP);
const originalGroup = groups.find(g => g.name === "ORIGINAL LAYERS") || null;
```

---

### 4. layer.move() Requires ElementPlacement Constants
**Impact**: HIGH - Layer organization will fail

**Problem**: Code passes strings to layer.move():
```javascript
layer.move(targetGroup, "placeInside");  // ❌ String not accepted
await textureLayer.move(targetGroup, "placeAtEnd");  // ❌ String not accepted
```

**Solution**: Use constants:
```javascript
layer.move(targetGroup, constants.ElementPlacement.PLACEINSIDE);
await textureLayer.move(targetGroup, constants.ElementPlacement.PLACEATEND);
```

**Files Affected**:
- `core/layers.js`:
  - Line 163: `layer.move(targetGroup)` - needs second parameter

- `core/effects.js`:
  - Line 534: `await textureLayer.move(targetGroup, "placeAtEnd")`

**ElementPlacement Constants**:
- `constants.ElementPlacement.PLACEBEFORE`
- `constants.ElementPlacement.PLACEAFTER`
- `constants.ElementPlacement.PLACEINSIDE` (for groups)
- `constants.ElementPlacement.PLACEATBEGINNING`
- `constants.ElementPlacement.PLACEATEND`

---

### 5. Preset Structure Mismatch
**Impact**: MEDIUM - Effects will use wrong values

**Problem**: `presets/default.json` has range values:
```json
"blur": {
  "type": "gaussian",
  "radiusRange": [0.4, 0.6]
},
"noise": {
  "amountRange": [1.5, 2.5]
},
"opacity": {
  "base": 0.80,
  "range": [0.78, 0.82]
}
```

But code expects flat values:
```javascript
const radius = copySettings.blur.radius;  // undefined - no "radius" property
const amount = copySettings.noise.amount;  // undefined - no "amount" property
const opacity = copySettings.opacity.base; // This one works
```

**Solution Option A**: Update preset file to match code expectations:
```json
"blur": {
  "radius": 0.5,
  "variance": 0.1
},
"noise": {
  "amount": 2.0,
  "distribution": "gaussian"
},
"opacity": {
  "base": 80,
  "variance": 2
}
```

**Solution Option B**: Update code to sample from ranges using PRNG:
```javascript
// In effects.js where blur is applied:
const blurRadius = copySettings.blur.radiusRange
  ? rng.range(copySettings.blur.radiusRange[0], copySettings.blur.radiusRange[1])
  : copySettings.blur.radius || 0.5;

// In effects.js where noise is applied:
const noiseAmount = copySettings.noise.amountRange
  ? rng.range(copySettings.noise.amountRange[0], copySettings.noise.amountRange[1])
  : copySettings.noise.amount || 2.0;

// For opacity:
const opacity = copySettings.opacity.range
  ? rng.range(copySettings.opacity.range[0], copySettings.opacity.range[1])
  : copySettings.opacity.base || 80;
```

**Recommendation**: Option A is simpler. Update the preset file structure.

**Files Affected**:
- `presets/default.json` - Needs restructuring
- `core/effects.js` - Multiple functions expecting flat values:
  - `applyGaussianBlur()` - expects radius
  - `applyNoise()` - expects amount
  - `setLayerOpacity()` - expects base + variance
  - `processLayerForCopy()` - reads these values

---

### 6. doc.width/height May Be Numbers, Not Objects
**Impact**: LOW - May cause errors in effects

**Problem**: Code accesses `.value` property:
```javascript
const docWidth = doc.width.value;  // May fail if width is already a number
```

**Solution**: Safe access pattern:
```javascript
const docWidth = doc.width?.value ?? doc.width;
const docHeight = doc.height?.value ?? doc.height;
```

**Files Affected**:
- `core/effects.js`:
  - Line 314: `doc.width.value`
  - Line 460: `doc.width.value`
  - Line 461: `doc.height.value`
  - Similar pattern throughout

---

### 7. layer.kind Comparison May Need Constants
**Impact**: LOW - May cause incorrect rasterization checks

**Problem**: Code compares layer.kind to strings:
```javascript
if (duplicate.kind !== "pixel") {  // May fail if kind is uppercase or enum
```

**Solution**: Use constants or case-insensitive comparison:
```javascript
if (duplicate.kind !== constants.LayerKind.PIXEL) {
  await duplicate.rasterize();
}
```

**Files Affected**:
- `core/effects.js`:
  - Line 142: `duplicate.kind !== "pixel"`
  - Line 399: `duplicate.kind !== "pixel"`
  - Line 618: `textLayer.kind === "text"`
  - Line 651: `textLayer.kind !== "pixel"`

---

## 🟡 MEDIUM PRIORITY FIXES

### 8. Remove Nested executeAsModal Wrappers
**Status**: Research shows nested calls ARE allowed, so this is actually OK

**Keeping as-is**: The nested executeAsModal calls in effects.js are valid in UXP.

---

### 9. doc.close() Parameter
**Impact**: LOW - May cause issues on document close

**Problem**: Code passes string to close():
```javascript
await exportDoc.close("doNotSaveChanges");
```

**Solution**: Use constant:
```javascript
await exportDoc.close(constants.SaveOptions.DONOTSAVECHANGES);
```

**Files Affected**:
- `core/export.js`: Lines 92, 144
- `core/engine.js`: Line 287 (in batch processing)

---

### 10. Missing Icons
**Impact**: LOW - Plugin works without icons in dev mode

**Status**: Icons folder only has README.md, no actual .png files

**Needed for production**:
- `icons/icon-dark.png` (23x23 and 46x46)
- `icons/icon-light.png` (23x23 and 46x46)

---

## 📋 TESTING CHECKLIST

After fixes are applied, test in this order:

1. **Plugin Loads**
   - ✅ Manifest validates
   - ✅ Plugin loads without errors
   - ✅ No "Failed to load devtools plugin" error

2. **Text Layer Creation**
   - Run plugin on blank document
   - Verify default text layers are created
   - Verify layers are named correctly

3. **Layer Operations**
   - Verify layer groups are created
   - Verify layers move into groups
   - Verify layer duplication works

4. **Effects Application**
   - Verify blur is applied
   - Verify noise is applied
   - Verify opacity changes
   - Verify blend modes are correct

5. **Export**
   - Verify PNG export works
   - Verify PSD export works
   - Verify files are saved to chosen location

6. **Full Workflow**
   - Run complete carbon copy generation
   - Verify 3 copies are created
   - Verify visual quality
   - Check for any console errors

---

## 🛠️ FIX PRIORITY ORDER

1. **Layer naming** (blocks everything)
2. **layer.move() constants** (blocks layer organization)
3. **layerGroups iteration** (blocks layer finding)
4. **Export saveAs** (blocks export)
5. **Preset structure** (blocks effects with correct values)
6. **doc.width/height safe access** (prevents crashes)
7. **layer.kind constants** (prevents rasterization issues)
8. **doc.close() constants** (minor issue)

---

## 📝 DEVELOPMENT NOTES

### UXP API Facts (From Research):

✅ **What Works**:
- `doc.createTextLayer({ name, contents, fontSize, position })`
- `doc.createLayerGroup({ name, opacity })`
- `doc.createLayer({ name })`
- `layer.duplicate(relativeObject, insertLocation, name)`
- `layer.move(relativeObject, insertLocation)` with constants
- `doc.saveAs.png(entry)`, `doc.saveAs.psd(entry)` with Entry objects
- Nested `executeAsModal` calls (allowed and share modal state)
- All constants via `require("photoshop").constants`

❌ **What Doesn't Work**:
- Setting `layer.name` after creation (readonly)
- Passing strings to layer.move() (needs constants)
- Using `doc.layerGroups` (doesn't exist)
- String comparison for blend modes (needs constants)
- String comparison for document modes (needs constants)

### Key Imports Needed:
```javascript
const { app, constants } = require("photoshop");
const { executeAsModal } = require("photoshop").core;
const { action } = require("photoshop");
const storage = require('uxp').storage;
const fs = storage.localFileSystem;
```

### ElementPlacement Usage:
```javascript
// Move layer before another
layer.move(targetLayer, constants.ElementPlacement.PLACEBEFORE);

// Move layer after another
layer.move(targetLayer, constants.ElementPlacement.PLACEAFTER);

// Move layer into group (at end)
layer.move(targetGroup, constants.ElementPlacement.PLACEINSIDE);

// Move layer to beginning of group
layer.move(targetGroup, constants.ElementPlacement.PLACEATBEGINNING);

// Move layer to end of group
layer.move(targetGroup, constants.ElementPlacement.PLACEATEND);
```

---

## 🔗 USEFUL REFERENCES

- **UXP Photoshop API Docs**: https://developer.adobe.com/photoshop/uxp/2022/ps_reference/
- **Constants Reference**: https://developer.adobe.com/photoshop/uxp/2022/ps_reference/modules/constants/
- **TypeScript Definitions**: https://cdn.jsdelivr.net/npm/@adobe-uxp-types/photoshop@0.0.9/photoshop.d.ts
- **Sample Plugins**: https://github.com/AdobeDocs/uxp-photoshop-plugin-samples
- **Actions Panel**: "Copy As JavaScript" to get batchPlay descriptors

---

## 💾 CURRENT BRANCH

Branch: `claude/debug-uxp-plugin-load-011CV2gw7KETUXNAGLANGpCW`

Last commit: `d427507` - Fix critical UXP API issues

Next session should start fresh with this document as reference.
