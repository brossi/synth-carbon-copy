# Carbon Copy Simulator - Development Plan
## Iterations 1-2 (v0.1 Foundation)

**Plan Version:** 1.0
**Created:** 2025-01-15
**Target Platform:** Photoshop 27.0 UXP
**Based on:** carbon_copy_simulator_spec_v1.0.md

---

## Executive Summary

This plan organizes the v0.1 implementation into two focused iterations. Each iteration delivers working, testable functionality while building toward the complete feature set.

**Iteration 1:** Foundation & Core Processing
**Iteration 2:** Advanced Features & Export System

---

## Iteration 1: Foundation & Core Processing
**Goal:** Establish plugin infrastructure and core carbon copy effects

### Milestones

#### M0: Scaffold & Infrastructure
**Priority:** Critical - Required for all subsequent work

**Deliverables:**
- [x] UXP plugin manifest.json with command registration
- [x] Project file structure (core/, presets/, textures/, docs/)
- [x] Configuration system (config.json loader and validator)
- [x] Seeded PRNG implementation (mulberry32 algorithm)
- [x] Logging system with file output to pluginData folder
- [x] Folder persistence system (token storage and rehydration)

**Key Implementation Files:**
```
manifest.json                    # UXP plugin registration
main.js                          # Entry point, command handler
core/config.js                   # Config loading, validation, folder persistence
core/prng.js                     # Seeded random number generation
core/logger.js                   # File-based logging system
config.json                      # Main configuration file
presets/default.json             # Default preset
```

**Technical Requirements:**
- Config validation with type checking and range validation
- FolderPersistence class with token save/load/rehydrate
- mulberry32 PRNG with createSeededRandom utilities
- calculateDocumentSeed with documentHash strategy
- Logger with info/warn/error levels, max file size handling

**Success Criteria:**
- [ ] Plugin loads successfully in Photoshop 27.0
- [ ] Command appears in Plugins menu
- [ ] Config.json validates correctly with helpful error messages
- [ ] Preset files load and validate
- [ ] PRNG generates reproducible sequences (same seed = same output)
- [ ] Folder tokens persist between Photoshop sessions
- [ ] Log file created in pluginData folder with timestamped entries

**Testing:**
- Load plugin with valid config → success
- Load plugin with invalid config (wrong types) → validation error
- Generate 100 random numbers with seed 12345 → repeat → identical sequence
- Select folder → restart Photoshop → folder rehydrates without picker
- Delete token file → folder picker prompts on next run

---

#### M1: Layer Selection & Scaffold
**Priority:** Critical - Core workflow foundation

**Deliverables:**
- [x] Layer identification with name-based rules
- [x] Visible-only filtering (checks layer and parent group visibility)
- [x] Document scaffold creation (ORIGINAL LAYERS, UNPROCESSED, COPIES groups)
- [x] State management (capture and restore document state)
- [x] Layer ID tracking for original verification
- [x] executeAsModal integration with try/finally blocks

**Key Implementation Files:**
```
core/layers.js                   # Layer detection, filtering, manipulation
core/engine.js                   # Main processing pipeline
```

**Technical Requirements:**
- `identifyTargetLayers()` - matches processIfContains, excludes skipIfContains
- `isLayerEffectivelyVisible()` - checks layer and all parent groups
- `identifyExcludedLayers()` - finds layers that match skipIfContains
- `createScaffold()` - creates group structure for N copies
- `captureDocumentState()` - saves active layers, visibility, history state
- `restoreDocumentState()` - restores state in finally block
- `verifyOriginalLayerIDs()` - ensures originals unchanged

**Scaffold Structure:**
```
Document Root
├── COPY 1
├── COPY 2
├── COPY 3
├── UNPROCESSED (signature, stamps, etc.)
└── ORIGINAL LAYERS (hidden, protected)
```

**Success Criteria:**
- [ ] Correct layers identified based on name rules (case-insensitive)
- [ ] Hidden layers automatically excluded when visibleOnly: true
- [ ] Layers in hidden groups excluded even if layer is visible
- [ ] Skip rules have priority over process rules
- [ ] Scaffold groups created in correct order
- [ ] Original layers moved to ORIGINAL LAYERS group and hidden
- [ ] Excluded layers moved to UNPROCESSED group
- [ ] Document state restored after processing (selections, visibility)
- [ ] Document state restored on error (try/finally works correctly)
- [ ] Original layer IDs verified unchanged at end of processing

