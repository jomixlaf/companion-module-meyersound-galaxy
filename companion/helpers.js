// helpers.js
// Shared utility functions used across actions.js, feedbacks.js, variables.js, and presets.js

/**
 * Constants
 */
const SNAPSHOT_MAX = 255
const DISPLAY_NOCHANGE = 'nochange'

const DISPLAY_BRIGHTNESS_CHOICES = [
	{ id: '0', label: 'Level 0 (Dim)' },
	{ id: '1', label: 'Level 1 (Normal)' },
	{ id: '2', label: 'Level 2 (Bright)' },
]

const DISPLAY_COLOR_CHOICES = [
	{ id: '0', label: 'Green' },
	{ id: '1', label: 'Blue' },
	{ id: '2', label: 'Yellow' },
	{ id: '3', label: 'Cyan' },
	{ id: '4', label: 'Magenta' },
	{ id: '5', label: 'Red' },
]

/**
 * Generate an array of choices from 1 to n
 * @param {number} n - Maximum number
 * @param {string} prefix - Optional prefix for labels
 * @returns {Array<{id: string, label: string}>}
 */
function rangeChoices(n, prefix = '') {
	const a = []
	for (let i = 1; i <= n; i++) a.push({ id: String(i), label: `${prefix}${i}` })
	return a
}

/**
 * Safe fallback helper (no nullish coalescing for older Node versions)
 * @param {*} v - Value to check
 * @param {*} d - Default value
 * @returns {*} v if not null/undefined, otherwise d
 */
function nn(v, d) {
	return v !== undefined && v !== null ? v : d
}

/**
 * Build input channel choices with live names
 * @param {Object} self - Module instance
 * @param {number} NUM_INPUTS - Number of input channels
 * @returns {Array<{id: string, label: string}>}
 */
function buildInputChoices(self, NUM_INPUTS) {
	if (!self) return [{ id: '1', label: '1' }]
	const choices = []
	for (let ch = 1; ch <= NUM_INPUTS; ch++) {
		const nm = self?.inputName?.[ch]
		const label = nm && String(nm).trim() !== '' ? `${ch} - ${nm}` : `${ch}`
		choices.push({ id: String(ch), label })
	}
	return choices
}

/**
 * Build output channel choices with live names
 * @param {Object} self - Module instance
 * @param {number} NUM_OUTPUTS - Number of output channels
 * @returns {Array<{id: string, label: string}>}
 */
function buildOutputChoices(self, NUM_OUTPUTS) {
	if (!self) return [{ id: '1', label: '1' }]
	const choices = []
	for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
		const nm = self?.outputName?.[ch]
		const label = nm && String(nm).trim() !== '' ? `${ch} - ${nm}` : `${ch}`
		choices.push({ id: String(ch), label })
	}
	return choices
}

/**
 * Get the currently active snapshot ID
 * @param {Object} self - Module instance
 * @returns {number|null}
 */
function getActiveSnapshotId(self) {
	let raw = self?.snapshotValues?.snapshot_active_id
	if (raw == null && typeof self?.getVariableValue === 'function') {
		raw = self.getVariableValue('snapshot_active_id')
	}
	const match = String(raw ?? '').match(/\d+/)
	if (!match) return null
	const id = Number(match[0])
	return Number.isFinite(id) ? id : null
}

/**
 * Get the boot snapshot ID
 * @param {Object} self - Module instance
 * @returns {number|null}
 */
function getBootSnapshotId(self) {
	let raw = self?.snapshotValues?.snapshot_boot_id
	if (raw == null && typeof self?.getVariableValue === 'function') {
		raw = self.getVariableValue('snapshot_boot_id')
	}
	const match = String(raw ?? '').match(/-?\d+/)
	if (!match) return null
	const id = Number(match[0])
	return Number.isFinite(id) ? id : null
}

