// actions.js

function rangeChoices(n, prefix = '') {
  const a = []
  for (let i = 1; i <= n; i++) a.push({ id: String(i), label: `${prefix}${i}` })
  return a
}

// ---- Friendly label builders (use live names) ----
function buildInputChoices(self, NUM_INPUTS) {
  const choices = []
  for (let ch = 1; ch <= NUM_INPUTS; ch++) {
    const nm = self?.inputName?.[ch]
    const label = nm && String(nm).trim() !== '' ? `${ch} - ${nm}` : `${ch}`
    choices.push({ id: String(ch), label })
  }
  return choices
}

function buildOutputChoices(self, NUM_OUTPUTS) {
  const choices = []
  for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
    const nm = self?.outputName?.[ch]
    const label = nm && String(nm).trim() !== '' ? `${ch} - ${nm}` : `${ch}`
    choices.push({ id: String(ch), label })
  }
  return choices
}

function buildMatrixInputChoices(self) {
  const choices = []
  for (let i = 1; i <= 32; i++) {
    const nm = self?.inputName?.[i]
    const label = nm && String(nm).trim() !== '' ? `${i} - ${nm}` : `${i}`
    choices.push({ id: String(i), label })
  }
  return choices
}

function buildMatrixOutputChoices(self, NUM_OUTPUTS) {
  const choices = []
  for (let o = 1; o <= NUM_OUTPUTS; o++) {
    const nm = self?.outputName?.[o]
    const label = nm && String(nm).trim() !== '' ? `${o} - ${nm}` : `${o}`
    choices.push({ id: String(o), label })
  }
  return choices
}