**Testing:**
- Document with 5 layers: 3 visible matching "text", 2 hidden matching "text"
  - Expected: 3 layers processed
- Document with layer "Body Text" in hidden group
  - Expected: Layer excluded (parent group hidden)
- Document with "Signature - Smith" (skip rule)
  - Expected: Moved to UNPROCESSED group
- Simulate error during processing
  - Expected: Document state restored to pre-run condition
- Lock a layer that matches process rules
  - Expected: Error thrown, state restored

---

#### M2: Core Effects Implementation
**Priority:** Critical - Essential carbon copy visual effects

**Deliverables:**
- [x] Layer duplication and processing pipeline
- [x] Rasterization before filter operations
- [x] Gaussian blur with range-based variation
- [x] Add Noise filter with range-based variation
- [x] Opacity variation within ranges
- [x] Color overlay transformation (carbonColor)
- [x] Gradient fill streak generation (no external textures)
- [x] Paper background layer creation

**Key Implementation Files:**
```
core/effects.js                  # All effect implementations
```

**Technical Requirements:**

**processLayerForCopy():**
- Duplicate original layer
- Check layer.kind !== "pixel" → rasterize
- Apply color overlay (carbonColor from preset)
- Apply opacity with RNG variation within range
- Apply Gaussian blur with RNG variation within radiusRange
- Apply Add Noise with RNG variation within amountRange
- Move to target copy group

**createImperfectionsLayer():**
- Generate N gradient fill layers (N from streakCount range)
- Each streak: random X position, angle ~90° ± variation
- Use batchPlay to create gradient fill with transparency gradient
- CRITICAL: Rasterize gradient fill layer before applying noise
- Apply heavy noise (30%, monochromatic) for texture
- Set blend mode (multiply) and opacity
- Group all streaks in "Imperfections - Copy N" group

**createPaperBackground():**
- Create solid color fill layer (paperColor from preset)
- Apply texture overlay if specified in preset
- Position at bottom of copy group
- Set blend mode for texture (softLight recommended)

**Success Criteria:**
- [ ] Text layers correctly duplicated and rasterized
- [ ] Smart Objects rasterized before effects applied
- [ ] Blur applied successfully to all processed layers
- [ ] Noise applied successfully to all processed layers
- [ ] Opacity values fall within specified ranges
- [ ] Progressive degradation visible (Copy 1 > Copy 2 > Copy 3)
- [ ] Gradient streaks created programmatically (3-5 per copy)
- [ ] Streaks are near-vertical (angle ~90°±5°)
- [ ] Gradient fills rasterized before noise applied
- [ ] Paper background created with correct color
- [ ] Same seed produces identical effect parameters across runs

**Testing:**
- Generate copy 1, 2, 3 with same seed twice
  - Expected: Identical blur/noise/opacity values
- Process text layer
  - Expected: Rasterized, effects applied
- Process Smart Object layer
  - Expected: Duplicated, rasterized, effects applied
- Verify opacity range [0.58, 0.62] for copy 3
  - Run 20 times, record opacity values
  - Expected: All values within range
- Count gradient streaks for copy 2
  - Expected: 3-5 streaks created
- Measure streak angles
  - Expected: All within 85-95° range

---

### Iteration 1 Deliverables Summary

**Working Features:**
- ✓ UXP plugin structure with command registration
- ✓ JSON configuration and preset loading with validation
- ✓ Persistent folder handles (save/rehydrate tokens)
- ✓ Seeded PRNG for deterministic randomness
- ✓ Layer name-based filtering with visible-only option
- ✓ Non-destructive scaffold with protected originals
- ✓ State management with error recovery
- ✓ Core effects: blur, noise, opacity variation
- ✓ Gradient fill streaks for imperfections
- ✓ Paper background layers

**End of Iteration 1 Demo:**
- Open sample document with 3 text layers
- Run plugin command (Plugins → Carbon Copy Simulator → Run)
- Generate 3 copies in single run
- Observe progressive degradation
- Verify originals preserved in hidden group
- Run again with same seed → identical results

**Known Limitations (to be addressed in Iteration 2):**
- No texture overlay support yet
- No reverse bleed-through effect yet
- No export functionality (files remain in master PSD)
- No batch processing yet
- Single document mode only

---

