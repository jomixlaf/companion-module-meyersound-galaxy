// actions/matrix.js
// Matrix routing actions

const { safeGetChannels, buildMatrixInputChoices, buildMatrixOutputChoices } = require('../actions-helpers')

/**
 * Register matrix-related actions
 * @param {Object} actions - Actions object to populate
 * @param {Object} self - Module instance
 * @param {number} NUM_INPUTS - Number of input channels
 * @param {number} NUM_OUTPUTS - Number of output channels
 */
function registerMatrixActions(actions, self, NUM_INPUTS, NUM_OUTPUTS) {
	const matrixInputChoices = buildMatrixInputChoices(self)
	const matrixOutputChoices = buildMatrixOutputChoices(self, NUM_OUTPUTS)

	// =========================
	// ===== Matrix Routing ====
	// =========================

	actions['matrix_gain_set'] = {
		name: 'Matrix: Set gain',
		options: [
			{
				type: 'multidropdown',
				id: 'matrix_inputs',
				label: 'Matrix input(s)',
				default: [],
				choices: matrixInputChoices,
				minSelection: 0,
			},
			{
				type: 'multidropdown',
				id: 'matrix_outputs',
				label: 'Matrix output(s)',
				default: [],
				choices: matrixOutputChoices,
				minSelection: 0,
			},
			{ type: 'number', id: 'gain', label: 'Gain (dB)', default: 0, min: -90, max: 20, step: 0.1 },
			{ type: 'number', id: 'fadeMs', label: 'Fade duration (ms)', default: 0, min: 0, max: 600000, step: 10 },
			{
				type: 'dropdown',
				id: 'curve',
				label: 'Curve (used if fading)',
				default: 'linear',
				choices: [
					{ id: 'linear', label: 'Linear (dB)' },
					{ id: 'log', label: 'Logarithmic' },
				],
			},
		],
		callback: (e) => {
			if (!self) return
			const dur = Math.max(0, Number(e.options.fadeMs) || 0)
			const curve = e.options.curve === 'log' ? 'log' : 'linear'
			const inputs = safeGetChannels(e.options, 'matrix_inputs', 32)
			const outs = safeGetChannels(e.options, 'matrix_outputs', NUM_OUTPUTS)
			if (inputs.length === 0 || outs.length === 0) {
				self.log?.('warn', 'No valid matrix channels selected')
				return
			}
			const gain = Number.isFinite(Number(e.options.gain)) ? Number(e.options.gain) : 0
			for (const i of inputs) {
				if (dur > 0 && typeof self._startMatrixGainFadeMulti === 'function') {
					self._startMatrixGainFadeMulti(i, outs, gain, dur, curve)
				} else if (typeof self._setMatrixGainMulti === 'function') {
					self._setMatrixGainMulti(i, outs, gain)
				}
			}
		},
	}

	actions['matrix_gain_nudge'] = {
		name: 'Matrix: Nudge gain',
		options: [
			{
				type: 'multidropdown',
				id: 'matrix_inputs',
				label: 'Matrix input(s)',
				default: [],
				choices: matrixInputChoices,
				minSelection: 0,
			},
			{
				type: 'multidropdown',
				id: 'matrix_outputs',
				label: 'Matrix output(s)',
				default: [],
				choices: matrixOutputChoices,
				minSelection: 0,
			},
			{ type: 'number', id: 'delta', label: 'Delta (dB)', default: 1, min: -30, max: 30, step: 0.1 },
		],
		callback: (e) => {
			if (!self) return
			const inputs = safeGetChannels(e.options, 'matrix_inputs', 32)
			const outs = safeGetChannels(e.options, 'matrix_outputs', NUM_OUTPUTS)
			if (inputs.length === 0 || outs.length === 0) {
				self.log?.('warn', 'No valid matrix channels selected')
				return
			}
			const d = Number(e.options.delta)
			for (const i of inputs) {
				if (typeof self._nudgeMatrixGainMulti === 'function') {
					self._nudgeMatrixGainMulti(i, outs, d)
				}
			}
		},
	}

	// =========================
	// ===== Matrix Delay ======
	// =========================

	actions['matrix_delay_set'] = {
		name: 'Matrix: Set delay',
		options: [
			{
				type: 'multidropdown',
				id: 'matrix_inputs',
				label: 'Matrix input(s)',
				default: [],
				choices: matrixInputChoices,
				minSelection: 0,
			},
			{
				type: 'multidropdown',
				id: 'matrix_outputs',
				label: 'Matrix output(s)',
				default: [],
				choices: matrixOutputChoices,
				minSelection: 0,
			},
			{ type: 'number', id: 'ms', label: 'Delay (ms)', default: 0, min: 0, max: 500, step: 0.01 },
			{ type: 'checkbox', id: 'relative', label: 'Add to current delay (relative)', default: false },
		],
		callback: (e) => {
			if (!self) return
			const inputs = safeGetChannels(e.options, 'matrix_inputs', 32)
			const outs = safeGetChannels(e.options, 'matrix_outputs', NUM_OUTPUTS)
			if (inputs.length === 0 || outs.length === 0) {
				self.log?.('warn', 'No valid matrix channels selected')
				return
			}
			const wantRelative = !!e.options.relative
			const reqMs = Number(e.options.ms)
			const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
			const roundTo01 = (v) => Math.round(v / 0.01) * 0.01

			for (const i of inputs) {
				for (const o of outs) {
					let targetMs = clamp(Number.isFinite(reqMs) ? reqMs : 0, 0, 500)
					if (wantRelative) {
						const key = `${i}-${o}`
						const curMs = Number(self?.matrixDelay?.[key]?.ms)
						if (Number.isFinite(curMs)) targetMs = curMs + targetMs
					}
					targetMs = roundTo01(targetMs)
					const samples = Math.round(targetMs * 96)
					self._cmdSendLine(`/processing/matrix/${i}/${o}/delay=${samples}`)
					self._applyMatrixDelay(i, o, samples)
				}
			}
		},
	}

	actions['matrix_delay_bypass'] = {
		name: 'Matrix: Delay bypass',
		options: [
			{
				type: 'multidropdown',
				id: 'matrix_inputs',
				label: 'Matrix input(s)',
				default: [],
				choices: matrixInputChoices,
				minSelection: 0,
			},
			{
				type: 'multidropdown',
				id: 'matrix_outputs',
				label: 'Matrix output(s)',
				default: [],
				choices: matrixOutputChoices,
				minSelection: 0,
			},
			{
				type: 'dropdown',
				id: 'operation',
				label: 'Operation',
				default: 'bypass',
				choices: [
					{ id: 'bypass', label: 'Bypass (ON)' },
					{ id: 'unbypass', label: 'Unbypass (OFF)' },
					{ id: 'toggle', label: 'Toggle' },
				],
			},
		],
		callback: (e) => {
			if (!self) return
			const inputs = safeGetChannels(e.options, 'matrix_inputs', 32)
			const outs = safeGetChannels(e.options, 'matrix_outputs', NUM_OUTPUTS)
			if (inputs.length === 0 || outs.length === 0) {
				self.log?.('warn', 'No valid matrix channels selected')
				return
			}
			const op = String(e.options.operation || 'bypass')

			for (const i of inputs) {
				for (const o of outs) {
					let newState
					if (op === 'toggle') {
						const key = `${i}-${o}`
						const current = !!self?.matrixDelay?.[key]?.bypass
						newState = !current
					} else {
						newState = op === 'bypass'
					}
					self._cmdSendLine(`/processing/matrix/${i}/${o}/delay_bypass='${newState}'`)
					self._applyMatrixDelayBypass(i, o, newState)
				}
			}
		},
	}

	// =========================
	// ==== MATRIX DELAY TYPE ==
	// =========================
	actions['matrix_delay_type_set'] = {
		name: 'Matrix: Set delay type (time unit)',
		options: [
			{
				type: 'multidropdown',
				id: 'matrix_inputs',
				label: 'Matrix input(s)',
				default: [],
				choices: matrixInputChoices,
				minSelection: 0,
			},
			{
				type: 'multidropdown',
				id: 'matrix_outputs',
				label: 'Matrix output(s)',
				default: [],
				choices: matrixOutputChoices,
				minSelection: 0,
			},
			{
				type: 'dropdown',
				id: 'type',
				label: 'Delay Type',
				default: '0',
				choices: [
					{ id: '0', label: 'milliseconds' },
					{ id: '1', label: 'feet' },
					{ id: '2', label: 'meters' },
					{ id: '3', label: 'frames (24fps)' },
					{ id: '4', label: 'frames (25fps)' },
					{ id: '5', label: 'frames (30fps)' },
					{ id: '6', label: 'samples (96kHz)' },
				],
			},
		],
		callback: (e) => {
			if (!self) return
			const inputs = safeGetChannels(e.options, 'matrix_inputs', 32)
			const outs = safeGetChannels(e.options, 'matrix_outputs', NUM_OUTPUTS)
			if (inputs.length === 0 || outs.length === 0) {
				self.log?.('warn', 'No valid matrix channels selected')
				return
			}
			const typeId = String(e.options.type)

			for (const i of inputs) {
				for (const o of outs) {
					self._cmdSendLine(`/processing/matrix/${i}/${o}/delay_type='${typeId}'`)
					if (self._applyMatrixDelayType) {
						self._applyMatrixDelayType(i, o, Number(typeId))
					}
				}
			}
		},
	}
}

module.exports = { registerMatrixActions }
