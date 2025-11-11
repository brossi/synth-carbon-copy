/**
 * Logging System
 * Provides file-based logging with multiple severity levels
 */

const fs = require("uxp").storage.localFileSystem;

class Logger {
  constructor(config) {
    this.enabled = config.logging.enabled;
    this.logFile = config.logging.logFile;
    this.verbosity = config.logging.verbosity || "info";
    this.maxLogSize = config.logging.maxLogSize || 1048576; // 1MB default
    this.logFolder = config.logging.logFolder || "pluginData";

    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    this.currentLevel = this.levels[this.verbosity] || this.levels.info;
  }

  /**
   * Get or create log file
   */
  async getLogFile() {
    try {
      const dataFolder = await fs.getDataFolder();
      const logFile = await dataFolder.createFile(this.logFile, { overwrite: false });
      return logFile;
    } catch (err) {
      console.error("Failed to create log file:", err);
      return null;
    }
  }

  /**
   * Write message to log file
   */
  async writeLog(level, message) {
    if (!this.enabled) return;

    if (this.levels[level] < this.currentLevel) {
      return; // Message below current verbosity level
    }

    try {
      const logFile = await this.getLogFile();
      if (!logFile) return;

      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

      // Check file size
      const entry = await logFile.read();
      const currentSize = new Blob([entry]).size;

      if (currentSize > this.maxLogSize) {
        // Truncate log file if too large
        await logFile.write(logEntry);
      } else {
        // Append to log file
        const currentContent = await logFile.read();
        await logFile.write(currentContent + logEntry);
      }

      // Also log to console for development
      console.log(logEntry.trim());

    } catch (err) {
      console.error("Failed to write to log:", err);
    }
  }

  /**
   * Log debug message
   */
  async debug(message) {
    await this.writeLog("debug", message);
  }

  /**
   * Log info message
   */
  async info(message) {
    await this.writeLog("info", message);
  }

  /**
   * Log warning message
   */
  async warn(message) {
    await this.writeLog("warn", message);
  }

  /**
   * Log error message
   */
  async error(message) {
    await this.writeLog("error", message);
  }
}

// Singleton instance
let loggerInstance = null;

/**
 * Initialize logger with config
 */
function initLogger(config) {
  loggerInstance = new Logger(config);
  return loggerInstance;
}

/**
 * Get logger instance
 */
function getLogger() {
  if (!loggerInstance) {
    throw new Error("Logger not initialized. Call initLogger() first.");
  }
  return loggerInstance;
}

module.exports = {
  Logger,
  initLogger,
  getLogger
};