## Iteration 2: Advanced Features & Export System
**Goal:** Complete v0.1 feature set with export and batch processing

### Milestones

#### M3: Texture System
**Priority:** High - Enhances realism

**Deliverables:**
- [x] Texture file loading from disk
- [x] Texture resolution and aspect ratio verification
- [x] Texture overlay application with blend modes
- [x] Native texture sizing (no scaling in v0.1)
- [x] Graceful handling of missing texture files

**Key Implementation Files:**
```
core/effects.js                  # Texture application functions
textures/README.txt              # Texture requirements documentation
```

**Technical Requirements:**

**loadTexture():**
- Load image file from textures/ folder
- Return as layer object
- Handle file not found gracefully (warning, continue processing)

**applyTextureOverlay():**
- Load texture file
- Place texture layer in target group
- Set blend mode (softLight, overlay, multiply)
- Set opacity
- Position in layer stack (above background, below text)
- Check applyToLayers filter ["background", "all", specific copy numbers]

**verifyTextureProperties():**
- Check texture resolution vs document resolution
- Warning if difference > 50 DPI
- Check aspect ratio vs 8.5×11
- Warning if aspect ratio differs significantly
- No automatic scaling (v0.1 limitation documented)

**textures/README.txt:**
```
Texture Requirements:
- Format: PNG, TIF, PSD (any Photoshop-compatible raster format)
- Resolution: Match document DPI for best results (typically 300 DPI)
- Size: 2550×3300px for 8.5×11 at 300 DPI
- Color Mode: RGB (will be converted if needed)
- Content: Paper grain, streak patterns, aged paper texture

Recommended textures:
- paper_onionskin.png - Fine grain for copy 1
- paper_yellow.png - Coarser grain for copy 2
- paper_aged.png - Heavy grain for copies 4-5

Note: v0.1 uses native texture size. For best results, prepare textures
at target document dimensions.
```

**Success Criteria:**
- [ ] Texture file loaded successfully from textures/ folder
- [ ] Texture applied with correct blend mode and opacity
- [ ] Missing texture triggers warning but processing continues
- [ ] Resolution mismatch triggers warning (if enabled in config)
- [ ] Aspect ratio mismatch triggers warning (if enabled in config)
- [ ] Texture positioned correctly in layer stack
- [ ] Multiple textures supported (different per copy)

**Testing:**
- Preset with texture path "textures/paper_grain.png"
  - Place valid texture → Expected: Applied successfully
  - Remove texture file → Expected: Warning logged, processing continues
- Document at 300 DPI, texture at 150 DPI
  - Expected: Warning "Texture resolution differs from document"
- Document 2550×3300px, texture 1000×1000px
  - Expected: Warning "Texture aspect ratio differs from document"
- Apply texture to copy 1 only (applyToLayers: ["background"])
  - Expected: Texture appears in Copy 1 group only

---

#### M4: Reverse Bleed-Through
**Priority:** High - Distinctive carbon copy artifact

**Deliverables:**
- [x] Reverse bleed effect implementation
- [x] Vertical offset with horizontal jitter
- [x] Merge text layers before processing
- [x] Horizontal flip transformation
- [x] Low opacity application
- [x] Additional blur for depth effect

**Key Implementation Files:**
```
core/effects.js                  # createReverseBleed() function
```

**Technical Requirements:**

**createReverseBleed():**
- Collect all text layers from copy group (exclude background, imperfections)
- Duplicate text layers (preserve originals)
- Merge duplicates into single "Reverse Bleed - Copy N" layer
- CRITICAL: Rasterize merged layer before transforms
- Apply horizontal flip
- Calculate offset based on offsetMode:
  - "vertical": offsetY from range, small offsetX jitter
  - "random": both from ranges (legacy support)
- Apply translate(offsetX, offsetY)
- Set opacity from opacityRange (typically 0.05-0.08, very low)
- Apply additional blur if specified (e.g., 0.3px for depth)
- Position above background, below main text layers

**Preset Configuration:**
```json
"reverseBleed": {
  "enabled": true,
  "opacityRange": [0.05, 0.08],
  "offsetMode": "vertical",
  "offsetX": [-2, 2],
  "offsetY": [1, 3],
  "additionalBlur": 0.3
}
```

