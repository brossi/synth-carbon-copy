/**
 * Export System
 * Handles PNG/PSD export with ICC profile logging
 */

const { app, action } = require("photoshop");
const { executeAsModal } = require("photoshop").core;
const { getLogger } = require("./logger");
const fs = require("uxp").storage.localFileSystem;
const { formats } = require("photoshop").constants;

/**
 * Isolate a specific copy group (hide all others)
 */
async function isolateCopyGroup(doc, copyNum) {
  const logger = getLogger();

  try {
    // Hide all groups except the target copy
    for (const layerGroup of doc.layerGroups) {
      if (layerGroup.name === `COPY ${copyNum}`) {
        layerGroup.visible = true;
      } else {
        layerGroup.visible = false;
      }
    }

    await logger.debug(`Isolated COPY ${copyNum} for export`);

  } catch (err) {
    await logger.error(`Failed to isolate copy group: ${err.message}`);
    throw err;
  }
}

/**
 * Export document as PNG
 */
async function exportPNG(doc, copyNum, filename, settings, outputFolder) {
  const logger = getLogger();

  return await executeAsModal(async () => {
    try {
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
          await logger.warn("Could not read color profile name");
        }

        // Save as PNG
        const outputFile = await outputFolder.createFile(filename, { overwrite: true });

        try {
          await exportDoc.saveAs.png(outputFile, {
            compression: 9,
            interlaced: false
          }, true);

          // Log successful export with profile information
          if (settings.logProfileName) {
            await logger.info(`Exported ${filename} with ICC profile: ${profileName}`);
          }

        } catch (err) {
          // If PNG export fails, try fallback
          await logger.warn(`PNG export failed, trying fallback: ${err.message}`);

          await exportDoc.saveAs.png(outputFile, {
            compression: 9,
            interlaced: false
          }, true);

          await logger.info(`Exported ${filename} (fallback method)`);
        }

      } finally {
        // Always close export document
        await exportDoc.close("doNotSaveChanges");
      }

    } catch (err) {
      await logger.error(`Failed to export PNG: ${err.message}`);
      throw err;
    }
  }, { commandName: `Export Copy ${copyNum} PNG` });
}

/**
 * Export document as PSD
 */
async function exportPSD(doc, copyNum, filename, settings, outputFolder) {
  const logger = getLogger();

  return await executeAsModal(async () => {
    try {
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
          await logger.warn("Could not read color profile name");
        }

        // Save as PSD
        const outputFile = await outputFolder.createFile(filename, { overwrite: true });

        await exportDoc.saveAs.psd(outputFile, {
          embedColorProfile: settings.embedICC
        }, true);

        // Log successful export with profile information
        if (settings.logProfileName) {
          await logger.info(`Exported ${filename} with ICC profile: ${profileName}`);
        }

      } finally {
        // Always close export document
        await exportDoc.close("doNotSaveChanges");
      }

    } catch (err) {
      await logger.error(`Failed to export PSD: ${err.message}`);
      throw err;
    }
  }, { commandName: `Export Copy ${copyNum} PSD` });
}

/**
 * Export a specific copy with all configured formats
 */
async function exportCopy(doc, copyNum, exportSettings, outputFolder) {
  const logger = getLogger();

  if (!exportSettings.enabled) {
    await logger.debug("Export disabled in configuration");
    return;
  }

  try {
    // Generate filename
    const baseFilename = doc.name.replace(/\.psd$/i, '');
    const filename = exportSettings.namingPattern
      .replace('{filename}', baseFilename)
      .replace('{n:02d}', copyNum.toString().padStart(2, '0'))
      .replace('{n}', copyNum.toString())
      .replace('{suffix}', exportSettings.suffix);

    // Export in each requested format
    for (const format of exportSettings.formats) {
      const fullFilename = filename.replace('{ext}', format.toLowerCase());

      if (format.toUpperCase() === 'PNG') {
        await exportPNG(doc, copyNum, fullFilename, exportSettings, outputFolder);
      } else if (format.toUpperCase() === 'PSD') {
        await exportPSD(doc, copyNum, fullFilename, exportSettings, outputFolder);
      }
    }

    await logger.info(`Exported copy ${copyNum} in ${exportSettings.formats.length} format(s)`);

  } catch (err) {
    await logger.error(`Failed to export copy ${copyNum}: ${err.message}`);
    throw err;
  }
}

/**
 * Get output folder for exports
 */
async function getOutputFolder(config, folderPersistence) {
  const logger = getLogger();

  // If output folder is configured to prompt, use folder persistence
  if (config.batch?.promptForOutputFolder) {
    return await folderPersistence.getOutputFolder(false);
  }

  // Otherwise, use document folder
  const doc = app.activeDocument;
  if (!doc.path) {
    throw new Error("Document must be saved before exporting");
  }

  return await fs.getFolder(doc.path);
}

module.exports = {
  exportCopy,
  exportPNG,
  exportPSD,
  isolateCopyGroup,
  getOutputFolder
};
