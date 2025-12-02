// actions-data.js
// Data structures used by action implementations
// This file contains product integration data, speaker configurations,
// phase curves, starting points, and other static data needed for actions

const fs = require('fs')
const path = require('path')

// ===================================================
// ============ SPEAKER KEY NORMALIZATION ============
// ===================================================

/**
 * Normalize speaker key to uppercase with underscores
 * @param {string} key - Raw speaker key
 * @returns {string} Normalized key
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
 * Canonicalize speaker key by removing underscores
 * @param {string} key - Raw speaker key
 * @returns {string} Canonical key (no underscores)
 */
const canonicalizeSpeakerKey = (key) => {
	return normalizeSpeakerKey(key).replace(/_/g, '')
}

// ===================================================
// ========== STARTING POINTS DATA LOADER ============
// ===================================================

/**
 * Load starting points configuration from JSON file
 * Returns speaker starting points, categories, compensation data, and combinations
 */
const STARTING_POINTS_SOURCE = (() => {
	try {
		const candidates = [
			path.join(__dirname, 'starting-points.json'),
			path.join(__dirname, '..', 'starting-points.json'),
		]
		const filePath = candidates.find((p) => fs.existsSync(p))
		if (!filePath) return { startingPoints: {}, categories: {}, compensation: {}, combinations: {} }

		const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
		if (raw && typeof raw === 'object') {
			const payload = raw.startingPoint && typeof raw.startingPoint === 'object' ? raw.startingPoint : raw
			const categories = raw.speakerCategories && typeof raw.speakerCategories === 'object' ? raw.speakerCategories : {}
			const compensation =
				raw.mixedArrayCompensation && typeof raw.mixedArrayCompensation === 'object' ? raw.mixedArrayCompensation : {}
			const combinations =
				raw.mixedArrayCombinations && typeof raw.mixedArrayCombinations === 'object' ? raw.mixedArrayCombinations : {}
			return {
				startingPoints: payload || {},
				categories: categories,
				compensation: compensation,
				combinations: combinations,
			}
		}
	} catch (err) {
		console.warn?.(`Failed to load starting points: ${err?.message || err}`)
	}
	return { startingPoints: {}, categories: {}, compensation: {}, combinations: {} }
})()

// ===================================================
// ======== PRODUCT INTEGRATION TYPE MAPPING =========
// ===================================================

/**
 * Raw product integration type data
 * Format: "ID:DelayIntegrationType_SPEAKER_pcPHASE"
 * Example: "2:DelayIntegrationType_LEO_M_pc125"
 */