**Success Criteria:**
- [ ] Reverse bleed layer created from merged text
- [ ] Layer flipped horizontally (mirror image)
- [ ] Offset primarily vertical (offsetY > offsetX in magnitude)
- [ ] Opacity very low (5-8%, subtle effect)
- [ ] Additional blur applied for depth
- [ ] Layer positioned correctly in stack (above BG, below text)
- [ ] Effect disabled when enabled: false in preset
- [ ] No reverse bleed created if no text layers in group

**Testing:**
- Generate copy 2 with reverseBleed.enabled: true
  - Expected: Reverse bleed layer visible, flipped, offset
- Measure offset values over 20 runs
  - Expected: offsetY consistently larger than offsetX
- Check opacity values
  - Expected: 5-8% range
- Disable reverse bleed (enabled: false)
  - Expected: No reverse bleed layer created
- Document with only background (no text layers)
  - Expected: Warning logged, no reverse bleed created

---

#### M5: Export Engine & Batch Processing
**Priority:** Critical - Required for deliverable output

**Deliverables:**
- [x] PNG export with ICC profile handling
- [x] PSD export functionality
- [x] ICC profile name logging
- [x] Graceful fallback for missing profiles
- [x] Per-copy isolation and flattening
- [x] Filename pattern substitution
- [x] Batch folder processing
- [x] Document hash seed strategy for batch
- [x] Error handling with continueOnError
- [x] Batch summary report

**Key Implementation Files:**
```
core/export.js                   # Export functions
core/engine.js                   # Batch processing loop
```

**Technical Requirements:**

**exportCopy():**
- Generate filename using pattern substitution
  - {filename} → document name without .psd
  - {n:02d} → copy number zero-padded (01, 02, 03)
  - {n} → copy number (1, 2, 3)
  - {suffix} → custom suffix ("_carbon")
  - {ext} → format extension
- For each format (PNG, PSD):
  - Duplicate document for export
  - Isolate target copy group (hide all other groups)
  - Flatten document
  - Read ICC profile name before export
  - Export with embedICC setting
  - Log profile name (if logProfileName: true)
  - Handle ICC embedding failure gracefully (fallback without profile)
  - Close export document

**Batch Processing Loop:**
- Get input folder (rehydrate from token or prompt)
- Get all .psd files (respect filePattern config)
- For each document:
  - Calculate document seed (baseSeed + hash(filename))
  - Open document
  - Process with processDocument()
  - Export copies
  - Save master PSD (if configured)
  - Close document (if closeAfterProcessing: true)
  - Log result (success/error)
  - Continue on error (if continueOnError: true)
- Generate batch summary:
  - Total documents processed
  - Successes/failures
  - Total copies generated
  - Time elapsed

**Success Criteria:**
- [ ] PNG exported with correct filename pattern
- [ ] PSD exported with correct filename pattern
- [ ] ICC profile name logged (or "none" if no profile)
- [ ] Export succeeds without profile (fallback works)
- [ ] ICC embedding failure handled gracefully
- [ ] Multiple formats exported per copy (PNG + PSD)
- [ ] Batch processing opens all PSDs in folder
- [ ] Each document gets unique seed (hash strategy)
- [ ] Same document filename produces identical results across batches
- [ ] Errors logged but batch continues (if continueOnError: true)
- [ ] Batch summary shows correct counts

**Testing:**
- Export copy 2 with pattern "{filename}_copy{n:02d}{suffix}.{ext}"
  - Document: Report.psd, suffix: "_carbon"
  - Expected: Report_copy02_carbon.png
- Document with ICC profile "sRGB IEC61966-2.1"
  - Expected: Log shows "Exported with ICC profile: sRGB IEC61966-2.1"
- Document without ICC profile
  - Expected: Log shows "Exported with ICC profile: none"
- Batch process 3 documents: A.psd, B.psd, C.psd
  - Seed 11111, strategy "documentHash"
  - Expected: Each document has different random values
  - Re-run batch → Expected: Each document has identical values to first run
- Batch with one corrupted PSD file
  - continueOnError: true
  - Expected: Error logged, other documents processed successfully

---

#### M6: Testing, Validation & Documentation
**Priority:** Critical - Ensures quality and reliability

**Deliverables:**
- [x] Comprehensive test plan execution (17 tests from spec)
- [x] Seed reproducibility validation
- [x] Document hash variation validation
- [x] Edge case testing (missing textures, locked layers, etc.)
- [x] Performance benchmarking
- [x] User documentation (README.md, USAGE.md)
- [x] Bug fixes from testing

