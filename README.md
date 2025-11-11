# synth-carbon-copy

Photoshop action to generate simulated carbon copies from "typed" documents

## Overview

This is a UXP (Unified Extensibility Platform) plugin for Adobe Photoshop 27.0 and later. It provides tools to create realistic carbon copy effects on typed documents.

## Project Structure

```
synth-carbon-copy/
├── manifest.json          # UXP plugin manifest (required)
├── package.json           # Node package metadata
├── .gitignore            # Git ignore rules
├── src/                  # Source code directory
│   └── index.js          # Main entry point
└── icons/                # Icon assets directory
    └── README.md         # Icon requirements and guidelines
```

## Requirements

- Adobe Photoshop 27.0 or later
- UXP Developer Tool (for development and testing)

## Development

This plugin uses the UXP (Unified Extensibility Platform) framework. To develop and test:

1. Install the [UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/guides/get-started/)
2. Load this plugin directory in the UXP Developer Tool
3. Click "Load" to install in Photoshop
4. Access the plugin from Plugins > Carbon Copy in Photoshop

## Plugin Structure

The plugin follows the UXP manifest version 5 specification with:
- Panel-based UI for user interaction
- Support for light and dark themes
- Minimum Photoshop version 27.0.0

## License

ISC
