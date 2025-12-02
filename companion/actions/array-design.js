// actions/array-design.js
// Advanced array design actions: Line array design, LMBC
const { rangeChoices } = require('../helpers')

/**
 * Register array design related actions
 * @param {Object} actions - Actions object to populate
 * @param {Object} self - Module instance
 * @param {number} NUM_INPUTS - Number of input channels
 * @param {number} NUM_OUTPUTS - Number of output channels
 */
function registerArrayDesignActions(actions, self, NUM_INPUTS, NUM_OUTPUTS) {
	// Get all data needed from main.js global scope
	const STARTING_POINTS_SOURCE = self.constructor.STARTING_POINTS_SOURCE || {
		startingPoints: {},
		categories: {},
		compensation: {},
		combinations: {},
	}
	const PRODUCT_INTEGRATION_DATA = self.constructor.PRODUCT_INTEGRATION_DATA || {
		speakers: new Map(),
		lookup: new Map(),
		startingPoints: new Map(),
		lineArraySpeakerChoices: [{ id: '', label: '-- None --' }],
	}

	const productIntegrationSpeakers = PRODUCT_INTEGRATION_DATA.speakers || new Map()
	const productIntegrationLookup = PRODUCT_INTEGRATION_DATA.lookup || new Map()
	const productIntegrationStartingPoints = PRODUCT_INTEGRATION_DATA.startingPoints || new Map()
	const lineArraySpeakerChoices = PRODUCT_INTEGRATION_DATA.lineArraySpeakerChoices || [
		{ id: '', label: '-- None --' },
	]
	const lineArrayCombinations = STARTING_POINTS_SOURCE.combinations || {}

	/**
	 * Normalize speaker key to standard format
	 */
	const normalizeSpeakerKey = (key) => {
		const normalized = String(key ?? '')
			.trim()
			.replace(/[\s-]+/g, '_')
			.replace(/[^\w]/g, '_')
			.replace(/_+/g, '_')
			.toUpperCase()

		// Special case: convert LEO_M variants to just LEO
		if (normalized === 'LEO_M' || normalized === 'LEOM') {
			return 'LEO'
		}

		return normalized
	}

	/**
	 * Canonicalize speaker key (remove underscores)
	 */
	const canonicalizeSpeakerKey = (key) => {
		return normalizeSpeakerKey(key).replace(/_/g, '')
	}

	// Factory reset commands template (will replace {ch} with actual channel number)
	const FACTORY_RESET_COMMANDS = [
		"/processing/output/{ch}/allpass/1/band_bypass='true'",
		"/processing/output/{ch}/allpass/1/frequency='32'",
		"/processing/output/{ch}/allpass/1/q='1'",
		"/processing/output/{ch}/allpass/2/band_bypass='true'",
		"/processing/output/{ch}/allpass/2/frequency='64'",
		"/processing/output/{ch}/allpass/2/q='1'",
		"/processing/output/{ch}/allpass/3/band_bypass='true'",
		"/processing/output/{ch}/allpass/3/frequency='128'",
		"/processing/output/{ch}/allpass/3/q='1'",
		"/processing/output/{ch}/allpass/bypass='false'",
		"/processing/output/{ch}/atmospheric/bypass='true'",
		"/processing/output/{ch}/atmospheric/distance='0'",
		"/processing/output/{ch}/atmospheric/gain='10'",
		"/processing/output/{ch}/beam_control_allpass/band_bypass='true'",
		"/processing/output/{ch}/beam_control_allpass/frequency='32'",
		"/processing/output/{ch}/beam_control_allpass/q='1'",
		"/processing/output/{ch}/delay='0'",
		"/processing/output/{ch}/delay_integration/1/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/1/frequency='32'",
		"/processing/output/{ch}/delay_integration/1/q='1'",
		"/processing/output/{ch}/delay_integration/10/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/10/frequency='2048'",
		"/processing/output/{ch}/delay_integration/10/q='1'",
		"/processing/output/{ch}/delay_integration/11/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/11/frequency='2896.3'",
		"/processing/output/{ch}/delay_integration/11/q='1'",
		"/processing/output/{ch}/delay_integration/12/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/12/frequency='4096'",
		"/processing/output/{ch}/delay_integration/12/q='1'",
		"/processing/output/{ch}/delay_integration/13/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/13/frequency='5792.6'",
		"/processing/output/{ch}/delay_integration/13/q='1'",
		"/processing/output/{ch}/delay_integration/14/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/14/frequency='8192'",
		"/processing/output/{ch}/delay_integration/14/q='1'",
		"/processing/output/{ch}/delay_integration/2/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/2/frequency='64'",
		"/processing/output/{ch}/delay_integration/2/q='1'",
		"/processing/output/{ch}/delay_integration/3/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/3/frequency='128'",
		"/processing/output/{ch}/delay_integration/3/q='1'",
		"/processing/output/{ch}/delay_integration/4/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/4/frequency='256'",
		"/processing/output/{ch}/delay_integration/4/q='1'",
		"/processing/output/{ch}/delay_integration/5/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/5/frequency='362'",
		"/processing/output/{ch}/delay_integration/5/q='1'",
		"/processing/output/{ch}/delay_integration/6/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/6/frequency='512'",
		"/processing/output/{ch}/delay_integration/6/q='1'",
		"/processing/output/{ch}/delay_integration/7/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/7/frequency='724.1'",
		"/processing/output/{ch}/delay_integration/7/q='1'",
		"/processing/output/{ch}/delay_integration/8/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/8/frequency='1024'",
		"/processing/output/{ch}/delay_integration/8/q='1'",
		"/processing/output/{ch}/delay_integration/9/band_bypass='true'",
		"/processing/output/{ch}/delay_integration/9/frequency='1448.2'",
		"/processing/output/{ch}/delay_integration/9/q='1'",
		"/processing/output/{ch}/delay_integration/bypass='false'",
		"/processing/output/{ch}/delay_integration/polarity_reversal='false'",
		"/processing/output/{ch}/delay_integration/type='1'",
		"/processing/output/{ch}/delay_type='0'",
		"/processing/output/{ch}/eq/1/band_bypass='false'",
		"/processing/output/{ch}/eq/1/bandwidth='1'",
		"/processing/output/{ch}/eq/1/frequency='32'",
		"/processing/output/{ch}/eq/1/gain='0'",
		"/processing/output/{ch}/eq/10/band_bypass='false'",
		"/processing/output/{ch}/eq/10/bandwidth='1'",
		"/processing/output/{ch}/eq/10/frequency='16000'",
		"/processing/output/{ch}/eq/10/gain='0'",
		"/processing/output/{ch}/eq/2/band_bypass='false'",
		"/processing/output/{ch}/eq/2/bandwidth='1'",
		"/processing/output/{ch}/eq/2/frequency='63'",
		"/processing/output/{ch}/eq/2/gain='0'",
		"/processing/output/{ch}/eq/3/band_bypass='false'",
		"/processing/output/{ch}/eq/3/bandwidth='1'",
		"/processing/output/{ch}/eq/3/frequency='125'",
		"/processing/output/{ch}/eq/3/gain='0'",
		"/processing/output/{ch}/eq/4/band_bypass='false'",
		"/processing/output/{ch}/eq/4/bandwidth='1'",
		"/processing/output/{ch}/eq/4/frequency='250'",
		"/processing/output/{ch}/eq/4/gain='0'",
		"/processing/output/{ch}/eq/5/band_bypass='false'",
		"/processing/output/{ch}/eq/5/bandwidth='1'",
		"/processing/output/{ch}/eq/5/frequency='500'",
		"/processing/output/{ch}/eq/5/gain='0'",
		"/processing/output/{ch}/eq/6/band_bypass='false'",
		"/processing/output/{ch}/eq/6/bandwidth='1'",
		"/processing/output/{ch}/eq/6/frequency='1000'",
		"/processing/output/{ch}/eq/6/gain='0'",
		"/processing/output/{ch}/eq/7/band_bypass='false'",
		"/processing/output/{ch}/eq/7/bandwidth='1'",
		"/processing/output/{ch}/eq/7/frequency='2000'",
		"/processing/output/{ch}/eq/7/gain='0'",
		"/processing/output/{ch}/eq/8/band_bypass='false'",
		"/processing/output/{ch}/eq/8/bandwidth='1'",
		"/processing/output/{ch}/eq/8/frequency='4000'",
		"/processing/output/{ch}/eq/8/gain='0'",
		"/processing/output/{ch}/eq/9/band_bypass='false'",
		"/processing/output/{ch}/eq/9/bandwidth='1'",
		"/processing/output/{ch}/eq/9/frequency='8000'",
		"/processing/output/{ch}/eq/9/gain='0'",
		"/processing/output/{ch}/eq/bypass='false'",
		"/processing/output/{ch}/gain='0'",
		"/processing/output/{ch}/highpass/filter_configure='0'",
		"/processing/output/{ch}/highpass/frequency='20'",
		"/processing/output/{ch}/lowpass/filter_configure='0'",
		"/processing/output/{ch}/lowpass/frequency='20000'",
		"/processing/output/{ch}/mute='false'",
		"/processing/output/{ch}/polarity_reversal='false'",
		"/processing/output/{ch}/solo='false'",
		"/processing/output/{ch}/u_shaping/bypass='false'",
		"/processing/output/{ch}/u_shaping/hf_gain='0'",
		"/processing/output/{ch}/u_shaping/lf_gain='0'",
		"/processing/output/{ch}/u_shaping/lmf_gain='0'",
		"/processing/output/{ch}/u_shaping/selected='0'",
	]

	/**
	 * Build LMBC status preview
	 */
	function lmbcStatusPreview(arrayIndex = 1) {
		const status = self?.beamControlStatus?.[arrayIndex]
		if (!status || status.errorCode === undefined) {
			return `-- Waiting for status from Galaxy (Array ${arrayIndex}) --`
		}
		const errorMsg = status.errorString || ''
		if (errorMsg && errorMsg.trim() !== '') {
			return errorMsg
		}
		return '-- No error message --'
	}

	// Build phase options for line array - one option per speaker with phases
	const lineArrayPhaseOptions = []
	for (const speaker of productIntegrationSpeakers.values()) {
		if (!speaker.phases || speaker.phases.length === 0) continue

		const speakerKey = speaker.key
		const phaseChoices = speaker.phases.map((p) => ({ id: p.id, label: p.label }))
		const safeSpeakerJson = JSON.stringify(speakerKey)

		lineArrayPhaseOptions.push({
			type: 'dropdown',
			id: `phase_for_${speakerKey}`,
			label: 'Phase Curve',
			default: speaker.phases[0]?.id || '',
			choices: phaseChoices,
			isVisible: new Function('options', `return options.primary_speaker === ${safeSpeakerJson};`),
		})
	}

	// Build starting point options for line array - primary
	const lineArrayPrimaryStartingPointOptions = []
	for (const [canonicalKey, entries] of productIntegrationStartingPoints.entries()) {
		if (!entries || entries.length === 0) continue

		// Find the speaker with this canonical key
		let speakerKey = null
		for (const speaker of productIntegrationSpeakers.values()) {
			if (canonicalizeSpeakerKey(speaker.key) === canonicalKey) {
				speakerKey = speaker.key
				break
			}
		}
		if (!speakerKey) continue

		const choices = [{ id: '', label: '-- None --' }, ...entries.map((sp) => ({ id: sp.id, label: sp.title }))]
		const safeSpeakerJson = JSON.stringify(speakerKey)

		lineArrayPrimaryStartingPointOptions.push({
			type: 'dropdown',
			id: `primary_sp_for_${speakerKey}`,
			label: 'Starting point (primary)',
			default: '',
			choices: choices,
			isVisible: new Function('options', `return options.primary_speaker === ${safeSpeakerJson};`),
		})
	}

	// Build starting point options for line array - secondary
	const lineArraySecondaryStartingPointOptions = []
	for (const [canonicalKey, entries] of productIntegrationStartingPoints.entries()) {
		if (!entries || entries.length === 0) continue

		// Find the speaker with this canonical key
		let speakerKey = null
		for (const speaker of productIntegrationSpeakers.values()) {
			if (canonicalizeSpeakerKey(speaker.key) === canonicalKey) {
				speakerKey = speaker.key
				break
			}
		}
		if (!speakerKey) continue

		const choices = [{ id: '', label: '-- None --' }, ...entries.map((sp) => ({ id: sp.id, label: sp.title }))]
		const safeSpeakerJson = JSON.stringify(speakerKey)

		// Build visibility check that checks if this speaker is selected as secondary
		const visibilityCode = `
			if (!options.mixed_array) return false;
			const primarySpeaker = String(options.primary_speaker || '');
			if (!primarySpeaker) return false;
			const secondaryOptionId = 'secondary_for_' + primarySpeaker;
			const selectedSecondary = options[secondaryOptionId];
			return selectedSecondary === ${safeSpeakerJson};
		`

		lineArraySecondaryStartingPointOptions.push({
			type: 'dropdown',
			id: `secondary_sp_for_${speakerKey}`,
			label: 'Starting point (secondary)',
			default: '',
			choices: choices,
			isVisible: new Function('options', visibilityCode),
		})
	}

	// Build secondary speaker options - one per primary speaker that has a valid combination
	const lineArraySecondaryOptions = []
	for (const [primaryKey, combo] of Object.entries(lineArrayCombinations)) {
		if (!combo || !combo.secondary) continue

		const safePrimaryJson = JSON.stringify(primaryKey)
		const secondarySpeaker = combo.secondary

		lineArraySecondaryOptions.push({
			type: 'dropdown',
			id: `secondary_for_${primaryKey}`,
			label: 'Secondary loudspeaker',
			default: secondarySpeaker,
			choices: [
				{ id: primaryKey, label: primaryKey },
				{ id: secondarySpeaker, label: secondarySpeaker },
			],
			isVisible: new Function(
				'options',
				`return options.mixed_array === true && options.primary_speaker === ${safePrimaryJson};`,
			),
		})
	}

	// =========================
	// ===== LINE ARRAY DESIGN ======
	// =========================

	actions['line_array_design'] = {
		name: 'Line Array Design',
		options: [
			{
				type: 'dropdown',
				id: 'primary_speaker',
				label: 'Primary loudspeaker',
				default: '',
				choices: lineArraySpeakerChoices,
			},
			{
				type: 'number',
				id: 'primary_elements',
				label: 'Number of elements (primary)',
				default: 12,
				min: 1,
				max: 64,
			},
			{
				type: 'number',
				id: 'elements_per_output',
				label: 'Number of elements per output',
				default: 1,
				min: 1,
				max: 2,
			},
			{
				type: 'dropdown',
				id: 'start_output',
				label: 'Starting output',
				default: '1',
				choices: rangeChoices(NUM_OUTPUTS, 'Output '),
			},

			// Spread phase options - one per speaker
			...lineArrayPhaseOptions,

			// Spread primary starting point options - one per speaker
			...lineArrayPrimaryStartingPointOptions,

			{
				type: 'checkbox',
				id: 'mixed_array',
				label: 'Mixed array',
				default: false,
				tooltip: 'Enable to add a secondary loudspeaker type with delay compensation',
				isVisible: new Function(
					'options',
					`
					const primarySpeaker = String(options.primary_speaker || '');
					if (!primarySpeaker) return false;
					const validPrimarySpeakers = ${JSON.stringify(Object.keys(lineArrayCombinations))};
					return validPrimarySpeakers.includes(primarySpeaker);
				`,
				),
			},
			// Spread secondary speaker options - one per primary speaker
			...lineArraySecondaryOptions,
			{
				type: 'number',
				id: 'secondary_elements',
				label: 'Number of elements (secondary)',
				default: 6,
				min: 1,
				max: 64,
				isVisible: new Function(
					'options',
					`
					if (!options.mixed_array) return false;
					const primarySpeaker = String(options.primary_speaker || '');
					if (!primarySpeaker) return false;
					const validPrimarySpeakers = ${JSON.stringify(Object.keys(lineArrayCombinations))};
					return validPrimarySpeakers.includes(primarySpeaker);
				`,
				),
			},

			// Spread secondary starting point options - one per speaker
			...lineArraySecondaryStartingPointOptions,

			// Link Group options
			{
				type: 'dropdown',
				id: 'link_group',
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
			},
			{
				type: 'checkbox',
				id: 'link_group_enable',
				label: 'Enable the selected Output Link Group',
				default: true,
				isVisible: (o) => o.link_group !== '0',
			},
			{
				type: 'checkbox',
				id: 'reset_line_array',
				label: 'Reset channels to factory defaults before applying',
				default: false,
			},

			// ===== LMBC OPTIONS =====
			{
				type: 'checkbox',
				id: 'enable_lmbc',
				label: 'Enable LMBC (Low-Mid Beam Control)',
				default: false,
				tooltip: 'Enable Low-Mid Beam Control for this line array',
				isVisible: (o) => o.primary_speaker !== 'M1D',
			},
			{
				type: 'dropdown',
				id: 'lmbc_array_index',
				label: 'LMBC: Beam Control Array',
				default: '1',
				choices: [
					{ id: '1', label: 'Beam Control Array 1' },
					{ id: '2', label: 'Beam Control Array 2' },
					{ id: '3', label: 'Beam Control Array 3' },
					{ id: '4', label: 'Beam Control Array 4' },
				],
				tooltip: 'Select which beam control array to configure (1-4)',
				isVisible: (o) => o.enable_lmbc === true && o.primary_speaker !== 'M1D',
			},
			{
				type: 'number',
				id: 'lmbc_beam_angle',
				label: 'LMBC: Total Angle (degrees)',
				default: 15,
				min: 10,
				max: 99,
				tooltip: 'Total beam angle in degrees (10-99)',
				isVisible: (o) => o.enable_lmbc === true && o.primary_speaker !== 'M1D',
			},
			{
				type: 'dropdown',
				id: 'lmbc_control_type',
				label: 'LMBC: Type',
				default: '0',
				choices: [
					{ id: '0', label: 'Spread' },
					{ id: '1', label: 'Steer Up' },
				],
				tooltip: 'Beam control type: Spread or Steer Up',
				isVisible: (o) => o.enable_lmbc === true && o.primary_speaker !== 'M1D',
			},
			{
				type: 'number',
				id: 'lmbc_starting_element',
				label: 'LMBC: Starting Element',
				default: 1,
				min: 1,
				max: 32,
				tooltip: 'First element number in the array (1-32)',
				isVisible: (o) => o.enable_lmbc === true && o.primary_speaker !== 'M1D',
			},
			{
				type: 'static-text',
				id: 'lmbc_status_info',
				label: 'LMBC Status',
				value: lmbcStatusPreview(1),
				isVisible: (o) => o.enable_lmbc === true && o.primary_speaker !== 'M1D',
			},
		],
		callback: async (e) => {
			try {
				const primarySpeaker = String(e.options.primary_speaker || '')
				const primaryElements = Number(e.options.primary_elements) || 12
				const elementsPerOutput = Number(e.options.elements_per_output) || 1
				const startOutput = Number(e.options.start_output) || 1
				const mixedArray = e.options.mixed_array === true

				// Get secondary speaker from the dynamic option ID
				const secondarySpeakerOptionId = `secondary_for_${primarySpeaker}`
				const secondarySpeaker = String(e.options[secondarySpeakerOptionId] || '')
				const secondaryElements = Number(e.options.secondary_elements) || 0

				if (!primarySpeaker) {
					self.log?.('warn', 'Line Array Design: No primary speaker selected')
					return
				}

				// Calculate total elements (primary + secondary if mixed array)
				const totalElements = mixedArray && secondarySpeaker ? primaryElements + secondaryElements : primaryElements

				// Calculate number of outputs needed
				const numOutputs = Math.ceil(totalElements / elementsPerOutput)

				// Check if we have enough outputs
				if (startOutput + numOutputs - 1 > NUM_OUTPUTS) {
					self.log?.(
						'warn',
						`Line Array Design: Not enough outputs. Need ${numOutputs} outputs starting from ${startOutput}, but only ${NUM_OUTPUTS - startOutput + 1} available`,
					)
					return
				}

				const commands = []

				// Check if factory reset is enabled
				const shouldReset = e.options.reset_line_array === true

				// Calculate delay compensation for mixed array using combinations data
				let primaryDelayMs = 0
				let secondaryDelayMs = 0
				if (mixedArray && secondarySpeaker) {
					const combinations = STARTING_POINTS_SOURCE.combinations || {}
					const combo = combinations[primarySpeaker]
					if (combo && combo.secondary === secondarySpeaker) {
						primaryDelayMs = combo.primaryDelayMs || 0
						secondaryDelayMs = combo.secondaryDelayMs || 0
					} else {
						// Fallback to old compensation method
						const compensation = STARTING_POINTS_SOURCE.compensation || {}
						const compData = compensation[secondarySpeaker]
						if (compData && typeof compData.delayMs === 'number') {
							primaryDelayMs = compData.delayMs
							secondaryDelayMs = 0
						}
					}
				}

				// Calculate how many outputs are for primary vs secondary
				const primaryOutputs = Math.ceil(primaryElements / elementsPerOutput)
				const secondaryOutputs = mixedArray && secondarySpeaker ? Math.ceil(secondaryElements / elementsPerOutput) : 0

				// Helper function to get product integration type ID and starting points
				const getSpeakerSettings = (speakerKey, isPrimary) => {
					// Get phase from the phase option for the primary speaker (shared for whole array)
					const phaseOptionId = `phase_for_${primarySpeaker}`
					const requestedPhase = String(e.options?.[phaseOptionId] || '')

					let typeId = null
					const speakerEntry = productIntegrationSpeakers.get(speakerKey)
					let phaseKey = requestedPhase
					if ((!phaseKey || phaseKey === '') && speakerEntry?.phases?.[0]?.id) {
						phaseKey = speakerEntry.phases[0].id
					}

					if (typeof phaseKey === 'string' && phaseKey.length > 0) {
						typeId = productIntegrationLookup.get(`${speakerKey}|${phaseKey}`)
						if (!typeId && speakerEntry?.phases) {
							const exact = speakerEntry.phases.find((p) => p.id === phaseKey)
							if (exact?.typeId) typeId = exact.typeId
						}
					}

					if (!typeId && speakerEntry?.phases?.length > 0) {
						const fallbackPhase = speakerEntry.phases[0]
						phaseKey = fallbackPhase?.id ?? ''
						typeId = fallbackPhase?.typeId ?? null
					}

					// Get starting point commands
					let startingPointCommands = null
					let startingPointTitle = ''
					const startingPointOptionId = isPrimary ? `primary_sp_for_${speakerKey}` : `secondary_sp_for_${speakerKey}`
					const selectionId = String(e.options?.[startingPointOptionId] ?? '').trim()
					if (selectionId) {
						const canonicalKey = canonicalizeSpeakerKey(speakerKey)
						const entries = productIntegrationStartingPoints.get(canonicalKey) || []
						const entry = entries.find((sp) => sp.id === selectionId)
						if (entry && Array.isArray(entry.controlPoints) && entry.controlPoints.length > 0) {
							startingPointCommands = entry.controlPoints
							startingPointTitle = entry.title || ''
						}
					}

					return { typeId, startingPointCommands, startingPointTitle }
				}

				// Get settings for primary speaker
				const primarySettings = getSpeakerSettings(primarySpeaker, true)

				// Get settings for secondary speaker if mixed array
				let secondarySettings = null
				if (mixedArray && secondarySpeaker) {
					secondarySettings = getSpeakerSettings(secondarySpeaker, false)
				}

				// Apply settings to each output
				for (let i = 0; i < numOutputs; i++) {
					const outputNum = startOutput + i
					if (outputNum > NUM_OUTPUTS) break

					// Determine if this output is primary or secondary
					const isPrimary = i < primaryOutputs
					const speakerType = isPrimary ? primarySpeaker : secondarySpeaker
					const settings = isPrimary ? primarySettings : secondarySettings

					// Calculate element range for this output
					let firstElement, lastElement
					if (isPrimary) {
						firstElement = i * elementsPerOutput + 1
						lastElement = Math.min((i + 1) * elementsPerOutput, primaryElements)
					} else {
						const secondaryIndex = i - primaryOutputs
						firstElement = secondaryIndex * elementsPerOutput + 1
						lastElement = Math.min((secondaryIndex + 1) * elementsPerOutput, secondaryElements)
					}
					const elementsOnThisOutput = lastElement - firstElement + 1

					// Apply factory reset if checkbox is enabled
					if (shouldReset) {
						for (const resetCmd of FACTORY_RESET_COMMANDS) {
							const cmd = resetCmd.replace(/\{ch\}/g, outputNum)
							self._cmdSendLine(cmd)
						}
					}

					// Apply product integration type
					if (settings?.typeId) {
						self._cmdSendLine(`/processing/output/${outputNum}/delay_integration/type=${settings.typeId}`)
					}

					// Apply starting point commands
					if (settings?.startingPointCommands && settings.startingPointCommands.length) {
						for (const rawCmd of settings.startingPointCommands) {
							let cmd = String(rawCmd || '').trim()
							if (!cmd) continue
							if (cmd.includes('{}')) {
								cmd = cmd.replace(/\{\}/g, outputNum)
							} else if (cmd.includes('{ch}')) {
								cmd = cmd.replace(/\{ch\}/gi, outputNum)
							}
							self._cmdSendLine(cmd)
						}
					}

					// Set delay with compensation if needed
					const delayMs = isPrimary ? primaryDelayMs : secondaryDelayMs
					if (delayMs > 0) {
						self._cmdSendLine(`/processing/output/${outputNum}/delay=${Math.round(delayMs * 96)}`)
					}

					// Apply link group assignment if specified
					const linkGroup = String(e.options?.link_group || '0')
					if (linkGroup !== '0') {
						const groupNum = Number(linkGroup)
						if (groupNum >= 1 && groupNum <= 8) {
							self._cmdSendLine(`/device/output/${outputNum}/output_link_group='${linkGroup}'`)
							// Update local state
							if (!self.outputLinkGroupAssign) self.outputLinkGroupAssign = {}
							self.outputLinkGroupAssign[outputNum] = groupNum
						}
					}

					const startingPointInfo = settings?.startingPointTitle ? ` | ${settings.startingPointTitle}` : ''
					const delayInfo = delayMs > 0 ? ` | ${delayMs.toFixed(2)}ms delay` : ''
					self.log?.(
						'info',
						`Line Array Design: Output ${outputNum} - ${speakerType} Elements ${firstElement}-${lastElement} (${elementsOnThisOutput} element${elementsOnThisOutput > 1 ? 's' : ''})${delayInfo}${startingPointInfo}`,
					)
				}

				// Apply link group bypass state if link group was assigned
				const linkGroup = String(e.options?.link_group || '0')
				if (linkGroup !== '0') {
					const groupNum = Number(linkGroup)
					if (groupNum >= 1 && groupNum <= 8) {
						// Enable = not bypassed (false), Disable = bypassed (true)
						const shouldBypass = e.options?.link_group_enable !== true
						self._cmdSendLine(`/device/output_link_group/${groupNum}/bypass='${shouldBypass}'`)
						// Update local state
						if (!self.outputLinkGroupBypass) self.outputLinkGroupBypass = {}
						self.outputLinkGroupBypass[groupNum] = shouldBypass
						if (typeof self.checkFeedbacks === 'function') {
							self.checkFeedbacks('output_link_group_bypassed')
							self.checkFeedbacks('output_link_group_assigned')
						}
						const groupStatus = shouldBypass ? 'Disabled (Bypassed)' : 'Enabled'
						self.log?.('info', `Line Array Design: Link Group ${groupNum} - ${groupStatus}`)
					}
				}

				// Send commands
				if (commands.length > 0) {
					await self.sendOsc(commands)
				}

				// Apply LMBC configuration if enabled
				if (e.options.enable_lmbc === true) {
					const arrayIndex = Number(e.options.lmbc_array_index) || 1 // User-selected beam control array (1-4)
					const beamAngle = Math.max(10, Math.min(99, Number(e.options.lmbc_beam_angle) || 15))
					const bypass = 'false' // Always active (not bypassed)
					const controlType = e.options.lmbc_control_type === '1' ? '1' : '0'
					const lmbcStartingElement = Math.max(1, Math.min(32, Number(e.options.lmbc_starting_element) || 1))

					// Map primary speaker to product type
					const productTypeMap = {
						'LEO-M': '0',
						LYON: '1',
						LEOPARD: '2',
						MICA: '3',
						MELODIE: '4',
						MINA: '5',
						LINA: '5', // Same as MINA
						MILO: '6',
						M3D: '7',
						M2D: '8',
						PANTHER: '9',
					}
					const productType = productTypeMap[primarySpeaker] || '0'

					const lmbcCommands = [
						`/processing/beam_control_array/${arrayIndex}/beam_angle='${beamAngle}'`,
						`/processing/beam_control_array/${arrayIndex}/bypass='${bypass}'`,
						`/processing/beam_control_array/${arrayIndex}/control_type='${controlType}'`,
						`/processing/beam_control_array/${arrayIndex}/elements_per_output='${elementsPerOutput}'`,
						`/processing/beam_control_array/${arrayIndex}/number_of_elements='${totalElements}'`,
						`/processing/beam_control_array/${arrayIndex}/product_type='${productType}'`,
						`/processing/beam_control_array/${arrayIndex}/starting_output_number='${startOutput}'`,
						`/processing/beam_control_array/${arrayIndex}/starting_element='${lmbcStartingElement}'`,
					]

					// Send LMBC commands
					for (const cmd of lmbcCommands) {
						self._cmdSendLine(cmd)
					}

					const lmbcTypeLabel = controlType === '1' ? 'Steer Up' : 'Spread'
					self.log?.(
						'info',
						`Line Array Design: LMBC Array ${arrayIndex} configured - Active, ${lmbcTypeLabel}, ${beamAngle}° beam angle, ${totalElements} elements starting at element ${lmbcStartingElement}`,
					)
				}

				const mixedArrayInfo = mixedArray && secondarySpeaker ? ` | Mixed array with ${secondarySpeaker}` : ''
				const linkGroupInfo = linkGroup !== '0' ? ` | Link Group ${linkGroup}` : ''
				const lmbcInfo = e.options.enable_lmbc === true ? ' | LMBC Enabled' : ''
				self.log?.(
					'info',
					`Line Array Design: ${primarySpeaker} | ${totalElements} elements, ${elementsPerOutput} per output | Starting at Output ${startOutput} (${numOutputs} outputs)${mixedArrayInfo}${linkGroupInfo}${lmbcInfo}`,
				)
			} catch (err) {
				self.log?.('error', `Line Array Design failed: ${err?.message || err}`)
			}
		},
	}

	// =========================
	// ===== LMBC (Low-Mid Beam Control) =====
	// =========================

	actions['lmbc_configure'] = {
		name: 'LMBC: Configure Low-Mid Beam Control',
		options: [
			{
				type: 'dropdown',
				id: 'array_index',
				label: 'Beam Control Array',
				default: '1',
				choices: [
					{ id: '1', label: 'Beam Control Array 1' },
					{ id: '2', label: 'Beam Control Array 2' },
					{ id: '3', label: 'Beam Control Array 3' },
					{ id: '4', label: 'Beam Control Array 4' },
				],
				tooltip: 'Select which beam control array to configure (1-4)',
			},
			{
				type: 'number',
				id: 'beam_angle',
				label: 'Total Angle (degrees)',
				default: 15,
				min: 10,
				max: 99,
				tooltip: 'Total beam angle in degrees (10-99)',
			},
			{
				type: 'number',
				id: 'elements_per_output',
				label: 'Elements Per Output',
				default: 1,
				min: 1,
				max: 2,
				tooltip: 'Number of elements per output (1 or 2)',
			},
			{
				type: 'dropdown',
				id: 'product_type',
				label: 'Loudspeaker Model',
				default: '0',
				choices: [
					{ id: '0', label: 'LEO-M' },
					{ id: '1', label: 'LYON' },
					{ id: '2', label: 'LEOPARD' },
					{ id: '3', label: 'MICA' },
					{ id: '4', label: 'MELODIE' },
					{ id: '5', label: 'MINA' },
					{ id: '6', label: 'MILO' },
					{ id: '7', label: 'M3D' },
					{ id: '8', label: 'M2D' },
					{ id: '9', label: 'PANTHER' },
				],
				tooltip: 'Select the loudspeaker model for beam control',
			},
			{
				type: 'dropdown',
				id: 'bypass',
				label: 'Bypass',
				default: 'false',
				choices: [
					{ id: 'false', label: 'Active (Not Bypassed)' },
					{ id: 'true', label: 'Bypassed' },
				],
				tooltip: 'Enable or bypass the beam control',
			},
			{
				type: 'dropdown',
				id: 'control_type',
				label: 'Type',
				default: '0',
				choices: [
					{ id: '0', label: 'Spread' },
					{ id: '1', label: 'Steer Up' },
				],
				tooltip: 'Beam control type: Spread or Steer Up',
			},
			{
				type: 'number',
				id: 'number_of_elements',
				label: 'Number of Elements',
				default: 12,
				min: 8,
				max: 32,
				tooltip: 'Total number of elements in the array (8-32)',
			},
			{
				type: 'number',
				id: 'starting_output',
				label: 'Starting Output',
				default: 1,
				min: 1,
				max: NUM_OUTPUTS,
				tooltip: 'First output channel for the array',
			},
			{
				type: 'number',
				id: 'starting_element',
				label: 'Starting Element',
				default: 1,
				min: 1,
				max: 32,
				tooltip: 'First element number in the array (1-32)',
			},
			{
				type: 'static-text',
				id: 'lmbc_status_info',
				label: 'LMBC Status',
				value: lmbcStatusPreview(1),
			},
		],
		callback: async (e) => {
			if (!self) return
			try {
				const arrayIndex = Number(e.options.array_index) || 1 // User-selected beam control array (1-4)
				const beamAngle = Math.max(10, Math.min(99, Number(e.options.beam_angle) || 15))
				const elementsPerOutput = Math.max(1, Math.min(2, Number(e.options.elements_per_output) || 1))
				const bypass = e.options.bypass === 'true' ? 'true' : 'false'
				const controlType = e.options.control_type === '1' ? '1' : '0'
				const numberOfElements = Math.max(8, Math.min(32, Number(e.options.number_of_elements) || 12))
				const startingOutput = Math.max(1, Math.min(NUM_OUTPUTS, Number(e.options.starting_output) || 1))
				const startingElement = Math.max(1, Math.min(32, Number(e.options.starting_element) || 1))

				// Product type mapping: 0:LEOM, 1:LYON, 2:LEOPARD, 3:MICA, 4:MELODIE, 5:MINA, 6:MILO, 7:M3D, 8:M2D, 9:PANTHER
				const productType = String(e.options.product_type || '0')

				const commands = [
					`/processing/beam_control_array/${arrayIndex}/beam_angle='${beamAngle}'`,
					`/processing/beam_control_array/${arrayIndex}/bypass='${bypass}'`,
					`/processing/beam_control_array/${arrayIndex}/control_type='${controlType}'`,
					`/processing/beam_control_array/${arrayIndex}/elements_per_output='${elementsPerOutput}'`,
					`/processing/beam_control_array/${arrayIndex}/number_of_elements='${numberOfElements}'`,
					`/processing/beam_control_array/${arrayIndex}/product_type='${productType}'`,
					`/processing/beam_control_array/${arrayIndex}/starting_output_number='${startingOutput}'`,
					`/processing/beam_control_array/${arrayIndex}/starting_element='${startingElement}'`,
				]

				// Send commands
				for (const cmd of commands) {
					self._cmdSendLine(cmd)
				}

				const productTypeLabels = {
					'0': 'LEO-M',
					'1': 'LYON',
					'2': 'LEOPARD',
					'3': 'MICA',
					'4': 'MELODIE',
					'5': 'MINA',
					'6': 'MILO',
					'7': 'M3D',
					'8': 'M2D',
					'9': 'PANTHER',
				}
				const speakerName = productTypeLabels[productType] || 'Unknown'
				const bypassStatus = bypass === 'true' ? 'Bypassed' : 'Active'
				const typeLabel = controlType === '1' ? 'Steer Up' : 'Spread'

				// Build log message with beam control status
				let logMessage = `LMBC: ${speakerName} | ${numberOfElements} elements (${elementsPerOutput}/output) | ${beamAngle}° ${typeLabel} | Output ${startingOutput} | ${bypassStatus}`

				// Add error status if available
				if (self.beamControlStatus && self.beamControlStatus[arrayIndex]) {
					const status = self.beamControlStatus[arrayIndex]
					if (status.errorCodeLabel) {
						logMessage += ` | Status: ${status.errorCodeLabel}`
					}
					if (status.errorString && status.errorString.trim() !== '') {
						logMessage += ` | ${status.errorString}`
					}
				}

				self.log?.('info', logMessage)
			} catch (err) {
				self.log?.('error', `LMBC configuration failed: ${err?.message || err}`)
			}
		},
	}
}

module.exports = { registerArrayDesignActions }