**Key Deliverables:**
```
docs/README.md                   # Installation and quick start
docs/USAGE.md                    # Detailed usage guide
docs/TEST_PLAN.md                # Testing procedures and results
```

**Test Execution Checklist:**

**Functional Tests (10):**
- [ ] Test 1: Single document, single copy
- [ ] Test 2: Single document, multiple copies (1, 3, 5)
- [ ] Test 3: Batch processing with document hash
- [ ] Test 4: Visible-only layer processing
- [ ] Test 5: Layer name filtering
- [ ] Test 6: State restoration on error
- [ ] Test 7: Gradient streak generation
- [ ] Test 8: Reverse bleed with vertical offset
- [ ] Test 9: ICC profile handling
- [ ] Test 10: Folder persistence

**Edge Case Tests (5):**
- [ ] Test 11: No matching layers (error handling)
- [ ] Test 12: Smart Object handling
- [ ] Test 13: Texture file missing
- [ ] Test 14: Texture resolution mismatch
- [ ] Test 15: CMYK conversion

**Reproducibility Tests (2):**
- [ ] Test 16: Seed consistency (bit-identical results)
- [ ] Test 17: Document hash variation

**Performance Benchmarking:**
- [ ] Simple document (2-3 layers, 300 DPI)
- [ ] Medium document (5-7 layers, 300 DPI)
- [ ] Complex document (10+ layers, 300 DPI)
- [ ] Batch processing (5 documents)

**Documentation:**

**README.md:**
- Installation instructions
- Quick start guide
- Basic configuration
- Troubleshooting common issues

**USAGE.md:**
- Detailed configuration options
- Preset customization
- Layer naming conventions
- Batch processing workflow
- Export settings
- Advanced seed strategies
- Performance optimization tips

**Success Criteria:**
- [ ] All 17 tests pass
- [ ] Seed reproducibility verified across multiple runs with identical seed
- [ ] Document hash produces variation across files
- [ ] Document hash produces identical results for same file
- [ ] Performance acceptable for 300 DPI documents
- [ ] No crashes or data loss during testing
- [ ] Documentation clear and complete

---

### Iteration 2 Deliverables Summary

**New Features Completed:**
- ✓ Texture overlay system with verification
- ✓ Reverse bleed-through effect
- ✓ PNG/PSD export with ICC profile handling
- ✓ Batch folder processing
- ✓ Document hash seed strategy
- ✓ Comprehensive testing and validation
- ✓ User documentation

**End of Iteration 2 Demo:**
- Batch process folder of 3 historical documents
- Each document generates copies 1, 2, 3
- Each copy exported as PNG and PSD
- Review ICC profile handling in logs
- Verify seed reproducibility (re-run batch)
- Show texture overlay and reverse bleed effects
- Review comprehensive documentation

**v0.1 Complete Feature Set:**
- ✓ UXP plugin structure with command registration
- ✓ JSON config and preset loading with type validation
- ✓ Persistent folder handles (store tokens, rehydrate on launch)
- ✓ Seeded PRNG (mulberry32) for deterministic randomness
- ✓ Layer name-based filtering (smart detection, visible-only)
- ✓ Non-destructive scaffold with layer ID tracking
- ✓ State management (save/restore in try/finally blocks)
- ✓ Generate N copies in single run (1-5)
- ✓ Core effects: Gaussian blur, noise, opacity variation
- ✓ Gradient fill layers for directional streaks
- ✓ Reverse bleed-through (vertical offset with X jitter)
- ✓ Paper background with color and texture overlay
- ✓ Auto-export PSD and PNG with ICC profile logging
- ✓ Batch folder processing with seed + document hash
- ✓ RGB color mode support with conversion warnings
- ✓ Comprehensive logging to plugin data folder

---

## Risk Management

### Identified Risks

**Technical Risks:**

1. **UXP API Limitations** (High Impact, Medium Probability)
   - Risk: UXP may not expose all required Photoshop features
   - Mitigation: Early spike on batchPlay for gradient fills, test filter access
   - Fallback: Document limitations, defer to v0.2 if critical

2. **Rasterization Side Effects** (Medium Impact, Medium Probability)
   - Risk: Smart Object/Text rasterization may produce unexpected results
   - Mitigation: Comprehensive testing with various layer types
   - Fallback: Clear documentation of rasterization behavior

