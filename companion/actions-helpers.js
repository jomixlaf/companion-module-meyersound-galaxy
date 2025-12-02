// actions-helpers.js
// Helper functions used by action implementations

/**
 * Safely parse and validate channel selections from action options
 * @param {Object} options - Action options object
 * @param {string} key - Property key to extract channels from
 * @param {number} max - Maximum valid channel number
 * @returns {number[]} Array of valid channel numbers
 */
function safeGetChannels(options, key, max) {
	try {
		if (!options || !options[key]) return []

		const raw = Array.isArray(options[key]) ? options[key] : [options[key]]

		return raw.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n >= 1 && n <= max)
	} catch (err) {
		console.error(`Error parsing channels for ${key}:`, err)
		return []
	}
}

/**
 * Calculate speed of sound in meters per second based on temperature
 * @param {number} tempC - Temperature in Celsius
 * @returns {number} Speed of sound in m/s
 */
function speedOfSound_mps(tempC) {
	const T = Number.isFinite(Number(tempC)) ? Number(tempC) : 20
	return 331.3 + 0.606 * T
}

/**
 * Build matrix input choices with live names
 * @param {Object} self - Module instance
 * @returns {Array} Choices array for matrix inputs (1-32)
 */
function buildMatrixInputChoices(self) {
	if (!self) return [{ id: '1', label: '1' }]
	const choices = []
	for (let i = 1; i <= 32; i++) {
		const nm = self?.inputName?.[i]
		const theLabel = nm && String(nm).trim() !== '' ? `${i} - ${nm}` : `${i}`
		choices.push({ id: String(i), label: theLabel })
	}
	return choices
}

/**
 * Build matrix output choices with live names
 * @param {Object} self - Module instance
 * @param {number} NUM_OUTPUTS - Number of output channels
 * @returns {Array} Choices array for matrix outputs
 */
function buildMatrixOutputChoices(self, NUM_OUTPUTS) {
	if (!self) return [{ id: '1', label: '1' }]
	const choices = []
	for (let o = 1; o <= NUM_OUTPUTS; o++) {
		const nm = self?.outputName?.[o]
		const label = nm && String(nm).trim() !== '' ? `${o} - ${nm}` : `${o}`
		choices.push({ id: String(o), label })
	}
	return choices
}

/**
 * Quote and escape a snapshot argument for the command protocol
 * @param {string} text - Text to quote
 * @returns {string} Quoted and escaped string
 */
function quoteSnapshotArg(text) {
	const safe = String(text ?? '')
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\r?\n/g, ' ')
	return `"${safe}"`
}

/**
 * Build a label string showing the current active snapshot info
 * @param {Object} self - Module instance
 * @returns {string} Formatted active snapshot label
 */
function buildActiveSnapshotLabel(self) {
	let raw = self?.snapshotValues?.snapshot_active_id
	if (raw == null && typeof self?.getVariableValue === 'function') {
		raw = self.getVariableValue('snapshot_active_id')
	}
	const idMatch = String(raw ?? '').match(/\d+/)
	const id = idMatch ? Number(idMatch[0]) : null
	if (!Number.isFinite(id)) return 'Active snapshot: Unknown'

	const name = String(self?.snapshotValues?.snapshot_active_name ?? '').trim()
	const comment = String(self?.snapshotValues?.snapshot_active_comment ?? '').trim()
	const pieces = [`ID ${id}`]
	if (name) pieces.push(`Name "${name}"`)
	if (comment) pieces.push(`Comment "${comment}"`)
	return `Active snapshot: ${pieces.join(' — ')}`
}

module.exports = {
	safeGetChannels,
	speedOfSound_mps,
	buildMatrixInputChoices,
	buildMatrixOutputChoices,
	quoteSnapshotArg,
	buildActiveSnapshotLabel,
}
