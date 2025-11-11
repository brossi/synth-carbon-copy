/**
 * Effects Implementation
 * Core effects: blur, noise, opacity, gradient streaks, reverse bleed
 */

const { app, action } = require("photoshop");
const { executeAsModal } = require("photoshop").core;
const { getLogger } = require("./logger");

/**
 * Apply Gaussian Blur to a layer
 */
async function applyGaussianBlur(layer, radius) {
  const logger = getLogger();

  return await executeAsModal(async () => {
    try {
      await action.batchPlay([{
        "_obj": "gaussianBlur",
        "radius": {
          "_unit": "pixelsUnit",
          "_value": radius
        },
        "_target": [{ "_ref": "layer", "_enum": "ordinal", "_value": "targetEnum" }]
      }], {
        "synchronousExecution": true,
        "modalBehavior": "execute"
      });

      await logger.debug(`Applied Gaussian blur (${radius}px) to "${layer.name}"`);

    } catch (err) {
      await logger.error(`Failed to apply Gaussian blur: ${err.message}`);
      throw err;
    }
  }, { commandName: "Apply Gaussian Blur" });
}

/**
 * Apply Add Noise filter to a layer
 */
async function applyNoise(layer, amount, monochromatic = true) {
  const logger = getLogger();

  return await executeAsModal(async () => {
    try {
      await action.batchPlay([{
        "_obj": "addNoise",
        "noise": {
          "_unit": "percentUnit",
          "_value": amount
        },
        "distribution": {
          "_enum": "distribution",
          "_value": "gaussian"
        },
        "monochromatic": monochromatic,
        "_target": [{ "_ref": "layer", "_enum": "ordinal", "_value": "targetEnum" }]
      }], {
        "synchronousExecution": true,
        "modalBehavior": "execute"
      });

      await logger.debug(`Applied noise (${amount}%) to "${layer.name}"`);

    } catch (err) {
      await logger.error(`Failed to apply noise: ${err.message}`);
      throw err;
    }
  }, { commandName: "Apply Noise" });
}

/**
 * Apply color overlay to layer (transform to carbon color)
 */
async function applyColorOverlay(layer, hexColor) {
  const logger = getLogger();

  return await executeAsModal(async () => {
    try {
      // Convert hex color to RGB
      const r = parseInt(hexColor.substring(0, 2), 16);
      const g = parseInt(hexColor.substring(2, 4), 16);
      const b = parseInt(hexColor.substring(4, 6), 16);

      // Apply color overlay layer style
      await action.batchPlay([{
        "_obj": "set",
        "_target": [{ "_ref": "layer", "_enum": "ordinal", "_value": "targetEnum" }],
        "to": {
          "_obj": "layer",
          "layerEffects": {
            "_obj": "layerEffects",
            "solidFill": {
              "_obj": "solidFill",
              "enabled": true,
              "mode": {
                "_enum": "blendMode",
                "_value": "normal"
              },
              "opacity": {
                "_unit": "percentUnit",
                "_value": 100
              },
              "color": {
                "_obj": "RGBColor",
                "red": r,
                "grain": g,
                "blue": b
              }
            }
          }
        }
      }], {
        "synchronousExecution": true,
        "modalBehavior": "execute"
      });

      await logger.debug(`Applied color overlay #${hexColor} to "${layer.name}"`);

    } catch (err) {
      await logger.error(`Failed to apply color overlay: ${err.message}`);
      throw err;
    }
  }, { commandName: "Apply Color Overlay" });
}

/**
 * Process a layer for a specific copy
 * Duplicates, rasterizes, applies effects
 */
