// presets.js

function inputPreset(self, ch) {
  const inst = self.label || 'Galaxy'

  return {
    type: 'button',
    category: 'Presets: Inputs',
    name: `Mute Input ${ch}`,
    style: {
      text: `In ${ch}\n$(${inst}:input_${ch}_name)\n$(${inst}:input_${ch}_gain_db) dB`,
      size: '14',
      color: 0xffffff,
      bgcolor: 0x000000, // black default
      alignment: 'center:middle',
    },
    steps: [
      {
        down: [
          {
            actionId: 'inputs_mute_control_multi',
            options: { operation: 'toggle', chs: [String(ch)] },
          },
        ],
        up: [],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'input_muted',
        options: { ch: String(ch) },
        style: { color: 0xffffff, bgcolor: 0xff0000 }, // red when muted
      },
    ],
  }
}

function outputPreset(self, ch) {
  const inst = self.label || 'Galaxy'

  return {
    type: 'button',
    category: 'Presets: Outputs',
    name: `Mute Output ${ch}`,
    style: {
      text: `Out ${ch}\n$(${inst}:output_${ch}_name)\n$(${inst}:output_${ch}_gain_db) dB`,
      size: '14',
      color: 0xffffff,
      bgcolor: 0x000000,
      alignment: 'center:middle',
    },
    steps: [
      {
        down: [
          {
            actionId: 'outputs_mute_control_multi',
            options: { operation: 'toggle', chs: [String(ch)] },
          },
        ],
        up: [],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'output_muted',
        options: { ch: String(ch) },
        style: { color: 0xffffff, bgcolor: 0xff0000 },
      },
    ],
  }
}

function frontPanelPreset(self) {
  return {
    type: 'button',
    category: 'Presets: System',
    name: 'Front Panel Lockout',
    style: {
      text: 'Front Panel\nLockout',
      size: '14',
      color: 0xffffff,
      bgcolor: 0x000000, // black default
      alignment: 'center:middle',
    },
    steps: [
      {
        down: [
          {
            actionId: 'front_panel_lockout_control',
            options: { op: 'toggle' },
          },
        ],
        up: [],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'front_panel_lockout',
        options: {},
        style: { color: 0xffffff, bgcolor: 0xff0000 }, // red when locked
      },
    ],
  }
}

module.exports = function UpdatePresets(self, NUM_INPUTS, NUM_OUTPUTS) {
  const presets = []

  // Inputs 1–8
  const maxIn = Math.min(8, NUM_INPUTS)
  for (let ch = 1; ch <= maxIn; ch++) {
    presets.push(inputPreset(self, ch))
  }

  // Outputs 1–8 (or all available)
  const maxOut = Math.min(8, NUM_OUTPUTS)
  for (let ch = 1; ch <= maxOut; ch++) {
    presets.push(outputPreset(self, ch))
  }

  // System: Front panel lockout
  presets.push(frontPanelPreset(self))

  self.setPresetDefinitions(presets)
}
