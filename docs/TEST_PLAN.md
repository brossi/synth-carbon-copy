# Carbon Copy Simulator - Test Plan v0.1

## Overview

This document defines the comprehensive test plan for Carbon Copy Simulator v0.1. It includes 17 test cases covering functional requirements, edge cases, and reproducibility validation.

**Testing Objectives:**
- Verify all core features work as specified
- Validate edge case handling and error recovery
- Confirm deterministic behavior and seed reproducibility
- Ensure non-destructive workflow integrity

---

## Test Environment Setup

### Prerequisites

- Adobe Photoshop v27.0.0 or later
- Carbon Copy Simulator plugin loaded
- Test documents prepared (see Test Data Requirements)
- Clean `pluginData` folder (delete logs and tokens before testing)

### Test Data Requirements

Create the following test documents:

**simple_document.psd**
- Size: 2550×3300px (8.5×11" at 300 DPI)
- Color Mode: RGB
- Layers:
  - "Body Text" (visible, text or rasterized content)
  - "Date Header" (visible, text or rasterized content)

**complex_document.psd**
- Size: 2550×3300px (8.5×11" at 300 DPI)
- Color Mode: RGB
- Layers:
  - "Body Text" (visible)
  - "Signature - Smith" (visible)
  - "Stamp RED" (visible)
  - "Letterhead Logo" (visible)

**visibility_test.psd**
- Size: 2550×3300px
- Color Mode: RGB
- Layers:
  - "Text Layer 1" (visible)
  - "Text Layer 2" (visible)
  - "Text Layer 3" (visible)
  - "Text Layer 4" (hidden)
  - "Text Layer 5" (hidden)

**cmyk_document.psd**
- Size: 2550×3300px
- Color Mode: CMYK
- Layers:
  - "Body Text" (visible)

**smart_object_test.psd**
- Size: 2550×3300px
- Color Mode: RGB
- Layers:
  - "Body Text" (Smart Object containing text)

**doc_A.psd** and **doc_B.psd**
- Identical content (same layers, same text)
- Different filenames

---

## Functional Tests

### Test 1: Single Document, Single Copy

**Objective:** Verify basic single copy generation

**Preconditions:**
- simple_document.psd prepared and saved
- Plugin loaded

**Configuration:**
```json
{
  "mode": "single",
  "copyGeneration": {
    "nCopies": 5,
    "generateCopies": [3],
    "randomSeed": 12345,
    "seedStrategy": "fixed"
  },
  "export": {
    "enabled": true,
    "formats": ["PNG"]
  }
}
```

**Procedure:**
1. Open simple_document.psd
2. Run `Plugins > Run Carbon Copy Simulation`
3. Wait for completion alert
4. Examine document structure
5. Check export folder
6. Run plugin again (second time)
7. Compare outputs

**Expected Results:**
- ✅ One copy group created: "COPY 3"
- ✅ Two processed layers: "Text Copy 3 - Body Text", "Text Copy 3 - Date Header"
- ✅ Paper background with color #fff0f5 (pink)
- ✅ Imperfections layer with gradient streaks
- ✅ ORIGINAL LAYERS group contains originals (hidden)
- ✅ PNG exported: `simple_document_copy03_carbon.png`
- ✅ Opacity approximately 60% (58-62% range)
- ✅ Blur approximately 0.7px (0.6-0.8px range)
- ✅ Second run produces identical results (same seed)

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Tester: _____________
Results:


Issues Found:


```

---

### Test 2: Single Document, Multiple Copies

**Objective:** Verify multiple copy generation with progressive degradation

**Preconditions:**
- simple_document.psd prepared

**Configuration:**
```json
{
  "copyGeneration": {
    "nCopies": 5,
    "generateCopies": [1, 3, 5],
    "randomSeed": 67890,
    "seedStrategy": "fixed"
  }
}
```

**Procedure:**
1. Open simple_document.psd
2. Run plugin
3. Examine all copy groups
4. Compare opacity, blur, and noise across copies

**Expected Results:**
- ✅ Three copy groups: COPY 1, COPY 3, COPY 5
- ✅ Progressive degradation:
  - Copy 1: ~80% opacity, ~0.5px blur, ~2% noise
  - Copy 3: ~60% opacity, ~0.7px blur, ~4% noise
  - Copy 5: ~45% opacity, ~0.9px blur, ~5% noise
- ✅ Each copy has different random streak patterns
- ✅ All copies have unique but consistent characteristics

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 3: Batch Processing with Document Hash

**Objective:** Verify batch processing and document-specific seed variation

**Preconditions:**
- doc_A.psd, doc_B.psd, simple_document.psd in input folder

**Configuration:**
```json
{
  "mode": "batch",
  "batch": {
    "promptForInputFolder": true,
    "continueOnError": true
  },
  "copyGeneration": {
    "generateCopies": [2],
    "randomSeed": 11111,
    "seedStrategy": "documentHash"
  }
}
```

**Procedure:**
1. Run plugin
2. Select input folder with 3 PSDs
3. Select output folder
4. Wait for batch completion
5. Review log file
6. Run plugin again with same input folder
7. Compare outputs from first and second runs

**Expected Results:**
- ✅ All 3 documents processed successfully
- ✅ Batch summary shows: "3 successful, 0 failed"
- ✅ Each document has different random patterns (different seeds)
- ✅ doc_A.psd produces identical results in run 1 and run 2
- ✅ doc_B.psd produces identical results in run 1 and run 2
- ✅ doc_A results differ from doc_B results (different hash seeds)
- ✅ Log file shows seed values for each document

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 4: Visible-Only Layer Processing

**Objective:** Verify visible-only filtering

**Preconditions:**
- visibility_test.psd prepared

**Configuration:**
```json
{
  "layerRules": {
    "visibleOnly": true,
    "processIfContains": ["text"]
  }
}
```

**Procedure:**
1. Open visibility_test.psd
2. Verify layers 1-3 visible, layers 4-5 hidden
3. Run plugin
4. Check how many layers processed
5. Hide "Text Layer 3"
6. Run plugin again
7. Check how many layers processed

**Expected Results:**
- ✅ First run: 3 layers processed (layers 1, 2, 3)
- ✅ Second run: 2 layers processed (layers 1, 2)
- ✅ Hidden layers (4, 5) never processed
- ✅ ORIGINAL LAYERS contains all processed layers

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 5: Layer Name Filtering

**Objective:** Verify name-based layer filtering with skip rules

**Preconditions:**
- complex_document.psd prepared

**Configuration:**
```json
{
  "layerRules": {
    "processIfContains": ["body", "text"],
    "skipIfContains": ["signature", "stamp", "logo"]
  }
}
```

**Procedure:**
1. Open complex_document.psd
2. Run plugin
3. Examine which layers were processed
4. Check UNPROCESSED group

**Expected Results:**
- ✅ "Body Text" processed (matches "body" and "text")
- ✅ "Signature - Smith" skipped (matches "signature")
- ✅ "Stamp RED" skipped (matches "stamp")
- ✅ "Letterhead Logo" skipped (matches "logo")
- ✅ UNPROCESSED group contains: Signature, Stamp, Logo
- ✅ Only "Body Text" appears in copy groups

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 6: State Restoration on Error

**Objective:** Verify document state restored on error

**Preconditions:**
- simple_document.psd prepared
- Lock "Body Text" layer before test

**Configuration:**
```json
{
  "workflow": {
    "restoreStateOnError": true
  }
}
```

**Procedure:**
1. Open simple_document.psd
2. Lock "Body Text" layer
3. Select "Date Header" layer
4. Note current document state (active layer, visibility)
5. Run plugin (expect error)
6. Check document state after error

**Expected Results:**
- ✅ Error thrown during processing
- ✅ Error alert shown to user
- ✅ Document state restored:
  - Active layer unchanged
  - Layer visibility unchanged
  - No scaffold groups created
- ✅ ORIGINAL LAYERS preserved

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 7: Gradient Streak Generation

**Objective:** Verify gradient fill imperfections

**Preconditions:**
- simple_document.psd prepared

**Configuration (preset):**
```json
{
  "globalEffects": {
    "imperfections": {
      "enabled": true,
      "streakCount": [4, 6],
      "streakAngleBase": 90,
      "streakAngleVariation": 5
    }
  }
}
```

**Procedure:**
1. Open simple_document.psd
2. Run plugin
3. Expand "Imperfections - Copy 1" group
4. Count streak layers
5. Check layer kind (should be rasterized)
6. Measure streak angles visually

**Expected Results:**
- ✅ 4-6 gradient streak layers created
- ✅ Streaks named "Streak 0", "Streak 1", etc.
- ✅ Each streak is rasterized pixel layer (not gradient fill object)
- ✅ Noise applied to each streak
- ✅ Streaks appear near-vertical (angle ~85-95°)
- ✅ Group blend mode: multiply
- ✅ Group opacity: 12%

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 8: Reverse Bleed with Vertical Offset

**Objective:** Verify reverse bleed-through effect

**Preconditions:**
- simple_document.psd prepared

**Configuration (preset):**
```json
{
  "globalEffects": {
    "reverseBleed": {
      "enabled": true,
      "offsetMode": "vertical",
      "offsetX": [-2, 2],
      "offsetY": [1, 3]
    }
  }
}
```

**Procedure:**
1. Open simple_document.psd
2. Run plugin
3. Find "Reverse Bleed - Copy 1" layer
4. Check layer properties
5. Measure offset visually

**Expected Results:**
- ✅ "Reverse Bleed - Copy 1" layer created
- ✅ Layer contains merged text from all text layers
- ✅ Layer is horizontally flipped
- ✅ Opacity ~5-8%
- ✅ Offset primarily vertical (Y offset > X offset)
- ✅ Additional blur applied

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 9: ICC Profile Handling

**Objective:** Verify ICC profile embedding and logging

**Preconditions:**
- simple_document.psd with sRGB profile embedded
- simple_document.psd without profile (test variant)

**Configuration:**
```json
{
  "export": {
    "enabled": true,
    "embedICC": true,
    "logProfileName": true,
    "formats": ["PNG"]
  },
  "logging": {
    "verbosity": "info"
  }
}
```

**Procedure:**
1. **Test A - With Profile:**
   - Open simple_document.psd (with sRGB profile)
   - Run plugin
   - Check log file for profile name
   - Verify exported PNG has embedded profile

2. **Test B - Without Profile:**
   - Remove ICC profile from document
   - Run plugin
   - Check for warnings in log

**Expected Results:**
- ✅ Test A: Log shows "Exported ... with ICC profile: sRGB IEC61966-2.1"
- ✅ Test A: PNG has embedded ICC profile
- ✅ Test B: Warning logged about missing profile
- ✅ Test B: Export still succeeds

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 10: Folder Persistence

**Objective:** Verify folder token persistence

**Preconditions:**
- Delete `pluginData/folder_tokens.json` if exists
- Prepare batch input folder

**Configuration:**
```json
{
  "mode": "batch",
  "batch": {
    "useLastFolders": true,
    "promptForInputFolder": true
  },
  "folderPersistence": {
    "enabled": true
  }
}
```

**Procedure:**
1. Run plugin (first time)
2. Select input folder via picker
3. Wait for completion
4. Check `pluginData/folder_tokens.json` exists
5. Run plugin again (second time)
6. Note if folder picker appears
7. Delete token file
8. Run plugin (third time)
9. Note if folder picker appears

**Expected Results:**
- ✅ Run 1: Folder picker shown
- ✅ Token file created: `pluginData/folder_tokens.json`
- ✅ Token file contains persistent token
- ✅ Run 2: Folder rehydrated automatically (log shows "Rehydrated input folder")
- ✅ Run 3: Token missing, picker shown again

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

## Edge Case Tests

### Test 11: No Matching Layers

**Objective:** Verify graceful error when no layers match rules

**Preconditions:**
- Document with no layers matching process rules

**Configuration:**
```json
{
  "layerRules": {
    "processIfContains": ["nonexistent_keyword"]
  }
}
```

**Procedure:**
1. Open simple_document.psd
2. Run plugin
3. Check error message
4. Verify document unchanged

**Expected Results:**
- ✅ Error: "No visible layers match processing rules"
- ✅ Alert shown to user
- ✅ No scaffold groups created
- ✅ Document remains unchanged
- ✅ Error logged to file

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 12: Smart Object Handling

**Objective:** Verify Smart Object rasterization

**Preconditions:**
- smart_object_test.psd prepared

**Configuration:**
Default configuration

**Procedure:**
1. Open smart_object_test.psd
2. Verify "Body Text" is Smart Object
3. Run plugin
4. Check ORIGINAL LAYERS group
5. Check processed layers in copy groups

**Expected Results:**
- ✅ Smart Object duplicated successfully
- ✅ Duplicate rasterized before processing
- ✅ Effects applied to rasterized layer
- ✅ Original Smart Object in ORIGINAL LAYERS unchanged
- ✅ Smart Object icon still present on original
- ✅ Processing completes without errors

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 13: Texture File Missing

**Objective:** Verify graceful handling of missing texture files

**Preconditions:**
- simple_document.psd prepared
- Preset references non-existent texture

**Configuration (preset):**
```json
{
  "textures": [
    {
      "name": "missing_texture",
      "path": "textures/nonexistent.png",
      "blendMode": "softLight",
      "opacity": 30,
      "applyToLayers": ["background"]
    }
  ]
}
```

**Procedure:**
1. Ensure texture file does NOT exist
2. Open simple_document.psd
3. Run plugin
4. Check log file for warnings
5. Verify output created

**Expected Results:**
- ✅ Warning logged: "Texture file not found: textures/nonexistent.png"
- ✅ Processing continues without texture
- ✅ Copy groups created successfully
- ✅ Paper background created (no texture overlay)
- ✅ No errors thrown
- ✅ Export completes successfully

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 14: Texture Resolution Mismatch

**Objective:** Verify resolution mismatch warnings

**Preconditions:**
- 300 DPI document
- Texture at 150 DPI (e.g., 1275×1650px for 8.5×11")

**Configuration:**
```json
{
  "textures": {
    "verifyResolution": true
  }
}
```

**Configuration (preset):**
```json
{
  "textures": [
    {
      "path": "textures/low_res_texture.png",
      "blendMode": "softLight",
      "opacity": 30,
      "applyToLayers": ["background"]
    }
  ]
}
```

**Procedure:**
1. Prepare low-res texture file
2. Open 300 DPI document
3. Run plugin
4. Check log for warnings

**Expected Results:**
- ✅ Warning: "Texture resolution differs from document. Document: 300 DPI, Texture: ~150 DPI"
- ✅ Texture still applied
- ✅ Texture used at native size (no scaling)
- ✅ Processing completes successfully

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

### Test 15: CMYK Conversion

**Objective:** Verify CMYK to RGB conversion

**Preconditions:**
- cmyk_document.psd prepared in CMYK mode

**Configuration:**
```json
{
  "colorMode": {
    "convertIfNeeded": true,
    "warnOnConversion": true
  }
}
```

**Procedure:**
1. Open cmyk_document.psd
2. Verify document is CMYK (`Image > Mode`)
3. Run plugin
4. Check log for conversion warnings
5. Check final document mode

**Expected Results:**
- ✅ Warning: "Converting document from CMYKColorMode to RGB..."
- ✅ Document converted to RGB
- ✅ Processing completes
- ✅ Output is in RGB mode
- ✅ Log shows "Color mode converted to RGB"

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Results:


```

---

## Reproducibility Tests

### Test 16: Seed Consistency

**Objective:** Verify deterministic results with same seed

**Preconditions:**
- simple_document.psd prepared

**Configuration:**
```json
{
  "copyGeneration": {
    "generateCopies": [3],
    "randomSeed": 99999,
    "seedStrategy": "fixed"
  }
}
```

**Procedure:**
1. Open simple_document.psd
2. Run plugin (Run 1)
3. Record exact values:
   - Layer 1 opacity: ______
   - Layer 1 blur: ______
   - Layer 1 noise: ______
   - Number of streaks: ______
   - Reverse bleed offset: ______
4. Close document without saving
5. Reopen simple_document.psd
6. Run plugin again (Run 2)
7. Record same values
8. Compare Run 1 vs Run 2

**Expected Results:**
- ✅ All recorded values identical between runs
- ✅ Opacity matches within 0.01%
- ✅ Blur radius identical
- ✅ Noise amount identical
- ✅ Streak count identical
- ✅ Streak positions identical
- ✅ Reverse bleed offset identical
- ✅ Complete reproducibility confirmed

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
Run 1 Values:


Run 2 Values:


Match: Yes / No
```

---

### Test 17: Document Hash Variation

**Objective:** Verify document-specific seed variation

**Preconditions:**
- doc_A.psd and doc_B.psd prepared (identical content)

**Configuration:**
```json
{
  "copyGeneration": {
    "randomSeed": 11111,
    "seedStrategy": "documentHash"
  }
}
```

**Procedure:**
1. Open doc_A.psd
2. Run plugin
3. Record opacity values for all layers
4. Close without saving
5. Open doc_B.psd (same content, different name)
6. Run plugin
7. Record opacity values
8. Compare doc_A vs doc_B values
9. Reopen doc_A.psd
10. Run plugin again
11. Verify matches original doc_A values

**Expected Results:**
- ✅ doc_A produces different values than doc_B
- ✅ doc_A values consistent across multiple runs
- ✅ doc_B values consistent across multiple runs
- ✅ Different filenames produce different results
- ✅ Same filename produces same results
- ✅ Log shows different seed values for each document

**Status:** [ ] Pass [ ] Fail [ ] Not Tested

**Notes:**
```
Date Tested: _____________
doc_A values:


doc_B values:


doc_A repeat values:


Variation confirmed: Yes / No
```

---

## Test Summary

### Test Results Summary

| Test # | Test Name | Status | Date | Notes |
|--------|-----------|--------|------|-------|
| 1 | Single Document, Single Copy | ☐ | | |
| 2 | Multiple Copies | ☐ | | |
| 3 | Batch Processing | ☐ | | |
| 4 | Visible-Only Processing | ☐ | | |
| 5 | Layer Name Filtering | ☐ | | |
| 6 | State Restoration | ☐ | | |
| 7 | Gradient Streaks | ☐ | | |
| 8 | Reverse Bleed | ☐ | | |
| 9 | ICC Profile Handling | ☐ | | |
| 10 | Folder Persistence | ☐ | | |
| 11 | No Matching Layers | ☐ | | |
| 12 | Smart Object Handling | ☐ | | |
| 13 | Texture File Missing | ☐ | | |
| 14 | Texture Resolution Mismatch | ☐ | | |
| 15 | CMYK Conversion | ☐ | | |
| 16 | Seed Consistency | ☐ | | |
| 17 | Document Hash Variation | ☐ | | |

### Pass Criteria

**v0.1 Release Requirements:**
- ✅ All functional tests (1-10) must pass
- ✅ All edge case tests (11-15) must pass
- ✅ All reproducibility tests (16-17) must pass
- ✅ No critical bugs found
- ✅ No data loss in any test scenario

### Known Issues

Document any issues found during testing:

```
Issue #1:
Description:
Severity: Critical / High / Medium / Low
Status: Open / Fixed / Deferred


Issue #2:
...
```

---

## Testing Notes

**Tester Name:** _____________________

**Test Environment:**
- Photoshop Version: _____________________
- Plugin Version: 0.1.0
- OS: _____________________
- Date: _____________________

**General Observations:**
```




```

**Recommendations:**
```




```