3. **Performance Issues** (Medium Impact, Low Probability)
   - Risk: Large documents (>500MB) may timeout or crash
   - Mitigation: Test with various document sizes early
   - Fallback: Document size limits, defer async yielding to v0.2

**Process Risks:**

4. **Scope Creep** (High Impact, Medium Probability)
   - Risk: Additional feature requests during development
   - Mitigation: Strict adherence to spec, v0.2 parking lot for enhancements
   - Fallback: Defer non-critical features

5. **Testing Coverage** (Medium Impact, Medium Probability)
   - Risk: 17 comprehensive tests may uncover more issues than anticipated
   - Mitigation: Automate where possible, parallel test execution
   - Fallback: Prioritize critical tests, defer nice-to-have validation

### Risk Response Plan

**If UXP API blocks gradient fill creation:**
- Fall back to pre-made gradient texture files
- Update textures/README.txt with gradient file requirements
- Document limitation for gradient customization

**If performance is unacceptable for typical documents:**
- Profile code to identify bottlenecks
- Optimize filter application (batch operations where possible)
- Document performance expectations and limitations clearly
- Defer async yielding optimization to v0.2

**If testing reveals critical bugs:**
- Pause development, fix critical bugs before proceeding
- Re-run affected tests
- Communicate impact and any necessary scope adjustments

---

## Dependencies & Prerequisites

### Required Before Starting Iteration 1

**Development Environment:**
- [ ] Photoshop 27.0 installed and licensed
- [ ] UXP Developer Tool installed and configured
- [ ] Code editor (VS Code recommended) with ES6 support
- [ ] Git configured with repository access

**Knowledge Prerequisites:**
- [ ] UXP plugin development basics
- [ ] Photoshop DOM API familiarity
- [ ] batchPlay for advanced features (gradient fills)
- [ ] JavaScript async/await patterns
- [ ] JSON schema validation

**Sample Assets:**
- [ ] Test document: simple_document.psd (2-3 text layers, 300 DPI)
- [ ] Test document: complex_document.psd (10+ layers, various types)
- [ ] Test batch: 3-5 PSD files with different content
- [ ] Sample texture: paper_grain.png (2550×3300px, 300 DPI)

### External Dependencies

**None** - Plugin is self-contained, no external services or APIs required

---

## Success Metrics

### Iteration 1 Success Criteria

**Functional:**
- [ ] Plugin loads without errors
- [ ] Config validation catches all invalid inputs
- [ ] PRNG produces reproducible sequences
- [ ] Layer filtering correctly identifies target layers
- [ ] Scaffold structure created correctly
- [ ] Core effects applied successfully to all layer types
- [ ] State restored correctly after processing and on errors
- [ ] Progressive degradation visible across copies

**Quality:**
- [ ] Zero data loss (originals always preserved)
- [ ] No crashes during normal operation
- [ ] Graceful error handling with helpful messages
- [ ] Code modular and testable

**Performance:**
- [ ] Simple document processing completes successfully

### Iteration 2 Success Criteria

**Functional:**
- [ ] All 17 specification tests pass
- [ ] Batch processing completes successfully
- [ ] PNG/PSD exports created with correct filenames
- [ ] ICC profiles handled correctly (embedded or logged)
- [ ] Texture overlays applied when configured
- [ ] Reverse bleed effect visible and realistic

**Quality:**
- [ ] Seed reproducibility verified across multiple runs
- [ ] Document hash produces variation across files
- [ ] Comprehensive error handling for all edge cases
- [ ] Complete user documentation

**Performance:**
- [ ] Medium document processing completes successfully
- [ ] Batch processing completes without memory issues

### Overall v0.1 Success Criteria

**Must Have (Release Blockers):**
- ✓ All core effects working (blur, noise, opacity, streaks)
- ✓ Non-destructive workflow (originals preserved)
- ✓ Reproducible results (seeded PRNG)
- ✓ Export functionality (PNG/PSD)
- ✓ Batch processing working
- ✓ Zero data loss in all scenarios

**Should Have (High Priority):**
- ✓ Texture overlay system
- ✓ Reverse bleed effect
- ✓ ICC profile handling
- ✓ Comprehensive documentation
- ✓ All 17 tests passing

**Nice to Have (Optional for v0.1):**
- Color mode conversion testing beyond RGB
- Performance optimization for large documents
- Additional preset examples