module.exports = function UpdateActions(self, NUM_INPUTS, NUM_OUTPUTS) {
  const actions = {}

  // Basic number choices (kept for some legacy items)
  const inputChoicesNum  = rangeChoices(NUM_INPUTS,  'Input ')
  const outputChoicesNum = rangeChoices(NUM_OUTPUTS, 'Output ')

  // Friendly (live name) choices
  const inputChoicesFriendly  = buildInputChoices(self, NUM_INPUTS)
  const outputChoicesFriendly = buildOutputChoices(self, NUM_OUTPUTS)

  // =========================
  // ======= MUTES ===========
  // =========================

  // Inputs: multi mute (toggle default)
  actions['inputs_mute_control_multi'] = {
    name: 'Inputs: Mute',
    options: [
      {
        type: 'dropdown',
        id: 'operation',
        label: 'Operation',
        default: 'toggle',
        choices: [
          { id: 'on',     label: 'Mute ON' },
          { id: 'off',    label: 'Mute OFF' },
          { id: 'toggle', label: 'Toggle'   },
        ],
      },
      {
        type: 'multidropdown',
        id: 'chs',
        label: 'Select input(s)',
        default: [], // no default selection
        choices: inputChoicesFriendly,
        minSelection: 1,
      },
    ],
    callback: (e) => {
      const op = e.options.operation
      const chs = Array.isArray(e.options.chs) ? e.options.chs : [e.options.chs]
      for (const chId of chs) {
        const ch = Number(chId)
        if (op === 'on') self._setMute('input', ch, true)
        else if (op === 'off') self._setMute('input', ch, false)
        else self._toggleMute('input', ch)
      }
    },
  }

  // Outputs: multi mute (toggle default)
  actions['outputs_mute_control_multi'] = {
    name: 'Outputs: Mute',
    options: [
      {
        type: 'dropdown',
        id: 'operation',
        label: 'Operation',
        default: 'toggle',
        choices: [
          { id: 'on',     label: 'Mute ON' },
          { id: 'off',    label: 'Mute OFF' },
          { id: 'toggle', label: 'Toggle'   },
        ],
      },
      {
        type: 'multidropdown',
        id: 'chs',
        label: 'Select output(s)',
        default: [], // no default selection
        choices: outputChoicesFriendly,
        minSelection: 1,
      },
    ],
    callback: (e) => {
      const op = e.options.operation
      const chs = Array.isArray(e.options.chs) ? e.options.chs : [e.options.chs]
      for (const chId of chs) {
        const ch = Number(chId)
        if (op === 'on') self._setMute('output', ch, true)
        else if (op === 'off') self._setMute('output', ch, false)
        else self._toggleMute('output', ch)
      }
    },
  }

  // =========================
  // ===== INPUT GAINS ======
  // =========================

  actions['input_gain_set'] = {
    name: 'Input: Set gain (dB)',
    options: [
      {
        type: 'multidropdown',
        id: 'chs',
        label: 'Input channel(s)',
        default: [], // no default selection
        choices: inputChoicesFriendly,
        minSelection: 1,
      },
      { type: 'number', id: 'gain', label: 'Gain (dB)', default: 0, min: -90, max: 10, step: 0.1 },
    ],
    callback: (e) => {
      const chs = Array.isArray(e.options.chs) ? e.options.chs.map(Number) : [Number(e.options.chs)]
      const g = Number(e.options.gain)
      for (const ch of chs) self._setInputGain(ch, g)
    },
  }

  actions['input_gain_nudge'] = {
    name: 'Input: Nudge gain (±dB)',
    options: [
      {
        type: 'multidropdown',
        id: 'chs',
        label: 'Input channel(s)',
        default: [], // no default selection
        choices: inputChoicesFriendly,
        minSelection: 1,
      },
      { type: 'number', id: 'delta', label: 'Delta (dB)', default: 1, min: -30, max: 30, step: 0.1 },
    ],
    callback: (e) => {
      const chs = Array.isArray(e.options.chs) ? e.options.chs.map(Number) : [Number(e.options.chs)]
      const d = Number(e.options.delta)
      for (const ch of chs) self._nudgeInputGain(ch, d)
    },
  }

  actions['input_gain_fade'] = {
    name: 'Input: Fade gain',
    options: [
      {
        type: 'multidropdown',
        id: 'chs',
        label: 'Input channel(s)',
        default: [], // no default selection
        choices: inputChoicesFriendly,
        minSelection: 1,
      },
      { type: 'number', id: 'target',   label: 'Target (dB)',  default: 0,    min: -90, max: 10, step: 0.1 },
      { type: 'number', id: 'duration', label: 'Duration (ms)', default: 1000, min: 1,   max: 600000, step: 10 },
      {
        type: 'dropdown',
        id: 'curve',
        label: 'Curve',
        default: 'linear',
        choices: [
          { id: 'linear', label: 'Linear (dB)' },
          { id: 'log',    label: 'Logarithmic' },
        ],
      },
    ],
    callback: (e) => {
      const chs = Array.isArray(e.options.chs) ? e.options.chs.map(Number) : [Number(e.options.chs)]
      const t = Number(e.options.target)
      const dur = Number(e.options.duration)
      const curve = e.options.curve
      for (const ch of chs) self._startInputGainFade(ch, t, dur, curve)
    },
  }

  // =========================
  // ==== OUTPUT GAINS =======
  // =========================

  actions['output_gain_set'] = {
    name: 'Output: Set gain (dB)',
    options: [
      {
        type: 'multidropdown',
        id: 'chs',
        label: 'Output channel(s)',
        default: [], // no default selection
        choices: outputChoicesFriendly,
        minSelection: 1,
      },
      { type: 'number', id: 'gain', label: 'Gain (dB)', default: 0, min: -90, max: 10, step: 0.1 },
    ],
    callback: (e) => {
      const chs = Array.isArray(e.options.chs) ? e.options.chs.map(Number) : [Number(e.options.chs)]
      const g = Number(e.options.gain)
      for (const ch of chs) self._setOutputGain(ch, g)
    },
  }

  actions['output_gain_nudge'] = {
    name: 'Output: Nudge gain (±dB)',
    options: [
      {
        type: 'multidropdown',
        id: 'chs',
        label: 'Output channel(s)',
        default: [], // no default selection
        choices: outputChoicesFriendly,
        minSelection: 1,
      },
      { type: 'number', id: 'delta', label: 'Delta (dB)', default: 1, min: -30, max: 30, step: 0.1 },
    ],
    callback: (e) => {
      const chs = Array.isArray(e.options.chs) ? e.options.chs.map(Number) : [Number(e.options.chs)]
      const d = Number(e.options.delta)
      for (const ch of chs) self._nudgeOutputGain(ch, d)
    },
  }

  actions['output_gain_fade'] = {
    name: 'Output: Fade gain',
    options: [
      {
        type: 'multidropdown',
        id: 'chs',
        label: 'Output channel(s)',
        default: [], // no default selection
        choices: outputChoicesFriendly,
        minSelection: 1,
      },
      { type: 'number', id: 'target',   label: 'Target (dB)',  default: 0,    min: -90, max: 10, step: 0.1 },
      { type: 'number', id: 'duration', label: 'Duration (ms)', default: 1000, min: 1,   max: 600000, step: 10 },
      {
        type: 'dropdown',
        id: 'curve',
        label: 'Curve',
        default: 'linear',
        choices: [
          { id: 'linear', label: 'Linear (dB)' },
          { id: 'log',    label: 'Logarithmic' },
        ],
      },
    ],
    callback: (e) => {
      const chs = Array.isArray(e.options.chs) ? e.options.chs.map(Number) : [Number(e.options.chs)]
      const t = Number(e.options.target)
      const dur = Number(e.options.duration)
      const curve = e.options.curve
      for (const ch of chs) self._startOutputGainFade(ch, t, dur, curve)
    },
  }

  // =========================
  // ===== MATRIX (multi) ====
  // =========================

  const matrixInputChoices  = buildMatrixInputChoices(self)
  const matrixOutputChoices = buildMatrixOutputChoices(self, NUM_OUTPUTS)

  actions['matrix_gain_set_multi'] = {
    name: 'Matrix: Set gain',
    options: [
      {
        type: 'multidropdown',
        id: 'mi',
        label: 'Matrix input(s)',
        default: [], // no default selection
        choices: matrixInputChoices,
        minSelection: 1,
      },
      {
        type: 'multidropdown',
        id: 'mo',
        label: 'Matrix output(s)',
        default: [], // no default selection
        choices: matrixOutputChoices,
        minSelection: 1,
      },
      { type: 'number', id: 'gain', label: 'Gain (dB)', default: 0, min: -90, max: 10, step: 0.1 },
    ],
    callback: (e) => {
      const inputs = Array.isArray(e.options.mi) ? e.options.mi.map(Number) : [Number(e.options.mi)]
      const outs   = Array.isArray(e.options.mo) ? e.options.mo.map(Number) : [Number(e.options.mo)]
      const g = Number(e.options.gain)
      for (const i of inputs) self._setMatrixGainMulti(i, outs, g)
    },
  }

  actions['matrix_gain_nudge_multi'] = {
    name: 'Matrix: Nudge gain',
    options: [
      {
        type: 'multidropdown',
        id: 'mi',
        label: 'Matrix input(s)',
        default: [], // no default selection
        choices: matrixInputChoices,
        minSelection: 1,
      },
      {
        type: 'multidropdown',
        id: 'mo',
        label: 'Matrix output(s)',
        default: [], // no default selection
        choices: matrixOutputChoices,
        minSelection: 1,
      },
      { type: 'number', id: 'delta', label: 'Delta (dB)', default: 1, min: -30, max: 30, step: 0.1 },
    ],
    callback: (e) => {
      const inputs = Array.isArray(e.options.mi) ? e.options.mi.map(Number) : [Number(e.options.mi)]
      const outs   = Array.isArray(e.options.mo) ? e.options.mo.map(Number) : [Number(e.options.mo)]
      const d = Number(e.options.delta)
      for (const i of inputs) self._nudgeMatrixGainMulti(i, outs, d)
    },
  }

  actions['matrix_gain_fade_multi'] = {
    name: 'Matrix: Fade gain',
    options: [
      {
        type: 'multidropdown',
        id: 'mi',
        label: 'Matrix input(s)',
        default: [], // no default selection
        choices: matrixInputChoices,
        minSelection: 1,
      },
      {
        type: 'multidropdown',
        id: 'mo',
        label: 'Matrix output(s)',
        default: [], // no default selection
        choices: matrixOutputChoices,
        minSelection: 1,
      },
      { type: 'number', id: 'target',   label: 'Target (dB)',  default: 0,    min: -90, max: 10, step: 0.1 },
      { type: 'number', id: 'duration', label: 'Duration (ms)', default: 1000, min: 1,   max: 600000, step: 10 },
      {
        type: 'dropdown',
        id: 'curve',
        label: 'Curve',
        default: 'linear',
        choices: [
          { id: 'linear', label: 'Linear (dB)' },
          { id: 'log',    label: 'Logarithmic' },
        ],
      },
    ],
    callback: (e) => {
      const inputs = Array.isArray(e.options.mi) ? e.options.mi.map(Number) : [Number(e.options.mi)]
      const outs   = Array.isArray(e.options.mo) ? e.options.mo.map(Number) : [Number(e.options.mo)]
      const t = Number(e.options.target)
      const dur = Number(e.options.duration)
      const curve = e.options.curve
      for (const i of inputs) self._startMatrixGainFadeMulti(i, outs, t, dur, curve)
    },
  }

  // =========================
  // ===== Speaker test ======
  // =========================
  actions['output_chase_start'] = {
    name: 'Speaker test: Start',
    options: [
      { type: 'dropdown', id: 'start', label: 'First output', default: '1', choices: outputChoicesNum },
      { type: 'dropdown', id: 'end',   label: 'Last output',  default: String(Math.min(8, NUM_OUTPUTS)), choices: outputChoicesNum },
      { type: 'number',   id: 'delay', label: 'Delay per step (ms)', default: 1000, min: 50, max: 600000, step: 50 },
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
    callback: (e) => self._startOutputChase(Number(e.options.start), Number(e.options.end), Number(e.options.delay), Number(e.options.window)),
  }
  actions['output_chase_stop'] = { name: 'Speaker test: Stop', options: [], callback: () => self._stopOutputChase() }

  // =========================
  // ===== AVB connect =======
  // =========================
  actions['connect_avb_input'] = {
    name: 'AVB: :connect_avb_input',
    options: [
      { type: 'number', id: 'input', label: 'Galaxy input #', default: 1, min: 1, max: 999, step: 1 },
      { type: 'textinput', id: 'groupP',  label: 'Primary group',   default: 'HQ.Audio' },
      { type: 'textinput', id: 'entityP', label: 'Primary entity',  default: 'GX 1 L' },
      { type: 'number',    id: 'idxP',    label: 'Primary index',   default: 0, min: 0, max: 999, step: 1 },
      { type: 'number',    id: 'chanP',   label: 'Primary channel', default: 0, min: 0, max: 999, step: 1 },
      { type: 'textinput', id: 'groupS',  label: 'Secondary group',   default: 'HQ.Audio' },
      { type: 'textinput', id: 'entityS', label: 'Secondary entity',  default: 'GX 1 L' },
      { type: 'number',    id: 'idxS',    label: 'Secondary index',   default: 0, min: 0, max: 999, step: 1 },
      { type: 'number',    id: 'chanS',   label: 'Secondary channel', default: 0, min: 0, max: 999, step: 1 },
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

  // =========================
  // ===== Snapshots =========
  // =========================
  actions['recall_snapshot'] = {
    name: 'Project: Recall snapshot',
    options: [
      { type: 'number', id: 'id',     label: 'Snapshot ID (0–255)', default: 0, min: 0, max: 255, step: 1 },
      { type: 'checkbox', id: 'use_excl', label: 'Use exclusions?', default: false },
      {
        type: 'multidropdown',
        id: 'excl',
        label: 'Exclude settings',
        default: [],
        choices: [
          { id: '2',   label: 'Input Channel Types' },
          { id: '4',   label: 'Input/Output Voltage Ranges' },
          { id: '8',   label: 'Input/Output Mute' },
          { id: '16',  label: 'Update active snapshot before recall' },
          { id: '32',  label: 'SIM3 Bus Address' },
          { id: '64',  label: 'SIM3 Probe Point' },
          { id: '128', label: 'Clock Sync Mode' },
          { id: '256', label: 'AVB Configuration' },
        ],
        isVisible: (o) => !!o.use_excl,
      },
    ],
    callback: (e) => {
      const id = Number(e.options.id)
      if (!e.options.use_excl) {
        // exclusion=1 means enabled but nothing excluded
        self._cmdSendLine(`:recall_snapshot ${id} 1`)
        return
      }
      const codes = (Array.isArray(e.options.excl) ? e.options.excl : [e.options.excl])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0)
      let mask = 1 // enable exclusion
      for (const n of codes) mask += n
      self._cmdSendLine(`:recall_snapshot ${id} ${mask}`)
    },
  }

  // ===============================
  // === System: Front Panel Lock ===
  // ===============================
  actions['front_panel_lockout_control'] = {
    name: 'System: Front panel lockout',
    options: [
      {
        type: 'dropdown',
        id: 'op',
        label: 'Operation',
        default: 'toggle',
        choices: [
          { id: 'on',     label: 'Lock (ON)' },
          { id: 'off',    label: 'Unlock (OFF)' },
          { id: 'toggle', label: 'Toggle' },
        ],
      },
    ],
    callback: (e) => {
      const op = e.options.op
      if (op === 'toggle') {
        const cur = self?.miscValues?.front_panel_lockout
        const curBool = typeof cur === 'boolean' ? cur : /^(true|1|on)$/i.test(String(cur || '').trim())
        self._cmdSendLine(`/system/hardware/front_panel_lockout=${curBool ? 'false' : 'true'}`)
        return
      }
      const state = op === 'on'
      self._cmdSendLine(`/system/hardware/front_panel_lockout=${state ? 'true' : 'false'}`)
    },
  }

  self.setActionDefinitions(actions)
}
