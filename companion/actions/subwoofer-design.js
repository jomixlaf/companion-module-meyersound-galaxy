// actions/subwoofer-design.js
// Subwoofer design assist: End-fire, Array, Array End-Fire, and Gradient configurations

const { buildOutputChoices, nn } = require('../helpers')
const { safeGetChannels, speedOfSound_mps } = require('../actions-helpers')
const { FACTORY_RESET_COMMANDS } = require('../actions-data')

/**
 * Helper function to display subwoofer spacing preview
 * @param {Object} self - Module instance
 * @returns {string} Preview text
 */
function subassistPreview(self) {
	const d = self?._subassist || null
	if (!d || typeof d.spacing_m !== 'number') return '-- Run once to update preview --'
	const ft = d.spacing_m * 3.28084
	return `${ft.toFixed(2)} ft  (${d.spacing_m.toFixed(3)} m)`
}

/**
 * Helper function to display end-fire speed of sound preview
 * @param {Object} self - Module instance
 * @returns {string} Preview text
 */
function endfirePreview(self) {
	const d = self?._subassist || null
	if (!d || typeof d.c !== 'number' || typeof d.T !== 'number') return '-- Run once to update preview --'
	const c_mps = d.c
	const c_fps = c_mps * 3.28084
	const T_C = d.T
	const T_F = (T_C * 9) / 5 + 32
	return `c ≈ ${c_mps.toFixed(1)} m/s (${c_fps.toFixed(1)} ft/s) at ${T_C.toFixed(1)} °C (${T_F.toFixed(1)} °F)`
}

/**
 * Helper function to display arc speed of sound preview
 * @param {Object} self - Module instance
 * @returns {string} Preview text
 */
function arcPreview(self) {
	const d = self?._arcassist
	if (!d || typeof d.c !== 'number') return '-- Run once to update preview --'
	const c_mps = d.c
	const c_fps = c_mps * 3.28084
	const T_C = d.T
	const T_F = (T_C * 9) / 5 + 32
	return `c ≈ ${c_mps.toFixed(1)} m/s (${c_fps.toFixed(1)} ft/s) at ${T_C.toFixed(1)} °C (${T_F.toFixed(1)} °F)`
}

/**
 * Register subwoofer design actions
 * @param {Object} actions - Actions object to populate
 * @param {Object} self - Module instance
 * @param {number} NUM_INPUTS - Number of input channels
 * @param {number} NUM_OUTPUTS - Number of output channels
 */