async function processLayerForCopy(doc, origLayer, settings, copyNum, rng, targetGroup) {
  const logger = getLogger();

  return await executeAsModal(async () => {
    try {
      // 1. Duplicate original layer
      const duplicate = await origLayer.duplicate();
      duplicate.name = `Text Copy ${copyNum} - ${origLayer.name}`;

      // 2. CRITICAL: Rasterize if not already raster
      if (duplicate.kind !== "pixel") {
        await logger.debug(`Rasterizing layer: ${duplicate.name}`);
        await action.batchPlay([{
          "_obj": "rasterizeLayer",
          "_target": [{ "_ref": "layer", "_enum": "ordinal", "_value": "targetEnum" }]
        }], {
          "synchronousExecution": true,
          "modalBehavior": "execute"
        });
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

      await logger.debug(`Processed layer copy ${copyNum}: ${duplicate.name}`);
      return duplicate;

    } catch (err) {
      await logger.error(`Failed to process layer: ${err.message}`);
      throw err;
    }
  }, { commandName: `Process Layer Copy ${copyNum}` });
}

/**
 * Create gradient fill layer for streak effect
 */
async function createGradientStreak(doc, parentGroup, xPosition, angle, opacity, index) {
  const logger = getLogger();

  return await executeAsModal(async () => {
    try {
      // Create gradient fill layer via batchPlay
      const result = await action.batchPlay([{
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
                    "grain": 64,
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
                    "grain": 64,
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
        "modalBehavior": "execute"
      });

      // Get reference to created layer
      const streakLayer = doc.activeLayers[0];
      streakLayer.name = `Streak ${index}`;
      streakLayer.opacity = opacity;

      // Move to imperfections group
      await streakLayer.move(parentGroup);

      return streakLayer;

    } catch (err) {
      await logger.error(`Failed to create gradient streak: ${err.message}`);
      throw err;
    }
  }, { commandName: `Create Gradient Streak ${index}` });
}

/**
 * Create imperfections layer with gradient streaks
 */
async function createImperfectionsLayer(doc, settings, copyNum, rng, targetGroup) {
  const logger = getLogger();

  if (!settings.enabled) return null;

  return await executeAsModal(async () => {
    try {
      // Create container group for imperfections
      const imperfGroup = await targetGroup.createLayerGroup({
        name: `Imperfections - Copy ${copyNum}`
      });

      // Set blend mode - convert string to Photoshop enum
      const blendModeMap = {
        "multiply": "multiply",
        "screen": "screen",
        "overlay": "overlay",
        "softLight": "softLight",
        "hardLight": "hardLight"
      };

      imperfGroup.blendMode = blendModeMap[settings.blendMode] || "multiply";
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
        await action.batchPlay([{
          "_obj": "rasterizeLayer",
          "_target": [{ "_ref": "layer", "_enum": "ordinal", "_value": "targetEnum" }]
        }], {
          "synchronousExecution": true,
          "modalBehavior": "execute"
        });

        await applyNoise(streakLayer, 30, true); // Heavy noise for texture
      }

      await logger.info(`Created ${numStreaks} gradient streak(s) for copy ${copyNum}`);
      return imperfGroup;

    } catch (err) {
      await logger.error(`Failed to create imperfections: ${err.message}`);
      throw err;
    }
  }, { commandName: `Create Imperfections Copy ${copyNum}` });
}

/**
 * Create paper background layer
 */
async function createPaperBackground(doc, settings, targetGroup, textures) {
  const logger = getLogger();

  return await executeAsModal(async () => {
    try {
      // Convert hex color to RGB
      const hexColor = settings.paperColor;
      const r = parseInt(hexColor.substring(0, 2), 16);
      const g = parseInt(hexColor.substring(2, 4), 16);
      const b = parseInt(hexColor.substring(4, 6), 16);

      // Create solid color fill layer
      const result = await action.batchPlay([{
        "_obj": "make",
        "_target": [{ "_ref": "contentLayer" }],
        "using": {
          "_obj": "contentLayer",
          "type": {
            "_obj": "solidColorLayer",
            "color": {
              "_obj": "RGBColor",
              "red": r,
              "grain": g,
              "blue": b
            }
          }
        }
      }], {
        "synchronousExecution": true,
        "modalBehavior": "execute"
      });

      const paperLayer = doc.activeLayers[0];
      paperLayer.name = "Paper Background";

      // Move to target group (at bottom)
      await paperLayer.move(targetGroup, "placeAtEnd");

      await logger.debug(`Created paper background #${hexColor}`);
      return paperLayer;

    } catch (err) {
      await logger.error(`Failed to create paper background: ${err.message}`);
      throw err;
    }
  }, { commandName: "Create Paper Background" });
}

/**
 * Create reverse bleed-through effect
 */
async function createReverseBleed(doc, copyGroup, settings, copyNum, rng) {
  const logger = getLogger();

  if (!settings.enabled) return null;

  return await executeAsModal(async () => {
    try {
      // Get all text layers from copy group (excluding background, imperfections)
      const textLayers = [];
      for (const layer of copyGroup.layers) {
        if (layer.name.startsWith("Text Copy") && layer.kind === "pixel") {
          textLayers.push(layer);
        }
      }

      if (textLayers.length === 0) {
        await logger.warn("No text layers found for reverse bleed");
        return null;
      }

      // Duplicate text layers for merging
      const duplicates = [];
      for (const textLayer of textLayers) {
        const dup = await textLayer.duplicate();
        duplicates.push(dup);
      }

      // Merge duplicates into single layer
      // Select all duplicates
      doc.activeLayers = duplicates;

      // Merge selected layers
      await action.batchPlay([{
        "_obj": "mergeLayersNew"
      }], {
        "synchronousExecution": true,
        "modalBehavior": "execute"
      });

      const mergedLayer = doc.activeLayers[0];
      mergedLayer.name = `Reverse Bleed - Copy ${copyNum}`;

      // CRITICAL: Ensure layer is rasterized before transform
      if (mergedLayer.kind !== "pixel") {
        await action.batchPlay([{
          "_obj": "rasterizeLayer",
          "_target": [{ "_ref": "layer", "_enum": "ordinal", "_value": "targetEnum" }]
        }], {
          "synchronousExecution": true,
          "modalBehavior": "execute"
        });
      }

      // Flip horizontal
      await action.batchPlay([{
        "_obj": "flip",
        "_target": [{ "_ref": "layer", "_enum": "ordinal", "_value": "targetEnum" }],
        "axis": { "_enum": "orientation", "_value": "horizontal" }
      }], {
        "synchronousExecution": true,
        "modalBehavior": "execute"
      });

      // Apply offset
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

      // Move to copy group
      await mergedLayer.move(copyGroup);

      await logger.info(`Created reverse bleed for copy ${copyNum}`);
      return mergedLayer;

    } catch (err) {
      await logger.error(`Failed to create reverse bleed: ${err.message}`);
      throw err;
    }
  }, { commandName: `Create Reverse Bleed Copy ${copyNum}` });
}

module.exports = {
  applyGaussianBlur,
  applyNoise,
  applyColorOverlay,
  processLayerForCopy,
  createGradientStreak,
  createImperfectionsLayer,
  createPaperBackground,
  createReverseBleed
};