---

## Milestone Dependencies

### Iteration 1: Foundation & Core Processing
| Milestone | Dependencies | Deliverable |
|-----------|--------------|-------------|
| M0: Scaffold | None | Working plugin shell, config system, PRNG |
| M1: Layers | M0 | Layer filtering, scaffold, state management |
| M2: Effects | M0, M1 | Core effects, gradient streaks, paper BG |
| **Iteration 1 Complete** | **M0-M2** | **Working single-document processor** |

### Iteration 2: Advanced Features & Export
| Milestone | Dependencies | Deliverable |
|-----------|--------------|-------------|
| M3: Textures | M0, M2 | Texture overlay system |
| M4: Reverse Bleed | M1, M2 | Reverse bleed effect |
| M5: Export | M0-M4 | Export engine, batch processing |
| M6: Testing | M0-M5 | Validated v0.1, documentation |
| **Iteration 2 Complete** | **M0-M6** | **Complete v0.1 release** |

---

## Handoff to v0.2

### Deferred Features (Out of Scope for v0.1)

The following features are explicitly deferred to v0.2 and should NOT be implemented in these iterations:

**Advanced Effects:**
- ⚙ Motion blur (directional carbon streaking)
- ⚙ Edge fray effects
- ⚙ Uneven pressure zone masks
- ⚙ Paper tone overlay layer

**Platform Extensions:**
- ⚙ CMYK color mode round-trip support
- ⚙ Grayscale mode support
- ⚙ Artboard support

**UI Enhancements:**
- ⚙ UXP panel UI
- ⚙ Real-time preview
- ⚙ Progress indicators with cancel

**Performance:**
- ⚙ Async yielding for large documents (>1GB)
- ⚙ Proxy preview for faster feedback

### Known Limitations to Document

**v0.1 Limitations (by design):**
- Artboards not supported (use single-page documents)
- Smart Objects will be rasterized (no smart filter preservation)
- RGB primary mode (CMYK/Grayscale converted with warning)
- No procedural Perlin noise (use gradient fills + noise filter)
- No Generative AI integration (not scriptable in UXP)
- Texture sizing is native only (no automatic scaling)
- Single-threaded processing (may be slow for very large documents)

---

## Definition of Done

### Iteration 1 Complete When:
- [ ] All M0, M1, M2 deliverables checked off
- [ ] Plugin command successfully generates 3 copies in single run
- [ ] Same seed produces identical results in 2 consecutive runs
- [ ] Originals verified unchanged after processing
- [ ] Code reviewed and commented
- [ ] No critical bugs in layer selection or core effects
- [ ] Basic smoke testing passed

### Iteration 2 Complete When:
- [ ] All M3, M4, M5, M6 deliverables checked off
- [ ] All 17 specification tests passing
- [ ] Batch processing tested with 5+ documents
- [ ] Export generates correct PNG and PSD files
- [ ] ICC profile handling verified (with and without profiles)
- [ ] Seed reproducibility validated in batch mode
- [ ] README.md and USAGE.md complete
- [ ] TEST_PLAN.md shows all tests passed
- [ ] No critical or high-priority bugs
- [ ] Performance acceptable for 300 DPI documents
- [ ] User can successfully run plugin following README alone

### v0.1 Release Ready When:
- [ ] Both iterations complete
- [ ] All definition of done items checked
- [ ] Documentation reviewed for clarity and completeness
- [ ] Known limitations clearly documented
- [ ] Sample presets tested and working
- [ ] Plugin successfully tested on clean Photoshop installation
- [ ] Git repository tagged as v0.1.0

---

## Next Steps (After Plan Approval)

1. **Set up development environment**
   - Install/verify Photoshop 27.0 and UXP tools
   - Initialize plugin directory structure
   - Create manifest.json

2. **Create sample assets**
   - Build simple_document.psd for testing
   - Build complex_document.psd for edge cases
   - Gather test batch of 3-5 PSDs

3. **Begin M0 implementation**
   - Implement config.js with validation
   - Implement prng.js with mulberry32
   - Implement logger.js
   - Test PRNG reproducibility

4. **Regular progress reviews recommended**
   - Progress check
   - Blocker identification
   - Risk assessment

---

**END OF DEVELOPMENT PLAN**

This plan is ready for implementation. Proceed with Iteration 1, Milestone M0.
