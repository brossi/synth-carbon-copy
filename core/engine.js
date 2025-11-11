/**
 * Main Processing Engine
 * Orchestrates the carbon copy generation pipeline
 */

const { app } = require("photoshop");
const { executeAsModal } = require("photoshop").core;
const { getLogger } = require("./logger");
const { createSeededRandom, calculateDocumentSeed } = require("./prng");
const {
  identifyTargetLayers,
  identifyExcludedLayers,
  createScaffold,
  moveLayersToGroup,
  captureDocumentState,
  restoreDocumentState,
  verifyOriginalLayerIDs
} = require("./layers");
const {
  processLayerForCopy,
  createImperfectionsLayer,
  createPaperBackground,
  createReverseBleed
} = require("./effects");
const { exportCopy, getOutputFolder } = require("./export");

/**
 * Validate document before processing
 */
async function validateDocument(doc, config) {
  const logger = getLogger();
  const validation = {
    errors: [],
    warnings: []
  };

  // Check if document is saved (required for export)
  if (config.export?.enabled && !doc.path) {
    validation.warnings.push("Document is not saved. Exports may fail.");
  }

  // Check color mode
  if (doc.mode !== "RGBColorMode") {
    if (config.colorMode?.convertIfNeeded) {
      validation.warnings.push(`Document is in ${doc.mode} mode. Will convert to RGB (may be lossy).`);
    } else {
      validation.errors.push(`Document must be in RGB mode (currently ${doc.mode})`);
    }
  }

  // Check for artboards (not supported)
  if (doc.artboards && doc.artboards.length > 0) {
    validation.errors.push("Artboards are not supported in v0.1. Use single-page documents.");
  }

  return validation;
}

/**
 * Convert document to RGB if needed
 */
async function convertColorModeIfNeeded(doc, config) {
  const logger = getLogger();

  if (doc.mode === "RGBColorMode") {
    return; // Already RGB
  }

  if (!config.colorMode?.convertIfNeeded) {
    throw new Error(`Document is not in RGB mode and conversion is disabled`);
  }

  return await executeAsModal(async () => {
    await logger.warn(`Converting document from ${doc.mode} to RGB...`);

    try {
      await doc.changeMode("RGBColorMode");
      await logger.info("Color mode converted to RGB");
    } catch (err) {
      await logger.error(`Failed to convert color mode: ${err.message}`);
      throw err;
    }
  }, { commandName: "Convert to RGB" });
}

/**
 * Process a single document
 */
