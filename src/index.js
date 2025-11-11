/**
 * Synth Carbon Copy - Main Entry Point
 * Photoshop UXP Plugin for generating simulated carbon copies
 */

const { app } = require("photoshop");
const { entrypoints } = require("uxp");

// Main panel setup
entrypoints.setup({
  panels: {
    synthCarbonCopyPanel: {
      create() {
        // Panel UI will be created here
        const html = `
          <style>
            body {
              padding: 20px;
            }
            h1 {
              font-size: 16px;
              margin-bottom: 10px;
            }
            .description {
              margin-bottom: 20px;
              font-size: 12px;
              color: #666;
            }
          </style>
          <div>
            <h1>Carbon Copy Effect</h1>
            <p class="description">
              Generate simulated carbon copies from typed documents
            </p>
          </div>
        `;
        
        const panel = document.createElement("div");
        panel.innerHTML = html;
        
        return panel;
      }
    }
  }
});
