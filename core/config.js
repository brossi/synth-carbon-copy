/**
 * Configuration System
 * Handles config loading, validation, and folder persistence
 */

const fs = require("uxp").storage.localFileSystem;
const { getLogger } = require("./logger");

/**
 * Load configuration file
 */
async function loadConfig() {
  try {
    const pluginFolder = await fs.getPluginFolder();
    const configFile = await pluginFolder.getEntry("config.json");
    const contents = await configFile.read();
    const config = JSON.parse(contents);

    validateConfig(config);
    return config;

  } catch (err) {
    throw new Error(`Failed to load config.json: ${err.message}`);
  }
}

/**
 * Load preset file
 */
async function loadPreset(presetPath) {
  try {
    const pluginFolder = await fs.getPluginFolder();
    const presetFile = await pluginFolder.getEntry(presetPath);
    const contents = await presetFile.read();
    const preset = JSON.parse(contents);

    return preset;

  } catch (err) {
    throw new Error(`Failed to load preset ${presetPath}: ${err.message}`);
  }
}

/**
 * Validate configuration
 */
function validateConfig(config) {
  const errors = [];

  // Type checks
  if (typeof config.copyGeneration?.nCopies !== 'number') {
    errors.push("config.copyGeneration.nCopies must be a number");
  }

  if (typeof config.copyGeneration?.randomSeed !== 'number') {
    errors.push("config.copyGeneration.randomSeed must be a number");
  }

  if (!Array.isArray(config.copyGeneration?.generateCopies)) {
    errors.push("config.copyGeneration.generateCopies must be an array");
  }

  // Range checks
  if (config.copyGeneration?.nCopies < 1 || config.copyGeneration?.nCopies > 5) {
    errors.push("nCopies must be 1-5");
  }

  // Validate generateCopies array values
  if (config.copyGeneration?.generateCopies) {
    for (const copyNum of config.copyGeneration.generateCopies) {
      if (typeof copyNum !== 'number' || copyNum < 1 || copyNum > 5) {
        errors.push(`Invalid copy number in generateCopies: ${copyNum}`);
      }
    }
  }

  // Check processing mode
  const validModes = ['smart_detection', 'selected_layers', 'flatten_all'];
  if (config.layerRules?.processingMode && !validModes.includes(config.layerRules.processingMode)) {
    errors.push(`Invalid processingMode: ${config.layerRules.processingMode}`);
  }

  if (errors.length > 0) {
    throw new Error("Configuration validation failed:\n" + errors.join('\n'));
  }

  return true;
}

/**
 * Validate preset
 */
function validatePreset(preset, config) {
  const errors = [];

  // Ensure preset has settings for all requested copies
  if (config.copyGeneration?.generateCopies) {
    for (const copyNum of config.copyGeneration.generateCopies) {
      const setting = preset.copySettings?.find(s => s.copyNumber === copyNum);
      if (!setting) {
        errors.push(`Preset missing settings for copy ${copyNum}`);
      }
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

/**
 * Persistent folder handle management
 */
class FolderPersistence {
  constructor(config) {
    this.enabled = config.folderPersistence?.enabled ?? true;
    this.tokenFile = config.folderPersistence?.tokenFile || "folder_tokens.json";
  }

  /**
   * Load persisted tokens
   */
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

  /**
   * Save folder tokens
   */
  async saveTokens(tokens) {
    try {
      const dataFolder = await fs.getDataFolder();
      const tokenFile = await dataFolder.createFile(this.tokenFile, { overwrite: true });
      await tokenFile.write(JSON.stringify(tokens, null, 2));
    } catch (err) {
      console.error("Failed to save folder tokens:", err);
    }
  }

  /**
   * Get input folder (with token rehydration)
   */
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
          const logger = getLogger();
          await logger.info("Rehydrated input folder from token");
          return folder;
        }
      } catch (err) {
        const logger = getLogger();
        await logger.warn("Failed to rehydrate input folder, will prompt user");
      }
    }

    // Prompt user to select folder
    const folder = await fs.getFolder();
    const token = await fs.createPersistentToken(folder);

    tokens.inputFolder = token;
    await this.saveTokens(tokens);

    return folder;
  }

  /**
   * Get output folder (with token rehydration)
   */
  async getOutputFolder(promptUser = false) {
    if (!this.enabled) {
      return await fs.getFolder();
    }

    // Try to load persisted token
    const tokens = await this.loadTokens();

    if (tokens.outputFolder && !promptUser) {
      try {
        const folder = await fs.getEntryForPersistentToken(tokens.outputFolder);
        if (folder) {
          const logger = getLogger();
          await logger.info("Rehydrated output folder from token");
          return folder;
        }
      } catch (err) {
        const logger = getLogger();
        await logger.warn("Failed to rehydrate output folder, will prompt user");
      }
    }

    // Prompt user to select folder
    const folder = await fs.getFolder();
    const token = await fs.createPersistentToken(folder);

    tokens.outputFolder = token;
    await this.saveTokens(tokens);

    return folder;
  }
}

module.exports = {
  loadConfig,
  loadPreset,
  validateConfig,
  validatePreset,
  FolderPersistence
};
