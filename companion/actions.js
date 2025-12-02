// actions.js
// This file has been refactored into modular components
// All action definitions are now in the ./actions/ directory
//
// Migration completed:
// - Input actions (23) -> ./actions/inputs.js
// - Output actions (36 of 37) -> ./actions/outputs.js
// - Matrix actions (2) -> ./actions/matrix.js
// - Snapshot actions (1 combined) -> ./actions/snapshots.js
// - System actions (17) -> ./actions/system.js
// - Array design actions (2) -> ./actions/array-design.js
//
// Data structures moved to:
// - Product integration data -> ./actions-data.js
// - Helper functions -> ./actions-helpers.js
//
// Main entry point: ./actions/index.js

// Re-export the main UpdateActions function from the modular structure
module.exports = require('./actions/index')