const PRODUCT_INTEGRATION_RAW = [
	'1:DelayIntegrationType_OFF',
	'2:DelayIntegrationType_LEO_M_pc125',
	'3:DelayIntegrationType_LEO_M_pc100',
	'4:DelayIntegrationType_LYON_pc125',
	'5:DelayIntegrationType_LYON_pc100',
	'6:DelayIntegrationType_LYON_pc63',
	'7:DelayIntegrationType_LEOPARD_pc125',
	'8:DelayIntegrationType_LEOPARD_pc100',
	'9:DelayIntegrationType_LEOPARD_pc63',
	'10:DelayIntegrationType_MILO_pc125',
	'11:DelayIntegrationType_MICA_pc125',
	'12:DelayIntegrationType_Melodie_pc125',
	'13:DelayIntegrationType_MINA_pc125',
	'14:DelayIntegrationType_M3D_pc125',
	'15:DelayIntegrationType_M3D_pc100',
	'16:DelayIntegrationType_M2D_pc125',
	'17:DelayIntegrationType_M2D_pc100',
	'18:DelayIntegrationType_M1D_pc125',
	'19:DelayIntegrationType_M1D_pc100',
	'20:DelayIntegrationType_CQ_1_pc125',
	'21:DelayIntegrationType_CQ_1_pc100',
	'22:DelayIntegrationType_CQ_2_pc125',
	'23:DelayIntegrationType_CQ_2_pc100',
	'24:DelayIntegrationType_MSL_6_pc125',
	'25:DelayIntegrationType_MSL_4_pc125',
	'26:DelayIntegrationType_JM_1P_pc125',
	'27:DelayIntegrationType_JM_1P_pc100',
	'28:DelayIntegrationType_UPM_1P_pc125',
	'29:DelayIntegrationType_UPM_1P_pc100',
	'30:DelayIntegrationType_UPM_2P_pc125',
	'31:DelayIntegrationType_UPM_2P_pc100',
	'32:DelayIntegrationType_UPM_1XP_pc125',
	'33:DelayIntegrationType_UPM_1XP_pc100',
	'34:DelayIntegrationType_UPM_2XP_pc125',
	'35:DelayIntegrationType_UPM_2XP_pc100',
	'36:DelayIntegrationType_MM_4XP_pc125',
	'37:DelayIntegrationType_MM_4XPD_pc125',
	'38:DelayIntegrationType_UPJunior_pc125',
	'39:DelayIntegrationType_UPJunior_XP_pc125',
	'40:DelayIntegrationType_UPQ_1P_pc125',
	'41:DelayIntegrationType_UPQ_1P_pc100',
	'42:DelayIntegrationType_UPQ_2P_pc125',
	'43:DelayIntegrationType_UPQ_2P_pc100',
	'44:DelayIntegrationType_UPA_1P_pc125',
	'45:DelayIntegrationType_UPA_1P_pc100',
	'46:DelayIntegrationType_UPA_2P_pc125',
	'47:DelayIntegrationType_UPA_2P_pc100',
	'48:DelayIntegrationType_UPJ_1P_pc125',
	'49:DelayIntegrationType_UPJ_1P_pc100',
	'50:DelayIntegrationType_UPJ_1XP_pc125',
	'51:DelayIntegrationType_UPJ_1XP_pc100',
	'52:DelayIntegrationType_1100_LFC_pc125',
	'53:DelayIntegrationType_1100_LFC_pc100',
	'54:DelayIntegrationType_1100_LFC_pc63',
	'55:DelayIntegrationType_900_LFC_pc125',
	'56:DelayIntegrationType_900_LFC_pc100',
	'57:DelayIntegrationType_900_LFC_pc63',
	'58:DelayIntegrationType_700_HP_pc125',
	'59:DelayIntegrationType_700_HP_pc100',
	'60:DelayIntegrationType_M3D_Sub_pc125',
	'61:DelayIntegrationType_M3D_Sub_pc100',
	'62:DelayIntegrationType_M2D_Sub_pc125',
	'63:DelayIntegrationType_M2D_Sub_pc100',
	'64:DelayIntegrationType_M1D_Sub_pc125',
	'65:DelayIntegrationType_M1D_Sub_pc100',
	'66:DelayIntegrationType_650_P_pc125',
	'67:DelayIntegrationType_650_P_pc100',
	'68:DelayIntegrationType_600_HP_pc125',
	'69:DelayIntegrationType_600_HP_pc100',
	'70:DelayIntegrationType_500_HP_pc125',
	'71:DelayIntegrationType_500_HP_pc100',
	'72:DelayIntegrationType_USW_1P_pc125',
	'73:DelayIntegrationType_USW_1P_pc100',
	'74:DelayIntegrationType_USW_1P_pc63',
	'75:DelayIntegrationType_UMS_1P_pc125',
	'76:DelayIntegrationType_UMS_1P_pc100',
	'77:DelayIntegrationType_UMS_1XP_pc125',
	'78:DelayIntegrationType_UMS_1XP_pc100',
	'79:DelayIntegrationType_LINA_pc125',
	'80:DelayIntegrationType_LINA_pc63',
	'81:DelayIntegrationType_750_LFC_pc125',
	'82:DelayIntegrationType_750_LFC_pc100',
	'83:DelayIntegrationType_750_LFC_pc63',
	'84:DelayIntegrationType_UP_4XP_pc125',
	'85:DelayIntegrationType_UP_4XP_pc100',
	'86:DelayIntegrationType_UP_4slim_pc125',
	'87:DelayIntegrationType_UP_4slim_pc63',
	'88:DelayIntegrationType_Ashby_8C_pc125',
	'89:DelayIntegrationType_Ashby_8C_pc100',
	'90:DelayIntegrationType_Ashby_5C_pc125',
	'91:DelayIntegrationType_USW_210P_pc125',
	'92:DelayIntegrationType_USW_210P_pc100',
	'93:DelayIntegrationType_USW_210P_pc63',
	'94:DelayIntegrationType_UP_4slimWP_pc125',
	'95:DelayIntegrationType_UP_4slimWP_pc63',
	'96:DelayIntegrationType_UPQ_D1_pc125',
	'97:DelayIntegrationType_UPQ_D1_pc100',
	'98:DelayIntegrationType_UPQ_D1_pc63',
	'99:DelayIntegrationType_UPQ_D2_pc125',
	'100:DelayIntegrationType_UPQ_D2_pc100',
	'101:DelayIntegrationType_UPQ_D2_pc63',
	'102:DelayIntegrationType_UPQ_D3_pc125',
	'103:DelayIntegrationType_UPQ_D3_pc100',
	'104:DelayIntegrationType_UPQ_D3_pc63',
	'105:DelayIntegrationType_ULTRA_X40_pc125',
	'106:DelayIntegrationType_ULTRA_X40_pc100',
	'107:DelayIntegrationType_ULTRA_X40_pc63',
	'108:DelayIntegrationType_ULTRA_X42_pc125',
	'109:DelayIntegrationType_ULTRA_X42_pc100',
	'110:DelayIntegrationType_ULTRA_X42_pc63',
	'111:DelayIntegrationType_MM_10_900_LFC_pc125',
	'112:DelayIntegrationType_MM_10_900_LFC_pc100',
	'113:DelayIntegrationType_MM_10_900_LFC_pc63',
	'114:DelayIntegrationType_UPJ_1Pd_pc125',
	'115:DelayIntegrationType_UPJ_1Pd_pc100',
	'116:DelayIntegrationType_UPM_1Pd_pc125',
	'117:DelayIntegrationType_UPM_1Pd_pc100',
	'118:DelayIntegrationType_UPM_2Pd_pc125',
	'119:DelayIntegrationType_UPM_2Pd_pc100',
	'120:DelayIntegrationType_ULTRA_X20_pc125',
	'121:DelayIntegrationType_ULTRA_X20_pc100',
	'122:DelayIntegrationType_ULTRA_X20_pc63',
	'123:DelayIntegrationType_ULTRA_X20XP_pc125',
	'124:DelayIntegrationType_ULTRA_X20XP_pc100',
	'125:DelayIntegrationType_ULTRA_X20XP_pc63',
	'126:DelayIntegrationType_ULTRA_X22_pc125',
	'127:DelayIntegrationType_ULTRA_X22_pc100',
	'128:DelayIntegrationType_ULTRA_X22_pc63',
	'129:DelayIntegrationType_ULTRA_X22XP_pc125',
	'130:DelayIntegrationType_ULTRA_X22XP_pc100',
	'131:DelayIntegrationType_ULTRA_X22XP_pc63',
	'132:DelayIntegrationType_ULTRA_X23_pc125',
	'133:DelayIntegrationType_ULTRA_X23_pc100',
	'134:DelayIntegrationType_ULTRA_X23_pc63',
	'135:DelayIntegrationType_ULTRA_X23XP_pc125',
	'136:DelayIntegrationType_ULTRA_X23XP_pc100',
	'137:DelayIntegrationType_ULTRA_X23XP_pc63',
	'138:DelayIntegrationType_USW_112P_pc125',
	'139:DelayIntegrationType_USW_112P_pc100',
	'140:DelayIntegrationType_USW_112P_pc63',
	'141:DelayIntegrationType_USW_112XP_pc125',
	'142:DelayIntegrationType_USW_112XP_pc100',
	'143:DelayIntegrationType_USW_112XP_pc63',
	'144:DelayIntegrationType_X_1100C_pc125',
	'145:DelayIntegrationType_X_1100C_pc100',
	'146:DelayIntegrationType_X_1100C_pc63',
	'147:DelayIntegrationType_LF_18_pc125',
	'148:DelayIntegrationType_LF_18_pc100',
	'149:DelayIntegrationType_LF_18_pc63',
	'150:DelayIntegrationType_PANTHER_pc125',
	'151:DelayIntegrationType_PANTHER_pc100',
	'152:DelayIntegrationType_PANTHER_pc63',
	'153:DelayIntegrationType_2100_LFC_pc125',
	'154:DelayIntegrationType_2100_LFC_pc100',
	'155:DelayIntegrationType_2100_LFC_pc63',
	'156:DelayIntegrationType_ULTRA_X80_pc125',
	'157:DelayIntegrationType_ULTRA_X80_pc100',
	'158:DelayIntegrationType_ULTRA_X80_pc63',
	'159:DelayIntegrationType_ULTRA_X82_pc125',
	'160:DelayIntegrationType_ULTRA_X82_pc100',
	'161:DelayIntegrationType_ULTRA_X82_pc63',
]