function registerSubwooferDesignActions(actions, self, NUM_INPUTS, NUM_OUTPUTS) {
	// Get data structures from self.constructor (attached in main.js)
	const PRODUCT_INTEGRATION_DATA = self.constructor.PRODUCT_INTEGRATION_DATA || {}
	const STARTING_POINTS_SOURCE = self.constructor.STARTING_POINTS_SOURCE || {}

	const subwooferSpeakerChoices = PRODUCT_INTEGRATION_DATA.subwooferSpeakerChoices || [{ id: '', label: '-- None --' }]
	const endfireStartingPointOptionDefs = PRODUCT_INTEGRATION_DATA.endfireStartingPointOptionDefs || []
	const arrayStartingPointOptionDefs = PRODUCT_INTEGRATION_DATA.arrayStartingPointOptionDefs || []
	const arrayendfireStartingPointOptionDefs = PRODUCT_INTEGRATION_DATA.arrayendfireStartingPointOptionDefs || []
	const gradientStartingPointOptionDefs_Front = PRODUCT_INTEGRATION_DATA.gradientStartingPointOptionDefs_Front || []
	const gradientStartingPointOptionDefs_Reversed = PRODUCT_INTEGRATION_DATA.gradientStartingPointOptionDefs_Reversed || []

	const productIntegrationSpeakers = PRODUCT_INTEGRATION_DATA.speakers || new Map()
	const productIntegrationStartingPoints = PRODUCT_INTEGRATION_DATA.startingPoints || new Map()
	const endfireSpeakerStartingPointOption = PRODUCT_INTEGRATION_DATA.endfireSpeakerStartingPointOption || new Map()
	const arraySpeakerStartingPointOption = PRODUCT_INTEGRATION_DATA.arraySpeakerStartingPointOption || new Map()
	const arrayendfireSpeakerStartingPointOption = PRODUCT_INTEGRATION_DATA.arrayendfireSpeakerStartingPointOption || new Map()
	const gradientSpeakerStartingPointOption_Front = PRODUCT_INTEGRATION_DATA.gradientSpeakerStartingPointOption_Front || new Map()
	const gradientSpeakerStartingPointOption_Reversed = PRODUCT_INTEGRATION_DATA.gradientSpeakerStartingPointOption_Reversed || new Map()

	const outputChoices = buildOutputChoices(self, NUM_OUTPUTS)
	const outputChoicesFriendly = outputChoices

	actions['subassist_combined'] = {
		name: 'Sub Design Assist',
		options: [
			{
				type: 'dropdown',
				id: 'mode',
				label: 'Mode',
				default: 'endfire',
				choices: [
					{ id: 'endfire', label: 'End-Fire' },
					{ id: 'array', label: 'Array' },
					{ id: 'array_endfire', label: 'Array End-Fire' },
					{ id: 'gradient', label: 'Gradient' },
				],
			},

			// ===== END-FIRE OPTIONS =====
			{
				type: 'dropdown',
				id: 'endfire_speaker',
				label: 'Loudspeaker (optional)',
				default: '',
				choices: subwooferSpeakerChoices,
				isVisible: (o) => o.mode === 'endfire',
			},
			...endfireStartingPointOptionDefs,
			{
				type: 'checkbox',
				id: 'reset_endfire',
				label: 'Reset channels to factory defaults before applying',
				default: false,
				isVisible: (o) => o.mode === 'endfire',
			},
			{
				type: 'static-text',
				id: 'preview',
				label: 'Recommended spacing',
				value: subassistPreview(self),
				isVisible: (o) => o.mode === 'endfire',
			},
			{
				type: 'static-text',
				id: 'speed_preview',
				label: 'Speed of sound',
				value: endfirePreview(self),
				isVisible: (o) => o.mode === 'endfire',
			},
			{
				type: 'number',
				id: 'freq',
				label: 'Target frequency (Hz)',
				default: 80,
				min: 10,
				max: 200,
				step: 1,
				isVisible: (o) => o.mode === 'endfire',
			},
			{
				type: 'number',
				id: 'temp_endfire',
				label: 'Air temperature',
				default: 20,
				min: -40,
				max: 140,
				step: 0.1,
				isVisible: (o) => o.mode === 'endfire',
			},
			{
				type: 'dropdown',
				id: 'tempUnit_endfire',
				label: 'Temperature unit',
				default: 'C',
				choices: [
					{ id: 'C', label: '°C' },
					{ id: 'F', label: '°F' },
				],
				isVisible: (o) => o.mode === 'endfire',
			},
			{
				type: 'dropdown',
				id: 'depth',
				label: 'Depth (number of taps)',
				default: '2',
				choices: [
					{ id: '2', label: '2 (T0..T1)' },
					{ id: '3', label: '3 (T0..T2)' },
					{ id: '4', label: '4 (T0..T3)' },
					{ id: '5', label: '5 (T0..T4)' },
					{ id: '6', label: '6 (T0..T5)' },
					{ id: '7', label: '7 (T0..T6)' },
					{ id: '8', label: '8 (T0..T7)' },
				],
				isVisible: (o) => o.mode === 'endfire',
			},
			{
				type: 'multidropdown',
				id: 't0',
				label: 'T0 outputs (0 ms)',
				default: [],
				choices: outputChoicesFriendly,
				minSelection: 0,
				isVisible: (o) => o.mode === 'endfire' && Number(o.depth) >= 1,
			},
			{
				type: 'multidropdown',
				id: 't1',
				label: 'T1 outputs (1x delay)',
				default: [],
				choices: outputChoicesFriendly,
				minSelection: 0,
				isVisible: (o) => o.mode === 'endfire' && Number(o.depth) >= 2,
			},
			{
				type: 'multidropdown',
				id: 't2',
				label: 'T2 outputs (2x delay)',
				default: [],
				choices: outputChoicesFriendly,
				minSelection: 0,
				isVisible: (o) => o.mode === 'endfire' && Number(o.depth) >= 3,
			},
			{
				type: 'multidropdown',
				id: 't3',
				label: 'T3 outputs (3x delay)',
				default: [],
				choices: outputChoicesFriendly,
				minSelection: 0,
				isVisible: (o) => o.mode === 'endfire' && Number(o.depth) >= 4,
			},
			{
				type: 'multidropdown',
				id: 't4',
				label: 'T4 outputs (4x delay)',
				default: [],
				choices: outputChoicesFriendly,
				minSelection: 0,
				isVisible: (o) => o.mode === 'endfire' && Number(o.depth) >= 5,
			},
			{
				type: 'multidropdown',
				id: 't5',
				label: 'T5 outputs (5x delay)',
				default: [],
				choices: outputChoicesFriendly,
				minSelection: 0,
				isVisible: (o) => o.mode === 'endfire' && Number(o.depth) >= 6,
			},
			{
				type: 'multidropdown',
				id: 't6',
				label: 'T6 outputs (6x delay)',
				default: [],
				choices: outputChoicesFriendly,
				minSelection: 0,
				isVisible: (o) => o.mode === 'endfire' && Number(o.depth) >= 7,
			},
			{
				type: 'multidropdown',
				id: 't7',
				label: 'T7 outputs (7x delay)',
				default: [],
				choices: outputChoicesFriendly,
				minSelection: 0,
				isVisible: (o) => o.mode === 'endfire' && Number(o.depth) >= 8,
			},
			{
				type: 'dropdown',
				id: 'endfire_link_group',
				label: 'Assign to Output Link Group',
				default: '0',
				choices: [
					{ id: '0', label: 'None (Unassigned)' },
					{ id: '1', label: 'Link Group 1' },
					{ id: '2', label: 'Link Group 2' },
					{ id: '3', label: 'Link Group 3' },
					{ id: '4', label: 'Link Group 4' },
					{ id: '5', label: 'Link Group 5' },
					{ id: '6', label: 'Link Group 6' },
					{ id: '7', label: 'Link Group 7' },
					{ id: '8', label: 'Link Group 8' },
				],
				isVisible: (o) => o.mode === 'endfire',
			},
			{
				type: 'checkbox',
				id: 'endfire_link_group_enable',
				label: 'Enable the selected Output Link Group',
				default: true,
				isVisible: (o) => o.mode === 'endfire' && o.endfire_link_group !== '0',
			},

			// ===== ARRAY OPTIONS =====
			{
				type: 'dropdown',
				id: 'array_speaker',
				label: 'Loudspeaker (optional)',
				default: '',
				choices: subwooferSpeakerChoices,
				isVisible: (o) => o.mode === 'array',
			},
			...arrayStartingPointOptionDefs,
			{
				type: 'checkbox',
				id: 'reset_array',
				label: 'Reset channels to factory defaults before applying',
				default: false,
				isVisible: (o) => o.mode === 'array',
			},
			{
				type: 'number',
				id: 'numSubs',
				label: 'Number of subs',
				default: 6,
				min: 1,
				max: NUM_OUTPUTS,
				isVisible: (o) => o.mode === 'array',
			},
			{
				type: 'dropdown',
				id: 'startCh',
				label: 'Starting output channel',
				default: '',
				choices: outputChoicesFriendly,
				isVisible: (o) => o.mode === 'array',
			},
			{
				type: 'dropdown',
				id: 'units',
				label: 'Units',
				default: 'm',
				choices: [
					{ id: 'm', label: 'Meters' },
					{ id: 'ft', label: 'Feet' },
				],
				isVisible: (o) => o.mode === 'array',
			},
			{
				type: 'number',
				id: 'spacing',
				label: 'Sub spacing',
				default: 1.0,
				step: 0.01,
				isVisible: (o) => o.mode === 'array',
			},
			{
				type: 'number',
				id: 'radius',
				label: 'Arc angle (degrees)',
				default: 60,
				min: 0,
				max: 120,
				step: 1,
				isVisible: (o) => o.mode === 'array',
			},
			{
				type: 'number',
				id: 'temp_array',
				label: 'Air temperature',
				default: 20.0,
				step: 0.1,
				min: -40,
				max: 140,
				isVisible: (o) => o.mode === 'array',
			},
			{
				type: 'dropdown',
				id: 'tempUnit_array',
				label: 'Temperature unit',
				default: 'C',
				choices: [
					{ id: 'C', label: '°C' },
					{ id: 'F', label: '°F' },
				],
				isVisible: (o) => o.mode === 'array',
			},
			{
				type: 'static-text',
				id: 'arc_preview',
				label: 'Speed of sound',
				value: arcPreview(self),
				isVisible: (o) => o.mode === 'array',
			},
			{
				type: 'dropdown',
				id: 'array_link_group',
				label: 'Assign to Output Link Group',
				default: '0',
				choices: [
					{ id: '0', label: 'None (Unassigned)' },
					{ id: '1', label: 'Link Group 1' },
					{ id: '2', label: 'Link Group 2' },
					{ id: '3', label: 'Link Group 3' },
					{ id: '4', label: 'Link Group 4' },
					{ id: '5', label: 'Link Group 5' },
					{ id: '6', label: 'Link Group 6' },
					{ id: '7', label: 'Link Group 7' },
					{ id: '8', label: 'Link Group 8' },
				],
				isVisible: (o) => o.mode === 'array',
			},
			{
				type: 'checkbox',
				id: 'array_link_group_enable',
				label: 'Enable the selected Output Link Group',
				default: true,
				isVisible: (o) => o.mode === 'array' && o.array_link_group !== '0',
			},

			// ===== ARRAY END-FIRE OPTIONS =====
			{
				type: 'dropdown',
				id: 'arrayendfire_speaker',
				label: 'Loudspeaker (optional)',
				default: '',
				choices: subwooferSpeakerChoices,
				isVisible: (o) => o.mode === 'array_endfire',
			},
			...arrayendfireStartingPointOptionDefs,
			{
				type: 'checkbox',
				id: 'reset_arrayendfire',
				label: 'Reset channels to factory defaults before applying',
				default: false,
				isVisible: (o) => o.mode === 'array_endfire',
			},
			{
				type: 'number',
				id: 'freq_arrayendfire',
				label: 'End-Fire frequency (Hz)',
				default: 80,
				min: 20,
				max: 200,
				step: 0.1,
				isVisible: (o) => o.mode === 'array_endfire',
			},
			{
				type: 'number',
				id: 'depth_arrayendfire',
				label: 'End-Fire depth (rows: 2-8)',
				default: 2,
				min: 2,
				max: 8,
				step: 1,
				isVisible: (o) => o.mode === 'array_endfire',
			},
			{
				type: 'number',
				id: 'numSubs_arrayendfire',
				label: 'Number of subs per row',
				default: 6,
				min: 1,
				max: NUM_OUTPUTS,
				isVisible: (o) => o.mode === 'array_endfire',
			},
			{
				type: 'number',
				id: 'startCh_front_arrayendfire',
				label: 'First output (front row)',
				default: 1,
				min: 1,
				max: NUM_OUTPUTS,
				isVisible: (o) => o.mode === 'array_endfire',
			},
			{
				type: 'number',
				id: 'startCh_second_arrayendfire',
				label: 'First output (second row)',
				default: 7,
				min: 1,
				max: NUM_OUTPUTS,
				isVisible: (o) => o.mode === 'array_endfire' && Number(o.depth_arrayendfire) >= 2,
			},
			{
				type: 'number',
				id: 'startCh_third_arrayendfire',
				label: 'First output (third row)',
				default: 13,
				min: 1,
				max: NUM_OUTPUTS,
				isVisible: (o) => o.mode === 'array_endfire' && Number(o.depth_arrayendfire) >= 3,
			},
			{
				type: 'number',
				id: 'startCh_fourth_arrayendfire',
				label: 'First output (fourth row)',
				default: 19,
				min: 1,
				max: NUM_OUTPUTS,
				isVisible: (o) => o.mode === 'array_endfire' && Number(o.depth_arrayendfire) >= 4,
			},
			{
				type: 'number',
				id: 'startCh_fifth_arrayendfire',
				label: 'First output (fifth row)',
				default: 25,
				min: 1,
				max: NUM_OUTPUTS,
				isVisible: (o) => o.mode === 'array_endfire' && Number(o.depth_arrayendfire) >= 5,
			},
			{
				type: 'number',
				id: 'startCh_sixth_arrayendfire',
				label: 'First output (sixth row)',
				default: 31,
				min: 1,
				max: NUM_OUTPUTS,
				isVisible: (o) => o.mode === 'array_endfire' && Number(o.depth_arrayendfire) >= 6,
			},
			{
				type: 'number',
				id: 'startCh_seventh_arrayendfire',
				label: 'First output (seventh row)',
				default: 37,
				min: 1,
				max: NUM_OUTPUTS,
				isVisible: (o) => o.mode === 'array_endfire' && Number(o.depth_arrayendfire) >= 7,
			},
			{
				type: 'number',
				id: 'startCh_eighth_arrayendfire',
				label: 'First output (eighth row)',
				default: 43,
				min: 1,
				max: NUM_OUTPUTS,
				isVisible: (o) => o.mode === 'array_endfire' && Number(o.depth_arrayendfire) >= 8,
			},
			{
				type: 'dropdown',
				id: 'units_arrayendfire',
				label: 'Units',
				default: 'm',
				choices: [
					{ id: 'm', label: 'Meters' },
					{ id: 'ft', label: 'Feet' },
				],
				isVisible: (o) => o.mode === 'array_endfire',
			},
			{
				type: 'number',
				id: 'spacing_arrayendfire',
				label: 'Sub spacing',
				default: 1.0,
				step: 0.01,
				isVisible: (o) => o.mode === 'array_endfire',
			},
			{
				type: 'number',
				id: 'radius_arrayendfire',
				label: 'Arc angle (degrees)',
				default: 60,
				min: 0,
				max: 120,
				step: 1,
				isVisible: (o) => o.mode === 'array_endfire',
			},
			{
				type: 'number',
				id: 'temp_arrayendfire',
				label: 'Air temperature',
				default: 20.0,
				step: 0.1,
				min: -40,
				max: 140,
				isVisible: (o) => o.mode === 'array_endfire',
			},
			{
				type: 'dropdown',
				id: 'tempUnit_arrayendfire',
				label: 'Temperature unit',
				default: 'C',
				choices: [
					{ id: 'C', label: '°C' },
					{ id: 'F', label: '°F' },
				],
				isVisible: (o) => o.mode === 'array_endfire',
			},
			{
				type: 'dropdown',
				id: 'arrayendfire_link_group',
				label: 'Assign to Output Link Group',
				default: '0',
				choices: [
					{ id: '0', label: 'None (Unassigned)' },
					{ id: '1', label: 'Link Group 1' },
					{ id: '2', label: 'Link Group 2' },
					{ id: '3', label: 'Link Group 3' },
					{ id: '4', label: 'Link Group 4' },
					{ id: '5', label: 'Link Group 5' },
					{ id: '6', label: 'Link Group 6' },
					{ id: '7', label: 'Link Group 7' },
					{ id: '8', label: 'Link Group 8' },
				],
				isVisible: (o) => o.mode === 'array_endfire',
			},
			{
				type: 'checkbox',
				id: 'arrayendfire_link_group_enable',
				label: 'Enable the selected Output Link Group',
				default: true,
				isVisible: (o) => o.mode === 'array_endfire' && o.arrayendfire_link_group !== '0',
			},

			// ===== GRADIENT OPTIONS =====
			{
				type: 'dropdown',
				id: 'gradient_speaker',
				label: 'Loudspeaker',
				default: '',
				choices: subwooferSpeakerChoices,
				isVisible: (o) => o.mode === 'gradient',
			},
			...gradientStartingPointOptionDefs_Front,
			{
				type: 'multidropdown',
				id: 'gradient_outputs_front',
				label: 'Output Front',
				default: [],
				choices: outputChoicesFriendly,
				minSelection: 0,
				isVisible: (o) => o.mode === 'gradient',
			},
			...gradientStartingPointOptionDefs_Reversed,
			{
				type: 'multidropdown',
				id: 'gradient_outputs_reversed',
				label: 'Output Reversed',
				default: [],
				choices: outputChoicesFriendly,
				minSelection: 0,
				isVisible: (o) => o.mode === 'gradient',
			},
			{
				type: 'checkbox',
				id: 'reset_gradient',
				label: 'Reset channels to factory defaults before applying',
				default: false,
				isVisible: (o) => o.mode === 'gradient',
			},
			{
				type: 'dropdown',
				id: 'gradient_link_group',
				label: 'Assign to Output Link Group',
				default: '0',
				choices: [
					{ id: '0', label: 'None (Unassigned)' },
					{ id: '1', label: 'Link Group 1' },
					{ id: '2', label: 'Link Group 2' },
					{ id: '3', label: 'Link Group 3' },
					{ id: '4', label: 'Link Group 4' },
					{ id: '5', label: 'Link Group 5' },
					{ id: '6', label: 'Link Group 6' },
					{ id: '7', label: 'Link Group 7' },
					{ id: '8', label: 'Link Group 8' },
				],
				isVisible: (o) => o.mode === 'gradient',
			},
			{
				type: 'checkbox',
				id: 'gradient_link_group_enable',
				label: 'Enable the selected Output Link Group',
				default: true,
				isVisible: (o) => o.mode === 'gradient' && o.gradient_link_group !== '0',
			},
		],
		callback: async (e) => {
			const mode = e.options.mode

			if (mode === 'endfire') {
				// Execute End-Fire logic
				const f = Math.max(1e-6, Number(e.options.freq) || 80)
				const unitIn = e.options.tempUnit_endfire === 'F' ? 'F' : 'C'
				let T = Number.isFinite(Number(e.options.temp_endfire)) ? Number(e.options.temp_endfire) : 20
				if (unitIn === 'F') T = ((T - 32) * 5) / 9
				const c = speedOfSound_mps(T)

				const depth = Math.min(8, Math.max(2, Number(e.options.depth) || 2))

				const spacing_m = c / (4 * f)
				self._subassist = { spacing_m, T, c }
				self.setVariableValues?.({
					subassist_spacing_ft: (spacing_m * 3.28084).toFixed(2),
					subassist_spacing_m: spacing_m.toFixed(3),
				})

				const roundTo01 = (val) => Math.round(val / 0.01) * 0.01
				const perTapMs = roundTo01(1000 / (4 * f))
				const perTapSamples = Math.round(perTapMs * 96)

				const taps = []
				for (let t = 0; t < depth; t++) {
					const key = `t${t}`
					const arr = Array.isArray(e.options[key])
						? e.options[key].map(Number)
						: e.options[key]
							? [Number(e.options[key])]
							: []
					taps.push(arr.filter((ch) => Number.isFinite(ch) && ch >= 1 && ch <= NUM_OUTPUTS))
				}

				// Get product integration settings if specified
				const speakerKey = String(e.options?.endfire_speaker || '')
				let typeId = null
				let startingPointCommands = null
				let startingPointTitle = ''

				if (speakerKey && speakerKey !== 'OFF' && speakerKey !== '') {
					const speakerEntry = productIntegrationSpeakers.get(speakerKey)
					if (speakerEntry?.phases?.length > 0) {
						const fallbackPhase = speakerEntry.phases[0]
						typeId = fallbackPhase?.typeId ?? null
					}

					const startingPointOptionId = endfireSpeakerStartingPointOption.get(speakerKey)
					if (startingPointOptionId) {
						const startingPointId = String(e.options?.[startingPointOptionId] || '').trim()
						if (startingPointId) {
							const entries = productIntegrationStartingPoints.get(speakerKey) || []
							const entry = entries.find((sp) => sp.id === startingPointId)
							if (entry && Array.isArray(entry.controlPoints) && entry.controlPoints.length > 0) {
								startingPointCommands = entry.controlPoints
								startingPointTitle = entry.title || ''
							}
						}
					}
				}

				// Check if factory reset is enabled
				const shouldReset = e.options.reset_endfire === true

				const lines = []
				for (let t = 0; t < taps.length; t++) {
					const targetSamples = t * perTapSamples
					const targetMs = targetSamples / 96
					for (const ch of taps[t]) {
						// Apply factory reset if checkbox is enabled
						if (shouldReset) {
							for (const resetCmd of FACTORY_RESET_COMMANDS) {
								const cmd = resetCmd.replace(/\{ch\}/g, ch)
								self._cmdSendLine(cmd)
							}
						}

						// Apply product integration if specified
						if (typeId) {
							self._cmdSendLine(`/processing/output/${ch}/delay_integration/type=${typeId}`)
						}
						if (startingPointCommands && Array.isArray(startingPointCommands)) {
							for (const cmd of startingPointCommands) {
								const finalCmd = cmd.replace(/\{ch\}/g, ch).replace(/\{\}/g, ch)
								self._cmdSendLine(finalCmd)
							}
						}

						// Apply end-fire delay
						self._cmdSendLine(`/processing/output/${ch}/delay=${targetSamples}`)
						self._applyOutputDelay(ch, targetSamples)

						// Apply link group assignment if specified
						const linkGroup = String(e.options?.endfire_link_group || '0')
						if (linkGroup !== '0') {
							const groupNum = Number(linkGroup)
							if (groupNum >= 1 && groupNum <= 8) {
								self._cmdSendLine(`/device/output/${ch}/output_link_group='${linkGroup}'`)
								// Update local state
								if (!self.outputLinkGroupAssign) self.outputLinkGroupAssign = {}
								self.outputLinkGroupAssign[ch] = groupNum
							}
						}

						const spLabel =
							speakerKey && speakerKey !== 'OFF'
								? ` [${speakerKey}${startingPointTitle ? ': ' + startingPointTitle : ''}]`
								: ''
						lines.push(`End-Fire T${t}: ch ${ch} = ${targetMs.toFixed(2)} ms${spLabel}`)
					}
				}

				// Apply link group bypass state if link group was assigned
				const linkGroup = String(e.options?.endfire_link_group || '0')
				if (linkGroup !== '0') {
					const groupNum = Number(linkGroup)
					if (groupNum >= 1 && groupNum <= 8) {
						// Enable = not bypassed (false), Disable = bypassed (true)
						const shouldBypass = e.options?.endfire_link_group_enable !== true
						self._cmdSendLine(`/device/output_link_group/${groupNum}/bypass='${shouldBypass}'`)
						// Update local state
						if (!self.outputLinkGroupBypass) self.outputLinkGroupBypass = {}
						self.outputLinkGroupBypass[groupNum] = shouldBypass
						if (typeof self.checkFeedbacks === 'function') {
							self.checkFeedbacks('output_link_group_bypassed')
							self.checkFeedbacks('output_link_group_assigned')
						}
						const groupStatus = shouldBypass ? 'Disabled (Bypassed)' : 'Enabled'
						lines.push(`Link Group ${groupNum}: ${groupStatus}`)
					}
				}

				if (lines.length) {
					const c_fps = c * 3.28084
					const T_F = (T * 9) / 5 + 32
					self.log?.(
						'info',
						[
							`End-Fire: f=${f} Hz | T=${e.options.temp_endfire}°${unitIn} (~${T.toFixed(1)}°C, c~${c.toFixed(1)} m/s ~ ${c_fps.toFixed(1)} ft/s) | perTap~${perTapMs.toFixed(2)} ms`,
							...lines,
						].join(' | '),
					)
				}

				try {
					self.updateActions?.()
				} catch {}
			} else if (mode === 'array') {
				// Execute Array logic
				try {
					const o = e.options
					const unitIn = o.tempUnit_array === 'F' ? 'F' : 'C'
					let T = Number.isFinite(Number(o.temp_array)) ? Number(o.temp_array) : 20
					if (unitIn === 'F') T = ((T - 32) * 5) / 9
					const c = speedOfSound_mps(T)

					self._arcassist = { T, c }
					try {
						self.updateActions?.()
					} catch {}

					if (o.startCh === '' || !Number.isFinite(Number(o.startCh))) {
						const c_fps = c * 3.28084
						const T_F = (T * 9) / 5 + 32
						self.log?.(
							'info',
							`Arc preview: c~${c.toFixed(1)} m/s (${c_fps.toFixed(1)} ft/s) at ${T.toFixed(1)} °C (${T_F.toFixed(1)} °F)`,
						)
						return
					}

					// Get product integration settings if specified
					const speakerKey = String(e.options?.array_speaker || '')
					let typeId = null
					let startingPointCommands = null
					let startingPointTitle = ''

					if (speakerKey && speakerKey !== 'OFF' && speakerKey !== '') {
						const speakerEntry = productIntegrationSpeakers.get(speakerKey)
						if (speakerEntry?.phases?.length > 0) {
							const fallbackPhase = speakerEntry.phases[0]
							typeId = fallbackPhase?.typeId ?? null
						}

						const startingPointOptionId = arraySpeakerStartingPointOption.get(speakerKey)
						if (startingPointOptionId) {
							const startingPointId = String(e.options?.[startingPointOptionId] || '').trim()
							if (startingPointId) {
								const entries = productIntegrationStartingPoints.get(speakerKey) || []
								const entry = entries.find((sp) => sp.id === startingPointId)
								if (entry && Array.isArray(entry.controlPoints) && entry.controlPoints.length > 0) {
									startingPointCommands = entry.controlPoints
									startingPointTitle = entry.title || ''
								}
							}
						}
					}

					const n = Math.max(1, Math.min(NUM_OUTPUTS, Number(o.numSubs)))
					const start = Math.max(1, Math.min(NUM_OUTPUTS, Number(o.startCh)))
					const end = Math.min(NUM_OUTPUTS, start + n - 1)

					const toMeters = o.units === 'ft' ? 0.3048 : 1.0
					const spacingM = Number(o.spacing) * toMeters
					const arcAngleDeg = Number(o.radius) || 0 // Treat "radius" field as arc angle in degrees

					const roundTo01 = (val) => Math.round(val / 0.01) * 0.01

					const msAtIndex = (i) => {
						if (arcAngleDeg === 0) return 0 // Straight line, no delays

						// Meyer Sound calculation method (matches Excel and official documentation)
						// Uses Cartesian distance calculation from arc positions to reference line

						const singleSplayDeg = arcAngleDeg / (n - 1)
						const singleSplayRad = (singleSplayDeg * Math.PI) / 180
						const AcC_virtual = -spacingM / singleSplayRad // Virtual acoustic center (negative radius)

						// Base angle offset for even/odd speaker count
						const baseAngleDeg = (n % 2 === 0) ? singleSplayDeg / 2 : 0

						// Reference point Y coordinate (straight line spacing)
						// For even count: starts at spacing/2, increments by spacing
						// T values go from high to low (T7=11, T8=9, ..., T12=1 for 6 speakers with 2m spacing)
						const T_base = (n % 2 === 0) ? spacingM / 2 : 0
						const T = T_base + ((n - 1 - i) * spacingM)

						// Speaker angle (decreases from high to low: 66°, 54°, 42°, 30°, 18°, 6° for 60° arc)
						const angleDeg = baseAngleDeg + ((n - 1 - i) * singleSplayDeg)
						const angleRad = (angleDeg * Math.PI) / 180

						// Speaker position on arc (Cartesian coordinates)
						const L = Math.abs(AcC_virtual) * Math.cos(angleRad) + AcC_virtual
						const M = Math.abs(AcC_virtual) * Math.sin(angleRad)

						// Reference point coordinates
						const S = 0

						// Euclidean distance from speaker to reference point
						const distance = Math.sqrt(Math.pow(S - L, 2) + Math.pow(T - M, 2))

						return (distance / c) * 1000
					}

					const raw = []
					for (let i = 0; i < n; i++) raw.push(msAtIndex(i))
					const minMs = Math.min(...raw)
					const relative = raw.map((v) => v - minMs)

					// Create symmetric delays: arc is symmetric, so we mirror the second half
					// Take last half (which has minimum delays) and create: lastHalf + reverse(lastHalf)
					const halfCount = Math.ceil(n / 2)
					const lastHalf = relative.slice(n - halfCount)

					const offsetsMs = [...lastHalf]
					// Append reverse, skipping last element for even count (to avoid duplicating center)
					for (let i = halfCount - (n % 2 === 0 ? 1 : 2); i >= 0; i--) {
						offsetsMs.push(lastHalf[i])
					}

					// Check if factory reset is enabled
					const shouldReset = e.options.reset_array === true

					const lines = []
					for (let i = 0; i < n; i++) {
						const ch = start + i

						// Apply factory reset if checkbox is enabled
						if (shouldReset) {
							for (const resetCmd of FACTORY_RESET_COMMANDS) {
								const cmd = resetCmd.replace(/\{ch\}/g, ch)
								self._cmdSendLine(cmd)
							}
						}

						// Apply product integration if specified
						if (typeId) {
							self._cmdSendLine(`/processing/output/${ch}/delay_integration/type=${typeId}`)
						}
						if (startingPointCommands && Array.isArray(startingPointCommands)) {
							for (const cmd of startingPointCommands) {
								const finalCmd = cmd.replace(/\{ch\}/g, ch).replace(/\{\}/g, ch)
								self._cmdSendLine(finalCmd)
							}
						}

						// Apply arc delay
						const targetMs = roundTo01(offsetsMs[i])
						self._setOutputDelayMs(ch, targetMs)

						// Apply link group assignment if specified
						const linkGroup = String(e.options?.array_link_group || '0')
						if (linkGroup !== '0') {
							const groupNum = Number(linkGroup)
							if (groupNum >= 1 && groupNum <= 8) {
								self._cmdSendLine(`/device/output/${ch}/output_link_group='${linkGroup}'`)
								// Update local state
								if (!self.outputLinkGroupAssign) self.outputLinkGroupAssign = {}
								self.outputLinkGroupAssign[ch] = groupNum
							}
						}

						const spLabel =
							speakerKey && speakerKey !== 'OFF'
								? ` [${speakerKey}${startingPointTitle ? ': ' + startingPointTitle : ''}]`
								: ''
						lines.push(`Arc: ch ${ch} = ${targetMs.toFixed(2)} ms${spLabel}`)
					}

					// Apply link group bypass state if link group was assigned
					const linkGroup = String(e.options?.array_link_group || '0')
					if (linkGroup !== '0') {
						const groupNum = Number(linkGroup)
						if (groupNum >= 1 && groupNum <= 8) {
							// Enable = not bypassed (false), Disable = bypassed (true)
							const shouldBypass = e.options?.array_link_group_enable !== true
							self._cmdSendLine(`/device/output_link_group/${groupNum}/bypass='${shouldBypass}'`)
							// Update local state
							if (!self.outputLinkGroupBypass) self.outputLinkGroupBypass = {}
							self.outputLinkGroupBypass[groupNum] = shouldBypass
							if (typeof self.checkFeedbacks === 'function') {
								self.checkFeedbacks('output_link_group_bypassed')
								self.checkFeedbacks('output_link_group_assigned')
							}
							const groupStatus = shouldBypass ? 'Disabled (Bypassed)' : 'Enabled'
							lines.push(`Link Group ${groupNum}: ${groupStatus}`)
						}
					}

					self.log?.(
						'info',
						[
							`Sub Arc: n=${n}, ch ${start}-${end}, spacing=${o.spacing}${o.units}, R=${o.radius}${o.units}, T=${o.temp_array}°${unitIn} (~${T.toFixed(1)}°C, c~${c.toFixed(1)} m/s)`,
							...lines,
						].join(' | '),
					)
				} catch (err) {
					self.log?.('error', `Arc delay failed: ${err?.message || err}`)
				}
			} else if (mode === 'gradient') {
				// Execute Gradient logic
				const speakerKey = String(e.options?.gradient_speaker || '')
				if (!speakerKey || speakerKey === 'OFF' || speakerKey === '') {
					self.log?.('warn', 'Please select a loudspeaker for Gradient mode')
					return
				}

				// Get the delay integration type ID
				let typeId = null
				const speakerEntry = productIntegrationSpeakers.get(speakerKey)

				// Use the first available phase for this speaker
				if (speakerEntry?.phases?.length > 0) {
					const fallbackPhase = speakerEntry.phases[0]
					typeId = fallbackPhase?.typeId ?? null
				}

				if (!typeId) {
					self.log?.('warn', `Invalid product integration selection for speaker ${speakerKey}`)
					return
				}

				const finalTypeId = String(typeId)
				const shouldReset = e.options.reset_gradient === true
				const lines = []

				// Process Front outputs
				const frontOptionId = gradientSpeakerStartingPointOption_Front.get(speakerKey)
				let frontStartingPointId = ''
				if (frontOptionId) {
					frontStartingPointId = String(e.options?.[frontOptionId] || '').trim()
				}

				const frontOutputsRaw = e.options.gradient_outputs_front
				const frontOutputs = Array.isArray(frontOutputsRaw)
					? frontOutputsRaw.map(Number).filter((ch) => Number.isFinite(ch) && ch >= 1 && ch <= NUM_OUTPUTS)
					: []

				// Process Reversed outputs
				const reversedOptionId = gradientSpeakerStartingPointOption_Reversed.get(speakerKey)
				let reversedStartingPointId = ''
				if (reversedOptionId) {
					reversedStartingPointId = String(e.options?.[reversedOptionId] || '').trim()
				}

				const reversedOutputsRaw = e.options.gradient_outputs_reversed
				const reversedOutputs = Array.isArray(reversedOutputsRaw)
					? reversedOutputsRaw.map(Number).filter((ch) => Number.isFinite(ch) && ch >= 1 && ch <= NUM_OUTPUTS)
					: []

				// Check for duplicate output selections
				const frontSet = new Set(frontOutputs)
				const reversedSet = new Set(reversedOutputs)
				const duplicates = frontOutputs.filter((ch) => reversedSet.has(ch))
				if (duplicates.length > 0) {
					self.log?.(
						'warn',
						`Warning: Outputs ${duplicates.join(', ')} are selected in both Front and Reversed. The Reversed setting will overwrite the Front setting for these channels.`,
					)
				}

				if (frontOutputs.length > 0) {
					let frontCommands = null
					let frontTitle = ''

					if (frontStartingPointId) {
						const entries = productIntegrationStartingPoints.get(speakerKey) || []
						const entry = entries.find((sp) => sp.id === frontStartingPointId)
						if (entry && Array.isArray(entry.controlPoints) && entry.controlPoints.length > 0) {
							frontCommands = entry.controlPoints
							frontTitle = entry.title || ''
						}
					}

					for (const ch of frontOutputs) {
						// Apply factory reset if checkbox is enabled
						if (shouldReset) {
							for (const resetCmd of FACTORY_RESET_COMMANDS) {
								const cmd = resetCmd.replace(/\{ch\}/g, ch)
								self._cmdSendLine(cmd)
							}
						}

						// Apply delay integration type
						self._cmdSendLine(`/processing/output/${ch}/delay_integration/type=${finalTypeId}`)

						// Apply starting point commands if any
						if (frontCommands && Array.isArray(frontCommands)) {
							for (const cmd of frontCommands) {
								const finalCmd = cmd.replace(/\{ch\}/g, ch).replace(/\{\}/g, ch)
								self._cmdSendLine(finalCmd)
							}
						}

						// Apply link group assignment if specified
						const linkGroup = String(e.options?.gradient_link_group || '0')
						if (linkGroup !== '0') {
							const groupNum = Number(linkGroup)
							if (groupNum >= 1 && groupNum <= 8) {
								self._cmdSendLine(`/device/output/${ch}/output_link_group='${linkGroup}'`)
								// Update local state
								if (!self.outputLinkGroupAssign) self.outputLinkGroupAssign = {}
								self.outputLinkGroupAssign[ch] = groupNum
							}
						}

						const spLabel = frontTitle ? ` (${frontTitle})` : ''
						lines.push(`Front ch ${ch}${spLabel}`)
					}
				}

				if (reversedOutputs.length > 0) {
					let reversedCommands = null
					let reversedTitle = ''

					if (reversedStartingPointId) {
						const entries = productIntegrationStartingPoints.get(speakerKey) || []
						const entry = entries.find((sp) => sp.id === reversedStartingPointId)
						if (entry && Array.isArray(entry.controlPoints) && entry.controlPoints.length > 0) {
							reversedCommands = entry.controlPoints
							reversedTitle = entry.title || ''
						}
					}

					for (const ch of reversedOutputs) {
						// Apply factory reset if checkbox is enabled
						if (shouldReset) {
							for (const resetCmd of FACTORY_RESET_COMMANDS) {
								const cmd = resetCmd.replace(/\{ch\}/g, ch)
								self._cmdSendLine(cmd)
							}
						}

						// Apply delay integration type
						self._cmdSendLine(`/processing/output/${ch}/delay_integration/type=${finalTypeId}`)

						// Apply starting point commands if any
						if (reversedCommands && Array.isArray(reversedCommands)) {
							for (const cmd of reversedCommands) {
								const finalCmd = cmd.replace(/\{ch\}/g, ch).replace(/\{\}/g, ch)
								self._cmdSendLine(finalCmd)
							}
						}

						// Apply link group assignment if specified
						const linkGroup = String(e.options?.gradient_link_group || '0')
						if (linkGroup !== '0') {
							const groupNum = Number(linkGroup)
							if (groupNum >= 1 && groupNum <= 8) {
								self._cmdSendLine(`/device/output/${ch}/output_link_group='${linkGroup}'`)
								// Update local state
								if (!self.outputLinkGroupAssign) self.outputLinkGroupAssign = {}
								self.outputLinkGroupAssign[ch] = groupNum
							}
						}

						const spLabel = reversedTitle ? ` (${reversedTitle})` : ''
						lines.push(`Reversed ch ${ch}${spLabel}`)
					}
				}

				// Apply link group bypass state if link group was assigned
				const linkGroup = String(e.options?.gradient_link_group || '0')
				if (linkGroup !== '0') {
					const groupNum = Number(linkGroup)
					if (groupNum >= 1 && groupNum <= 8) {
						// Enable = not bypassed (false), Disable = bypassed (true)
						const shouldBypass = e.options?.gradient_link_group_enable !== true
						self._cmdSendLine(`/device/output_link_group/${groupNum}/bypass='${shouldBypass}'`)
						// Update local state
						if (!self.outputLinkGroupBypass) self.outputLinkGroupBypass = {}
						self.outputLinkGroupBypass[groupNum] = shouldBypass
						if (typeof self.checkFeedbacks === 'function') {
							self.checkFeedbacks('output_link_group_bypassed')
							self.checkFeedbacks('output_link_group_assigned')
						}
						const groupStatus = shouldBypass ? 'Disabled (Bypassed)' : 'Enabled'
						lines.push(`Link Group ${groupNum}: ${groupStatus}`)
					}
				}

				if (lines.length > 0) {
					self.log?.('info', [`Gradient: ${speakerKey} (type ${finalTypeId})`, ...lines].join(' | '))
				} else {
					self.log?.('warn', 'No outputs selected for Gradient mode')
				}
			} else if (mode === 'array_endfire') {
				// Execute Array End-Fire logic (combines end-fire and array)
				try {
					const o = e.options

					// Get end-fire parameters
					const f = Math.max(1e-6, Number(o.freq_arrayendfire) || 80)
					const depth = Math.min(8, Math.max(2, Number(o.depth_arrayendfire) || 2))

					// Get temperature and calculate speed of sound
					const unitIn = o.tempUnit_arrayendfire === 'F' ? 'F' : 'C'
					let T = Number.isFinite(Number(o.temp_arrayendfire)) ? Number(o.temp_arrayendfire) : 20
					if (unitIn === 'F') T = ((T - 32) * 5) / 9
					const c = speedOfSound_mps(T)

					// Store for variable updates
					const spacing_m = c / (4 * f)
					self._subassist = { spacing_m, T, c }
					self._arcassist = { T, c }
					self.setVariableValues?.({
						subassist_spacing_ft: (spacing_m * 3.28084).toFixed(2),
						subassist_spacing_m: spacing_m.toFixed(3),
					})

					try {
						self.updateActions?.()
					} catch {}

					// Get array parameters
					const toMeters = o.units_arrayendfire === 'ft' ? 0.3048 : 1.0
					const spacingM = Number(o.spacing_arrayendfire) * toMeters
					const arcAngleDeg = Number(o.radius_arrayendfire) || 0 // Treat "radius" field as arc angle in degrees
					const numSubs = Math.max(1, Math.min(NUM_OUTPUTS, Number(o.numSubs_arrayendfire)))

					// Get starting channels for each row
					const rowLabels = ['front', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']
					const rowStartChannels = []
					for (let rowIdx = 0; rowIdx < depth; rowIdx++) {
						const key = `startCh_${rowLabels[rowIdx]}_arrayendfire`
						const startCh = Number(o[key])
						if (Number.isFinite(startCh) && startCh >= 1 && startCh <= NUM_OUTPUTS) {
							rowStartChannels.push(startCh)
						} else {
							rowStartChannels.push(null)
						}
					}

					// Calculate end-fire delays per row
					const roundTo01 = (val) => Math.round(val / 0.01) * 0.01
					const perTapMs = roundTo01(1000 / (4 * f))
					const perTapSamples = Math.round(perTapMs * 96)

					// Calculate array arc delays (same for all rows)
					const msAtIndex = (i) => {
						if (arcAngleDeg === 0) return 0 // Straight line, no delays

						// Meyer Sound calculation method (matches Excel and official documentation)
						// Uses Cartesian distance calculation from arc positions to reference line

						const singleSplayDeg = arcAngleDeg / (numSubs - 1)
						const singleSplayRad = (singleSplayDeg * Math.PI) / 180
						const AcC_virtual = -spacingM / singleSplayRad // Virtual acoustic center (negative radius)

						// Base angle offset for even/odd speaker count
						const baseAngleDeg = (numSubs % 2 === 0) ? singleSplayDeg / 2 : 0

						// Reference point Y coordinate (straight line spacing)
						// For even count: starts at spacing/2, increments by spacing
						// T values go from high to low (T7=11, T8=9, ..., T12=1 for 6 speakers with 2m spacing)
						const T_base = (numSubs % 2 === 0) ? spacingM / 2 : 0
						const T = T_base + ((numSubs - 1 - i) * spacingM)

						// Speaker angle (decreases from high to low: 66°, 54°, 42°, 30°, 18°, 6° for 60° arc)
						const angleDeg = baseAngleDeg + ((numSubs - 1 - i) * singleSplayDeg)
						const angleRad = (angleDeg * Math.PI) / 180

						// Speaker position on arc (Cartesian coordinates)
						const L = Math.abs(AcC_virtual) * Math.cos(angleRad) + AcC_virtual
						const M = Math.abs(AcC_virtual) * Math.sin(angleRad)

						// Reference point coordinates
						const S = 0

						// Euclidean distance from speaker to reference point
						const distance = Math.sqrt(Math.pow(S - L, 2) + Math.pow(T - M, 2))

						return (distance / c) * 1000
					}

					const raw = []
					for (let i = 0; i < numSubs; i++) raw.push(msAtIndex(i))
					const minMs = Math.min(...raw)
					const relative = raw.map((v) => v - minMs)

					// Create symmetric delays: arc is symmetric, so we mirror the second half
					// Take last half (which has minimum delays) and create: lastHalf + reverse(lastHalf)
					const halfCount = Math.ceil(numSubs / 2)
					const lastHalf = relative.slice(numSubs - halfCount)

					const arcOffsetsMs = [...lastHalf]
					// Append reverse, skipping last element for even count (to avoid duplicating center)
					for (let i = halfCount - (numSubs % 2 === 0 ? 1 : 2); i >= 0; i--) {
						arcOffsetsMs.push(lastHalf[i])
					}

					// Get product integration settings if specified
					const speakerKey = String(o?.arrayendfire_speaker || '')
					let typeId = null
					let startingPointCommands = null
					let startingPointTitle = ''

					if (speakerKey && speakerKey !== 'OFF' && speakerKey !== '') {
						const speakerEntry = productIntegrationSpeakers.get(speakerKey)
						if (speakerEntry?.phases?.length > 0) {
							const fallbackPhase = speakerEntry.phases[0]
							typeId = fallbackPhase?.typeId ?? null
						}

						const startingPointOptionId = arrayendfireSpeakerStartingPointOption.get(speakerKey)
						if (startingPointOptionId) {
							const startingPointId = String(o?.[startingPointOptionId] || '').trim()
							if (startingPointId) {
								const entries = productIntegrationStartingPoints.get(speakerKey) || []
								const entry = entries.find((sp) => sp.id === startingPointId)
								if (entry && Array.isArray(entry.controlPoints) && entry.controlPoints.length > 0) {
									startingPointCommands = entry.controlPoints
									startingPointTitle = entry.title || ''
								}
							}
						}
					}

					// Check if factory reset is enabled
					const shouldReset = o.reset_arrayendfire === true

					const lines = []

					// Apply combined delays to each row
					for (let rowIdx = 0; rowIdx < depth; rowIdx++) {
						const rowStartCh = rowStartChannels[rowIdx]
						if (rowStartCh === null) continue

						const endfireMs = (rowIdx * perTapSamples) / 96

						// Process each sub in this row
						for (let subIdx = 0; subIdx < numSubs; subIdx++) {
							const ch = rowStartCh + subIdx
							if (ch > NUM_OUTPUTS) break

							// Get the arc delay for this position in the array
							const arcMs = subIdx < arcOffsetsMs.length ? arcOffsetsMs[subIdx] : 0

							// Combined delay = end-fire delay + arc delay
							const combinedMs = roundTo01(endfireMs + arcMs)

							// Apply factory reset if checkbox is enabled
							if (shouldReset) {
								for (const resetCmd of FACTORY_RESET_COMMANDS) {
									const cmd = resetCmd.replace(/\{ch\}/g, ch)
									self._cmdSendLine(cmd)
								}
							}

							// Apply product integration if specified
							if (typeId) {
								self._cmdSendLine(`/processing/output/${ch}/delay_integration/type=${typeId}`)
							}
							if (startingPointCommands && Array.isArray(startingPointCommands)) {
								for (const cmd of startingPointCommands) {
									const finalCmd = cmd.replace(/\{ch\}/g, ch).replace(/\{\}/g, ch)
									self._cmdSendLine(finalCmd)
								}
							}

							// Apply combined delay
							self._setOutputDelayMs(ch, combinedMs)

							// Apply link group assignment if specified
							const linkGroup = String(o?.arrayendfire_link_group || '0')
							if (linkGroup !== '0') {
								const groupNum = Number(linkGroup)
								if (groupNum >= 1 && groupNum <= 8) {
									self._cmdSendLine(`/device/output/${ch}/output_link_group='${linkGroup}'`)
									// Update local state
									if (!self.outputLinkGroupAssign) self.outputLinkGroupAssign = {}
									self.outputLinkGroupAssign[ch] = groupNum
								}
							}

							const spLabel =
								speakerKey && speakerKey !== 'OFF'
									? ` [${speakerKey}${startingPointTitle ? ': ' + startingPointTitle : ''}]`
									: ''
							const rowName = rowLabels[rowIdx].charAt(0).toUpperCase() + rowLabels[rowIdx].slice(1)
							lines.push(
								`${rowName} row: ch ${ch} = ${combinedMs.toFixed(2)} ms (EF: ${endfireMs.toFixed(2)} + Arc: ${arcMs.toFixed(2)})${spLabel}`,
							)
						}
					}

					// Apply link group bypass state if link group was assigned
					const linkGroup = String(o?.arrayendfire_link_group || '0')
					if (linkGroup !== '0') {
						const groupNum = Number(linkGroup)
						if (groupNum >= 1 && groupNum <= 8) {
							// Enable = not bypassed (false), Disable = bypassed (true)
							const shouldBypass = o?.arrayendfire_link_group_enable !== true
							self._cmdSendLine(`/device/output_link_group/${groupNum}/bypass='${shouldBypass}'`)
							// Update local state
							if (!self.outputLinkGroupBypass) self.outputLinkGroupBypass = {}
							self.outputLinkGroupBypass[groupNum] = shouldBypass
							if (typeof self.checkFeedbacks === 'function') {
								self.checkFeedbacks('output_link_group_bypassed')
								self.checkFeedbacks('output_link_group_assigned')
							}
							const groupStatus = shouldBypass ? 'Disabled (Bypassed)' : 'Enabled'
							lines.push(`Link Group ${groupNum}: ${groupStatus}`)
						}
					}

					if (lines.length) {
						const c_fps = c * 3.28084
						const T_F = (T * 9) / 5 + 32
						self.log?.(
							'info',
							[
								`Array End-Fire: f=${f} Hz, depth=${depth} rows, ${numSubs} subs/row, spacing=${o.spacing_arrayendfire}${o.units_arrayendfire}, R=${o.radius_arrayendfire}${o.units_arrayendfire} | T=${o.temp_arrayendfire}°${unitIn} (~${T.toFixed(1)}°C, c~${c.toFixed(1)} m/s ~ ${c_fps.toFixed(1)} ft/s) | perRow~${perTapMs.toFixed(2)} ms`,
								...lines,
							].join(' | '),
						)
					} else {
						self.log?.('warn', 'No rows configured for Array End-Fire mode')
					}
				} catch (err) {
					self.log?.('error', `Array End-Fire failed: ${err?.message || err}`)
				}
			}
		},
	}
}

module.exports = { registerSubwooferDesignActions }
