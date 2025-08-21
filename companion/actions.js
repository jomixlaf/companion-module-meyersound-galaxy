// actions.js

function rangeChoices(n, prefix = '') {
  const a = []
  for (let i = 1; i <= n; i++) a.push({ id: String(i), label: `${prefix}${i}` })
  return a
}

module.exports = function UpdateActions(self, NUM_INPUTS, NUM_OUTPUTS) {
  const actions = {}
  const inputChoices = rangeChoices(NUM_INPUTS, 'Input ')
  const outputChoices = rangeChoices(NUM_OUTPUTS, 'Output ')
  const matrixInputChoices = rangeChoices(32, 'Matrix In ') // 32 matrix inputs

  // ===== Input mute (single) =====
  actions['input_mute_control'] = {
    name: 'Input: Mute (single)',
    options: [
      {
        type: 'dropdown',
        id: 'operation',
        label: 'Operation',
        default: 'on',
        choices: [
          { id: 'on', label: 'Mute ON' },
          { id: 'off', label: 'Mute OFF' },
          { id: 'toggle', label: 'Toggle' },
        ],
      },
      { type: 'dropdown', id: 'ch', label: 'Input channel', default: '1', choices: inputChoices },
    ],
    callback: (e) => {
      const ch = Number(e.options.ch)
      const op = e.options.operation
      if (op === 'on') return self._setMute('input', ch, true)
      if (op === 'off') return self._setMute('input', ch, false)
      return self._toggleMute('input', ch)
    },
  }

  // ===== Output mute (single) =====
  actions['output_mute_control'] = {
    name: 'Output: Mute (single)',
    options: [
      {
        type: 'dropdown',
        id: 'operation',
        label: 'Operation',
        default: 'on',
        choices: [
          { id: 'on', label: 'Mute ON' },
          { id: 'off', label: 'Mute OFF' },
          { id: 'toggle', label: 'Toggle' },
        ],
      },
      { type: 'dropdown', id: 'ch', label: 'Output channel', default: '1', choices: outputChoices },
    ],
    callback: (e) => {
      const ch = Number(e.options.ch)
      const op = e.options.operation
      if (op === 'on') return self._setMute('output', ch, true)
      if (op === 'off') return self._setMute('output', ch, false)
      return self._toggleMute('output', ch)
    },
  }

  // ===== All mutes =====
  actions['inputs_mute_all'] = { name: 'Inputs: Mute ALL', options: [], callback: () => self._setAll('input', true) }
  actions['inputs_unmute_all'] = { name: 'Inputs: Unmute ALL', options: [], callback: () => self._setAll('input', false) }
  actions['outputs_mute_all'] = { name: 'Outputs: Mute ALL', options: [], callback: () => self._setAll('output', true) }
  actions['outputs_unmute_all'] = { name: 'Outputs: Unmute ALL', options: [], callback: () => self._setAll('output', false) }

  // ===== Input gain =====
  actions['input_gain_set'] = {
    name: 'Input: Gain set (dB)',
    options: [
      { type: 'dropdown', id: 'ch', label: 'Input ch', default: '1', choices: inputChoices },
      { type: 'number', id: 'gain', label: 'Gain (dB)', default: 0, min: -90, max: 10, step: 0.1 },
    ],
    callback: (e) => self._setInputGain(Number(e.options.ch), Number(e.options.gain)),
  }
  actions['input_gain_nudge'] = {
    name: 'Input: Gain nudge (±dB)',
    options: [
      { type: 'dropdown', id: 'ch', label: 'Input ch', default: '1', choices: inputChoices },
      { type: 'number', id: 'delta', label: 'Delta (dB)', default: 1, min: -30, max: 30, step: 0.1 },
    ],
    callback: (e) => self._nudgeInputGain(Number(e.options.ch), Number(e.options.delta)),
  }
  actions['input_gain_fade'] = {
    name: 'Input: Gain fade',
    options: [
      { type: 'dropdown', id: 'ch', label: 'Input ch', default: '1', choices: inputChoices },
      { type: 'number', id: 'target', label: 'Target (dB)', default: 0, min: -90, max: 10, step: 0.1 },
      { type: 'number', id: 'duration', label: 'Duration (ms)', default: 1000, min: 1, max: 600000, step: 10 },
      {
        type: 'dropdown',
        id: 'curve',
        label: 'Curve',
        default: 'linear',
        choices: [
          { id: 'linear', label: 'Linear (dB)' },
          { id: 'log', label: 'Logarithmic' },
        ],
      },
    ],
    callback: (e) =>
      self._startInputGainFade(
        Number(e.options.ch),
        Number(e.options.target),
        Number(e.options.duration),
        e.options.curve
      ),
  }

  // ===== Output gain =====
  actions['output_gain_set'] = {
    name: 'Output: Gain set (dB)',
    options: [
      { type: 'dropdown', id: 'ch', label: 'Output ch', default: '1', choices: outputChoices },
      { type: 'number', id: 'gain', label: 'Gain (dB)', default: 0, min: -90, max: 10, step: 0.1 },
    ],
    callback: (e) => self._setOutputGain(Number(e.options.ch), Number(e.options.gain)),
  }
  actions['output_gain_nudge'] = {
    name: 'Output: Gain nudge (±dB)',
    options: [
      { type: 'dropdown', id: 'ch', label: 'Output ch', default: '1', choices: outputChoices },
      { type: 'number', id: 'delta', label: 'Delta (dB)', default: 1, min: -30, max: 30, step: 0.1 },
    ],
    callback: (e) => self._nudgeOutputGain(Number(e.options.ch), Number(e.options.delta)),
  }
  actions['output_gain_fade'] = {
    name: 'Output: Gain fade',
    options: [
      { type: 'dropdown', id: 'ch', label: 'Output ch', default: '1', choices: outputChoices },
      { type: 'number', id: 'target', label: 'Target (dB)', default: 0, min: -90, max: 10, step: 0.1 },
      { type: 'number', id: 'duration', label: 'Duration (ms)', default: 1000, min: 1, max: 600000, step: 10 },
      {
        type: 'dropdown',
        id: 'curve',
        label: 'Curve',
        default: 'linear',
        choices: [
          { id: 'linear', label: 'Linear (dB)' },
          { id: 'log', label: 'Logarithmic' },
        ],
      },
    ],
    callback: (e) =>
      self._startOutputGainFade(
        Number(e.options.ch),
        Number(e.options.target),
        Number(e.options.duration),
        e.options.curve
      ),
  }

  // ===== Speaker test (output chase) =====
  actions['output_chase_start'] = {
    name: 'Speaker test: Start chase',
    options: [
      { type: 'dropdown', id: 'start', label: 'First output', default: '1', choices: outputChoices },
      { type: 'dropdown', id: 'end', label: 'Last output', default: String(Math.min(8, NUM_OUTPUTS)), choices: outputChoices },
      { type: 'number', id: 'delay', label: 'Delay per step (ms)', default: 1000, min: 50, max: 600000, step: 50 },
      {
        type: 'dropdown',
        id: 'window',
        label: 'Speakers at a time',
        default: '1',
        choices: [
          { id: '1', label: '1 (solo)' },
          { id: '2', label: '2 (solo→pair→advance)' },
        ],
      },
    ],
    callback: (e) =>
      self._startOutputChase(Number(e.options.start), Number(e.options.end), Number(e.options.delay), Number(e.options.window)),
  }
  actions['output_chase_stop'] = {
    name: 'Speaker test: Stop chase',
    options: [],
    callback: () => self._stopOutputChase(),
  }

  // ===== AVB connect =====
  actions['connect_avb_input'] = {
    name: 'AVB: :connect_avb_input',
    options: [
      { type: 'number', id: 'input', label: 'Galaxy input #', default: 1, min: 1, max: 999, step: 1 },
      { type: 'textinput', id: 'groupP', label: 'Primary group', default: 'HQ.Audio' },
      { type: 'textinput', id: 'entityP', label: 'Primary entity', default: 'GX 1 L' },
      { type: 'number', id: 'idxP', label: 'Primary index', default: 0, min: 0, max: 999, step: 1 },
      { type: 'number', id: 'chanP', label: 'Primary channel', default: 0, min: 0, max: 999, step: 1 },
      { type: 'textinput', id: 'groupS', label: 'Secondary group', default: 'HQ.Audio' },
      { type: 'textinput', id: 'entityS', label: 'Secondary entity', default: 'GX 1 L' },
      { type: 'number', id: 'idxS', label: 'Secondary index', default: 0, min: 0, max: 999, step: 1 },
      { type: 'number', id: 'chanS', label: 'Secondary channel', default: 0, min: 0, max: 999, step: 1 },
    ],
    callback: (e) =>
      self._sendConnectAvbInput({
        input: e.options.input,
        groupP: e.options.groupP,
        entityP: e.options.entityP,
        streamIndexP: e.options.idxP,
        streamChanP: e.options.chanP,
        groupS: e.options.groupS,
        entityS: e.options.entityS,
        streamIndexS: e.options.idxS,
        streamChanS: e.options.chanS,
      }),
  }

  // ===== Matrix gain (single pair) =====
  actions['matrix_gain_set'] = {
    name: 'Matrix: Set gain (single)',
    options: [
      { type: 'dropdown', id: 'mi', label: 'Matrix input', default: '1', choices: matrixInputChoices },
      { type: 'dropdown', id: 'mo', label: 'Output', default: '1', choices: outputChoices },
      { type: 'number', id: 'gain', label: 'Gain (dB)', default: 0, min: -90, max: 10, step: 0.1 },
    ],
    callback: (e) => self._setMatrixGain(Number(e.options.mi), Number(e.options.mo), Number(e.options.gain)),
  }

  actions['matrix_gain_nudge'] = {
    name: 'Matrix: Nudge gain (single)',
    options: [
      { type: 'dropdown', id: 'mi', label: 'Matrix input', default: '1', choices: matrixInputChoices },
      { type: 'dropdown', id: 'mo', label: 'Output', default: '1', choices: outputChoices },
      { type: 'number', id: 'delta', label: 'Delta (dB)', default: 1, min: -30, max: 30, step: 0.1 },
    ],
    callback: (e) => self._nudgeMatrixGain(Number(e.options.mi), Number(e.options.mo), Number(e.options.delta)),
  }

  actions['matrix_gain_fade'] = {
    name: 'Matrix: Fade gain (single)',
    options: [
      { type: 'dropdown', id: 'mi', label: 'Matrix input', default: '1', choices: matrixInputChoices },
      { type: 'dropdown', id: 'mo', label: 'Output', default: '1', choices: outputChoices },
      { type: 'number', id: 'target', label: 'Target (dB)', default: 0, min: -90, max: 10, step: 0.1 },
      { type: 'number', id: 'duration', label: 'Duration (ms)', default: 1000, min: 1, max: 600000, step: 10 },
      {
        type: 'dropdown',
        id: 'curve',
        label: 'Curve',
        default: 'linear',
        choices: [
          { id: 'linear', label: 'Linear (dB)' },
          { id: 'log', label: 'Logarithmic' },
        ],
      },
    ],
    callback: (e) =>
      self._startMatrixGainFade(
        Number(e.options.mi),
        Number(e.options.mo),
        Number(e.options.target),
        Number(e.options.duration),
        e.options.curve
      ),
  }

  // ===== Matrix gain (multi outputs) =====
  actions['matrix_gain_set_multi'] = {
    name: 'Matrix: Set gain (multi outputs)',
    options: [
      { type: 'dropdown', id: 'mi', label: 'Matrix input', default: '11', choices: matrixInputChoices },
      {
        type: 'multidropdown',
        id: 'outs',
        label: 'Outputs',
        default: ['1'],
        choices: outputChoices,
      },
      { type: 'number', id: 'gain', label: 'Gain for all (dB)', default: 0, min: -90, max: 10, step: 0.1 },
    ],
    callback: (e) => {
      const mi = Number(e.options.mi)
      const outs = Array.isArray(e.options.outs) ? e.options.outs : []
      const gain = Number(e.options.gain)
      if (!outs.length) return
      for (const o of outs) self._setMatrixGain(mi, Number(o), gain)
    },
  }

  actions['matrix_gain_nudge_multi'] = {
    name: 'Matrix: Nudge gain (multi outputs)',
    options: [
      { type: 'dropdown', id: 'mi', label: 'Matrix input', default: '11', choices: matrixInputChoices },
      {
        type: 'multidropdown',
        id: 'outs',
        label: 'Outputs',
        default: ['1'],
        choices: outputChoices,
      },
      { type: 'number', id: 'delta', label: 'Delta for all (dB)', default: 1, min: -30, max: 30, step: 0.1 },
    ],
    callback: (e) => {
      const mi = Number(e.options.mi)
      const outs = Array.isArray(e.options.outs) ? e.options.outs : []
      const delta = Number(e.options.delta)
      if (!outs.length) return
      for (const o of outs) self._nudgeMatrixGain(mi, Number(o), delta)
    },
  }

  // ===== Matrix gain fade (multi outputs) — NEW =====
  actions['matrix_gain_fade_multi'] = {
    name: 'Matrix: Fade gain (multi outputs)',
    options: [
      { type: 'dropdown', id: 'mi', label: 'Matrix input', default: '11', choices: matrixInputChoices },
      {
        type: 'multidropdown',
        id: 'outs',
        label: 'Outputs',
        default: ['1'],
        choices: outputChoices,
      },
      { type: 'number', id: 'target', label: 'Target for all (dB)', default: 0, min: -90, max: 10, step: 0.1 },
      { type: 'number', id: 'duration', label: 'Duration (ms)', default: 1000, min: 1, max: 600000, step: 10 },
      {
        type: 'dropdown',
        id: 'curve',
        label: 'Curve',
        default: 'linear',
        choices: [
          { id: 'linear', label: 'Linear (dB)' },
          { id: 'log', label: 'Logarithmic' },
        ],
      },
    ],
    callback: (e) => {
      const mi = Number(e.options.mi)
      const outs = Array.isArray(e.options.outs) ? e.options.outs : []
      const target = Number(e.options.target)
      const duration = Number(e.options.duration)
      const curve = e.options.curve
      if (!outs.length) return
      for (const o of outs) {
        self._startMatrixGainFade(mi, Number(o), target, duration, curve)
      }
    },
  }

  self.setActionDefinitions(actions)
}