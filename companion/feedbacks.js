// feedbacks.js
const { combineRgb } = require('@companion-module/base')
const {
	SNAPSHOT_MAX,
	rangeChoices,
	buildInputChoices,
	buildOutputChoices,
	buildSnapshotChoices,
	getActiveSnapshotId,
	getBootSnapshotId,
} = require('./helpers')

module.exports = function UpdateFeedbacks(self, NUM_INPUTS, NUM_OUTPUTS) {
	const feedbacks = {}

	// Numeric lists (kept for other feedbacks)
	const inputChoices = rangeChoices(NUM_INPUTS, 'Input ')
	const outputChoices = rangeChoices(NUM_OUTPUTS, 'Output ')

	// Friendly lists (live names)
	const inputChoicesFriendly = buildInputChoices(self, NUM_INPUTS)
	const outputChoicesFriendly = buildOutputChoices(self, NUM_OUTPUTS)
	const snapshotChoices = buildSnapshotChoices(self)
	const snapshotBootChoices = [...snapshotChoices, { id: '-1', label: 'No boot snapshot (-1 disables boot recall)' }]
	const displayBrightnessChoices = [
		{ id: '0', label: 'Level 0 (Dim)' },
		{ id: '1', label: 'Level 1 (Normal)' },
		{ id: '2', label: 'Level 2 (Bright)' },
	]
	const displayColorChoices = [
		{ id: '0', label: 'Green' },
		{ id: '1', label: 'Blue' },
		{ id: '2', label: 'Yellow' },
		{ id: '3', label: 'Cyan' },
		{ id: '4', label: 'Magenta' },
		{ id: '5', label: 'Red' },
	]

	// =========================
	// ==== FEEDBACK: Input muted
	// =========================
	feedbacks['input_muted'] = {
		type: 'boolean',
		name: 'Input: Muted',
		description: 'True when selected input is muted',
		defaultStyle: { color: 0xffffff, bgcolor: 0xff0000 },
		options: [{ type: 'dropdown', id: 'ch', label: 'Input channel', default: '1', choices: inputChoices }],
		callback: (fb) => !!self.inMute[Number(fb.options.ch)],
	}

	feedbacks['input_soloed'] = {
		type: 'boolean',
		name: 'Input: Soloed',
		description: 'True when selected input is in the active solo selection',
		defaultStyle: { color: 0x000000, bgcolor: 0xffff00 },
		options: [{ type: 'dropdown', id: 'ch', label: 'Input channel', default: '1', choices: inputChoices }],
		callback: (fb) => {
			const ch = Number(fb.options.ch)
			// Channel is soloed if it's in the solo state
			return self.inputSoloState?.soloChannels?.has(ch) || false
		},
	}

	feedbacks['input_link_group_bypassed'] = {
		type: 'boolean',
		name: 'Input: Link Group Bypassed',
		description: 'True when selected input link group is bypassed',
		defaultStyle: { color: 0xffffff, bgcolor: 0xff9800 },
		options: [
			{
				type: 'dropdown',
				id: 'group',
				label: 'Link Group',
				default: '1',
				choices: [
					{ id: '1', label: 'Link Group 1' },
					{ id: '2', label: 'Link Group 2' },
					{ id: '3', label: 'Link Group 3' },
					{ id: '4', label: 'Link Group 4' },
				],
			},
		],
		callback: (fb) => {
			const group = Number(fb.options.group)
			return !!self.inputLinkGroupBypass?.[group]
		},
	}

	feedbacks['output_link_group_bypassed'] = {
		type: 'boolean',
		name: 'Output: Link Group Bypassed',
		description: 'True when selected output link group is bypassed',
		defaultStyle: { color: 0xffffff, bgcolor: 0xff9800 },
		options: [
			{
				type: 'dropdown',
				id: 'group',
				label: 'Link Group',
				default: '1',
				choices: [
					{ id: '1', label: 'Link Group 1' },
					{ id: '2', label: 'Link Group 2' },
					{ id: '3', label: 'Link Group 3' },
					{ id: '4', label: 'Link Group 4' },
					{ id: '5', label: 'Link Group 5' },
					{ id: '6', label: 'Link Group 6' },
					{ id: '7', label: 'Link Group 7' },
					{ id: '8', label: 'Link Group 8' },
				],
			},
		],
		callback: (fb) => {
			const group = Number(fb.options.group)
			return !!self.outputLinkGroupBypass?.[group]
		},
	}

	feedbacks['input_link_group_assigned'] = {
		type: 'boolean',
		name: 'Input: Link Group Assigned',
		description: 'True when selected input is assigned to the specified link group',
		defaultStyle: { color: 0xffffff, bgcolor: 0x0080ff },
		options: [
			{
				type: 'dropdown',
				id: 'channel',
				label: 'Input Channel',
				default: '1',
				choices: inputChoicesFriendly,
			},
			{
				type: 'dropdown',
				id: 'link_group',
				label: 'Link Group',
				default: '1',
				choices: [
					{ id: '0', label: 'Unassigned' },
					{ id: '1', label: 'Link Group 1' },
					{ id: '2', label: 'Link Group 2' },
					{ id: '3', label: 'Link Group 3' },
					{ id: '4', label: 'Link Group 4' },
				],
			},
		],
		callback: (fb) => {
			const ch = Number(fb.options.channel)
			const targetGroup = Number(fb.options.link_group)
			const currentGroup = self.inputLinkGroupAssign?.[ch]
			return currentGroup === targetGroup
		},
	}

	feedbacks['output_link_group_assigned'] = {
		type: 'boolean',
		name: 'Output: Link Group Assigned',
		description: 'True when selected output is assigned to the specified link group',
		defaultStyle: { color: 0xffffff, bgcolor: 0x0080ff },
		options: [
			{
				type: 'dropdown',
				id: 'channel',
				label: 'Output Channel',
				default: '1',
				choices: outputChoicesFriendly,
			},
			{
				type: 'dropdown',
				id: 'link_group',
				label: 'Link Group',
				default: '1',
				choices: [
					{ id: '0', label: 'Unassigned' },
					{ id: '1', label: 'Link Group 1' },
					{ id: '2', label: 'Link Group 2' },
					{ id: '3', label: 'Link Group 3' },
					{ id: '4', label: 'Link Group 4' },
					{ id: '5', label: 'Link Group 5' },
					{ id: '6', label: 'Link Group 6' },
					{ id: '7', label: 'Link Group 7' },
					{ id: '8', label: 'Link Group 8' },
				],
			},
		],
		callback: (fb) => {
			const ch = Number(fb.options.channel)
			const targetGroup = Number(fb.options.link_group)
			const currentGroup = self.outputLinkGroupAssign?.[ch]
			return currentGroup === targetGroup
		},
	}

	// =========================
	// ==== FEEDBACK: Snapshot state
	// =========================
	feedbacks['snapshot_is_active'] = {
		type: 'boolean',
		name: 'Snapshot: Is active',
		description: 'True when the selected snapshot is currently active.',
		defaultStyle: { color: 0xffffff, bgcolor: combineRgb(34, 139, 34) },
		options: [
			{
				type: 'dropdown',
				id: 'snapshot_id',
				label: 'Snapshot',
				default: snapshotChoices[0]?.id ?? '0',
				choices: snapshotChoices,
			},
		],
		callback: (fb) => {
			const want = Number(fb.options.snapshot_id)
			if (!Number.isFinite(want)) return false
			const activeId = getActiveSnapshotId(self)
			return Number.isFinite(activeId) && activeId === want
		},
	}

	feedbacks['snapshot_is_boot'] = {
		type: 'boolean',
		name: 'Snapshot: Is boot snapshot',
		description: 'Active when the selected snapshot (or none) is set to load at boot.',
		defaultStyle: { color: 0xffffff, bgcolor: combineRgb(21, 101, 192) },
		options: [
			{
				type: 'dropdown',
				id: 'snapshot_id',
				label: 'Snapshot / None',
				default: snapshotBootChoices[0]?.id ?? '-1',
				choices: snapshotBootChoices,
			},
		],
		callback: (fb) => {
			const want = Number(fb.options.snapshot_id)
			if (!Number.isFinite(want)) return false
			const bootId = getBootSnapshotId(self)
			return Number.isFinite(bootId) && bootId === want
		},
	}

	feedbacks['snapshot_locked'] = {
		type: 'boolean',
		name: 'Snapshot: Locked',
		description: 'True when the selected snapshot is locked.',
		defaultStyle: { color: 0xffffff, bgcolor: combineRgb(183, 28, 28) },
		options: [
			{
				type: 'dropdown',
				id: 'snapshot_id',
				label: 'Snapshot',
				default: snapshotChoices[0]?.id ?? '0',
				choices: snapshotChoices,
			},
		],
		callback: (fb) => {
			const id = Number(fb.options.snapshot_id)
			if (!Number.isFinite(id) || id < 0 || id > SNAPSHOT_MAX) return false
			const raw = String(self?.snapshotValues?.[`snapshot_${id}_locked`] ?? '').trim()
			return /^(true|1|on)$/i.test(raw)
		},
	}

	// =========================
	// ==== FEEDBACK: Mute All ==
	// =========================
	feedbacks['mute_all'] = {
		type: 'boolean',
		name: 'System: All Inputs & Outputs Muted',
		description: 'Turns active if every input and output channel is muted',
		options: [],
		defaultStyle: { color: 0xffffff, bgcolor: 0xff0000 },
		callback: () => {
			// Check inputs
			for (let ch = 1; ch <= NUM_INPUTS; ch++) {
				const state = self?.inMute?.[ch]
				if (state !== true) return false
			}
			// Check outputs
			for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
				const state = self?.outMute?.[ch]
				if (state !== true) return false
			}
			return true
		},
	}

	// =========================
	// ==== FEEDBACK: Input mode (multi-select)
	// =========================
	feedbacks['input_mode'] = {
		type: 'boolean',
		name: 'System: Input mode',
		description: 'Active when selected input(s) are in the chosen mode',
		defaultStyle: { color: 0xffffff, bgcolor: 0x0066ff },
		options: [
			{
				type: 'multidropdown',
				id: 'chs',
				label: 'Input channel(s)',
				default: [],
				choices: inputChoicesFriendly,
				minSelection: 1,
			},
			{
				type: 'dropdown',
				id: 'mode',
				label: 'Mode',
				default: '1',
				choices: [
					{ id: '0', label: 'No Input' },
					{ id: '1', label: 'Analog' },
					{ id: '2', label: 'AES3L' },
					{ id: '3', label: 'AES3R' },
					{ id: '4', label: 'AVB' },
				],
			},
			{
				type: 'dropdown',
				id: 'logic',
				label: 'Condition',
				default: 'all',
				choices: [
					{ id: 'all', label: 'All selected match' },
					{ id: 'any', label: 'Any selected matches' },
				],
			},
		],
		callback: (fb) => {
			const want = String(fb.options.mode)
			const logic = fb.options.logic === 'any' ? 'any' : 'all'
			const chs = Array.isArray(fb.options.chs) ? fb.options.chs.map(Number) : [Number(fb.options.chs)]

			// sanitize to 1..NUM_INPUTS
			const valid = chs.filter((ch) => Number.isFinite(ch) && ch >= 1 && ch <= NUM_INPUTS)
			if (valid.length === 0) return false

			let matches = 0
			for (const ch of valid) {
				const cur = self?.inputMode?.[ch]
				if (cur != null && String(cur) === want) matches++
			}

			return logic === 'any' ? matches > 0 : matches === valid.length
		},
	}

	// =========================
	// ==== FEEDBACK: Output muted
	// =========================
	feedbacks['output_muted'] = {
		type: 'boolean',
		name: 'Output: Muted',
		description: 'True when selected output is muted',
		defaultStyle: { color: 0xffffff, bgcolor: 0xff0000 },
		options: [{ type: 'dropdown', id: 'ch', label: 'Output channel', default: '1', choices: outputChoices }],
		callback: (fb) => !!self.outMute[Number(fb.options.ch)],
	}

	feedbacks['output_soloed'] = {
		type: 'boolean',
		name: 'Output: Soloed',
		description: 'True when selected output is in the active solo selection',
		defaultStyle: { color: 0x000000, bgcolor: 0xffff00 },
		options: [{ type: 'dropdown', id: 'ch', label: 'Output channel', default: '1', choices: outputChoices }],
		callback: (fb) => {
			const ch = Number(fb.options.ch)
			// Channel is soloed if it's in the solo state
			return self.outputSoloState?.soloChannels?.has(ch) || false
		},
	}

	feedbacks['output_polarity_reversed'] = {
		type: 'boolean',
		name: 'Output: Polarity reversed',
		description: 'Active when selected output has polarity reversal engaged',
		defaultStyle: { color: 0x000000, bgcolor: 0xa0a0a0 },
		options: [{ type: 'dropdown', id: 'ch', label: 'Output channel', default: '1', choices: outputChoices }],
		callback: (fb) => !!self?.outputPolarity?.[Number(fb.options.ch)],
	}

	feedbacks['output_highpass_active'] = {
		type: 'boolean',
		name: 'Output: High-pass engaged',
		description: 'Active when the high-pass filter is engaged (not bypassed)',
		defaultStyle: { color: 0x000000, bgcolor: 0xa0a0a0 },
		options: [{ type: 'dropdown', id: 'ch', label: 'Output channel', default: '1', choices: outputChoices }],
		callback: (fb) => {
			const ch = Number(fb.options.ch)
			const hp = self?.outputHighpass?.[ch]
			if (!hp) return false
			return hp.bypass === false
		},
	}

	feedbacks['output_lowpass_active'] = {
		type: 'boolean',
		name: 'Output: Low-pass engaged',
		description: 'Active when the low-pass filter is engaged (not bypassed)',
		defaultStyle: { color: 0x000000, bgcolor: 0xe7d24b },
		options: [{ type: 'dropdown', id: 'ch', label: 'Output channel', default: '1', choices: outputChoices }],
		callback: (fb) => {
			const ch = Number(fb.options.ch)
			const lp = self?.outputLowpass?.[ch]
			if (!lp) return false
			return lp.bypass === false
		},
	}

	feedbacks['output_allpass_active'] = {
		type: 'boolean',
		name: 'Output: All-pass engaged',
		description: 'Active when the specified all-pass band is engaged (not bypassed)',
		defaultStyle: { color: 0x000000, bgcolor: 0xa0a0a0 },
		options: [
			{ type: 'dropdown', id: 'ch', label: 'Output channel', default: '1', choices: outputChoices },
			{
				type: 'dropdown',
				id: 'band',
				label: 'Band',
				default: '1',
				choices: [
					{ id: '1', label: 'Band 1' },
					{ id: '2', label: 'Band 2' },
					{ id: '3', label: 'Band 3' },
				],
			},
		],
		callback: (fb) => {
			const ch = Number(fb.options.ch)
			const band = Number(fb.options.band)
			const ap = self?.outputAllpass?.[ch]?.[band]
			if (!ap) return false
			return ap.band_bypass === false
		},
	}

	// =========================
	// ==== FEEDBACKS: Gain comparisons
	// =========================
	const makeGainFeedback = (which) => ({
		type: 'boolean',
		name: `${which}: Gain condition`,
		description: 'Compare channel gain (dB) against target (0.1 dB precision)',
		defaultStyle: { color: 0xffffff, bgcolor: which === 'Input' ? 0x0066ff : 0x009900 },
		options: [
			{
				type: 'dropdown',
				id: 'ch',
				label: `${which} channel`,
				default: '1',
				choices: which === 'Input' ? inputChoices : outputChoices,
			},
			{
				type: 'dropdown',
				id: 'op',
				label: 'Condition',
				default: 'eq',
				choices: [
					{ id: 'eq', label: '= equals' },
					{ id: 'ge', label: '≥ greater or equal' },
					{ id: 'le', label: '≤ less or equal' },
				],
			},
			{ type: 'number', id: 'value', label: 'Target gain (dB)', default: 0.0, min: -90, max: 20, step: 0.1 },
		],
		callback: (fb) => {
			const ch = Number(fb.options.ch),
				op = fb.options.op,
				target = Number(fb.options.value)
			const cur = which === 'Input' ? self.inputGain[ch] : self.outputGain[ch]
			if (typeof cur !== 'number') return false
			const a = Math.round(cur * 10) / 10,
				b = Math.round(target * 10) / 10
			if (op === 'eq') return Math.abs(a - b) <= 0.05
			if (op === 'ge') return a >= b
			if (op === 'le') return a <= b
			return false
		},
	})
	feedbacks['input_gain_level'] = makeGainFeedback('Input')
	feedbacks['output_gain_level'] = makeGainFeedback('Output')

	// =========================
	// ==== FEEDBACK: Matrix gain comparison
	// =========================
	feedbacks['matrix_gain_level'] = {
		type: 'boolean',
		name: 'Matrix: Gain condition',
		description: 'Compare matrix In→Out gain (dB)',
		defaultStyle: { color: 0xffffff, bgcolor: 0x663399 },
		options: [
			{ type: 'dropdown', id: 'matrix_input', label: 'Matrix input', default: '1', choices: rangeChoices(32, 'MIn ') },
			{ type: 'dropdown', id: 'matrix_output', label: 'Matrix output', default: '1', choices: outputChoices },
			{
				type: 'dropdown',
				id: 'op',
				label: 'Condition',
				default: 'eq',
				choices: [
					{ id: 'eq', label: '= equals' },
					{ id: 'ge', label: '≥ greater or equal' },
					{ id: 'le', label: '≤ less or equal' },
				],
			},
			{ type: 'number', id: 'value', label: 'Target gain (dB)', default: 0.0, min: -90, max: 20, step: 0.1 },
		],
		callback: (fb) => {
			const mi = Number(fb.options.matrix_input),
				mo = Number(fb.options.matrix_output)
			const k = `${mi}-${mo}`
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

	// =========================
	// ==== FEEDBACK: Matrix delay bypass
	// =========================
	feedbacks['matrix_delay_bypassed'] = {
		type: 'boolean',
		name: 'Matrix: Delay bypassed',
		description: 'Active when the matrix delay is bypassed',
		defaultStyle: { color: 0xffffff, bgcolor: 0xff9800 },
		options: [
			{ type: 'dropdown', id: 'matrix_input', label: 'Matrix input', default: '1', choices: rangeChoices(32, 'MIn ') },
			{ type: 'dropdown', id: 'matrix_output', label: 'Matrix output', default: '1', choices: outputChoices },
		],
		callback: (fb) => {
			const mi = Number(fb.options.matrix_input)
			const mo = Number(fb.options.matrix_output)
			const key = `${mi}-${mo}`
			const delayData = self?.matrixDelay?.[key]
			if (!delayData) return false
			return delayData.bypass === true
		},
	}

	// =========================
	// ==== FEEDBACK: Matrix gain color by level
	// =========================
	feedbacks['matrix_gain_color'] = {
		type: 'advanced',
		name: 'Matrix: Gain color by level',
		description: 'Change background color based on matrix gain value (dB)',
		options: [
			{ type: 'dropdown', id: 'matrix_input', label: 'Matrix input', default: '1', choices: rangeChoices(32, 'MIn ') },
			{ type: 'dropdown', id: 'matrix_output', label: 'Matrix output', default: '1', choices: outputChoices },
		],
		callback: (fb) => {
			const mi = Number(fb.options.matrix_input)
			const mo = Number(fb.options.matrix_output)
			const key = `${mi}-${mo}`
			const gain = self?.matrixGain?.[key]

			// If no gain value yet, use dark gray as default
			if (typeof gain !== 'number') {
				return { bgcolor: combineRgb(40, 40, 40), color: combineRgb(255, 255, 255) }
			}

			// Helper function for linear interpolation
			const lerp = (a, b, t) => Math.round(a + (b - a) * t)

			// Color stops: [dB threshold, R, G, B]
			// Each range fades from one color to the next
			const colorStops = [
				[20, 170, 170, 0], // +20 dB: Yellow (170,170,0)
				[15, 142, 142, 0], // +15 dB: (142,142,0)
				[10, 121, 121, 0], // +10 dB: Olive (121,121,0)
				[5, 106, 106, 0], // +5 dB: (106,106,0)
				[1, 97, 97, 0], // +1 dB: Dark olive (97,97,0)
				[0, 0, 127, 0], // 0 dB: Green (0,127,0)
				[-1, 113, 113, 113], // -1 dB: Light gray (113,113,113)
				[-5, 108, 108, 108], // -5 dB: (108,108,108)
				[-10, 102, 102, 102], // -10 dB: Medium gray (102,102,102)
				[-15, 96, 96, 96], // -15 dB: (96,96,96)
				[-20, 89, 89, 89], // -20 dB: Dark gray (89,89,89)
				[-30, 77, 77, 77], // -30 dB: (77,77,77)
				[-40, 64, 64, 64], // -40 dB: Darker gray (64,64,64)
				[-50, 51, 51, 51], // -50 dB: (51,51,51)
				[-60, 38, 38, 38], // -60 dB: Very dark gray (38,38,38)
				[-89, 0, 0, 0], // -89 dB: Black (0,0,0)
			]

			let bgcolor
			if (gain <= -89) {
				// -90 dB (effectively off/muted)
				bgcolor = combineRgb(0, 0, 0) // Black
			} else if (gain >= 20) {
				// Above 20 dB, use max color
				bgcolor = combineRgb(170, 170, 0) // Yellow
			} else {
				// Find the two color stops to interpolate between
				let lowerStop = null
				let upperStop = null

				for (let i = 0; i < colorStops.length - 1; i++) {
					if (gain <= colorStops[i][0] && gain >= colorStops[i + 1][0]) {
						upperStop = colorStops[i]
						lowerStop = colorStops[i + 1]
						break
					}
				}

				if (lowerStop && upperStop) {
					// Calculate interpolation factor (0 to 1)
					const range = upperStop[0] - lowerStop[0]
					const position = gain - lowerStop[0]
					const t = position / range

					// Interpolate RGB values
					const r = lerp(lowerStop[1], upperStop[1], t)
					const g = lerp(lowerStop[2], upperStop[2], t)
					const b = lerp(lowerStop[3], upperStop[3], t)

					bgcolor = combineRgb(r, g, b)
				} else {
					// Fallback (shouldn't happen)
					bgcolor = combineRgb(40, 40, 40)
				}
			}

			return { bgcolor, color: combineRgb(255, 255, 255) }
		},
	}

	// =========================
	// ==== FEEDBACKS: Meter thresholds (NEW)
	// =========================

	feedbacks['input_meter_level'] = {
		type: 'boolean',
		name: 'Input meter: threshold',
		description: 'Change style when an INPUT meter is above/below a threshold (dBFS).',
		defaultStyle: { bgcolor: 0x333333, color: 0xffffff },
		options: [
			{ type: 'dropdown', id: 'ch', label: 'Input channel', default: '1', choices: inputChoicesFriendly },
			{
				type: 'dropdown',
				id: 'cmp',
				label: 'Compare',
				default: '>=',
				choices: [
					{ id: '>=', label: '≥' },
					{ id: '>', label: '>' },
					{ id: '<=', label: '≤' },
					{ id: '<', label: '<' },
				],
			},
			{
				type: 'number',
				id: 'thresh',
				label: 'Threshold (dBFS)',
				default: -20.0,
				min: -120,
				max: 20,
				step: 0.1,
			},
			{ type: 'colorpicker', id: 'fg', label: 'Text color', default: 0xffffff },
			{ type: 'colorpicker', id: 'bg', label: 'Background', default: 0x008000 },
		],
		callback: (fb) => {
			const ch = Number(fb.options.ch)
			if (!Number.isFinite(ch) || ch < 1 || ch > NUM_INPUTS) return false
			const cmp = fb.options.cmp || '>='
			const t = Number(fb.options.thresh)
			const val = Number(self?.inputMeter?.[ch])
			if (!Number.isFinite(val) || !Number.isFinite(t)) return false

			switch (cmp) {
				case '>=':
					return val >= t
				case '>':
					return val > t
				case '<=':
					return val <= t
				case '<':
					return val < t
				default:
					return false
			}
		},
		style: (fb) => ({
			color: fb.options.fg ?? 0xffffff,
			bgcolor: fb.options.bg ?? 0x008000,
		}),
	}

	feedbacks['output_meter_level'] = {
		type: 'boolean',
		name: 'Output meter: threshold',
		description: 'Change style when an OUTPUT meter is above/below a threshold (dBFS).',
		defaultStyle: { bgcolor: 0x333333, color: 0xffffff },
		options: [
			{ type: 'dropdown', id: 'ch', label: 'Output channel', default: '1', choices: outputChoicesFriendly },
			{
				type: 'dropdown',
				id: 'cmp',
				label: 'Compare',
				default: '>=',
				choices: [
					{ id: '>=', label: '≥' },
					{ id: '>', label: '>' },
					{ id: '<=', label: '≤' },
					{ id: '<', label: '<' },
				],
			},
			{
				type: 'number',
				id: 'thresh',
				label: 'Threshold (dBFS)',
				default: -20.0,
				min: -120,
				max: 20,
				step: 0.1,
			},
			{ type: 'colorpicker', id: 'fg', label: 'Text color', default: 0xffffff },
			{ type: 'colorpicker', id: 'bg', label: 'Background', default: 0x008000 },
		],
		callback: (fb) => {
			const ch = Number(fb.options.ch)
			if (!Number.isFinite(ch) || ch < 1 || ch > NUM_OUTPUTS) return false
			const cmp = fb.options.cmp || '>='
			const t = Number(fb.options.thresh)
			const val = Number(self?.outputMeter?.[ch])
			if (!Number.isFinite(val) || !Number.isFinite(t)) return false

			switch (cmp) {
				case '>=':
					return val >= t
				case '>':
					return val > t
				case '<=':
					return val <= t
				case '<':
					return val < t
				default:
					return false
			}
		},
		style: (fb) => ({
			color: fb.options.fg ?? 0xffffff,
			bgcolor: fb.options.bg ?? 0x008000,
		}),
	}

	// =========================
	// ==== FEEDBACKS: Signal present (NEW)
	// =========================

	feedbacks['input_signal_present'] = {
		type: 'boolean',
		name: 'Input: signal present',
		description: 'True when input meter is above a simple threshold (default -50 dBFS).',
		defaultStyle: { bgcolor: 0x1a1a1a, color: 0xffffff },
		options: [
			{ type: 'dropdown', id: 'ch', label: 'Input channel', default: '1', choices: inputChoicesFriendly },
			{ type: 'number', id: 'thresh', label: 'Threshold (dBFS)', default: -50.0, min: -120, max: 20, step: 0.1 },
			{ type: 'colorpicker', id: 'fg', label: 'Text color', default: 0xffffff },
			{ type: 'colorpicker', id: 'bg', label: 'Background', default: 0x004c99 },
		],
		callback: (fb) => {
			const ch = Number(fb.options.ch)
			const t = Number(fb.options.thresh)
			const v = Number(self?.inputMeter?.[ch])
			if (!Number.isFinite(ch) || ch < 1 || ch > NUM_INPUTS) return false
			if (!Number.isFinite(t) || !Number.isFinite(v)) return false
			return v >= t
		},
		style: (fb) => ({
			color: fb.options.fg ?? 0xffffff,
			bgcolor: fb.options.bg ?? 0x004c99,
		}),
	}

	feedbacks['output_signal_present'] = {
		type: 'boolean',
		name: 'Output: signal present',
		description: 'True when output meter is above a simple threshold (default -50 dBFS).',
		defaultStyle: { bgcolor: 0x1a1a1a, color: 0xffffff },
		options: [
			{ type: 'dropdown', id: 'ch', label: 'Output channel', default: '1', choices: outputChoicesFriendly },
			{ type: 'number', id: 'thresh', label: 'Threshold (dBFS)', default: -50.0, min: -120, max: 20, step: 0.1 },
			{ type: 'colorpicker', id: 'fg', label: 'Text color', default: 0xffffff },
			{ type: 'colorpicker', id: 'bg', label: 'Background', default: 0x004c99 },
		],
		callback: (fb) => {
			const ch = Number(fb.options.ch)
			const t = Number(fb.options.thresh)
			const v = Number(self?.outputMeter?.[ch])
			if (!Number.isFinite(ch) || ch < 1 || ch > NUM_OUTPUTS) return false
			if (!Number.isFinite(t) || !Number.isFinite(v)) return false
			return v >= t
		},
		style: (fb) => ({
			color: fb.options.fg ?? 0xffffff,
			bgcolor: fb.options.bg ?? 0x004c99,
		}),
	}

	// =========================
	// ==== FEEDBACK: Speaker Test flash
	// =========================
	feedbacks['speaker_test_flash'] = {
		type: 'advanced',
		name: 'Speaker Test: Flash',
		description: 'Flashes between default color and black while the chase started by THIS button is active.',
		options: [],
		// Default button appearance when not flashing
		defaultStyle: {
			color: 0xffffff,
			bgcolor: 0xffa500, // orange accent for visibility, adjust if needed
		},
		callback: (fb) => {
			// Only flash when chase is running and this button is part of it
			if (!self._chase?.running) return {}
			const cid = fb?.controlId ? String(fb.controlId) : null
			if (cid && self._chase?.activeButtons instanceof Set) {
				if (!self._chase.activeButtons.has(cid)) return {}
			}

			// Flash to black during the "off" phase
			return self._flash?.phase ? {} : { bgcolor: combineRgb(0, 0, 0), color: combineRgb(255, 255, 255) }
		},
	}

	// =========================
	// ==== FEEDBACK: Front panel lockout
	// =========================
	feedbacks['front_panel_lockout'] = {
		type: 'boolean',
		name: 'System: Front panel lockout',
		description: 'True when the device front panel is locked out',
		defaultStyle: { color: 0xffffff, bgcolor: 0xff0000 },
		options: [],
		callback: () => {
			const v = self.miscValues?.front_panel_lockout
			if (typeof v === 'boolean') return v
			if (typeof v === 'string') return /^(true|1|on)$/i.test(v.trim())
			return false
		},
	}

	feedbacks['front_panel_brightness_state'] = {
		type: 'boolean',
		name: 'System: Display brightness',
		description: 'True when the Galaxy display brightness matches the selected level.',
		defaultStyle: { color: 0x000000, bgcolor: 0xfff176 },
		options: [
			{
				type: 'dropdown',
				id: 'level',
				label: 'Brightness level',
				default: '1',
				choices: displayBrightnessChoices,
			},
		],
		callback: (fb) => {
			const want = String(fb.options?.level ?? '')
			const current = String(self?.displayPrefs?.brightness ?? '')
			if (!want) return false
			return current === want
		},
	}

	feedbacks['front_panel_display_color'] = {
		type: 'boolean',
		name: 'System: Display color',
		description: 'True when the Galaxy display color matches the selected option.',
		defaultStyle: { color: 0x000000, bgcolor: 0x80deea },
		options: [
			{
				type: 'dropdown',
				id: 'color',
				label: 'Display color',
				default: '0',
				choices: displayColorChoices,
			},
		],
		callback: (fb) => {
			const want = String(fb.options?.color ?? '')
			const current = String(self?.displayPrefs?.display_color ?? '')
			if (!want) return false
			return current === want
		},
	}

	// ===========================
	// ===== SYSTEM: IDENTIFY ====
	// ===========================
	feedbacks['identify_active'] = {
		type: 'boolean',
		name: 'System: Identify active',
		description: 'True while /status/identify_active is true on the Galaxy.',
		options: [],
		// When ON and phase is "visible", we keep the button’s default look.
		// When phase is "hidden", we paint it black to blink.
		defaultStyle: { color: 0xffffff, bgcolor: 0x00a3ff }, // used if no button styling set
		callback: () => {
			const raw =
				(self && self.miscValues && self.miscValues.identify_active) ??
				(self && self.getVariableValue && self.getVariableValue('identify_active'))
			return /^(true|1|on)$/i.test(String(raw || '').trim())
		},
		style: () => {
			// Only consulted when callback() === true
			const phaseOn = !!(self && self._identifyFlash && self._identifyFlash.phase)
			// phaseOn => show default (no override), phaseOff => blackout to flash
			return phaseOn ? {} : { bgcolor: combineRgb(0, 0, 0), color: combineRgb(0, 0, 0) }
		},
	}

	// =========================
	// ==== FEEDBACKS: Access Privilege (Lock/Unlock)
	// =========================

	const ACCESS_PRIV_CHOICES = [
		{ id: '0', label: 'Lock ALL (everything locked)' },
		{ id: '1', label: 'Project' },
		{ id: '2', label: 'Recall Snapshots' },
		{ id: '4', label: 'Input Types' },
		{ id: '8', label: 'Environment' },
		{ id: '16', label: 'Network Settings' },
		{ id: '32', label: 'Channel Labels' },
		{ id: '64', label: 'Atmospheric Corrections' },
		{ id: '128', label: 'Polarity' },
		{ id: '256', label: 'Input Channel EQ Bypass' },
		{ id: '512', label: 'Output Channel EQ Bypass' },
		{ id: '1024', label: 'Input Gain' },
		{ id: '2048', label: 'Output Gain' },
		{ id: '4096', label: 'Input Parametric EQ' },
		{ id: '8192', label: 'Output Parametric EQ' },
		{ id: '16384', label: 'Input Mute' },
		{ id: '32768', label: 'Output Mute' },
		{ id: '65536', label: 'Input U-Shaping' },
		{ id: '131072', label: 'Output U-Shaping' },
		{ id: '262144', label: 'Output High/Low Pass' },
		{ id: '524288', label: 'Output All Pass' },
		{ id: '1048576', label: 'Input Delays' },
		{ id: '2097152', label: 'Output Delays' },
		{ id: '4194304', label: 'SIM3 Settings' },
		{ id: '8388608', label: 'Summing Matrix' },
		{ id: '16777216', label: 'Delay Matrix' },
		{ id: '33554432', label: 'Link Groups' },
		{ id: '67108864', label: 'Input/Output Voltage Range' },
		{ id: '134217728', label: 'Upload Firmware' },
		{ id: '536870912', label: 'Product Integration' },
		{ id: '1073741824', label: 'Low-Mid Beam Control' },
		{ id: '2147483648', label: 'System Clock' },
		{ id: '9223372036854775807', label: 'Everything (unlock all)' },
	]

	const getAccessNow = () => {
		const cur = self?.accessPrivilege
		if (typeof cur === 'bigint') return cur
		if (typeof cur === 'number') return BigInt(cur)
		const s = String(self?.getVariableValue?.('access_privilege') ?? '')
		try {
			return BigInt(s)
		} catch {
			return undefined
		}
	}

	feedbacks['access_priv_equals'] = {
		type: 'boolean',
		name: 'Access: Equals mask',
		description: 'True when the access privilege equals the chosen sum (supports 0 and Everything).',
		defaultStyle: { color: 0xffffff, bgcolor: 0x0066ff },
		options: [
			{
				type: 'multidropdown',
				id: 'privs',
				label: 'Privileges (exact match)',
				default: [],
				minSelection: 1,
				choices: ACCESS_PRIV_CHOICES,
			},
		],
		callback: (fb) => {
			const list = Array.isArray(fb.options.privs) ? fb.options.privs : []
			if (!list.length) return false

			let total = 0n
			if (list.includes('0')) {
				total = 0n
			} else {
				for (const v of list) {
					try {
						total += BigInt(v)
					} catch {}
				}
			}

			const now = getAccessNow()
			if (typeof now === 'undefined') return false
			return now === total
		},
	}

	feedbacks['access_priv_has'] = {
		type: 'boolean',
		name: 'Access: Contains privileges',
		description: 'True when all selected privileges are allowed by the current mask.',
		defaultStyle: { color: 0xffffff, bgcolor: 0x00aa66 },
		options: [
			{
				type: 'multidropdown',
				id: 'privs',
				label: 'Privileges (must ALL be present)',
				default: [],
				minSelection: 1,
				choices: ACCESS_PRIV_CHOICES,
			},
		],
		callback: (fb) => {
			const list = Array.isArray(fb.options.privs) ? fb.options.privs : []
			if (!list.length) return false
			const now = getAccessNow()
			if (typeof now === 'undefined') return false

			if (list.includes('0')) return now === 0n
			if (list.includes('9223372036854775807')) return now === 9223372036854775807n

			let mask = 0n
			for (const v of list) {
				try {
					mask |= BigInt(v)
				} catch {}
			}
			return (now & mask) === mask
		},
	}

	// ===================================
	// ==== FEEDBACK: U-Shaping Input Selected
	// ===================================
	feedbacks['ushaping_input_selected'] = {
		type: 'boolean',
		name: 'U-Shaping: Input Selected',
		description: 'Highlights when the specified input is selected for U-Shaping control.',
		defaultStyle: { color: 0x000000, bgcolor: 0x00ff00 },
		options: [
			{
				type: 'dropdown',
				id: 'ch',
				label: 'Input',
				default: '1',
				choices: inputChoicesFriendly,
			},
		],
		callback: (feedback) => {
			const ch = Number(feedback.options.ch)
			const selectedInputs = self?._ushapingKnobControl?.selectedInputs || []
			return selectedInputs.includes(ch)
		},
	}

	// ===================================
	// ==== FEEDBACK: U-Shaping Band Selected
	// ===================================
	feedbacks['ushaping_band_selected'] = {
		type: 'boolean',
		name: 'U-Shaping: Band Selected',
		description: 'Highlights when the specified band is selected for U-Shaping control.',
		defaultStyle: { color: 0x000000, bgcolor: 0x00ff00 },
		options: [
			{
				type: 'dropdown',
				id: 'band',
				label: 'Band',
				default: '1',
				choices: [
					{ id: '1', label: 'Input U-Shaping Band 1' },
					{ id: '2', label: 'Input U-Shaping Band 2' },
					{ id: '3', label: 'Input U-Shaping Band 3' },
					{ id: '4', label: 'Input U-Shaping Band 4' },
					{ id: '5', label: 'Input U-Shaping Band 5' },
				],
			},
		],
		callback: (feedback) => {
			const band = Number(feedback.options.band)
			const selectedBand = self?._ushapingKnobControl?.selectedBand || 1
			return selectedBand === band
		},
	}

	// ===================================
	// ==== FEEDBACK: Parametric EQ Input Selected
	// ===================================
	feedbacks['eq_input_selected'] = {
		type: 'boolean',
		name: 'Parametric EQ: Input Selected',
		description: 'Highlights when the specified input is selected for Parametric EQ control.',
		defaultStyle: { color: 0x000000, bgcolor: 0x00ff00 },
		options: [
			{
				type: 'dropdown',
				id: 'ch',
				label: 'Input',
				default: '1',
				choices: inputChoicesFriendly,
			},
		],
		callback: (feedback) => {
			const ch = Number(feedback.options.ch)
			const selectedInputs = self?._eqKnobControl?.selectedInputs || []
			return selectedInputs.includes(ch)
		},
	}

	// ===================================
	// ==== FEEDBACK: Parametric EQ Band Selected
	// ===================================
	feedbacks['eq_band_selected'] = {
		type: 'boolean',
		name: 'Parametric EQ: Band Selected',
		description: 'Highlights when the specified band is selected for Parametric EQ control.',
		defaultStyle: { color: 0x000000, bgcolor: 0x00ff00 },
		options: [
			{
				type: 'dropdown',
				id: 'band',
				label: 'Band',
				default: '1',
				choices: [
					{ id: '1', label: 'Input PEQ Band 1' },
					{ id: '2', label: 'Input PEQ Band 2' },
					{ id: '3', label: 'Input PEQ Band 3' },
					{ id: '4', label: 'Input PEQ Band 4' },
					{ id: '5', label: 'Input PEQ Band 5' },
				],
			},
		],
		callback: (feedback) => {
			const band = Number(feedback.options.band)
			const selectedBand = self?._eqKnobControl?.selectedBand || 1
			return selectedBand === band
		},
	}

	// ===================================
	// ==== FEEDBACK: Output U-Shaping Output Selected
	// ===================================
	feedbacks['ushaping_output_selected'] = {
		type: 'boolean',
		name: 'U-Shaping: Output Selected',
		description: 'Highlights when the specified output is selected for U-Shaping control.',
		defaultStyle: { color: 0x000000, bgcolor: 0x00ff00 },
		options: [
			{
				type: 'dropdown',
				id: 'ch',
				label: 'Output',
				default: '1',
				choices: outputChoicesFriendly,
			},
		],
		callback: (feedback) => {
			const ch = Number(feedback.options.ch)
			const selectedOutputs = self?._ushapingKnobControlOutput?.selectedOutputs || []
			return selectedOutputs.includes(ch)
		},
	}

	// ===================================
	// ==== FEEDBACK: Output U-Shaping Band Selected
	// ===================================
	feedbacks['ushaping_output_band_selected'] = {
		type: 'boolean',
		name: 'U-Shaping: Output Band Selected',
		description: 'Highlights when the specified band is selected for output U-Shaping control.',
		defaultStyle: { color: 0x000000, bgcolor: 0x00ff00 },
		options: [
			{
				type: 'dropdown',
				id: 'band',
				label: 'Band',
				default: '1',
				choices: [
					{ id: '1', label: 'Output U-Shaping Band 1' },
					{ id: '2', label: 'Output U-Shaping Band 2' },
					{ id: '3', label: 'Output U-Shaping Band 3' },
					{ id: '4', label: 'Output U-Shaping Band 4' },
					{ id: '5', label: 'Output U-Shaping Band 5' },
				],
			},
		],
		callback: (feedback) => {
			const band = Number(feedback.options.band)
			const selectedBand = self?._ushapingKnobControlOutput?.selectedBand || 1
			return selectedBand === band
		},
	}

	// ===================================
	// ==== FEEDBACK: Output Parametric EQ Output Selected
	// ===================================
	feedbacks['eq_output_selected'] = {
		type: 'boolean',
		name: 'Parametric EQ: Output Selected',
		description: 'Highlights when the specified output is selected for Parametric EQ control.',
		defaultStyle: { color: 0x000000, bgcolor: 0x00ff00 },
		options: [
			{
				type: 'dropdown',
				id: 'ch',
				label: 'Output',
				default: '1',
				choices: outputChoicesFriendly,
			},
		],
		callback: (feedback) => {
			const ch = Number(feedback.options.ch)
			const selectedOutputs = self?._eqKnobControlOutput?.selectedOutputs || []
			return selectedOutputs.includes(ch)
		},
	}

	// ===================================
	// ==== FEEDBACK: Output Parametric EQ Band Selected
	// ===================================
	feedbacks['eq_output_band_selected'] = {
		type: 'boolean',
		name: 'Parametric EQ: Output Band Selected',
		description: 'Highlights when the specified band is selected for output Parametric EQ control.',
		defaultStyle: { color: 0x000000, bgcolor: 0x00ff00 },
		options: [
			{
				type: 'dropdown',
				id: 'band',
				label: 'Band',
				default: '1',
				choices: [
					{ id: '1', label: 'Output PEQ Band 1' },
					{ id: '2', label: 'Output PEQ Band 2' },
					{ id: '3', label: 'Output PEQ Band 3' },
					{ id: '4', label: 'Output PEQ Band 4' },
					{ id: '5', label: 'Output PEQ Band 5' },
					{ id: '6', label: 'Output PEQ Band 6' },
					{ id: '7', label: 'Output PEQ Band 7' },
					{ id: '8', label: 'Output PEQ Band 8' },
					{ id: '9', label: 'Output PEQ Band 9' },
					{ id: '10', label: 'Output PEQ Band 10' },
				],
			},
		],
		callback: (feedback) => {
			const band = Number(feedback.options.band)
			const selectedBand = self?._eqKnobControlOutput?.selectedBand || 1
			return selectedBand === band
		},
	}

	// ===================================
	// ==== FEEDBACK: Input U-Shaping Band Bypass
	// ===================================
	feedbacks['input_ushaping_band_bypass'] = {
		type: 'boolean',
		name: 'Input U-Shaping: Band Bypass State',
		description: 'Indicates when the specified Input U-Shaping band bypass is ON.',
		defaultStyle: { color: 0x000000, bgcolor: 0xe7d24b },
		options: [
			{
				type: 'dropdown',
				id: 'ch',
				label: 'Input',
				default: '1',
				choices: inputChoicesFriendly,
			},
			{
				type: 'dropdown',
				id: 'band',
				label: 'Band',
				default: '1',
				choices: [
					{ id: '1', label: 'Input U-Shaping Band 1' },
					{ id: '2', label: 'Input U-Shaping Band 2' },
					{ id: '3', label: 'Input U-Shaping Band 3' },
					{ id: '4', label: 'Input U-Shaping Band 4' },
					{ id: '5', label: 'Input U-Shaping Band 5' },
				],
			},
		],
		callback: (feedback) => {
			const ch = Number(feedback.options.ch)
			const band = Number(feedback.options.band)
			if (ch < 1 || ch > NUM_INPUTS || band < 1 || band > 5) return false
			const bypass = self?.inputUShaping?.[ch]?.[band]?.band_bypass
			return bypass === true
		},
	}

	// ===================================
	// ==== FEEDBACK: Input Parametric EQ Band Bypass
	// ===================================
	feedbacks['input_eq_band_bypass'] = {
		type: 'boolean',
		name: 'Input Parametric EQ: Band Bypass State',
		description: 'Indicates when the specified Input Parametric EQ band bypass is ON.',
		defaultStyle: { color: 0x000000, bgcolor: 0xe7d24b },
		options: [
			{
				type: 'dropdown',
				id: 'ch',
				label: 'Input',
				default: '1',
				choices: inputChoicesFriendly,
			},
			{
				type: 'dropdown',
				id: 'band',
				label: 'Band',
				default: '1',
				choices: [
					{ id: '1', label: 'Input PEQ Band 1' },
					{ id: '2', label: 'Input PEQ Band 2' },
					{ id: '3', label: 'Input PEQ Band 3' },
					{ id: '4', label: 'Input PEQ Band 4' },
					{ id: '5', label: 'Input PEQ Band 5' },
				],
			},
		],
		callback: (feedback) => {
			const ch = Number(feedback.options.ch)
			const band = Number(feedback.options.band)
			if (ch < 1 || ch > NUM_INPUTS || band < 1 || band > 5) return false
			const bypass = self?.inputEQ?.[ch]?.[band]?.band_bypass
			return bypass === true
		},
	}

	// ===================================
	// ==== FEEDBACK: Output U-Shaping Band Bypass
	// ===================================
	feedbacks['output_ushaping_band_bypass'] = {
		type: 'boolean',
		name: 'Output U-Shaping: Band Bypass State',
		description: 'Indicates when the specified Output U-Shaping band bypass is ON.',
		defaultStyle: { color: 0x000000, bgcolor: 0xe7d24b },
		options: [
			{
				type: 'dropdown',
				id: 'ch',
				label: 'Output',
				default: '1',
				choices: outputChoicesFriendly,
			},
			{
				type: 'dropdown',
				id: 'band',
				label: 'Band',
				default: '1',
				choices: [
					{ id: '1', label: 'Output U-Shaping Band 1' },
					{ id: '2', label: 'Output U-Shaping Band 2' },
					{ id: '3', label: 'Output U-Shaping Band 3' },
					{ id: '4', label: 'Output U-Shaping Band 4' },
					{ id: '5', label: 'Output U-Shaping Band 5' },
				],
			},
		],
		callback: (feedback) => {
			const ch = Number(feedback.options.ch)
			const band = Number(feedback.options.band)
			if (ch < 1 || ch > NUM_OUTPUTS || band < 1 || band > 5) return false
			const bypass = self?.outputUShaping?.[ch]?.[band]?.band_bypass
			return bypass === true
		},
	}

	// ===================================
	// ==== FEEDBACK: Output Parametric EQ Band Bypass
	// ===================================
	feedbacks['output_eq_band_bypass'] = {
		type: 'boolean',
		name: 'Output Parametric EQ: Band Bypass State',
		description: 'Indicates when the specified Output Parametric EQ band bypass is ON.',
		defaultStyle: { color: 0xffffff, bgcolor: 0x4f4b23 },
		options: [
			{
				type: 'dropdown',
				id: 'ch',
				label: 'Output',
				default: '1',
				choices: outputChoicesFriendly,
			},
			{
				type: 'dropdown',
				id: 'band',
				label: 'Band',
				default: '1',
				choices: [
					{ id: '1', label: 'Output PEQ Band 1' },
					{ id: '2', label: 'Output PEQ Band 2' },
					{ id: '3', label: 'Output PEQ Band 3' },
					{ id: '4', label: 'Output PEQ Band 4' },
					{ id: '5', label: 'Output PEQ Band 5' },
					{ id: '6', label: 'Output PEQ Band 6' },
					{ id: '7', label: 'Output PEQ Band 7' },
					{ id: '8', label: 'Output PEQ Band 8' },
					{ id: '9', label: 'Output PEQ Band 9' },
					{ id: '10', label: 'Output PEQ Band 10' },
				],
			},
		],
		callback: (feedback) => {
			const ch = Number(feedback.options.ch)
			const band = Number(feedback.options.band)
			if (ch < 1 || ch > NUM_OUTPUTS || band < 1 || band > 10) return false
			const bypass = self?.outputEQ?.[ch]?.[band]?.band_bypass
			return bypass === true
		},
	}

	// LMBC Status feedback - Enabled
	feedbacks['lmbc_enabled'] = {
		type: 'boolean',
		name: 'LMBC: Beam Control Enabled',
		description: 'True when LMBC beam control is active (not bypassed)',
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(128, 128, 64),
		},
		options: [
			{
				type: 'dropdown',
				id: 'array_index',
				label: 'Beam Control Array',
				default: 1,
				choices: [
					{ id: 1, label: 'Beam Control Array 1' },
					{ id: 2, label: 'Beam Control Array 2' },
					{ id: 3, label: 'Beam Control Array 3' },
					{ id: 4, label: 'Beam Control Array 4' },
				],
			},
		],
		callback: (feedback) => {
			const arrayIndex = Number(feedback.options.array_index) || 1
			const status = self?.beamControlStatus?.[arrayIndex]
			if (!status || status.errorCode === undefined) {
				return false
			}
			// Error code 0 = ACTIVE (Enabled)
			return status.errorCode === 0
		},
	}

	// LMBC Status feedback - Bypassed
	feedbacks['lmbc_bypassed'] = {
		type: 'boolean',
		name: 'LMBC: Beam Control Bypassed',
		description: 'True when LMBC beam control is bypassed',
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 0),
		},
		options: [
			{
				type: 'dropdown',
				id: 'array_index',
				label: 'Beam Control Array',
				default: 1,
				choices: [
					{ id: 1, label: 'Beam Control Array 1' },
					{ id: 2, label: 'Beam Control Array 2' },
					{ id: 3, label: 'Beam Control Array 3' },
					{ id: 4, label: 'Beam Control Array 4' },
				],
			},
		],
		callback: (feedback) => {
			const arrayIndex = Number(feedback.options.array_index) || 1
			const status = self?.beamControlStatus?.[arrayIndex]
			if (!status || status.errorCode === undefined) {
				return false
			}
			// Error code 1 = BYPASS
			return status.errorCode === 1
		},
	}

	self.setFeedbackDefinitions(feedbacks)
}
