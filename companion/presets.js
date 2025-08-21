// presets.js
function UpdatePresets(self, NUM_INPUTS, NUM_OUTPUTS) {
  const presets = {}

  // ---------- Helpers ----------
  const baseStyle = {
    text: '',
    size: '14',
    color: 0xffffff,
    bgcolor: 0x000000, // default black
  }
  const activeStyle = {
    color: 0xffffff,
    bgcolor: 0xff0000, // red when muted (active)
  }

  const makeInputPreset = (ch) => ({
    type: 'button',
    category: 'Inputs',
    name: `Input ${ch} Mute (Toggle)`,
    style: { ...baseStyle, text: `IN ${ch}\nMUTE` },
    steps: [
      {
        down: [
          {
            actionId: 'input_mute_control',
            options: { operation: 'toggle', ch: String(ch) },
          },
        ],
        up: [],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'input_muted',
        options: { ch: String(ch) },
        style: activeStyle,
      },
    ],
  })

  const makeOutputPreset = (ch) => ({
    type: 'button',
    category: 'Outputs',
    name: `Output ${ch} Mute (Toggle)`,
    style: { ...baseStyle, text: `OUT ${ch}\nMUTE` },
    steps: [
      {
        down: [
          {
            actionId: 'output_mute_control',
            options: { operation: 'toggle', ch: String(ch) },
          },
        ],
        up: [],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'output_muted',
        options: { ch: String(ch) },
        style: activeStyle,
      },
    ],
  })

  // ---------- Build presets ----------
  // Inputs: 1..NUM_INPUTS (your module uses 8)
  for (let ch = 1; ch <= NUM_INPUTS; ch++) {
    presets[`in_mute_toggle_${ch}`] = makeInputPreset(ch)
  }

  // Outputs: 1..NUM_OUTPUTS (your module uses 16)
  for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
    presets[`out_mute_toggle_${ch}`] = makeOutputPreset(ch)
  }

  self.setPresetDefinitions(presets)
}

module.exports = UpdatePresets