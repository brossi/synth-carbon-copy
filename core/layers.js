/**
 * Layer Selection, Manipulation, and State Management
 */

const { app } = require("photoshop");
const { getLogger } = require("./logger");

/**
 * Get all layers recursively from a container
 */
function getAllLayers(container) {
  const layers = [];

  function traverse(node) {
    if (node.layers) {
      for (const layer of node.layers) {
        layers.push(layer);
        if (layer.typename === "LayerSet" || layer.layers) {
          traverse(layer);
        }
      }
    }
  }

  traverse(container);
  return layers;
}

/**
 * Check if layer is visible AND all parent groups are visible
 */
function isLayerEffectivelyVisible(layer) {
  if (!layer.visible) return false;

  // Check all parent groups
  let parent = layer.parent;
  while (parent && (parent.typename === "LayerSet" || parent.layers)) {
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
      return false;
    }
  }

  // Check process conditions
  for (const processTerm of rules.processIfContains) {
    const term = rules.caseSensitive ? processTerm : processTerm.toLowerCase();
    if (name.includes(term)) {
      return true;
    }
  }

  return false;
}

/**
 * Identify target layers for processing
 * - Must match name rules
 * - Must be visible (if visibleOnly: true)
 * - Excludes layers in hidden groups
 */
async function identifyTargetLayers(doc, rules) {
  const logger = getLogger();
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
      await logger.debug(`Will process layer: "${layer.name}"`);
    }
  }

  await logger.info(`Identified ${targets.length} target layers`);
  return targets;
}

/**
 * Identify layers to be excluded (moved to UNPROCESSED group)
 */
async function identifyExcludedLayers(doc, rules) {
  const logger = getLogger();
  const allLayers = getAllLayers(doc);
  const excluded = [];

  for (const layer of allLayers) {
    // Only check skip rules
    const name = rules.caseSensitive ? layer.name : layer.name.toLowerCase();

    for (const skipTerm of rules.skipIfContains) {
      const term = rules.caseSensitive ? skipTerm : skipTerm.toLowerCase();
      if (name.includes(term)) {
        excluded.push(layer);
        await logger.debug(`Will exclude layer: "${layer.name}"`);
        break;
      }
    }
  }

  await logger.info(`Identified ${excluded.length} excluded layers`);
  return excluded;
}

/**
 * Create document scaffold structure
 * Returns: { copiesGroups: [], originalGroup, unprocessedGroup }
 */
async function createScaffold(doc, nCopies) {
  const logger = getLogger();
  await logger.info(`Creating scaffold for ${nCopies} copies`);

  const copiesGroups = [];

  // Create copy groups (in reverse order so they appear correctly)
  for (let i = nCopies; i >= 1; i--) {
    const copyGroup = await doc.createLayerGroup({ name: `COPY ${i}` });
    copiesGroups.unshift(copyGroup);
  }

  // Create UNPROCESSED group
  const unprocessedGroup = await doc.createLayerGroup({ name: "UNPROCESSED" });

  // Create ORIGINAL LAYERS group (will be hidden)
  const originalGroup = await doc.createLayerGroup({ name: "ORIGINAL LAYERS" });

  await logger.info("Scaffold created successfully");

  return {
    copiesGroups,
    originalGroup,
    unprocessedGroup
  };
}

/**
 * Move layers to a target group
 */
async function moveLayersToGroup(layers, targetGroup) {
  const logger = getLogger();

  for (const layer of layers) {
    try {
      await layer.move(targetGroup);
    } catch (err) {
      await logger.warn(`Failed to move layer "${layer.name}": ${err.message}`);
    }
  }
}

/**
 * Capture current document state for restoration
 */
function captureDocumentState(doc) {
  return {
    activeDocument: app.activeDocument,
    activeLayers: doc.activeLayers ? [...doc.activeLayers].map(l => ({ id: l.id, name: l.name })) : [],
    historyState: doc.activeHistoryState,
    layerVisibility: captureLayerVisibility(doc)
  };
}

/**
 * Recursively capture layer visibility states
 */
function captureLayerVisibility(container) {
  const visibility = {};

  if (!container.layers) return visibility;

  for (const layer of container.layers) {
    visibility[layer.id] = {
      visible: layer.visible,
      children: (layer.typename === "LayerSet" || layer.layers) ? captureLayerVisibility(layer) : null
    };
  }

  return visibility;
}

/**
 * Restore document state after processing or on error
 */
async function restoreDocumentState(doc, savedState) {
  const logger = getLogger();

  try {
    // Restore active document
    if (savedState.activeDocument) {
      app.activeDocument = savedState.activeDocument;
    }

    // Restore layer visibility
    await restoreLayerVisibility(doc, savedState.layerVisibility);

    // Restore layer selection (approximate, as layer IDs may have changed)
    if (savedState.activeLayers && savedState.activeLayers.length > 0) {
      const layersToSelect = [];

      for (const savedLayer of savedState.activeLayers) {
        const layer = findLayerById(doc, savedLayer.id);
        if (layer) {
          layersToSelect.push(layer);
        }
      }

      if (layersToSelect.length > 0) {
        doc.activeLayers = layersToSelect;
      }
    }

    await logger.info("Document state restored");

  } catch (err) {
    await logger.warn(`Failed to fully restore document state: ${err.message}`);
  }
}

/**
 * Find layer by ID
 */
function findLayerById(container, id) {
  const allLayers = getAllLayers(container);
  return allLayers.find(l => l.id === id) || null;
}

/**
 * Restore layer visibility recursively
 */
async function restoreLayerVisibility(container, visibility) {
  if (!container.layers || !visibility) return;

  for (const layer of container.layers) {
    const visInfo = visibility[layer.id];
    if (visInfo) {
      layer.visible = visInfo.visible;

      if (visInfo.children && (layer.typename === "LayerSet" || layer.layers)) {
        await restoreLayerVisibility(layer, visInfo.children);
      }
    }
  }
}

/**
 * Verify original layers haven't been modified
 */
async function verifyOriginalLayerIDs(doc, originalIDs) {
  const logger = getLogger();

  try {
    // Find ORIGINAL LAYERS group
    const originalGroup = doc.layerGroups ?
      [...doc.layerGroups].find(g => g.name === "ORIGINAL LAYERS") :
      null;

    if (!originalGroup) {
      await logger.warn("Original layers group not found");
      return false;
    }

    const currentLayers = getAllLayers(originalGroup);
    const currentIDs = currentLayers.map(l => l.id);
    const missing = originalIDs.filter(id => !currentIDs.includes(id));

    if (missing.length > 0) {
      await logger.error(`${missing.length} original layer(s) were modified or deleted!`);
      return false;
    }

    await logger.info("Original layers verified intact");
    return true;

  } catch (err) {
    await logger.error(`Failed to verify original layers: ${err.message}`);
    return false;
  }
}

module.exports = {
  getAllLayers,
  isLayerEffectivelyVisible,
  shouldProcessLayer,
  identifyTargetLayers,
  identifyExcludedLayers,
  createScaffold,
  moveLayersToGroup,
  captureDocumentState,
  restoreDocumentState,
  verifyOriginalLayerIDs
};
