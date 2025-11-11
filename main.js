/**
 * Carbon Copy Simulator - Main Entry Point
 * Photoshop UXP Plugin for generating simulated carbon copies
 */

const { app, action } = require("photoshop");
const { entrypoints } = require("uxp");
const { initLogger, getLogger } = require("./core/logger");
const { loadConfig, loadPreset, validateConfig, validatePreset, FolderPersistence } = require("./core/config");
const { processDocument, processBatch } = require("./core/engine");

/**
 * Main command handler
 */
async function runCarbonCopySimulation() {
  let logger;

  try {
    // 1. Load and validate configuration
    const config = await loadConfig();
    validateConfig(config);

    // 2. Initialize logger
    logger = initLogger(config);
    await logger.info("=== Carbon Copy Simulator Started ===");
    await logger.info(`Version: 0.1.0`);

    // 3. Load and validate preset
    await logger.info(`Loading preset: ${config.preset}`);
    const preset = await loadPreset(config.preset);
    validatePreset(preset, config);

    // 4. Initialize folder persistence
    const folderPersistence = new FolderPersistence(config);

    // 5. Process based on mode
    if (config.mode === "single") {
      // Single document mode - process active document
      const doc = app.activeDocument;

      if (!doc) {
        throw new Error("No active document. Please open a document first.");
      }

      await logger.info(`Mode: Single document`);
      const result = await processDocument(doc, config, preset, folderPersistence);

      await logger.info(`Processing complete: ${result.copiesGenerated} copies generated, ${result.layersProcessed} layers processed`);

      // Show success message
      await app.showAlert("Carbon Copy Simulation Complete!", {
        message: `Generated ${result.copiesGenerated} carbon copies from ${result.layersProcessed} layers.`
      });

    } else if (config.mode === "batch") {
      // Batch mode - process folder of PSDs
      await logger.info(`Mode: Batch processing`);

      const results = await processBatch(config, preset, folderPersistence);

      await logger.info(`Batch complete: ${results.successful} successful, ${results.failed} failed`);

      // Show summary message
      await app.showAlert("Batch Processing Complete!", {
        message: `Processed ${results.total} documents.\nSuccessful: ${results.successful}\nFailed: ${results.failed}`
      });

    } else {
      throw new Error(`Invalid mode: ${config.mode}. Must be "single" or "batch".`);
    }

    await logger.info("=== Carbon Copy Simulator Finished ===");

  } catch (err) {
    const errorMessage = `Error: ${err.message}`;

    if (logger) {
      await logger.error(errorMessage);
    } else {
      console.error(errorMessage);
    }

    // Show error to user
    await app.showAlert("Carbon Copy Simulation Failed", {
      message: err.message
    });
  }
}

/**
 * Setup entry points
 */
entrypoints.setup({
  commands: {
    runCarbonCopy: runCarbonCopySimulation
  }
});

module.exports = {
  runCarbonCopySimulation
};