/**
 * Build snapshot choices with names and status indicators
 * @param {Object} self - Module instance
 * @returns {Array<{id: string, label: string}>}
 */
function buildSnapshotChoices(self) {
	const choices = []
	let bootId = getBootSnapshotId(self)

	try {
		for (let id = 0; id <= SNAPSHOT_MAX; id++) {
			const nm = String(self?.snapshotValues?.[`snapshot_${id}_name`] ?? '').trim()
			if (!nm) continue
			const comment = String(self?.snapshotValues?.[`snapshot_${id}_comment`] ?? '').trim()
			const lockedRaw = String(self?.snapshotValues?.[`snapshot_${id}_locked`] ?? '').trim()
			const isLocked = /^(true|1|on)$/i.test(lockedRaw)
			const isBoot = Number.isFinite(bootId) && bootId >= 0 && bootId === id

			const icons = []
			if (isBoot) icons.push('⭐')
			if (isLocked) icons.push('🔒')
			const prefix = icons.length ? `${icons.join(' ')} ` : ''

			let label = `${prefix}${id}: ${nm}`
			if (comment) label += ` — ${comment}`

			choices.push({ id: String(id), label })
		}
	} catch (err) {
		self?.log?.('error', `Error building snapshot choices: ${err}`)
		return [{ id: '0', label: '0: Factory Defaults' }]
	}

	if (choices.length === 0) {
		choices.push({ id: '0', label: '0: Factory Defaults' })
	}

	return choices
}

/**
 * Get human-readable label for filter type
 * @param {number|string} id - Filter type ID
 * @param {string} kind - 'highpass' or 'lowpass' (for context)
 * @returns {string}
 */
function filterTypeLabel(id, kind = 'highpass') {
	const map = {
		1: 'Butterworth 6dB',
		2: 'Butterworth 12dB',
		3: 'Butterworth 18dB',
		4: 'Butterworth 24dB',
		5: 'Butterworth 30dB',
		6: 'Butterworth 36dB',
		7: 'Butterworth 42dB',
		8: 'Butterworth 48dB',
		9: 'Linkwitz-Riley 12dB',
		10: 'Linkwitz-Riley 24dB',
		11: kind === 'highpass' ? '2nd Order (Legacy)' : 'Low Pass (Legacy)',
		12: 'Elliptical (Legacy)',
	}
	const n = Number(id)
	if (!Number.isFinite(n)) return String(id ?? '')
	return map[n] || `Type ${n}`
}

/**
 * Get human-readable label for display brightness
 * @param {number|string} value - Brightness level (0-2)
 * @returns {string}
 */
function displayBrightnessLabel(value) {
	const labels = {
		0: 'Level 0 (Dim)',
		1: 'Level 1 (Normal)',
		2: 'Level 2 (Bright)',
	}
	if (value === null || value === undefined || value === '') return '---'
	const key = String(value)
	return labels[key] || `Level ${key}`
}

/**
 * Get human-readable label for display color
 * @param {number|string} value - Color ID (0-5)
 * @returns {string}
 */
function displayColorLabel(value) {
	const labels = {
		0: 'Green',
		1: 'Blue',
		2: 'Yellow',
		3: 'Cyan',
		4: 'Magenta',
		5: 'Red',
	}
	if (value === null || value === undefined || value === '') return '---'
	const key = String(value)
	return labels[key] || `Color ${key}`
}

module.exports = {
	// Constants
	SNAPSHOT_MAX,
	DISPLAY_NOCHANGE,
	DISPLAY_BRIGHTNESS_CHOICES,
	DISPLAY_COLOR_CHOICES,

	// Choice builders
	rangeChoices,
	buildInputChoices,
	buildOutputChoices,
	buildSnapshotChoices,

	// Snapshot helpers
	getActiveSnapshotId,
	getBootSnapshotId,

	// Label formatters
	filterTypeLabel,
	displayBrightnessLabel,
	displayColorLabel,

	// Utility
	nn,
}