async function processDocument(doc, config, preset, folderPersistence) {
  const logger = getLogger();

  await logger.info(`Processing document: ${doc.name}`);

  // CRITICAL: Save state before any operations
  const savedState = captureDocumentState(doc);

  try {
    return await executeAsModal(async () => {
      // 1. VALIDATION
      const validation = await validateDocument(doc, config);

      if (validation.errors.length > 0) {
        throw new Error(validation.errors.join('; '));
      }

      // Log warnings
      for (const warning of validation.warnings) {
        await logger.warn(warning);
      }

      // 2. COLOR MODE
      await convertColorModeIfNeeded(doc, config);

      // 3. LAYER IDENTIFICATION (visible-only + name matching)
      const targetLayers = await identifyTargetLayers(doc, config.layerRules);
      const excludedLayers = await identifyExcludedLayers(doc, config.layerRules);

      if (targetLayers.length === 0) {
        throw new Error("No visible layers match processing rules");
      }

      await logger.info(`Found ${targetLayers.length} layers to process`);

      // 4. TRACK ORIGINAL LAYER IDs
      const originalLayerIDs = targetLayers.map(l => l.id);

      // 5. SCAFFOLD CREATION
      const scaffold = await createScaffold(doc, config.copyGeneration.nCopies);

      // 6. PRESERVE ORIGINALS
      await moveLayersToGroup(targetLayers, scaffold.originalGroup);
      scaffold.originalGroup.visible = false;

      if (excludedLayers.length > 0) {
        await moveLayersToGroup(excludedLayers, scaffold.unprocessedGroup);
      }

      // 7. INITIALIZE PRNG
      const docSeed = calculateDocumentSeed(doc, config);
      const rng = createSeededRandom(docSeed);
      await logger.info(`Using seed: ${docSeed}`);

      // 8. GENERATE COPIES
      const copyNumbers = config.copyGeneration.generateCopies;
      for (const copyNum of copyNumbers) {
        await logger.info(`Generating copy ${copyNum}...`);

        const copySettings = preset.copySettings.find(s => s.copyNumber === copyNum);
        if (!copySettings) {
          throw new Error(`No preset settings found for copy ${copyNum}`);
        }

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
        if (preset.globalEffects?.imperfections) {
          await createImperfectionsLayer(
            doc,
            preset.globalEffects.imperfections,
            copyNum,
            rng,
            copyGroup
          );
        }

        // Add reverse bleed-through
        if (preset.globalEffects?.reverseBleed?.enabled) {
          await createReverseBleed(
            doc,
            copyGroup,
            preset.globalEffects.reverseBleed,
            copyNum,
            rng
          );
        }
      }

      // 9. VERIFY ORIGINALS UNCHANGED
      await verifyOriginalLayerIDs(doc, originalLayerIDs);

      // 10. EXPORT
      if (config.export?.enabled) {
        const outputFolder = await getOutputFolder(config, folderPersistence);

        for (const copyNum of copyNumbers) {
          await exportCopy(doc, copyNum, config.export, outputFolder);
        }
      }

      // 11. SAVE MASTER PSD
      await doc.save();
      await logger.info("Master PSD saved");

      return {
        success: true,
        copiesGenerated: copyNumbers.length,
        layersProcessed: targetLayers.length
      };

    }, { commandName: "Carbon Copy Simulation" });

  } catch (err) {
    await logger.error(`Processing failed: ${err.message}`);
    throw err;

  } finally {
    // CRITICAL: Restore state even on error
    if (config.workflow?.restoreStateOnError) {
      await restoreDocumentState(doc, savedState);
    }
  }
}

/**
 * Process batch of documents
 */
async function processBatch(config, preset, folderPersistence) {
  const logger = getLogger();

  await logger.info("Starting batch processing...");

  try {
    // Get input folder
    const inputFolder = await folderPersistence.getInputFolder(
      config.batch?.promptForInputFolder ?? true
    );

    // Get all PSD files
    const entries = await inputFolder.getEntries();
    const psdFiles = entries.filter(entry =>
      entry.isFile && entry.name.toLowerCase().endsWith('.psd')
    );

    await logger.info(`Found ${psdFiles.length} PSD file(s) in folder`);

    const results = {
      total: psdFiles.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    // Process each document
    for (const file of psdFiles) {
      try {
        await logger.info(`Opening ${file.name}...`);

        // Open document
        const doc = await app.open(file);

        // Process document
        const result = await processDocument(doc, config, preset, folderPersistence);

        results.successful++;

        // Close if configured
        if (config.batch?.closeAfterProcessing) {
          await doc.close("saveChanges");
        }

      } catch (err) {
        results.failed++;
        results.errors.push({ file: file.name, error: err.message });

        await logger.error(`Failed to process ${file.name}: ${err.message}`);

        // Continue or stop based on config
        if (!config.batch?.continueOnError) {
          throw new Error(`Batch processing stopped due to error in ${file.name}`);
        }
      }
    }

    // Log summary
    await logger.info("Batch processing complete");
    await logger.info(`Total: ${results.total}, Successful: ${results.successful}, Failed: ${results.failed}`);

    return results;

  } catch (err) {
    await logger.error(`Batch processing failed: ${err.message}`);
    throw err;
  }
}

module.exports = {
  processDocument,
  processBatch,
  validateDocument,
  convertColorModeIfNeeded
};