// ===================================================
// ========= PRODUCT INTEGRATION DATA BUILD ==========
// ===================================================

/**
 * Build comprehensive product integration data structure
 * Includes speaker choices, phase curves, starting points, and dynamic option definitions
 */
const PRODUCT_INTEGRATION_DATA = (() => {
	const formatSpeakerLabel = (raw) =>
		String(raw || '')
			.replace(/_/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	const formatPhaseLabel = (digits) => `PC${digits}`

	const speakers = new Map()
	const lookup = new Map()
	const startingPointData = new Map()

	// Load starting point data indexed by canonical speaker key
	if (STARTING_POINTS_SOURCE.startingPoints && typeof STARTING_POINTS_SOURCE.startingPoints === 'object') {
		for (const [rawKey, entries] of Object.entries(STARTING_POINTS_SOURCE.startingPoints)) {
			const normalizedKey = normalizeSpeakerKey(rawKey)
			if (!normalizedKey || !Array.isArray(entries)) continue
			const canonicalKey = canonicalizeSpeakerKey(normalizedKey)
			if (!canonicalKey) continue
			const cleaned = entries
				.map((entry, idx) => {
					if (!entry) return null
					const title = String(entry.title ?? '').trim() || `Starting point ${idx + 1}`
					const controlPoints = Array.isArray(entry.controlPoints)
						? entry.controlPoints.map((cp) => String(cp || '').trim()).filter(Boolean)
						: []
					if (controlPoints.length === 0) return null
					return { id: String(idx), title, controlPoints }
				})
				.filter(Boolean)

			if (cleaned.length > 0) {
				startingPointData.set(canonicalKey, cleaned)
			}
		}
	}

	// Helper to ensure speaker exists in map
	const ensureSpeaker = (key, label) => {
		const k = normalizeSpeakerKey(key)
		const lbl = formatSpeakerLabel(label || key)
		if (!speakers.has(k)) {
			speakers.set(k, { key: k, label: lbl || k, phases: [] })
		}
		return speakers.get(k)
	}

	// Parse product integration raw data
	for (const entry of PRODUCT_INTEGRATION_RAW) {
		if (!entry) continue
		const parts = String(entry).split(':')
		if (parts.length < 2) continue
		const id = parts[0].trim()
		const rawName = parts[1].trim().replace(/^DelayIntegrationType_/, '')
		if (!id || !rawName) continue

		// Handle "OFF" special case
		if (rawName === 'OFF') {
			ensureSpeaker('OFF', 'Off')
			lookup.set('OFF|', id)
			continue
		}

		// Parse speaker_pcPHASE pattern
		const match = rawName.match(/^(.*)_pc(\d+)$/i)
		if (!match) {
			continue
		}

		const speakerKey = normalizeSpeakerKey(match[1])
		const phaseDigits = match[2]
		const speaker = ensureSpeaker(speakerKey, speakerKey)
		const phaseKey = `pc${phaseDigits}`

		// Add phase info if not already present
		if (!speaker.phases.find((p) => p.id === phaseKey)) {
			const info = {
				id: phaseKey,
				label: formatPhaseLabel(phaseDigits),
				typeId: id,
				numeric: Number(phaseDigits) || 0,
			}
			speaker.phases.push(info)
		}

		// Add to lookup map
		lookup.set(`${speakerKey}|${phaseKey}`, id)
	}

	// Ensure OFF speaker exists
	if (!speakers.has('OFF')) {
		speakers.set('OFF', { key: 'OFF', label: 'Off', phases: [] })
	}

	// Sort phases by numeric value
	for (const speaker of speakers.values()) {
		if (Array.isArray(speaker.phases)) {
			speaker.phases.sort((a, b) => a.numeric - b.numeric)
		}
	}

	// Build speaker choices (sorted, with OFF first)
	const sorted = Array.from(speakers.values()).filter((s) => s.key !== 'OFF')
	sorted.sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base', numeric: true }))

	const speakerChoices = [{ id: 'OFF', label: 'Off' }, ...sorted.map((s) => ({ id: s.key, label: s.label }))]

	// Create filtered speaker choices for subwoofers only
	const categories = STARTING_POINTS_SOURCE.categories || {}
	const subwooferSpeakers = sorted.filter((s) => {
		// Check category using canonical key matching
		const canonical = canonicalizeSpeakerKey(s.key)
		// Try all possible keys: label, key, and check each category key after normalization
		for (const [catKey, catValue] of Object.entries(categories)) {
			const normalizedCatKey = canonicalizeSpeakerKey(catKey)
			if (normalizedCatKey === canonical && catValue === 'subwoofer') {
				return true
			}
		}
		return false
	})
	const subwooferSpeakerChoices = [
		{ id: '', label: '-- None --' },
		...subwooferSpeakers.map((s) => ({ id: s.key, label: s.label })),
	]

	// Create filtered speaker choices for line arrays only
	const lineArraySpeakers = sorted.filter((s) => {
		const canonical = canonicalizeSpeakerKey(s.key)
		for (const [catKey, catValue] of Object.entries(categories)) {
			const normalizedCatKey = canonicalizeSpeakerKey(catKey)
			if (normalizedCatKey === canonical && catValue === 'line-array') {
				return true
			}
		}
		return false
	})
	const lineArraySpeakerChoices = [
		{ id: '', label: '-- None --' },
		...lineArraySpeakers.map((s) => ({ id: s.key, label: s.label })),
	]

	// Build dynamic phase option definitions grouped by phase combinations
	const phaseGroupMap = new Map()
	const speakerPhaseGroup = new Map()
	let phaseGroupCounter = 0

	for (const speaker of speakers.values()) {
		if (speaker.key === 'OFF') continue
		const comboKey = Array.isArray(speaker.phases)
			? speaker.phases
					.map((p) => p.id)
					.sort((a, b) => a.localeCompare(b))
					.join('|')
			: ''

		let group = phaseGroupMap.get(comboKey)
		if (!group) {
			const choices = speaker.phases.map((phase) => ({ id: phase.id, label: phase.label }))
			const optionId = `phase_option_${++phaseGroupCounter}`
			group = {
				optionId,
				choices,
				defaultId: speaker.phases[0]?.id || '',
				speakers: new Set(),
			}
			phaseGroupMap.set(comboKey, group)
		}

		group.speakers.add(speaker.key)
		speakerPhaseGroup.set(speaker.key, group.optionId)
	}

	const phaseOptionDefs = Array.from(phaseGroupMap.values()).map((group) => {
		const allowedSpeakers = Array.from(group.speakers)
		const allowedListJson = JSON.stringify(allowedSpeakers)
		const isVisible = new Function(
			'options',
			`const speaker = options && options.speaker !== undefined && options.speaker !== null ? String(options.speaker) : '';
       if (!speaker || speaker === 'OFF') return false;
       return ${allowedListJson}.includes(speaker);`,
		)

		return {
			type: 'dropdown',
			id: group.optionId,
			label: 'Phase Curve',
			default: group.defaultId,
			choices: group.choices,
			isVisible,
		}
	})

	// Build starting point option definitions (one per speaker that has starting points)
	const startingPointOptionDefs = []
	const speakerStartingPointOption = new Map()
	const speakerStartingPoints = new Map()
	let startingPointCounter = 0

	for (const speaker of speakers.values()) {
		if (speaker.key === 'OFF') continue
		const canonical = canonicalizeSpeakerKey(speaker.key)
		if (!canonical) continue
		const entries = startingPointData.get(canonical)
		if (!Array.isArray(entries) || entries.length === 0) continue

		const optionId = `starting_point_option_${++startingPointCounter}`
		const safeSpeakerJson = JSON.stringify(speaker.key)
		const choices = [
			{ id: '', label: 'Do not apply starting point' },
			...entries.map((entry) => ({ id: entry.id, label: entry.title })),
		]
		const isVisible = new Function(
			'options',
			`const speaker = options && options.speaker !== undefined && options.speaker !== null ? String(options.speaker) : '';
       return speaker === ${safeSpeakerJson};`,
		)
		startingPointOptionDefs.push({
			type: 'dropdown',
			id: optionId,
			label: 'Starting point',
			default: '',
			choices,
			isVisible,
		})
		speakerStartingPointOption.set(speaker.key, optionId)
		speakerStartingPoints.set(speaker.key, entries)
	}

	// Create gradient-specific starting point options (front and reversed)
	const gradientStartingPointOptionDefs_Front = []
	const gradientStartingPointOptionDefs_Reversed = []
	const gradientSpeakerStartingPointOption_Front = new Map()
	const gradientSpeakerStartingPointOption_Reversed = new Map()
	let gradientStartingPointCounter = 0

	// Create endfire-specific starting point options
	const endfireStartingPointOptionDefs = []
	const endfireSpeakerStartingPointOption = new Map()
	let endfireStartingPointCounter = 0

	// Create array-specific starting point options
	const arrayStartingPointOptionDefs = []
	const arraySpeakerStartingPointOption = new Map()

	// Create array_endfire-specific starting point options
	const arrayendfireStartingPointOptionDefs = []
	const arrayendfireSpeakerStartingPointOption = new Map()
	let arrayendfireStartingPointCounter = 0

	for (const speaker of speakers.values()) {
		if (speaker.key === 'OFF') continue
		const canonical = canonicalizeSpeakerKey(speaker.key)
		if (!canonical) continue
		const entries = startingPointData.get(canonical)
		if (!Array.isArray(entries) || entries.length === 0) continue

		const safeSpeakerJson = JSON.stringify(speaker.key)
		const choices = [{ id: '', label: '-- None --' }, ...entries.map((entry) => ({ id: entry.id, label: entry.title }))]

		// Gradient Front starting point option
		const frontOptionId = `gradient_sp_front_${++gradientStartingPointCounter}`
		const isVisibleFront = new Function(
			'options',
			`const mode = options && options.mode !== undefined ? String(options.mode) : '';
       const speaker = options && options.gradient_speaker !== undefined && options.gradient_speaker !== null ? String(options.gradient_speaker) : '';
       return mode === 'gradient' && speaker === ${safeSpeakerJson};`,
		)
		gradientStartingPointOptionDefs_Front.push({
			type: 'dropdown',
			id: frontOptionId,
			label: 'Starting Point Front',
			default: '',
			choices,
			isVisible: isVisibleFront,
		})
		gradientSpeakerStartingPointOption_Front.set(speaker.key, frontOptionId)

		// Gradient Reversed starting point option
		const reversedOptionId = `gradient_sp_reversed_${gradientStartingPointCounter}`
		const isVisibleReversed = new Function(
			'options',
			`const mode = options && options.mode !== undefined ? String(options.mode) : '';
       const speaker = options && options.gradient_speaker !== undefined && options.gradient_speaker !== null ? String(options.gradient_speaker) : '';
       return mode === 'gradient' && speaker === ${safeSpeakerJson};`,
		)
		gradientStartingPointOptionDefs_Reversed.push({
			type: 'dropdown',
			id: reversedOptionId,
			label: 'Starting Point Reversed',
			default: '',
			choices,
			isVisible: isVisibleReversed,
		})
		gradientSpeakerStartingPointOption_Reversed.set(speaker.key, reversedOptionId)

		// End-Fire starting point option
		const endfireOptionId = `endfire_sp_${++endfireStartingPointCounter}`
		const isVisibleEndfire = new Function(
			'options',
			`const mode = options && options.mode !== undefined ? String(options.mode) : '';
       const speaker = options && options.endfire_speaker !== undefined && options.endfire_speaker !== null ? String(options.endfire_speaker) : '';
       return mode === 'endfire' && speaker === ${safeSpeakerJson};`,
		)
		endfireStartingPointOptionDefs.push({
			type: 'dropdown',
			id: endfireOptionId,
			label: 'Starting Point',
			default: '',
			choices,
			isVisible: isVisibleEndfire,
		})
		endfireSpeakerStartingPointOption.set(speaker.key, endfireOptionId)

		// Array starting point option
		const arrayOptionId = `array_sp_${endfireStartingPointCounter}`
		const isVisibleArray = new Function(
			'options',
			`const mode = options && options.mode !== undefined ? String(options.mode) : '';
       const speaker = options && options.array_speaker !== undefined && options.array_speaker !== null ? String(options.array_speaker) : '';
       return mode === 'array' && speaker === ${safeSpeakerJson};`,
		)
		arrayStartingPointOptionDefs.push({
			type: 'dropdown',
			id: arrayOptionId,
			label: 'Starting Point',
			default: '',
			choices,
			isVisible: isVisibleArray,
		})
		arraySpeakerStartingPointOption.set(speaker.key, arrayOptionId)

		// Array End-Fire starting point option
		const arrayendfireOptionId = `arrayendfire_sp_${++arrayendfireStartingPointCounter}`
		const isVisibleArrayEndfire = new Function(
			'options',
			`const mode = options && options.mode !== undefined ? String(options.mode) : '';
       const speaker = options && options.arrayendfire_speaker !== undefined && options.arrayendfire_speaker !== null ? String(options.arrayendfire_speaker) : '';
       return mode === 'array_endfire' && speaker === ${safeSpeakerJson};`,
		)
		arrayendfireStartingPointOptionDefs.push({
			type: 'dropdown',
			id: arrayendfireOptionId,
			label: 'Starting Point',
			default: '',
			choices,
			isVisible: isVisibleArrayEndfire,
		})
		arrayendfireSpeakerStartingPointOption.set(speaker.key, arrayendfireOptionId)
	}

	return {
		speakerChoices,
		subwooferSpeakerChoices,
		lineArraySpeakerChoices,
		lookup,
		speakers,
		phaseOptionDefs,
		speakerPhaseGroup,
		startingPointOptionDefs,
		speakerStartingPointOption,
		startingPoints: speakerStartingPoints,
		gradientStartingPointOptionDefs_Front,
		gradientStartingPointOptionDefs_Reversed,
		gradientSpeakerStartingPointOption_Front,
		gradientSpeakerStartingPointOption_Reversed,
		endfireStartingPointOptionDefs,
		endfireSpeakerStartingPointOption,
		arrayStartingPointOptionDefs,
		arraySpeakerStartingPointOption,
		arrayendfireStartingPointOptionDefs,
		arrayendfireSpeakerStartingPointOption,
	}
})()

// ===================================================
// =============== FILTER TYPE CHOICES ===============
// ===================================================

const FILTER_TYPE_CHOICES_HP = [
	{ id: '1', label: 'Butterworth 6 dB' },
	{ id: '2', label: 'Butterworth 12 dB' },
	{ id: '3', label: 'Butterworth 18 dB' },
	{ id: '4', label: 'Butterworth 24 dB' },
	// { id: '5', label: 'Butterworth 30 dB' }, // secret option (hidden)
	// { id: '6', label: 'Butterworth 36 dB' }, // secret option (hidden)
	// { id: '7', label: 'Butterworth 42 dB' }, // secret option (hidden)
	{ id: '8', label: 'Butterworth 48 dB' },
	{ id: '9', label: 'Linkwitz-Riley 12 dB' },
	{ id: '10', label: 'Linkwitz-Riley 24 dB' },
	{ id: '11', label: '2nd Order (Legacy)' },
	{ id: '12', label: 'Elliptical (Legacy)' },
]

const FILTER_TYPE_CHOICES_LP = [
	{ id: '1', label: 'Butterworth 6 dB' },
	{ id: '2', label: 'Butterworth 12 dB' },
	{ id: '3', label: 'Butterworth 18 dB' },
	{ id: '4', label: 'Butterworth 24 dB' },
	// { id: '5', label: 'Butterworth 30 dB' }, // secret option (hidden)
	// { id: '6', label: 'Butterworth 36 dB' }, // secret option (hidden)
	// { id: '7', label: 'Butterworth 42 dB' }, // secret option (hidden)
	{ id: '8', label: 'Butterworth 48 dB' },
	{ id: '9', label: 'Linkwitz-Riley 12 dB' },
	{ id: '10', label: 'Linkwitz-Riley 24 dB' },
	{ id: '11', label: 'Low Pass (Legacy)' },
]

const ALLPASS_BAND_CHOICES = [
	{ id: '1', label: 'Band 1' },
	{ id: '2', label: 'Band 2' },
	{ id: '3', label: 'Band 3' },
]

// ===================================================
// =========== FACTORY RESET COMMANDS ================
// ===================================================

/**
 * Factory reset commands for output channels
 * Use {ch} placeholder for channel number
 */
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

// ===================================================
// ==================== EXPORTS ======================
// ===================================================

module.exports = {
	normalizeSpeakerKey,
	canonicalizeSpeakerKey,
	STARTING_POINTS_SOURCE,
	PRODUCT_INTEGRATION_RAW,
	PRODUCT_INTEGRATION_DATA,
	FILTER_TYPE_CHOICES_HP,
	FILTER_TYPE_CHOICES_LP,
	ALLPASS_BAND_CHOICES,
	FACTORY_RESET_COMMANDS,
}
