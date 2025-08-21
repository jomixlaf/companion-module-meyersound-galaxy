function rangeChoices(n, prefix = '') {
  const a = []
  for (let i = 1; i <= n; i++) a.push({ id: String(i), label: `${prefix}${i}` })
  return a
}

module.exports = function UpdateFeedbacks(self, NUM_INPUTS, NUM_OUTPUTS) {
  const feedbacks = {}
  const inputChoices  = rangeChoices(NUM_INPUTS,  'Input ')
  const outputChoices = rangeChoices(NUM_OUTPUTS, 'Output ')

  // Input muted
  feedbacks['input_muted'] = {
    type: 'boolean',
    name: 'Input: Muted',
    description: 'True when selected input is muted',
    defaultStyle: { color: 0xffffff, bgcolor: 0xff0000 },
    options: [{ type: 'dropdown', id: 'ch', label: 'Input channel', default: '1', choices: inputChoices }],
    callback: (fb) => !!self.inMute[Number(fb.options.ch)],
  }

  // Output muted
  feedbacks['output_muted'] = {
    type: 'boolean',
    name: 'Output: Muted',
    description: 'True when selected output is muted',
    defaultStyle: { color: 0xffffff, bgcolor: 0xff0000 },
    options: [{ type: 'dropdown', id: 'ch', label: 'Output channel', default: '1', choices: outputChoices }],
    callback: (fb) => !!self.outMute[Number(fb.options.ch)],
  }

  // Gain comparisons
  const makeGainFeedback = (which) => ({
    type: 'boolean',
    name: `${which}: Gain condition`,
    description: 'Compare channel gain (dB) against target (0.1 dB precision)',
    defaultStyle: { color: 0xffffff, bgcolor: which === 'Input' ? 0x0066ff : 0x009900 },
    options: [
      { type: 'dropdown', id: 'ch', label: `${which} channel`, default: '1', choices: which === 'Input' ? inputChoices : outputChoices },
      { type: 'dropdown', id: 'op', label: 'Condition', default: 'eq', choices: [
        { id: 'eq', label: '= equals' },
        { id: 'ge', label: '≥ greater or equal' },
        { id: 'le', label: '≤ less or equal' },
      ]},
      { type: 'number', id: 'value', label: 'Target gain (dB)', default: 0.0, min: -90, max: 10, step: 0.1 },
    ],
    callback: (fb) => {
      const ch = Number(fb.options.ch), op = fb.options.op, target = Number(fb.options.value)
      const cur = which === 'Input' ? self.inputGain[ch] : self.outputGain[ch]
      if (typeof cur !== 'number') return false
      const a = Math.round(cur * 10) / 10, b = Math.round(target * 10) / 10
      if (op === 'eq') return Math.abs(a - b) <= 0.05
      if (op === 'ge') return a >= b
      if (op === 'le') return a <= b
      return false
    },
  })
  feedbacks['input_gain_level']  = makeGainFeedback('Input')
  feedbacks['output_gain_level'] = makeGainFeedback('Output')

  // Matrix gain comparison
  feedbacks['matrix_gain_level'] = {
    type: 'boolean',
    name: 'Matrix: Gain condition',
    description: 'Compare matrix In→Out gain (dB)',
    defaultStyle: { color: 0xffffff, bgcolor: 0x663399 },
    options: [
      { type: 'dropdown', id: 'mi', label: 'Matrix input',  default: '1',  choices: rangeChoices(32, 'MIn ') },
      { type: 'dropdown', id: 'mo', label: 'Matrix output', default: '1',  choices: outputChoices },
      { type: 'dropdown', id: 'op', label: 'Condition', default: 'eq', choices: [
        { id: 'eq', label: '= equals' },
        { id: 'ge', label: '≥ greater or equal' },
        { id: 'le', label: '≤ less or equal' },
      ]},
      { type: 'number', id: 'value', label: 'Target gain (dB)', default: 0.0, min: -90, max: 10, step: 0.1 },
    ],
    callback: (fb) => {
      const mi = Number(fb.options.mi), mo = Number(fb.options.mo)
      const k = `${mi}_${mo}`
      const cur = self.matrixGain[k]
      if (typeof cur !== 'number') return false
      const a = Math.round(cur * 10) / 10
      const b = Math.round(Number(fb.options.value) * 10) / 10
      const op = fb.options.op
      if (op === 'eq') return Math.abs(a - b) <= 0.05
      if (op === 'ge') return a >= b
      if (op === 'le') return a <= b
      return false
    },
  }

  // NEW: Front panel lockout
  feedbacks['front_panel_lockout'] = {
    type: 'boolean',
    name: 'System: Front panel lockout',
    description: 'True when the device front panel is locked out',
    defaultStyle: { color: 0xffffff, bgcolor: 0xff0000 },
    options: [],
    callback: () => {
      const v = self.miscValues?.front_panel_lockout
      // Treat "true"/true/1/on as active
      if (typeof v === 'boolean') return v
      if (typeof v === 'string') return /^(true|1|on)$/i.test(v.trim())
      return false
    },
  }

  self.setFeedbackDefinitions(feedbacks)
}