# Actions Module Structure

This directory contains the action definitions for the Meyer Sound Galaxy module, organized by category for better maintainability.

## File Organization

### `index.js`
Main entry point that combines all action categories. This is what `main.js` imports.

### Category Files

- **`inputs.js`** - Input channel actions
  - Mute/unmute controls
  - Gain adjustments (set, nudge, fade)
  - Solo controls
  - U-Shaping EQ (knob-based and direct)
  - Parametric EQ (knob-based and direct)
  - Link group assignment

- **`outputs.js`** - Output channel actions
  - Mute/unmute controls
  - Gain adjustments (set, nudge, fade)
  - Solo controls
  - Polarity reversal
  - Filters (highpass, lowpass, allpass)
  - U-Shaping EQ (knob-based and direct)
  - Parametric EQ (knob-based and direct)
  - Link group assignment
  - Delay controls

- **`matrix.js`** - Matrix routing actions
  - Crosspoint gain controls
  - Multi-input/output routing

- **`snapshots.js`** - Snapshot management
  - Recall snapshots
  - Create/delete/duplicate
  - Rename and comment
  - Lock/unlock
  - Set boot snapshot

- **`system.js`** - System-level controls
  - Entity information
  - Speaker test (output chase)
  - AVB connections
  - SIM3 bus settings
  - Access privileges
  - Front panel lockout
  - Front panel display settings
  - System identify
  - Reboot
  - LCD text override
  - Log management

- **`array-design.js`** - Advanced array design
  - Sub design assist (end-fire, electronic arc, gradient)
  - Line array design
  - LMBC (Low-Mid Beam Control)

## Migration Status

⚠️ **INCOMPLETE MIGRATION**

The structure and stub files have been created, but the actual action definitions have NOT yet been moved from the original `../actions.js` file.

### To Complete the Migration:

1. **Move action definitions** from `../actions.js` to the appropriate category file
2. **Update imports** - ensure each category file imports required helpers from `../helpers.js`
3. **Test thoroughly** - verify all actions still work after migration
4. **Remove old file** - delete `../actions.js` once migration is complete and tested
5. **Update this README** - mark migration as complete

### Migration Pattern Example:

```javascript
// Before (in ../actions.js):
actions['inputs_mute_control_multi'] = {
  name: 'Input: Mute/Unmute (multi)',
  options: [ /* ... */ ],
  callback: async (action) => { /* ... */ }
}

// After (in inputs.js):
function registerInputActions(actions, self, NUM_INPUTS, NUM_OUTPUTS) {
  actions['inputs_mute_control_multi'] = {
    name: 'Input: Mute/Unmute (multi)',
    options: [ /* ... */ ],
    callback: async (action) => { /* ... */ }
  }
}
```

## Benefits of This Structure

1. **Maintainability** - Easier to find and modify related actions
2. **Code Organization** - Logical grouping reduces cognitive load
3. **Collaboration** - Multiple developers can work on different categories
4. **File Size** - Smaller files are easier to navigate
5. **Testing** - Can test categories independently

## Dependencies

All category files can import shared utilities from `../helpers.js`:
- `rangeChoices()` - Generate numeric choice arrays
- `buildInputChoices()` - Build input choices with live names
- `buildOutputChoices()` - Build output choices with live names
- `buildSnapshotChoices()` - Build snapshot choices with metadata
- `SNAPSHOT_MAX` - Maximum snapshot ID constant
- `DISPLAY_BRIGHTNESS_CHOICES` - Display brightness options
- `DISPLAY_COLOR_CHOICES` - Display color options
- `nn()` - Null/undefined fallback helper

## Notes

- The original 8774-line `actions.js` file remains in place until migration is complete
- Each category file exports a `register*Actions` function that populates the actions object
- The `index.js` file calls all register functions in sequence
- Node.js automatically resolves `require('./actions')` to `./actions/index.js` when the directory exists
