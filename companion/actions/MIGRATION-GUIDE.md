# Actions Migration Guide

## Current Status

The actions have been structured into category files, but the actual migration from the monolithic `../actions.js` (8774 lines) to individual category files has NOT been completed.

## Why Migration Wasn't Automated

The migration is complex because:
1. The file is 8774 lines with intricate interdependencies
2. Many helper functions and constants are interwoven throughout
3. Some sections reference helper functions defined elsewhere in the same file
4. Product integration data is embedded (starting-points.json loading, speaker mappings)
5. Complex callback functions with self references that need careful handling

## Recommended Migration Approach

### Option 1: Gradual Manual Migration (Safest)

Migrate one action category at a time, testing thoroughly between each step:

1. **Start with Snapshots** (Lines 6188-6643, ~455 lines)
   - Extract `buildActiveSnapshotLabel()` and `quoteSnapshotArg()` helpers
   - Move `snapshot_combined` action to `snapshots.js`
   - Test snapshot functionality completely

2. **Then Matrix** (Lines 5365-5463, ~98 lines)
   - Extract `buildMatrixInputChoices()` and `buildMatrixOutputChoices()` helpers
   - Move all matrix actions
   - Test matrix routing

3. **System Actions** (scattered: 888-910, 5465-5566, 5707-6187, etc.)
   - Entity, AVB, SIM bus, access lock, speaker test, front panel
   - This is scattered, so requires careful extraction

4. **Finally Inputs & Outputs** (largest sections)
   - These are the most complex with U-Shaping, Parametric EQ, etc.

### Option 2: Create Extraction Script

Create a Node.js script that:
1. Parses the actions.js file by sections
2. Identifies action definitions by regex patterns
3. Extracts to appropriate files
4. Handles helper function dependencies

### Option 3: Keep Current Structure (Recommended)

**Given the complexity, consider keeping the monolithic file but:**
1. Add clear section markers (already present)
2. Use your IDE's code folding to navigate
3. Keep the category structure as documentation
4. Revisit migration only if file becomes unmaintainable

## Migration Pattern (If You Proceed)

### Step-by-Step for Each Action:

**1. Identify the action block:**
```javascript
// In ../actions.js, find:
actions['action_name'] = {
  name: '...',
  options: [...],
  callback: async (e) => { ... }
}
```

**2. Extract helper functions** it depends on:
- Look for any functions called within the action
- Check what's imported at the top of actions.js
- Move shared helpers to a `../actions-helpers.js` file

**3. Move to category file:**
```javascript
// In actions/snapshots.js:
function registerSnapshotActions(actions, self, NUM_INPUTS, NUM_OUTPUTS) {
  // Paste the action definition here
  actions['action_name'] = {
    name: '...',
    options: [...],
    callback: async (e) => { ... }
  }
}
```

**4. Test immediately:**
- Restart Companion
- Test the migrated action
- Verify no console errors

## Helper Functions That Need Extraction

These are used across multiple actions and should go in a shared file:

### From actions.js (lines 630-697):
- `buildMatrixInputChoices(self)`
- `buildMatrixOutputChoices(self, NUM_OUTPUTS)`
- `quoteSnapshotArg(text)`
- `buildActiveSnapshotLabel(self)`
- `speedOfSound_mps(tempC)`
- `safeGetChannels(options, key, max)`

### Constants to Share:
- `DISPLAY_NOCHANGE`
- `PRODUCT_INTEGRATION_RAW` and derived data
- `STARTING_POINTS_SOURCE`
- All speaker/sub design constants

## Testing Checklist

After each migration:
- [ ] Module loads without errors
- [ ] Action appears in Companion UI
- [ ] Dropdown choices populate correctly
- [ ] Action callback executes
- [ ] Commands sent to Galaxy device
- [ ] No console errors in Companion
- [ ] Variables update correctly
- [ ] Feedbacks work as expected

## Rollback Plan

If migration causes issues:
1. Keep `../actions.js` as backup
2. Comment out the category import in `index.js`
3. Uncomment direct require of `../actions.js` in `../main.js`
4. Fix issues then retry

## Estimated Time

Based on file size and complexity:
- **Full Manual Migration:** 8-12 hours
- **With Script Assistance:** 4-6 hours
- **Snapshot Category Only:** 2-3 hours
- **Keeping Current Structure:** 0 hours ✓

## Current Decision

❌ **Migration NOT completed** - File remains as `../actions.js` (8774 lines)

✅ **Structure created** - Category files exist as templates/stubs

✅ **Documentation complete** - You now have a clear path forward

**Recommendation:** Keep the monolithic structure unless you have specific maintainability issues. The file is large but well-organized with section markers.
