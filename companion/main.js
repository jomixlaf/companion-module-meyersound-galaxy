// main.js
const net = require('net')
const { InstanceBase, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
const UpgradeScripts = require('./upgrades')
const UpdatePresets = require('./presets')
const { STARTING_POINTS_SOURCE, PRODUCT_INTEGRATION_DATA } = require('./actions-data')

// Protocol constants
const EOL_SPLIT = /\r\n|\n|\r/ // Line ending split pattern for incoming data
const TX_EOL = '\n' // Line ending for outgoing commands

// Device channel counts (Galaxy 816 model)
// NOTE: Different Galaxy models may have different channel counts:
// - Galaxy 408: 4 inputs, 8 outputs
// - Galaxy 816/816AES/816Bluehorn: 8 inputs, 16 outputs
const NUM_INPUTS = 8 // Physical input channels available
const NUM_OUTPUTS = 16 // Physical output channels available
const MATRIX_INPUTS = 32 // Matrix routing supports 32 virtual inputs

// Signal processing constants
const MATRIX_ROUTE_THRESHOLD_DB = -89.9 // Gains at or below this value are considered "off/unrouted"
const SAMPLES_PER_MS = 96 // Sample rate conversion: 96 samples = 1ms @ 96kHz

// Timing constants (in milliseconds)
const RECONNECT_DELAY_MS = 1000 // Initial delay before attempting to reconnect subscription socket
const RECONNECT_MAX_DELAY_MS = 30000 // Maximum delay between reconnection attempts (30 seconds)
const RECONNECT_MAX_ATTEMPTS = 0 // Maximum reconnection attempts (0 = infinite retries)
const CMD_SOCKET_TIMEOUT_MS = 1500 // Time to keep command socket alive after last command
const CMD_SOCKET_RETRY_MS = 800 // Delay before retrying failed command socket connection
const METER_BATCH_INTERVAL_MS = 100 // Batch meter updates to reduce UI thrashing
const UI_REFRESH_DEBOUNCE_MS = 150 // Debounce delay for actions/feedbacks/variables refresh
const PRESET_REFRESH_DEBOUNCE_MS = 250 // Debounce delay for preset refresh (slightly longer)
const PREV_GAIN_CAPTURE_WINDOW_MS = 300 // Window to capture "previous" gain before SET operation

// Display labels
const DISPLAY_BRIGHTNESS_LABELS = {
	0: 'Level 0 (Dim)',
	1: 'Level 1 (Normal)',
	2: 'Level 2 (Bright)',
}

const DISPLAY_COLOR_LABELS = {
	0: 'Green',
	1: 'Blue',
	2: 'Yellow',
	3: 'Cyan',
	4: 'Magenta',
	5: 'Red',
}

// ---- Output filter types ----
const FILTER_TYPE_LABELS = {
	1: 'Butterworth 6dB',
	2: 'Butterworth 12dB',
	3: 'Butterworth 18dB',
	4: 'Butterworth 24dB',
	5: 'Butterworth 30dB', // legacy option (hidden)
	6: 'Butterworth 36dB', // legacy option (hidden)
	7: 'Butterworth 42dB', // legacy option (hidden)
	8: 'Butterworth 48dB',
	9: 'Linkwitz-Riley 12dB',
	10: 'Linkwitz-Riley 24dB',
	11: 'Low Pass (Legacy)',
	12: 'Elliptical (Legacy)',
}

function formatFilterType(id) {
	const n = Number(id)
	if (!Number.isFinite(n)) return String(id ?? '')
	return FILTER_TYPE_LABELS[n] || `Type ${n}`
}

// ---- Snapshots ----
const SNAPSHOT_MAX = 255
const SNAPSHOT_FIELDS = ['comment', 'created', 'last_updated', 'locked', 'modified', 'name']
const SNAPSHOT_ACTIVE_FIELDS = ['comment', 'created', 'id', 'last_updated', 'locked', 'modified', 'name']

// ---- Entity (/entity/*) variables we expose ----
const ENTITY_PATHS = [
	'entity_id',
	'entity_model_id',
	'entity_name',
	'firmware_version',
	'group_name',
	'input_channel_count',
	'input_stream_count',
	'output_channel_count',
	'output_stream_count',
	'serial_number',
]

// ---- Clock AES Output (/status/clock/aes_output/*) ----
const CLOCK_AES_STATUS_PATHS = {
	input_number: 'aes_output_input_number',
	sample_rate: 'aes_output_sample_rate',
	source: 'aes_output_source',
	sync: 'aes_output_sync',
}

// ---- Clock Input (/status/clock/input/{1..3}/*) ----
const CLOCK_INPUT_INDEXES = [1, 2, 3]
const CLOCK_INPUT_LEAVES = ['sample_rate', 'sync']

// ---- Clock System (/status/clock/system/*) ----
const CLOCK_SYSTEM_PATHS = {
	input_number: 'clock_system_input_number',
	sample_rate: 'clock_system_sample_rate',
	source: 'clock_system_source',
	sync: 'clock_system_sync',
}

// ---- Word Clock (/status/clock/word_clock/*) ----
const WORD_CLOCK_PATHS = {
	sample_rate: 'word_clock_sample_rate',
	sync: 'word_clock_sync',
	termination: 'word_clock_termination',
}

// ---- RTC ----
const RTC_PATH = '/status/clock/rtc/date_and_time'
const RTC_VAR = 'rtc_date_and_time'

// ---- Status network (/status/network/*) + model string ----
const NET_IFACES = [1, 2]
const NET_LEAVES = ['carrier', 'duplex', 'gateway', 'ip_address', 'mac_address', 'net_mask', 'speed']
const MODEL_STRING_PATH = '/status/model_string'

// ---- dB helpers ----
function clampDb(v) {
	const n = Number(v)
	if (!Number.isFinite(n)) return 0
	return Math.max(-90, Math.min(20, n))
}
function roundTenth(v) {
	return Math.round(v * 10) / 10
}
function dbToAmp(db) {
	return Math.pow(10, clampDb(db) / 20)
}
function ampToDb(a) {
	const amp = Math.max(a, 1e-9)
	return clampDb(20 * Math.log10(amp))
}

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// subscribe socket (persistent)
		this.subSock = null
		this.subBuf = ''
		this._reconnectAttempts = 0
		this._reconnectDelay = RECONNECT_DELAY_MS

		// meters (dBFS)
		this.inputMeter = {} // { ch: number }
		this.outputMeter = {} // { ch: number }
		this.matrixInMeter = {} // { idx: number }  // matrix input meters 1..32

		// ✅ FIX: Initialize meter batching
		this._meterRateMs = METER_BATCH_INTERVAL_MS
		this._meterPending = { in: {}, out: {}, mxin: {} }
		this._meterFlushTimer = null

		// input modes (0..4)
		this.inputMode = {} // { ch: number }

		// delays cache
		this.inputDelay = {} // { ch: { raw: string|undefined, ms: number|null, samples: number|null } }
		this.outputDelay = {} // { ch: { raw: string|undefined, ms: number|null, samples: number|null } }

		// command socket (short-lived with queue)
		this.cmdSock = null
		this.cmdQueue = []
		this.cmdConnecting = false
		this.cmdTimer = null

		// state caches
		this.inMute = {}
		this.outMute = {}
		this.outputPolarity = {}
		this.outputHighpass = {}
		this.outputLowpass = {}
		this.outputAllpass = {} // { ch: { band: { bypass: bool, frequency: number|null, q: number|null } } }
		this.inputGain = {} // { ch: number (dB, 0.1) }
		this.outputGain = {} // { ch: number (dB, 0.1) }
		this.matrixGain = {} // { 'mi-mo': number }
		this.matrixDelay = {} // { 'mi-mo': { samples: number, ms: number, bypass: boolean } }
		this._matrixInputRoutes = {}
		this._matrixOutputRoutes = {}

		// previous gain caches (for revert)
		this._prevInputGainByButton = new Map()
		this._prevOutputGainByButton = new Map()
		this._prevInputGain = {}
		this._prevOutputGain = {}

		// NEW: short capture windows (press → GET → overwrite prev if fresher value arrives)
		this._pendingPrevCaptureIn = new Map() // key: `${ch}::${btn}` -> { untilTs }
		this._pendingPrevCaptureOut = new Map()

		this.accessPrivilege = 0n

		// metadata/clock caches
		this.entityValues = {}
		this.clockAesValues = {}
		this.clockInputValues = {}
		this.clockSystemValues = {}
		this.wordClockValues = {}
		this.displayPrefs = { brightness: null, display_color: null }
		this.miscValues = {}
		this.inputLinkGroupBypass = {} // { group: boolean }
		this.outputLinkGroupBypass = {} // { group: boolean }
		this.inputLinkGroupAssign = {} // { ch: group (0-4) }
		this.outputLinkGroupAssign = {} // { ch: group (0-8) }

		// names
		this.inputName = {} // { ch: string }
		this.outputName = {} // { ch: string }

		// matrix crosspoints
		this.matrixCrosspointsUsed = 0 // 0-232

		// solo state tracking
		this.inputSoloState = null // null or { soloChannels: Set }
		this.outputSoloState = null // null or { soloChannels: Set }

		// status network + model
		this.statusNetwork = {} // { `status_network_${iface}_${leaf}`: value }
		this.modelString = '' // status_model_string

		// snapshots cache
		this.snapshotValues = {} // { snapshot_<id>_<field>: value, snapshot_active_<field>: value }

		// fades (generic)
		this._fades = new Map()
		this._gainFadesIn = {}
		this._gainFadesOut = {}

		// ===== Previous gain tracking (per-channel + per-button) =====
		// Channel-scoped "previous" gain (last captured before a set)
		this._prevGain = {
			input: {}, // { ch: numberDb }
			output: {}, // { ch: numberDb }
		}
		// Button-scoped "previous" gain
		this._prevByButton = {
			input: {}, // { btnId: { ch: numberDb } }
			output: {}, // { btnId: { ch: numberDb } }
		}
		this._prevCaptureWindows = new Map()

		// ✅ FIX: Initialize refresh timers
		this._actionsRefreshTimer = null
		this._feedbacksRefreshTimer = null
		this._variablesRefreshTimer = null
		this._presetsRefreshTimer = null

		// Speaker test (output chase)
		this._chase = {
			running: false,
			timer: null,
			list: [],
			index: 0,
			delayMs: 1000,
			windowSize: 1, // 1 = solo steps, 2 = solo->pair->advance
			phase: 0,
			prevActive: new Set(),
			loop: false,
			activeButtons: new Set(), // controlIds of buttons that started current chase
		}

		// UI flash state for feedback
		this._flash = {
			timer: null,
			phase: true, // true = default color; false = black
		}

		// Log history request state
		this._logHistoryInFlight = null
		this._logHistoryFetched = false
		this._connectLogSent = false
		this._lastLogMessages = []
		this.fanStatus = {}

		// U-Shaping EQ state
		this.inputUShaping = {} // { ch: { bypass: bool, band: { gain, frequency, slope } } }
		this._ushapingKnobControl = { selectedInputs: [1], selectedBand: 1 }

		// Parametric EQ state
		this.inputEQ = {} // { ch: { bypass: bool, band: { gain, frequency, bandwidth, band_bypass } } }
		this._eqKnobControl = { selectedInputs: [1], selectedBand: 1 }
	}

	async init(config) {
		this.config = config
		this.updateStatus(InstanceStatus.Ok, 'Idle')

		this.updateActions()
		this.updateFeedbacks()
		this.updateVariableDefinitions()
		this.updatePresets()
		this._seedVariables()

		// Seed speaker-test variables
		this._updateSpeakerTestVars()

		this._startSubscribe()
	}

	async destroy() {
		this._stopAllFades()
		this._stopAllInputFades()
		this._stopAllOutputFades()
		this._stopOutputChase()
		this._stopSpeakerFlashTimer()

		// ✅ FIX: Clean up all timers
		clearTimeout(this._actionsRefreshTimer)
		this._actionsRefreshTimer = null
		clearTimeout(this._feedbacksRefreshTimer)
		this._feedbacksRefreshTimer = null
		clearTimeout(this._variablesRefreshTimer)
		this._variablesRefreshTimer = null
		clearTimeout(this._meterFlushTimer)
		this._meterFlushTimer = null

		try {
			this.subSock?.destroy()
		} catch {}
		this.subSock = null
		clearTimeout(this.cmdTimer)
		this.cmdTimer = null
		try {
			this.cmdSock?.destroy()
		} catch {}
		this.cmdSock = null
	}

	async configUpdated(config) {
		this.config = config
		this.updateActions()
		this.updateFeedbacks()
		this.updateVariableDefinitions()
		this.updatePresets()
		this._seedVariables()

		this._stopAllFades()
		this._stopAllInputFades()
		this._stopAllOutputFades()
		this._stopOutputChase()
		this._stopSpeakerFlashTimer()

		// ✅ FIX: Clean up timers on config update
		clearTimeout(this._actionsRefreshTimer)
		this._actionsRefreshTimer = null
		clearTimeout(this._feedbacksRefreshTimer)
		this._feedbacksRefreshTimer = null
		clearTimeout(this._variablesRefreshTimer)
		this._variablesRefreshTimer = null
		clearTimeout(this._meterFlushTimer)
		this._meterFlushTimer = null

		try {
			this.subSock?.destroy()
		} catch {}
		this.subSock = null
		this._startSubscribe()

		clearTimeout(this.cmdTimer)
		this.cmdTimer = null
		try {
			this.cmdSock?.destroy()
		} catch {}
		this.cmdSock = null

		this._updateSpeakerTestVars()
		this._logHistoryFetched = false
		this.fanStatus = {}
	}

	// -------- Config UI --------
	getConfigFields() {
		return [
			{
				type: 'bonjour-device',
				id: 'bonjour_host',
				label: 'Device',
				width: 6,
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP / Hostname',
				width: 8,
				default: '192.168.0.100',
				isVisible: (options) => !options.bonjour_host,
				regex: this.REGEX_HOSTNAME,
			},
			{
				type: 'number',
				id: 'port',
				label: 'Port',
				width: 4,
				default: 25003,
				min: 1,
				max: 65535,
				step: 1,
				isVisible: (options) => !options.bonjour_host,
			},
		]
	}

	// -------- Subscribe socket (~30ms default) --------
	_startSubscribe() {
		const { host, port } = this._resolveHostPortFromConfig()
		if (!host || !port) {
			this.updateStatus(InstanceStatus.BadConfig, 'Set IP/Port')
			return
		}
		if (this.subSock) return

		const sock = new net.Socket()
		this.subSock = sock
		this.subBuf = ''

		const reconnect = () => {
			if (this.subSock === sock) this.subSock = null
			this._logHistoryFetched = false

			// Check if we've exceeded max retry attempts (if limit is set)
			if (RECONNECT_MAX_ATTEMPTS > 0 && this._reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
				this.updateStatus(InstanceStatus.ConnectionFailure, 'Max reconnection attempts reached')
				return
			}

			// Exponential backoff: double delay each time, up to max
			this._reconnectAttempts++
			this._reconnectDelay = Math.min(this._reconnectDelay * 2, RECONNECT_MAX_DELAY_MS)

			this.updateStatus(
				InstanceStatus.Disconnected,
				`Reconnecting in ${(this._reconnectDelay / 1000).toFixed(0)}s (attempt ${this._reconnectAttempts})`,
			)

			setTimeout(() => this._startSubscribe(), this._reconnectDelay)
		}

		sock.on('error', reconnect)
		sock.on('end', reconnect)
		sock.on('close', reconnect)

		sock.on('data', (chunk) => {
			this.subBuf += chunk.toString('utf8')
			const parts = this.subBuf.split(EOL_SPLIT)
			this.subBuf = parts.pop() ?? ''
			for (const raw of parts) {
				const line = raw.trim()
				if (!line) continue
				this._onSubLine(line)
			}
		})

		this.updateStatus(InstanceStatus.Connecting, `Subscribing ${host}:${port}`)
		sock.connect(port, host, () => {
			// Reset reconnection counters on successful connection
			this._reconnectAttempts = 0
			this._reconnectDelay = RECONNECT_DELAY_MS

			this.updateStatus(InstanceStatus.Ok, 'Subscribed')

			// Subscribe inputs
			for (let ch = 1; ch <= NUM_INPUTS; ch++) {
				this._subWrite(`+/processing/input/${ch}/mute`)
				this._subWrite(`+/processing/input/${ch}/gain`)
				this._subWrite(`+/processing/input/${ch}/delay`) // delay in samples

				// U-Shaping bypass
				this._subWrite(`+/processing/input/${ch}/ushaping/bypass`)

				// U-Shaping bands 1-5 (gain, frequency, slope, band_bypass)
				for (let band = 1; band <= 5; band++) {
					this._subWrite(`+/processing/input/${ch}/ushaping/${band}/gain`)
					this._subWrite(`+/processing/input/${ch}/ushaping/${band}/slope`)
					this._subWrite(`+/processing/input/${ch}/ushaping/${band}/band_bypass`)
					// Bands 1-4 have frequency parameter, Band 5 does not
					if (band <= 4) {
						this._subWrite(`+/processing/input/${ch}/ushaping/${band}/frequency`)
					}
				}

				// Parametric EQ bypass (master)
				this._subWrite(`+/processing/input/${ch}/eq/bypass`)

				// Parametric EQ bands 1-5 (gain, frequency, bandwidth, band_bypass)
				for (let band = 1; band <= 5; band++) {
					this._subWrite(`+/processing/input/${ch}/eq/${band}/gain`)
					this._subWrite(`+/processing/input/${ch}/eq/${band}/frequency`)
					this._subWrite(`+/processing/input/${ch}/eq/${band}/bandwidth`)
					this._subWrite(`+/processing/input/${ch}/eq/${band}/band_bypass`)
				}
			}
			// Subscribe outputs
			for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
				this._subWrite(`+/processing/output/${ch}/mute`)
				this._subWrite(`+/processing/output/${ch}/gain`)
				this._subWrite(`+/processing/output/${ch}/delay`) // delay in samples
				this._subWrite(`+/processing/output/${ch}/polarity_reversal`)
				this._subWrite(`+/processing/output/${ch}/highpass/bypass`)
				this._subWrite(`+/processing/output/${ch}/highpass/frequency`)
				this._subWrite(`+/processing/output/${ch}/highpass/type`)
				this._subWrite(`+/processing/output/${ch}/lowpass/bypass`)
				this._subWrite(`+/processing/output/${ch}/lowpass/frequency`)
				this._subWrite(`+/processing/output/${ch}/lowpass/type`)
				for (let band = 1; band <= 3; band++) {
					this._subWrite(`+/processing/output/${ch}/allpass/${band}/band_bypass`)
					this._subWrite(`+/processing/output/${ch}/allpass/${band}/frequency`)
					this._subWrite(`+/processing/output/${ch}/allpass/${band}/q`)
				}

				// U-Shaping bypass
				this._subWrite(`+/processing/output/${ch}/ushaping/bypass`)

				// U-Shaping bands 1-5 (gain, frequency, slope, band_bypass)
				for (let band = 1; band <= 5; band++) {
					this._subWrite(`+/processing/output/${ch}/ushaping/${band}/gain`)
					this._subWrite(`+/processing/output/${ch}/ushaping/${band}/slope`)
					this._subWrite(`+/processing/output/${ch}/ushaping/${band}/band_bypass`)
					if (band <= 4) {
						this._subWrite(`+/processing/output/${ch}/ushaping/${band}/frequency`)
					}
				}

				// Parametric EQ bypass (master)
				this._subWrite(`+/processing/output/${ch}/eq/bypass`)

				// Parametric EQ bands 1-10 (outputs have 10 bands)
				for (let band = 1; band <= 10; band++) {
					this._subWrite(`+/processing/output/${ch}/eq/${band}/gain`)
					this._subWrite(`+/processing/output/${ch}/eq/${band}/frequency`)
					this._subWrite(`+/processing/output/${ch}/eq/${band}/bandwidth`)
					this._subWrite(`+/processing/output/${ch}/eq/${band}/band_bypass`)
				}
			}
			// Seed GETs
			for (let ch = 1; ch <= NUM_INPUTS; ch++) {
				this._subWrite(`/processing/input/${ch}/mute`)
				this._subWrite(`/processing/input/${ch}/gain`)
				this._subWrite(`/processing/input/${ch}/delay`) // get current delay (samples)

				// U-Shaping bypass
				this._subWrite(`/processing/input/${ch}/ushaping/bypass`)

				// U-Shaping bands 1-5 (gain, frequency, slope, band_bypass)
				for (let band = 1; band <= 5; band++) {
					this._subWrite(`/processing/input/${ch}/ushaping/${band}/gain`)
					this._subWrite(`/processing/input/${ch}/ushaping/${band}/slope`)
					this._subWrite(`/processing/input/${ch}/ushaping/${band}/band_bypass`)
					if (band <= 4) {
						this._subWrite(`/processing/input/${ch}/ushaping/${band}/frequency`)
					}
				}

				// Parametric EQ bypass (master)
				this._subWrite(`/processing/input/${ch}/eq/bypass`)

				// Parametric EQ bands 1-5
				for (let band = 1; band <= 5; band++) {
					this._subWrite(`/processing/input/${ch}/eq/${band}/gain`)
					this._subWrite(`/processing/input/${ch}/eq/${band}/frequency`)
					this._subWrite(`/processing/input/${ch}/eq/${band}/bandwidth`)
					this._subWrite(`/processing/input/${ch}/eq/${band}/band_bypass`)
				}
			}
			for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
				this._subWrite(`/processing/output/${ch}/mute`)
				this._subWrite(`/processing/output/${ch}/gain`)
				this._subWrite(`/processing/output/${ch}/delay`) // get current delay (samples)
				this._subWrite(`/processing/output/${ch}/polarity_reversal`)
				this._subWrite(`/processing/output/${ch}/highpass/bypass`)
				this._subWrite(`/processing/output/${ch}/highpass/frequency`)
				this._subWrite(`/processing/output/${ch}/highpass/type`)
				this._subWrite(`/processing/output/${ch}/lowpass/bypass`)
				this._subWrite(`/processing/output/${ch}/lowpass/frequency`)
				this._subWrite(`/processing/output/${ch}/lowpass/type`)
				for (let band = 1; band <= 3; band++) {
					this._subWrite(`/processing/output/${ch}/allpass/${band}/band_bypass`)
					this._subWrite(`/processing/output/${ch}/allpass/${band}/frequency`)
					this._subWrite(`/processing/output/${ch}/allpass/${band}/q`)
				}

				// U-Shaping bypass
				this._subWrite(`/processing/output/${ch}/ushaping/bypass`)

				// U-Shaping bands 1-5 (gain, frequency, slope, band_bypass)
				for (let band = 1; band <= 5; band++) {
					this._subWrite(`/processing/output/${ch}/ushaping/${band}/gain`)
					this._subWrite(`/processing/output/${ch}/ushaping/${band}/slope`)
					this._subWrite(`/processing/output/${ch}/ushaping/${band}/band_bypass`)
					if (band <= 4) {
						this._subWrite(`/processing/output/${ch}/ushaping/${band}/frequency`)
					}
				}

				// Parametric EQ bypass (master)
				this._subWrite(`/processing/output/${ch}/eq/bypass`)

				// Parametric EQ bands 1-10 (outputs have 10 bands)
				for (let band = 1; band <= 10; band++) {
					this._subWrite(`/processing/output/${ch}/eq/${band}/gain`)
					this._subWrite(`/processing/output/${ch}/eq/${band}/frequency`)
					this._subWrite(`/processing/output/${ch}/eq/${band}/bandwidth`)
					this._subWrite(`/processing/output/${ch}/eq/${band}/band_bypass`)
				}
			}

			// Matrix subscribe + seed (32 x 16)
			for (let mi = 1; mi <= MATRIX_INPUTS; mi++) {
				for (let mo = 1; mo <= NUM_OUTPUTS; mo++) {
					const addr = `/processing/matrix/${mi}/${mo}/gain`
					this._subWrite(`+${addr}`)
					this._subWrite(addr)
					// Matrix delay
					const delayAddr = `/processing/matrix/${mi}/${mo}/delay`
					this._subWrite(`+${delayAddr}`)
					this._subWrite(delayAddr)
					// Matrix delay bypass
					const delayBypassAddr = `/processing/matrix/${mi}/${mo}/delay_bypass`
					this._subWrite(`+${delayBypassAddr}`)
					this._subWrite(delayBypassAddr)
					// Matrix delay type
					const delayTypeAddr = `/processing/matrix/${mi}/${mo}/delay_type`
					this._subWrite(`+${delayTypeAddr}`)
					this._subWrite(delayTypeAddr)
				}
			}

			// ===== Meters (subscribe + seed) =====
			// Inputs 1..NUM_INPUTS
			for (let ch = 1; ch <= NUM_INPUTS; ch++) {
				const addr = `/status/meter/input/${ch}`
				this._subWrite(`+${addr}`)
				this._subWrite(addr)
			}
			// Outputs 1..NUM_OUTPUTS
			for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
				const addr = `/status/meter/output/${ch}`
				this._subWrite(`+${addr}`)
				this._subWrite(addr)
			}
			// Matrix inputs 1..32
			for (let i = 1; i <= 32; i++) {
				const addr = `/status/meter/matrix_input/${i}`
				this._subWrite(`+${addr}`)
				this._subWrite(addr)
			}
			// Entity & clocks
			for (const path of ENTITY_PATHS) {
				this._subWrite(`+/entity/${path}`)
				this._subWrite(`/entity/${path}`)
			}
			// Input link groups
			for (let group = 1; group <= 4; group++) {
				this._subWrite(`+/device/input_link_group/${group}/bypass`)
				this._subWrite(`/device/input_link_group/${group}/bypass`)
			}
			// Output link groups
			for (let group = 1; group <= 8; group++) {
				this._subWrite(`+/device/output_link_group/${group}/bypass`)
				this._subWrite(`/device/output_link_group/${group}/bypass`)
			}
			// Input link group assignments
			for (let ch = 1; ch <= NUM_INPUTS; ch++) {
				this._subWrite(`+/device/input/${ch}/input_link_group`)
				this._subWrite(`/device/input/${ch}/input_link_group`)
			}
			// Output link group assignments
			for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
				this._subWrite(`+/device/output/${ch}/output_link_group`)
				this._subWrite(`/device/output/${ch}/output_link_group`)
			}
			// Matrix crosspoints used
			this._subWrite(`+/status/matrix_crosspoints_used`)
			this._subWrite(`/status/matrix_crosspoints_used`)
			for (const key of Object.keys(CLOCK_AES_STATUS_PATHS)) {
				const addr = `/status/clock/aes_output/${key}`
				this._subWrite(`+${addr}`)
				this._subWrite(addr)
			}
			for (const idx of CLOCK_INPUT_INDEXES) {
				for (const leaf of CLOCK_INPUT_LEAVES) {
					const addr = `/status/clock/input/${idx}/${leaf}`
					this._subWrite(`+${addr}`)
					this._subWrite(addr)
				}
			}
			for (const key of Object.keys(CLOCK_SYSTEM_PATHS)) {
				const addr = `/status/clock/system/${key}`
				this._subWrite(`+${addr}`)
				this._subWrite(addr)
			}
			for (const key of Object.keys(WORD_CLOCK_PATHS)) {
				const addr = `/status/clock/word_clock/${key}`
				this._subWrite(`+${addr}`)
				this._subWrite(addr)
			}
			this._subWrite(`+${RTC_PATH}`)
			this._subWrite(RTC_PATH)

			// Fan status (4 fans)
			for (let idx = 1; idx <= 4; idx++) {
				const base = `/status/hardware/board/digital/fan/${idx}`
				this._subWrite(`+${base}/stalled`)
				this._subWrite(`${base}/stalled`)
				this._subWrite(`+${base}/tach`)
				this._subWrite(`${base}/tach`)
			}

			// Log messages
			this._subWrite('+/status/log_message')
			this._subWrite('/status/log_message')

			if (!this._logHistoryFetched) {
				this._fetchLogHistory()
			} else if (!this._connectLogSent) {
				this._announceCompanionConnected()
			}

			// Device names
			for (let ch = 1; ch <= 32; ch++) {
				let addr = `/device/input/${ch}/name`
				this._subWrite(`+${addr}`)
				this._subWrite(addr)
			}
			for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
				let addr = `/device/output/${ch}/name`
				this._subWrite(`+${addr}`)
				this._subWrite(addr)
			}

			// Device input modes (subscribe + seed)
			for (let ch = 1; ch <= 32; ch++) {
				const addr = `/device/input/${ch}/mode`
				this._subWrite(`+${addr}`)
				this._subWrite(addr)
			}

			// Status network + model string
			for (const iface of NET_IFACES) {
				for (const leaf of NET_LEAVES) {
					const addr = `/status/network/${iface}/${leaf}`
					this._subWrite(`+${addr}`)
					this._subWrite(addr)
				}
			}
			this._subWrite(`+${MODEL_STRING_PATH}`)
			this._subWrite(MODEL_STRING_PATH)

			// Front panel lockout (var + feedback)
			const fp = `/system/hardware/front_panel_lockout`
			this._subWrite(`+${fp}`)
			this._subWrite(fp)

			// Identify (subscribe + seed)
			this._subWrite('+/status/identify_active')
			this._subWrite('/status/identify_active')

			// Access lock privilege
			this._subWrite(`+/system/access/1/privilege`)
			this._subWrite(`/system/access/1/privilege`)

			// Beam control array error status (arrays 1-4)
			for (let arrayIdx = 1; arrayIdx <= 4; arrayIdx++) {
				this._subWrite(`+/processing/beam_control_array/${arrayIdx}/error_code`)
				this._subWrite(`/processing/beam_control_array/${arrayIdx}/error_code`)
				this._subWrite(`+/processing/beam_control_array/${arrayIdx}/error_string`)
				this._subWrite(`/processing/beam_control_array/${arrayIdx}/error_string`)
			}

			// ---- Snapshots subscribe + seed ----
			for (let id = 0; id <= SNAPSHOT_MAX; id++) {
				for (const field of SNAPSHOT_FIELDS) {
					const addr = `/project/snapshot/${id}/${field}`
					this._subWrite(`+${addr}`)
					this._subWrite(addr)
				}
			}
			for (const field of SNAPSHOT_ACTIVE_FIELDS) {
				const addr = `/project/snapshot/active/${field}`
				this._subWrite(`+${addr}`)
				this._subWrite(addr)
			}

			const bootAddr = `/project/boot_snapshot_id`
			this._subWrite(`+${bootAddr}`)
			this._subWrite(bootAddr)
		})
	}

	_subWrite(cmd) {
		const s = this.subSock
		if (!s) return
		try {
			s.write(Buffer.from(cmd + TX_EOL, 'utf8'))
		} catch (err) {
			// ✅ IMPROVED: Log errors for debugging
			this.log?.('debug', `Sub socket write failed: ${err?.message || err}`)
		}
	}

	_onSubLine(line) {
		try {
			this._onSubLineUnsafe(line)
		} catch (err) {
			this.log?.('error', `Error processing subscription line: ${err?.message || err}`)
			this.log?.('debug', `Problematic line: ${line}`)
		}
	}

	_onSubLineUnsafe(line) {
		// mutes
		const mute = this._parseAnyMuteLoose(line)
		if (mute && typeof mute.value === 'boolean') {
			if (mute.kind === 'input') this._applyInMute(mute.ch, mute.value)
			else if (mute.kind === 'output') this._applyOutMute(mute.ch, mute.value)
		}

		// input/output gains
		const ig = this._parseInputGain(line)
		if (ig) this._applyInputGain(ig.ch, ig.value)

		// input delay (samples)
		const id = this._parseInputDelay(line)
		if (id) {
			this._applyInputDelay(id.ch, id.samples)
			return
		}

		// U-Shaping bypass
		const ushByp = this._parseInputUShapingBypass(line)
		if (ushByp) {
			this._applyInputUShapingBypass(ushByp.ch, ushByp.value)
			return
		}

		// U-Shaping parameters (gain, frequency, slope)
		const ush = this._parseInputUShaping(line)
		if (ush) {
			this._applyInputUShaping(ush.ch, ush.band, ush.param, ush.value)
			return
		}

		// Parametric EQ bypass (master)
		const eqByp = this._parseInputEQBypass(line)
		if (eqByp) {
			this._applyInputEQBypass(eqByp.ch, eqByp.value)
			return
		}

		// Parametric EQ parameters (gain, frequency, bandwidth, band_bypass)
		const eq = this._parseInputEQ(line)
		if (eq) {
			this._applyInputEQ(eq.ch, eq.band, eq.param, eq.value)
			return
		}

		// meters (dBFS)
		const imtr = this._parseInputMeter(line)
		if (imtr) {
			this._applyInputMeter(imtr.ch, imtr.value)
			return
		}

		// Matrix input meter
		const mxm = this._parseMatrixInputMeter(line)
		if (mxm) {
			this._applyMatrixInputMeter(mxm.idx, mxm.value)
			return
		}

		// ✅ FIX: Move feedback check inside the if block
		const omtr = this._parseOutputMeter(line)
		if (omtr) {
			this._applyOutputMeter(omtr.ch, omtr.value)
			// Feedback check moved to batched meter flush for performance
			return
		}

		const og = this._parseOutputGain(line)
		if (og) this._applyOutputGain(og.ch, og.value)

		// output delay (samples)
		const od = this._parseOutputDelay(line)
		if (od) {
			this._applyOutputDelay(od.ch, od.samples)
			return
		}

		const opol = this._parseOutputPolarity(line)
		if (opol) {
			this._applyOutputPolarity(opol.ch, opol.value)
			return
		}

		const ohpf = this._parseOutputHighpass(line)
		if (ohpf) {
			this._applyOutputFilter('highpass', ohpf.ch, ohpf.field, ohpf.value)
			return
		}

		const olpf = this._parseOutputLowpass(line)
		if (olpf) {
			this._applyOutputFilter('lowpass', olpf.ch, olpf.field, olpf.value)
			return
		}

		const oap = this._parseOutputAllpass(line)
		if (oap) {
			this._applyOutputAllpass(oap.ch, oap.band, oap.field, oap.value)
			return
		}

		// Output U-Shaping bypass
		const ushBypOut = this._parseOutputUShapingBypass(line)
		if (ushBypOut) {
			this._applyOutputUShapingBypass(ushBypOut.ch, ushBypOut.value)
			return
		}

		// Output U-Shaping parameters (gain, frequency, slope)
		const ushOut = this._parseOutputUShaping(line)
		if (ushOut) {
			this._applyOutputUShaping(ushOut.ch, ushOut.band, ushOut.param, ushOut.value)
			return
		}

		// Output Parametric EQ bypass (master)
		const eqBypOut = this._parseOutputEQBypass(line)
		if (eqBypOut) {
			this._applyOutputEQBypass(eqBypOut.ch, eqBypOut.value)
			return
		}

		// Output Parametric EQ parameters (gain, frequency, bandwidth, band_bypass)
		const eqOut = this._parseOutputEQ(line)
		if (eqOut) {
			this._applyOutputEQ(eqOut.ch, eqOut.band, eqOut.param, eqOut.value)
			return
		}

		// matrix gains
		const mg = this._parseMatrixGain(line)
		if (mg) this._applyMatrixGain(mg.mi, mg.mo, mg.value)

		// matrix delay
		const md = this._parseMatrixDelay(line)
		if (md) {
			this._applyMatrixDelay(md.mi, md.mo, md.samples)
			return
		}

		// matrix delay bypass
		const mdb = this._parseMatrixDelayBypass(line)
		if (mdb) {
			this._applyMatrixDelayBypass(mdb.mi, mdb.mo, mdb.bypass)
			return
		}

		// Matrix delay type
		const mdt = this._parseMatrixDelayType(line)
		if (mdt) {
			this._applyMatrixDelayType(mdt.mi, mdt.mo, mdt.type)
			return
		}

		// names
		const nm = this._parseNameValue(line)
		if (nm) {
			if (nm.kind === 'input') this._applyInputName(nm.ch, nm.value)
			else if (nm.kind === 'output') this._applyOutputName(nm.ch, nm.value)
			return
		}

		// input mode
		const im = this._parseInputMode(line)
		if (im) {
			this._applyInputMode(im.ch, im.value)
			return
		}

		// entity & clocks
		const entity = this._parseEntityValue(line)
		if (entity) {
			this._applyEntityValue(entity.key, entity.value)
			return
		}

		// input link group bypass
		const linkGroup = this._parseInputLinkGroupBypass(line)
		if (linkGroup) {
			this._applyInputLinkGroupBypass(linkGroup.group, linkGroup.value)
			return
		}

		// output link group bypass
		const outputLinkGroup = this._parseOutputLinkGroupBypass(line)
		if (outputLinkGroup) {
			this._applyOutputLinkGroupBypass(outputLinkGroup.group, outputLinkGroup.value)
			return
		}

		// input link group assignment
		const inputLinkAssign = this._parseInputLinkGroupAssign(line)
		if (inputLinkAssign) {
			this._applyInputLinkGroupAssign(inputLinkAssign.ch, inputLinkAssign.group)
			return
		}

		// output link group assignment
		const outputLinkAssign = this._parseOutputLinkGroupAssign(line)
		if (outputLinkAssign) {
			this._applyOutputLinkGroupAssign(outputLinkAssign.ch, outputLinkAssign.group)
			return
		}

		const matrixCrosspoints = this._parseMatrixCrosspointsUsed(line)
		if (matrixCrosspoints !== undefined) {
			this._applyMatrixCrosspointsUsed(matrixCrosspoints)
			return
		}

		const aes = this._parseClockAesValue(line)
		if (aes) {
			this._applyClockAesValue(aes.varId, aes.value)
			return
		}
		const cin = this._parseClockInputValue(line)
		if (cin) {
			this._applyClockInputValue(cin.varId, cin.value)
			return
		}
		const csys = this._parseClockSystemValue(line)
		if (csys) {
			this._applyClockSystemValue(csys.varId, csys.value)
			return
		}
		const wclk = this._parseWordClockValue(line)
		if (wclk) {
			this._applyWordClockValue(wclk.varId, wclk.value)
			return
		}

		const rtc = this._parseRtcValue(line)
		if (rtc) {
			this._applyMiscValue(RTC_VAR, rtc.value)
			return
		}

		// status network + model string
		const net = this._parseStatusNetworkValue(line)
		if (net) {
			this._applyStatusNetworkValue(net.varId, net.value)
			return
		}
		const model = this._parseModelString(line)
		if (model) {
			this._applyMiscValue('status_model_string', model.value)
			return
		}

		const dispPref = this._parseDisplayPreference(line)
		if (dispPref) {
			this._applyDisplayPreference(dispPref.key, dispPref.value)
			return
		}

		// front panel lockout
		const fpl = this._parseFrontPanelLockout(line)
		if (fpl) {
			this._applyMiscValue('front_panel_lockout', String(fpl.value))
			this.checkFeedbacks('front_panel_lockout')
			return
		}

		const ident = this._parseIdentifyActive(line)
		if (ident) {
			this._applyMiscValue('identify_active', String(ident.value))
			this.setVariableValues({ identify_active: String(ident.value) })
			this.checkFeedbacks && this.checkFeedbacks('identify_active')
			return
		}

		// access privilege
		const priv = this._parseAccessPrivilege(line)
		if (priv !== undefined) {
			this.accessPrivilege = BigInt(priv)
			this.setVariableValues({ access_privilege: String(priv) })
			this.checkFeedbacks('access_priv_equals')
			this.checkFeedbacks('access_priv_has')
			return
		}

		const logm = this._parseLogMessage(line)
		if (logm) {
			this.log?.('info', `Galaxy log: ${logm}`)
			this._lastLogMessages.push(logm)
			while (this._lastLogMessages.length > 5) this._lastLogMessages.shift()
			try {
				this.setVariableValues({ system_log_last: logm })
			} catch {}
			try {
				this.setVariableValues({ system_log_recent: this._lastLogMessages.join(' • ') })
			} catch {}
			return
		}

		const fan = this._parseFanStatus(line)
		if (fan) {
			const { index, key, value } = fan
			this.fanStatus = this.fanStatus || {}
			this.fanStatus[index] = this.fanStatus[index] || {}
			this.fanStatus[index][key] = value
			const vars = {}
			if (key === 'stalled') vars[`fan_${index}_stalled`] = value ? 'true' : 'false'
			if (key === 'tach') vars[`fan_${index}_tach`] = String(value)
			if (Object.keys(vars).length) {
				try {
					this.setVariableValues(vars)
				} catch {}
			}
			return
		}

		const bootId = this._parseBootSnapshotId(line)
		if (bootId !== undefined) {
			this._applySnapshotBootId(bootId)
			return
		}

		// snapshots
		const snap = this._parseSnapshotValue(line)
		if (snap) {
			this._applySnapshotValue(snap.varId, snap.value)
			return
		}

		// beam control array error code
		const bcErrorCode = this._parseBeamControlErrorCode(line)
		if (bcErrorCode) {
			this._applyBeamControlErrorCode(bcErrorCode.arrayIndex, bcErrorCode.value)
			return
		}

		// beam control array error string
		const bcErrorString = this._parseBeamControlErrorString(line)
		if (bcErrorString) {
			this._applyBeamControlErrorString(bcErrorString.arrayIndex, bcErrorString.value)
			return
		}
	}

	// -------- Command socket with queue (quiet) --------
	_ensureCmdSocket() {
		if (this.cmdSock || this.cmdConnecting) return
		const { host, port } = this._resolveHostPortFromConfig()
		if (!host || !port) return

		this.cmdConnecting = true
		const sock = new net.Socket()
		this.cmdSock = sock

		const retry = () => {
			this.cmdConnecting = false
			if (this.cmdSock === sock) this.cmdSock = null
			clearTimeout(this.cmdTimer)
			this.cmdTimer = setTimeout(() => this._ensureCmdSocket(), CMD_SOCKET_RETRY_MS)
		}

		sock.on('error', retry)
		sock.on('end', retry)
		sock.on('close', retry)

		sock.connect(port, host, () => {
			this.cmdConnecting = false
			this._cmdFlush()
		})
	}

	_cmdSendLine(line) {
		this.cmdQueue.push(line)
		this._cmdFlush()
	}
	_cmdSendBatch(lines) {
		if (lines?.length) {
			this.cmdQueue.push(...lines)
			this._cmdFlush()
		}
	}

	_cmdFlush() {
		this._ensureCmdSocket()
		const s = this.cmdSock
		if (!s) return
		if (this.cmdQueue.length === 0) {
			clearTimeout(this.cmdTimer)
			this.cmdTimer = setTimeout(() => {
				try {
					s.end()
				} catch {}
				try {
					s.destroy()
				} catch {}
				this.cmdSock = null
			}, CMD_SOCKET_TIMEOUT_MS)
			return
		}
		clearTimeout(this.cmdTimer)

		const lines = this.cmdQueue.splice(0, this.cmdQueue.length)
		try {
			s.write(Buffer.from(lines.join(TX_EOL) + TX_EOL, 'utf8'))
		} catch {
			this.cmdQueue.unshift(...lines)
			try {
				s.end()
			} catch {}
			try {
				s.destroy()
			} catch {}
			this.cmdSock = null
			this._ensureCmdSocket()
			return
		}
		this.cmdTimer = setTimeout(() => {
			try {
				s.end()
			} catch {}
			try {
				s.destroy()
			} catch {}
			this.cmdSock = null
		}, CMD_SOCKET_TIMEOUT_MS)
	}

	// ====== Generic fade helpers ======
	_stopFade(key) {
		const f = this._fades?.get(key)
		if (f && f.timer) clearTimeout(f.timer)
		this._fades?.delete(key)
	}
	_stopAllFades() {
		if (!this._fades) return
		for (const [key, f] of this._fades.entries()) {
			if (f?.timer) clearTimeout(f.timer)
			this._fades.delete(key)
		}
	}
	_startFade(key, { start, end, durationMs, curve = 'linear', stepMs = 50, onStep, onDone }) {
		const startDb = roundTenth(clampDb(Number(start)))
		const endDb = roundTenth(clampDb(Number(end)))
		if (!Number.isFinite(startDb) || !Number.isFinite(endDb)) return
		if (Math.abs(endDb - startDb) < 1e-6 || durationMs <= 0) {
			onStep?.(endDb)
			onDone?.()
			return
		}
		this._stopFade(key)
		const steps = Math.max(1, Math.round(Number(durationMs) / stepMs))
		const fade = { timer: null, step: 0, steps, curve: curve === 'log' ? 'log' : 'linear', stepMs }
		this._fades.set(key, fade)

		const startAmp = dbToAmp(startDb)
		const endAmp = dbToAmp(endDb)

		const tick = () => {
			const f = this._fades.get(key)
			if (!f) return
			const i = f.step + 1
			const t = Math.min(1, i / f.steps)
			let dbNow
			if (f.curve === 'log') dbNow = ampToDb(startAmp + (endAmp - startAmp) * t)
			else dbNow = startDb + (endDb - startDb) * t
			dbNow = roundTenth(clampDb(dbNow))
			try {
				onStep?.(dbNow)
			} catch {}
			if (i >= f.steps) {
				this._stopFade(key)
				try {
					onDone?.()
				} catch {}
				return
			}
			f.step = i
			f.timer = setTimeout(tick, f.stepMs)
		}
		fade.timer = setTimeout(tick, stepMs)
	}

	// ✅ NEW: Batched meter updates for performance
	_scheduleMeterFlush() {
		if (this._meterFlushTimer) return
		this._meterFlushTimer = setTimeout(() => {
			this._meterFlushTimer = null
			const updates = {}
			let hasOutputMeters = false

			// Flush input meters
			for (const [ch, val] of Object.entries(this._meterPending.in)) {
				updates[`input_${ch}_meter_dbfs`] = val
			}

			// Flush output meters
			for (const [ch, val] of Object.entries(this._meterPending.out)) {
				updates[`output_${ch}_meter_dbfs`] = val
				hasOutputMeters = true
			}

			// Flush matrix input meters
			for (const [idx, val] of Object.entries(this._meterPending.mxin || {})) {
				updates[`matrix_input_${idx}_meter_dbfs`] = val
			}

			if (Object.keys(updates).length > 0) {
				this.setVariableValues(updates)

				// Only check output feedbacks once per batch (performance optimization)
				if (hasOutputMeters) {
					this.checkFeedbacks?.('output_meter_level', 'output_signal_present')
				}
			}

			// Clear pending
			this._meterPending = { in: {}, out: {}, mxin: {} }
		}, this._meterRateMs || METER_BATCH_INTERVAL_MS)
	}

	// Debounced refresh so action dropdown labels (with names) stay current
	_scheduleActionsRefresh() {
		clearTimeout(this._actionsRefreshTimer)
		this._actionsRefreshTimer = setTimeout(() => {
			try {
				this.updateActions()
			} catch {}
		}, UI_REFRESH_DEBOUNCE_MS)
	}

	_scheduleVariablesRefresh() {
		clearTimeout(this._variablesRefreshTimer)
		this._variablesRefreshTimer = setTimeout(() => {
			try {
				this.updateVariableDefinitions()
			} catch {}
		}, UI_REFRESH_DEBOUNCE_MS)
	}

	_schedulePresetsRefresh() {
		clearTimeout(this._presetsRefreshTimer)
		this._presetsRefreshTimer = setTimeout(() => {
			try {
				this.updatePresets()
			} catch {}
		}, PRESET_REFRESH_DEBOUNCE_MS)
	}

	// Debounced refresh so feedback dropdown labels (with names) stay current
	_scheduleFeedbacksRefresh() {
		clearTimeout(this._feedbacksRefreshTimer)
		this._feedbacksRefreshTimer = setTimeout(() => {
			try {
				this.updateFeedbacks()
			} catch {}
		}, UI_REFRESH_DEBOUNCE_MS)
	}

	// ===== Previous-gain helpers =====
	_prevKey(kind, ch) {
		const k = kind === 'output' ? 'output' : 'input'
		return `${k}:${Number(ch) || 0}`
	}

	_beginPrevCaptureWindow(kind, ch, btnId, ms = PREV_GAIN_CAPTURE_WINDOW_MS) {
		const key = this._prevKey(kind, ch)
		const until = Date.now() + Math.max(50, Number(ms) || PREV_GAIN_CAPTURE_WINDOW_MS)
		this._prevCaptureWindows.set(key, { until, btnId: btnId || null })
		setTimeout(
			() => {
				const w = this._prevCaptureWindows.get(key)
				if (!w) return
				if (Date.now() >= w.until) this._prevCaptureWindows.delete(key)
			},
			Math.max(60, Number(ms) || PREV_GAIN_CAPTURE_WINDOW_MS) + 50,
		)
	}

	_maybeCapturePrev(kind, ch, valDb) {
		const key = this._prevKey(kind, ch)
		const w = this._prevCaptureWindows.get(key)
		if (!w) return
		if (Date.now() > w.until) {
			this._prevCaptureWindows.delete(key)
			return
		}

		const v = Math.round(Number(valDb) * 10) / 10
		if (!Number.isFinite(v)) return

		this._prevGain[kind][ch] = v

		const btnId = w.btnId || null
		if (btnId) {
			if (!this._prevByButton[kind][btnId]) this._prevByButton[kind][btnId] = {}
			this._prevByButton[kind][btnId][ch] = v
		}

		this._prevCaptureWindows.delete(key)
	}

	_rememberPrev(kind, ch, btnId) {
		const k = kind === 'output' ? 'output' : 'input'
		const cur = k === 'input' ? Number(this.inputGain?.[ch]) : Number(this.outputGain?.[ch])
		const v = Math.round(cur * 10) / 10
		if (!Number.isFinite(v)) return
		this._prevGain[k][ch] = v
		if (btnId) {
			if (!this._prevByButton[k][btnId]) this._prevByButton[k][btnId] = {}
			this._prevByButton[k][btnId][ch] = v
		}
	}

	_rememberPrevInputGain(ch, btnId) {
		this._rememberPrev('input', ch, btnId)
	}
	_rememberPrevOutputGain(ch, btnId) {
		this._rememberPrev('output', ch, btnId)
	}

	_getPrev(kind, ch, btnId) {
		const k = kind === 'output' ? 'output' : 'input'
		if (btnId && this._prevByButton[k][btnId] && Number.isFinite(this._prevByButton[k][btnId][ch])) {
			return this._prevByButton[k][btnId][ch]
		}
		if (Number.isFinite(this._prevGain[k][ch])) return this._prevGain[k][ch]
		return null
	}
	_getPrevInputGain(ch, btnId) {
		return this._getPrev('input', ch, btnId)
	}
	_getPrevOutputGain(ch, btnId) {
		return this._getPrev('output', ch, btnId)
	}

	// ====== Mutes ======
	_setMute(kind, ch, state) {
		const k = kind === 'input' ? 'input' : 'output'
		const max = k === 'input' ? NUM_INPUTS : NUM_OUTPUTS
		const c = Math.max(1, Math.min(max, Number(ch)))
		this._cmdSendLine(`/processing/${k}/${c}/mute=${state ? 'true' : 'false'}`)
	}
	_toggleMute(kind, ch) {
		const k = kind === 'input' ? 'input' : 'output'
		const current = k === 'input' ? !!this.inMute[ch] : !!this.outMute[ch]
		this._setMute(k, ch, !current)
	}
	_setAll(kind, state) {
		const k = kind === 'input' ? 'input' : 'output'
		const max = k === 'input' ? NUM_INPUTS : NUM_OUTPUTS
		const lines = []
		for (let ch = 1; ch <= max; ch++) lines.push(`/processing/${k}/${ch}/mute=${state ? 'true' : 'false'}`)
		this._cmdSendBatch(lines)
	}
	_muteAllOutputs() {
		this._setAll('output', true)
	}
	_unmuteAllOutputs() {
		this._setAll('output', false)
	}
	_muteAllInputs() {
		this._setAll('input', true)
	}
	_unmuteAllInputs() {
		this._setAll('input', false)
	}

	_setOutputPolarity(ch, state) {
		const c = Math.max(1, Math.min(NUM_OUTPUTS, Number(ch)))
		const val = !!state
		this._cmdSendLine(`/processing/output/${c}/polarity_reversal=${val ? 'true' : 'false'}`)
		this._applyOutputPolarity(c, val)
	}

	_toggleOutputPolarity(ch) {
		const c = Math.max(1, Math.min(NUM_OUTPUTS, Number(ch)))
		const cur = !!this.outputPolarity?.[c]
		this._setOutputPolarity(c, !cur)
	}

	_setOutputHighpassBypass(ch, state) {
		this._setOutputFilter('highpass', ch, 'bypass', state)
	}
	_setOutputHighpassFrequency(ch, hz) {
		this._setOutputFilter('highpass', ch, 'frequency', hz)
	}
	_setOutputHighpassType(ch, type) {
		this._setOutputFilter('highpass', ch, 'type', type)
	}
	_toggleOutputHighpassBypass(ch) {
		const c = Math.max(1, Math.min(NUM_OUTPUTS, Number(ch)))
		const current = !!this.outputHighpass?.[c]?.bypass
		this._setOutputHighpassBypass(c, !current)
	}
	_setOutputLowpassBypass(ch, state) {
		this._setOutputFilter('lowpass', ch, 'bypass', state)
	}
	_setOutputLowpassFrequency(ch, hz) {
		this._setOutputFilter('lowpass', ch, 'frequency', hz)
	}
	_setOutputLowpassType(ch, type) {
		this._setOutputFilter('lowpass', ch, 'type', type)
	}
	_toggleOutputLowpassBypass(ch) {
		const c = Math.max(1, Math.min(NUM_OUTPUTS, Number(ch)))
		const current = !!this.outputLowpass?.[c]?.bypass
		this._setOutputLowpassBypass(c, !current)
	}

	_setOutputAllpassBypass(ch, band, state) {
		this._setOutputAllpass(ch, band, 'band_bypass', state)
	}
	_setOutputAllpassFrequency(ch, band, hz) {
		this._setOutputAllpass(ch, band, 'frequency', hz)
	}
	_setOutputAllpassQ(ch, band, q) {
		this._setOutputAllpass(ch, band, 'q', q)
	}
	_toggleOutputAllpassBypass(ch, band) {
		const c = Math.max(1, Math.min(NUM_OUTPUTS, Number(ch)))
		const b = Math.max(1, Math.min(3, Number(band)))
		const current = !!this.outputAllpass?.[c]?.[b]?.band_bypass
		this._setOutputAllpassBypass(c, b, !current)
	}

	_setOutputAllpass(ch, band, param, rawValue) {
		const c = Math.max(1, Math.min(NUM_OUTPUTS, Number(ch)))
		const b = Math.max(1, Math.min(3, Number(band)))
		if (!Number.isFinite(c) || !Number.isFinite(b)) return

		if (param === 'band_bypass') {
			const val = !!rawValue
			this._cmdSendLine(`/processing/output/${c}/allpass/${b}/band_bypass=${val ? 'true' : 'false'}`)
			this._applyOutputAllpass(c, b, 'band_bypass', val)
			return
		}

		if (param === 'frequency') {
			const hz = Number(rawValue)
			if (!Number.isFinite(hz)) return
			const clamped = Math.max(10, Math.min(20000, hz))
			this._cmdSendLine(`/processing/output/${c}/allpass/${b}/frequency=${clamped}`)
			this._applyOutputAllpass(c, b, 'frequency', clamped)
			return
		}

		if (param === 'q') {
			const qVal = Number(rawValue)
			if (!Number.isFinite(qVal)) return
			const clamped = Math.max(0.5, Math.min(10, qVal))
			this._cmdSendLine(`/processing/output/${c}/allpass/${b}/q=${clamped}`)
			this._applyOutputAllpass(c, b, 'q', clamped)
		}
	}

	_setOutputFilter(filter, ch, param, rawValue) {
		const kind = filter === 'lowpass' ? 'lowpass' : 'highpass'
		const c = Math.max(1, Math.min(NUM_OUTPUTS, Number(ch)))

		if (!Number.isFinite(c)) return

		if (param === 'bypass') {
			const val = !!rawValue
			this._cmdSendLine(`/processing/output/${c}/${kind}/bypass=${val ? 'true' : 'false'}`)
			this._applyOutputFilter(kind, c, 'bypass', val)
			return
		}

		if (param === 'frequency') {
			const hz = Number(rawValue)
			if (!Number.isFinite(hz)) return
			const clamped = kind === 'highpass' ? Math.max(5, Math.min(20000, hz)) : Math.max(10, Math.min(20000, hz))
			this._cmdSendLine(`/processing/output/${c}/${kind}/frequency=${clamped}`)
			this._applyOutputFilter(kind, c, 'frequency', clamped)
			return
		}

		if (param === 'type') {
			const id = Number(rawValue)
			if (!Number.isFinite(id)) return
			const maxType = kind === 'highpass' ? 12 : 11
			const rounded = Math.max(1, Math.min(maxType, Math.round(id)))
			this._cmdSendLine(`/processing/output/${c}/${kind}/type=${rounded}`)
			this._applyOutputFilter(kind, c, 'type', rounded)
		}
	}

	// ===== Input Mode (device) =====
	_setInputMode(ch, mode) {
		const c = Math.max(1, Math.min(32, Number(ch))) // allow 1..32
		const m = Math.max(0, Math.min(4, Number(mode)))
		this._cmdSendLine(`/device/input/${c}/mode=${m}`)
	}

	// ---- Sample-rate helper (prefer system, then word clock, else default 48k) ----
	_getSampleRateHz() {
		let sr = Number(this.clockSystemValues?.clock_system_sample_rate)
		if (!Number.isFinite(sr) || sr <= 0) {
			sr = Number(this.wordClockValues?.word_clock_sample_rate)
		}
		if (!Number.isFinite(sr) || sr <= 0) sr = 48000
		return sr
	}

	// ===== Output delay (accept ms; device expects samples @ 96 samples/ms) =====
	_setOutputDelayMs(ch, ms) {
		const c = Math.max(1, Math.min(NUM_OUTPUTS, Number(ch)))
		const msNum = Number(ms)
		if (!Number.isFinite(msNum)) return
		const samples = Math.round(msNum * SAMPLES_PER_MS) // integer samples for device
		this._cmdSendLine(`/processing/output/${c}/delay=${samples}`)
		this._applyOutputDelay(c, samples) // optimistic UI update
	}

	// ====== Gains (Input) ======
	_setInputGain(ch, gainDb) {
		const c = Math.max(1, Math.min(NUM_INPUTS, Number(ch)))
		const g = roundTenth(clampDb(gainDb))
		this._cmdSendLine(`/processing/input/${c}/gain=${g}`)
		this._applyInputGain(c, g)
	}
	_nudgeInputGain(ch, deltaDb) {
		const c = Math.max(1, Math.min(NUM_INPUTS, Number(ch)))
		const cur = Number(this.inputGain[c])
		const base = Number.isFinite(cur) ? cur : 0
		const next = roundTenth(clampDb(base + Number(deltaDb || 0)))
		this._cmdSendLine(`/processing/input/${c}/gain=${next}`)
		this._applyInputGain(c, next)
	}
	_stopInputFade(ch) {
		const key = `in-${ch}`
		this._stopFade(key)
		const f = this._gainFadesIn[ch]
		if (f && f.timer) clearTimeout(f.timer)
		this._gainFadesIn[ch] = null
	}
	_stopAllInputFades() {
		for (const k of Object.keys(this._gainFadesIn)) this._stopInputFade(Number(k))
	}
	_startInputGainFade(ch, targetDb, durationMs, curve) {
		const c = Math.max(1, Math.min(NUM_INPUTS, Number(ch)))
		const cur = Number(this.inputGain[c])
		const startDb = Number.isFinite(cur) ? roundTenth(clampDb(cur)) : 0.0
		const endDb = roundTenth(clampDb(Number(targetDb)))
		const key = `in-${c}`
		this._startFade(key, {
			start: startDb,
			end: endDb,
			durationMs: Number(durationMs),
			curve,
			onStep: (dbNow) => {
				this._cmdSendLine(`/processing/input/${c}/gain=${dbNow}`)
				this._applyInputGain(c, dbNow)
			},
		})
	}

	// ====== Gains (Output) ======
	_setOutputGain(ch, gainDb) {
		const c = Math.max(1, Math.min(NUM_OUTPUTS, Number(ch)))
		const g = roundTenth(clampDb(gainDb))
		this._cmdSendLine(`/processing/output/${c}/gain=${g}`)
		this._applyOutputGain(c, g)
	}
	_nudgeOutputGain(ch, deltaDb) {
		const c = Math.max(1, Math.min(NUM_OUTPUTS, Number(ch)))
		const cur = Number(this.outputGain[c])
		const base = Number.isFinite(cur) ? cur : 0
		const next = roundTenth(clampDb(base + Number(deltaDb || 0)))
		this._cmdSendLine(`/processing/output/${c}/gain=${next}`)
		this._applyOutputGain(c, next)
	}
	_stopOutputFade(ch) {
		const key = `out-${ch}`
		this._stopFade(key)
		const f = this._gainFadesOut[ch]
		if (f && f.timer) clearTimeout(f.timer)
		this._gainFadesOut[ch] = null
	}
	_stopAllOutputFades() {
		for (const k of Object.keys(this._gainFadesOut)) this._stopOutputFade(Number(k))
	}
	_startOutputGainFade(ch, targetDb, durationMs, curve) {
		const c = Math.max(1, Math.min(NUM_OUTPUTS, Number(ch)))
		const cur = Number(this.outputGain[c])
		const startDb = Number.isFinite(cur) ? roundTenth(clampDb(cur)) : 0.0
		const endDb = roundTenth(clampDb(Number(targetDb)))
		const key = `out-${c}`
		this._startFade(key, {
			start: startDb,
			end: endDb,
			durationMs: Number(durationMs),
			curve,
			onStep: (dbNow) => {
				this._cmdSendLine(`/processing/output/${c}/gain=${dbNow}`)
				this._applyOutputGain(c, dbNow)
			},
		})
	}

	// ====== Matrix (get/set/nudge/fades) ======
	_mxKey(mi, mo) {
		return `${mi}-${mo}`
	}
	_getMatrixGain(mi, mo) {
		return Number(this.matrixGain[this._mxKey(mi, mo)])
	}
	_applyMatrixGain(mi, mo, val) {
		const rounded = roundTenth(clampDb(val))
		const key = this._mxKey(mi, mo)
		if (this.matrixGain[key] === rounded) return
		this.matrixGain[key] = rounded
		const vars = {
			[`matrix_${mi}_${mo}_gain_db`]: rounded.toFixed(1),
		}
		Object.assign(vars, this._collectMatrixRouteSummaries(mi, mo))
		this.setVariableValues(vars)
		this.checkFeedbacks('matrix_gain_level', 'matrix_gain_color')
	}
	_setMatrixGain(mi, mo, gainDb) {
		const i = Math.max(1, Math.min(MATRIX_INPUTS, Number(mi)))
		const o = Math.max(1, Math.min(NUM_OUTPUTS, Number(mo)))
		const g = roundTenth(clampDb(gainDb))
		this._cmdSendLine(`/processing/matrix/${i}/${o}/gain=${g}`)
		this._applyMatrixGain(i, o, g)
	}

	_applyMatrixDelay(mi, mo, samples) {
		if (!this.matrixDelay) this.matrixDelay = {}
		const key = this._mxKey(mi, mo)
		const s = Number(samples)
		if (!Number.isFinite(s)) return
		const ms = s / SAMPLES_PER_MS
		if (!this.matrixDelay[key]) this.matrixDelay[key] = {}
		this.matrixDelay[key].samples = s
		this.matrixDelay[key].ms = ms
		this.setVariableValues({ [`matrix_${mi}_${mo}_delay_ms`]: ms.toFixed(2) })
	}

	_applyMatrixDelayBypass(mi, mo, bypass) {
		if (!this.matrixDelay) this.matrixDelay = {}
		const key = this._mxKey(mi, mo)
		const state = !!bypass
		if (!this.matrixDelay[key]) this.matrixDelay[key] = {}
		if (this.matrixDelay[key].bypass === state) return
		this.matrixDelay[key].bypass = state
		this.setVariableValues({ [`matrix_${mi}_${mo}_delay_bypass`]: state ? 'Bypassed' : 'Active' })
		this.checkFeedbacks('matrix_delay_bypassed')
	}

	_applyMatrixDelayType(mi, mo, typeId) {
		if (!this.matrixDelay) this.matrixDelay = {}
		const key = this._mxKey(mi, mo)
		const DELAY_TYPE_LABELS = ['ms', 'feet', 'meters', 'frames (24fps)', 'frames (25fps)', 'frames (30fps)', 'samples']
		if (!this.matrixDelay[key]) this.matrixDelay[key] = {}
		this.matrixDelay[key].type = typeId
		const label = DELAY_TYPE_LABELS[typeId] || 'ms'
		this.setVariableValues({ [`matrix_${mi}_${mo}_delay_type`]: label })
	}

	_collectMatrixRouteSummaries(mi, mo) {
		const values = {}

		// Per output: list active inputs feeding this output
		const inputs = []
		for (let src = 1; src <= MATRIX_INPUTS; src++) {
			const gain = Number(this.matrixGain[this._mxKey(src, mo)])
			if (!Number.isFinite(gain) || gain <= MATRIX_ROUTE_THRESHOLD_DB) continue
			inputs.push(this._formatMatrixRouteLabel('input', src, gain))
		}
		const outStr = inputs.join(' | ')
		this._matrixOutputRoutes[mo] = outStr
		values[`matrix_output_${mo}_routes`] = outStr

		// Per input: list outputs fed by this input
		const outs = []
		for (let dest = 1; dest <= NUM_OUTPUTS; dest++) {
			const gain = Number(this.matrixGain[this._mxKey(mi, dest)])
			if (!Number.isFinite(gain) || gain <= MATRIX_ROUTE_THRESHOLD_DB) continue
			outs.push(this._formatMatrixRouteLabel('output', dest, gain))
		}
		const inStr = outs.join(' | ')
		this._matrixInputRoutes[mi] = inStr
		values[`matrix_input_${mi}_routes`] = inStr

		return values
	}

	_formatMatrixRouteLabel(kind, ch, gain) {
		const names = kind === 'input' ? this.inputName : this.outputName
		const nmRaw = names?.[ch]
		const nm = typeof nmRaw === 'string' ? nmRaw.trim() : ''
		const prefix = kind === 'input' ? 'In' : 'Out'
		const base = nm ? `${prefix} ${ch} (${nm})` : `${prefix} ${ch}`
		const gainDb = roundTenth(clampDb(gain)).toFixed(1)
		return `${base} @ ${gainDb} dB`
	}
	_nudgeMatrixGain(mi, mo, deltaDb) {
		const i = Math.max(1, Math.min(MATRIX_INPUTS, Number(mi)))
		const o = Math.max(1, Math.min(NUM_OUTPUTS, Number(mo)))
		const cur = this._getMatrixGain(i, o)
		const base = Number.isFinite(cur) ? cur : 0
		const next = roundTenth(clampDb(base + Number(deltaDb || 0)))
		this._cmdSendLine(`/processing/matrix/${i}/${o}/gain=${next}`)
		this._applyMatrixGain(i, o, next)
	}
	_setMatrixGainMulti(mi, outs, gainDb) {
		const i = Math.max(1, Math.min(MATRIX_INPUTS, Number(mi)))
		const targets = (Array.isArray(outs) ? outs : [outs])
			.map((o) => Math.max(1, Math.min(NUM_OUTPUTS, Number(o))))
			.filter((o, idx, arr) => Number.isFinite(o) && arr.indexOf(o) === idx)
		if (!targets.length) return
		const g = roundTenth(clampDb(Number(gainDb)))
		const lines = []
		for (const o of targets) {
			lines.push(`/processing/matrix/${i}/${o}/gain=${g}`)
			this._applyMatrixGain(i, o, g)
		}
		this._cmdSendBatch(lines)
	}
	_nudgeMatrixGainMulti(mi, outs, deltaDb) {
		const i = Math.max(1, Math.min(MATRIX_INPUTS, Number(mi)))
		const targets = (Array.isArray(outs) ? outs : [outs])
			.map((o) => Math.max(1, Math.min(NUM_OUTPUTS, Number(o))))
			.filter((o, idx, arr) => Number.isFinite(o) && arr.indexOf(o) === idx)
		if (!targets.length) return
		const lines = []
		for (const o of targets) {
			const cur = this._getMatrixGain(i, o)
			const base = Number.isFinite(cur) ? cur : 0
			const next = roundTenth(clampDb(base + Number(deltaDb || 0)))
			lines.push(`/processing/matrix/${i}/${o}/gain=${next}`)
			this._applyMatrixGain(i, o, next)
		}
		this._cmdSendBatch(lines)
	}
	_startMatrixGainFade(mi, mo, targetDb, durationMs, curve) {
		const i = Math.max(1, Math.min(MATRIX_INPUTS, Number(mi)))
		const o = Math.max(1, Math.min(NUM_OUTPUTS, Number(mo)))
		const cur = this._getMatrixGain(i, o)
		const startDb = Number.isFinite(cur) ? roundTenth(clampDb(cur)) : 0.0
		const endDb = roundTenth(clampDb(Number(targetDb)))
		const key = `mx-${i}-${o}`
		this._startFade(key, {
			start: startDb,
			end: endDb,
			durationMs: Number(durationMs),
			curve,
			onStep: (dbNow) => {
				this._cmdSendLine(`/processing/matrix/${i}/${o}/gain=${dbNow}`)
				this._applyMatrixGain(i, o, dbNow)
			},
		})
	}
	_startMatrixGainFadeMulti(mi, outs, targetDb, durationMs, curve) {
		const i = Math.max(1, Math.min(MATRIX_INPUTS, Number(mi)))
		const targets = (Array.isArray(outs) ? outs : [outs])
			.map((o) => Math.max(1, Math.min(NUM_OUTPUTS, Number(o))))
			.filter((o, idx, arr) => Number.isFinite(o) && arr.indexOf(o) === idx)
		if (!targets.length) return

		const first = targets[0]
		const cur = this._getMatrixGain(i, first)
		const startDb = Number.isFinite(cur) ? roundTenth(clampDb(cur)) : 0.0
		const endDb = roundTenth(clampDb(Number(targetDb)))
		const key = `mx-${i}-[${targets.join(',')}]`

		this._startFade(key, {
			start: startDb,
			end: endDb,
			durationMs: Number(durationMs),
			curve,
			onStep: (dbNow) => {
				const lines = []
				for (const o of targets) {
					lines.push(`/processing/matrix/${i}/${o}/gain=${dbNow}`)
					this._applyMatrixGain(i, o, dbNow)
				}
				this._cmdSendBatch(lines)
			},
		})
	}

	// ====== Speaker Test / Output Chase ======
	_registerChaseInvoker(controlId) {
		if (!controlId) return
		try {
			this._chase.activeButtons.clear()
		} catch {}
		this._chase.activeButtons.add(String(controlId))
		this.checkFeedbacks && this.checkFeedbacks('speaker_test_flash')
	}

	_runChaseStep() {
		if (!this._chase.running) return
		const { list, index, delayMs, windowSize, loop } = this._chase

		if (index >= list.length) {
			if (loop) {
				this._chase.index = 0
				this._chase.phase = 0
			} else {
				this._muteAllOutputs()
				this._stopOutputChase()
				return
			}
		}

		if (windowSize === 1) {
			const current = list[this._chase.index]
			const desired = new Set([current])
			const lines = []
			for (const ch of this._chase.prevActive) if (!desired.has(ch)) lines.push(`/processing/output/${ch}/mute=true`)
			for (const ch of desired) if (!this._chase.prevActive.has(ch)) lines.push(`/processing/output/${ch}/mute=false`)
			if (lines.length) this._cmdSendBatch(lines)
			this._chase.prevActive = desired
			this._chase.index++
			this._chase.timer = setTimeout(() => this._runChaseStep(), delayMs)
			return
		}

		// windowSize === 2: solo -> two -> advance
		const phase = this._chase.phase
		const base = list[this._chase.index]
		const hasNext = this._chase.index + 1 < list.length
		const next = hasNext ? list[this._chase.index + 1] : list[0] // for loop

		if (phase === 0) {
			const desired = new Set([base])
			const lines = []
			for (const ch of this._chase.prevActive) if (!desired.has(ch)) lines.push(`/processing/output/${ch}/mute=true`)
			for (const ch of desired) if (!this._chase.prevActive.has(ch)) lines.push(`/processing/output/${ch}/mute=false`)
			if (lines.length) this._cmdSendBatch(lines)
			this._chase.prevActive = desired
			if (!hasNext && !loop) {
				this._chase.index++
				this._chase.timer = setTimeout(() => this._runChaseStep(), delayMs)
			} else {
				this._chase.phase = 1
				this._chase.timer = setTimeout(() => this._runChaseStep(), delayMs)
			}
			return
		}

		if (phase === 1) {
			const desired = new Set([base, next])
			const lines = []
			for (const ch of this._chase.prevActive) if (!desired.has(ch)) lines.push(`/processing/output/${ch}/mute=true`)
			for (const ch of desired) if (!this._chase.prevActive.has(ch)) lines.push(`/processing/output/${ch}/mute=false`)
			if (lines.length) this._cmdSendBatch(lines)
			this._chase.prevActive = desired
			this._chase.phase = 0
			this._chase.index++

			this._chase.timer = setTimeout(() => {
				const extra = []
				if (base && desired.has(base)) extra.push(`/processing/output/${base}/mute=true`)
				if (extra.length) this._cmdSendBatch(extra)
				this._chase.prevActive = new Set([next])
				this._runChaseStep()
			}, delayMs)
			return
		}
	}

	_startOutputChase(startCh, endCh, delayMs, windowSize, loop, invokerId) {
		let s = Math.max(1, Math.min(NUM_OUTPUTS, Number(startCh) || 1))
		let e = Math.max(1, Math.min(NUM_OUTPUTS, Number(endCh) || NUM_OUTPUTS))
		if (s > e) [s, e] = [e, s]
		const d = Math.max(50, Number(delayMs) || 1000)
		const w = Number(windowSize) === 2 ? 2 : 1

		this._stopOutputChase()
		const list = []
		for (let ch = s; ch <= e; ch++) list.push(ch)

		this._chase.running = true
		this._chase.list = list
		this._chase.index = 0
		this._chase.delayMs = d
		this._chase.windowSize = w
		this._chase.phase = 0
		this._chase.prevActive = new Set()
		this._chase.loop = !!loop

		this._registerChaseInvoker(invokerId)

		this._startSpeakerFlashTimer()
		this._updateSpeakerTestVars()

		this._muteAllOutputs()
		this._chase.timer = setTimeout(() => this._runChaseStep(), 60)
	}

	_stopOutputChase() {
		if (!this._chase.running) return
		this._chase.running = false
		if (this._chase.timer) clearTimeout(this._chase.timer)
		this._chase.timer = null
		this._chase.prevActive = new Set()
		this._chase.phase = 0
		this._muteAllOutputs()

		this._stopSpeakerFlashTimer()
		this._updateSpeakerTestVars()

		try {
			this._chase.activeButtons.clear()
		} catch {}
		this.checkFeedbacks && this.checkFeedbacks('speaker_test_flash')
	}

	_fetchLogHistory() {
		if (this._logHistoryInFlight) {
			this.log?.('warn', 'Log history request already in progress')
			return
		}

		const { host, port } = this._resolveHostPortFromConfig()
		if (!host || !port) {
			this.log?.('warn', 'Log history request skipped: host/port not configured')
			return
		}

		const sock = new net.Socket()
		this._logHistoryInFlight = sock
		let buffer = ''
		let finished = false
		let endTimer = null

		const emitLines = () => {
			if (!buffer) return
			const parts = buffer.split(EOL_SPLIT)
			buffer = parts.pop() ?? ''
			for (const raw of parts) {
				const line = String(raw ?? '').trim()
				if (!line) continue
				this.log?.('info', `Galaxy log: ${line}`)
			}
		}

		const finish = () => {
			if (finished) return
			finished = true
			if (endTimer) {
				clearTimeout(endTimer)
				endTimer = null
			}
			emitLines()
			const trailing = buffer.trim()
			if (trailing) this.log?.('info', `Galaxy log: ${trailing}`)
			buffer = ''
			if (this._logHistoryInFlight === sock) this._logHistoryInFlight = null
			try {
				sock.destroy()
			} catch {}
			if (!this._connectLogSent) {
				this._announceCompanionConnected()
			}
		}

		sock.setEncoding('utf8')
		sock.on('data', (chunk) => {
			buffer += chunk
			emitLines()
		})
		sock.on('end', finish)
		sock.on('close', finish)
		sock.on('error', (err) => {
			this.log?.('error', `Log history request failed: ${err?.message || err}`)
			this._logHistoryFetched = false
			finish()
		})

		sock.connect(port, host, () => {
			this.log?.('info', 'Galaxy: requesting log history…')
			try {
				sock.write(':get_log_history\n')
				this._logHistoryFetched = true
			} catch (err) {
				this.log?.('error', `Failed to request log history: ${err?.message || err}`)
				this._logHistoryFetched = false
				finish()
				return
			}
			endTimer = setTimeout(() => {
				try {
					sock.end()
				} catch {}
			}, 2000)
		})
	}

	_announceCompanionConnected() {
		if (this._connectLogSent) return
		const msg = 'Bitfocus Companion is connected'
		this._connectLogSent = true
		try {
			this._cmdSendLine(`:add_log_message "${msg.replace(/"/g, '\\"')}"`)
			this.log?.('info', `Galaxy log: ${msg}`)
		} catch (err) {
			this.log?.('error', `Failed to announce connection: ${err?.message || err}`)
		}
	}

	// ---- Speaker Test variables + flash helpers ----
	_updateSpeakerTestVars() {
		this.setVariableValues({
			speaker_test: this._chase.running ? 'On' : 'Off',
			speaker_test_delay_ms: String(this._chase.delayMs || 0),
		})
		this.checkFeedbacks && this.checkFeedbacks('speaker_test_flash')
	}

	_startSpeakerFlashTimer() {
		this._stopSpeakerFlashTimer()
		// Fixed flash speed at 1000ms (1 second), independent of delay per step
		const flashInterval = 1000
		this._flash.phase = true
		this._flash.timer = setInterval(() => {
			this._flash.phase = !this._flash.phase
			this.checkFeedbacks && this.checkFeedbacks('speaker_test_flash')
		}, flashInterval)
	}

	_restartSpeakerFlashTimer() {
		if (this._chase.running) this._startSpeakerFlashTimer()
	}

	_stopSpeakerFlashTimer() {
		if (this._flash.timer) clearInterval(this._flash.timer)
		this._flash.timer = null
		this._flash.phase = true
		this.checkFeedbacks && this.checkFeedbacks('speaker_test_flash')
	}

	_setChaseDelayMs(newDelayMs) {
		const d = Math.max(50, Number(newDelayMs) || 1000)
		this._chase.delayMs = d
		if (this._chase.running) this._restartSpeakerFlashTimer()
		this._updateSpeakerTestVars()
	}

	// ===== AVB connect helper =====
	_quoteIfNeeded(val) {
		if (val === null || val === undefined) return ''
		const s = String(val)
		if (s === '') return '""'
		if (/\s/.test(s) || /["]/.test(s)) return `"${s.replace(/"/g, '\\"')}"`
		return s
	}
	_sendConnectAvbInput({
		input,
		groupP,
		entityP,
		streamIndexP,
		streamChanP,
		groupS,
		entityS,
		streamIndexS,
		streamChanS,
	}) {
		const parts = [
			':connect_avb_input',
			Number(input),
			this._quoteIfNeeded(groupP),
			this._quoteIfNeeded(entityP),
			Number(streamIndexP),
			Number(streamChanP),
			this._quoteIfNeeded(groupS),
			this._quoteIfNeeded(entityS),
			Number(streamIndexS),
			Number(streamChanS),
		]
		this._cmdSendLine(parts.join(' '))
	}

	// ===== Access privilege toggle =====
	_toggleAccessPrivilege(bit) {
		try {
			const b = BigInt(bit)
			const now = typeof this.accessPrivilege === 'bigint' ? this.accessPrivilege : 0n
			const next = now ^ b
			this._cmdSendLine(`/system/access/1/privilege=${next.toString()}`)
			this.accessPrivilege = next
			this.setVariableValues({ access_privilege: next.toString() })
			this.checkFeedbacks && this.checkFeedbacks('access_priv_has', 'access_priv_equals')
		} catch {
			/* ignore */
		}
	}

	// -------- Actions / Feedbacks / Variables --------
	updateActions() {
		UpdateActions(this, NUM_INPUTS, NUM_OUTPUTS)
	}
	updateFeedbacks() {
		UpdateFeedbacks(this, NUM_INPUTS, NUM_OUTPUTS)
	}
	updateVariableDefinitions() {
		UpdateVariableDefinitions(this, NUM_INPUTS, NUM_OUTPUTS)
	}
	updatePresets() {
		UpdatePresets(this, NUM_INPUTS, NUM_OUTPUTS)
	}

	// -------- Vars + state --------
	_seedVariables() {
		const vals = {}
		for (let ch = 1; ch <= NUM_INPUTS; ch++) {
			vals[`input_${ch}_mute`] = ''
			vals[`input_${ch}_gain_db`] = ''
			vals[`input_${ch}_name`] = ''
			vals[`input_${ch}_delay_ms`] = ''
			vals[`input_${ch}_mode`] = ''
			vals[`input_${ch}_meter_dbfs`] = ''

			// U-Shaping variables
			vals[`input_${ch}_ushaping_bypass`] = ''
			for (let band = 1; band <= 5; band++) {
				vals[`input_${ch}_ushaping_band${band}_gain`] = ''
				if (band <= 4) {
					vals[`input_${ch}_ushaping_band${band}_frequency`] = ''
				}
				vals[`input_${ch}_ushaping_band${band}_slope`] = ''
			}

			// Parametric EQ variables
			vals[`input_${ch}_eq_bypass`] = ''
			for (let band = 1; band <= 5; band++) {
				vals[`input_${ch}_eq_band${band}_gain`] = ''
				vals[`input_${ch}_eq_band${band}_frequency`] = ''
				vals[`input_${ch}_eq_band${band}_bandwidth`] = ''
				vals[`input_${ch}_eq_band${band}_bypass`] = ''
			}
		}
		for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
			vals[`output_${ch}_mute`] = ''
			vals[`output_${ch}_gain_db`] = ''
			vals[`output_${ch}_name`] = ''
			vals[`output_${ch}_delay_ms`] = ''
			vals[`output_${ch}_meter_dbfs`] = ''
			vals[`output_${ch}_polarity`] = 'Normal'
			vals[`output_${ch}_highpass`] = 'OFF'
			vals[`output_${ch}_highpass_frequency`] = '---'
			vals[`output_${ch}_highpass_type`] = '---'
			vals[`output_${ch}_lowpass`] = 'OFF'
			vals[`output_${ch}_lowpass_frequency`] = '---'
			vals[`output_${ch}_lowpass_type`] = '---'
			for (let band = 1; band <= 3; band++) {
				vals[`output_${ch}_allpass${band}`] = 'OFF'
				vals[`output_${ch}_allpass${band}_frequency`] = '---'
				vals[`output_${ch}_allpass${band}_q`] = '---'
			}
		}
		for (let mi = 1; mi <= MATRIX_INPUTS; mi++) {
			for (let mo = 1; mo <= NUM_OUTPUTS; mo++) {
				vals[`matrix_${mi}_${mo}_gain_db`] = ''
				vals[`matrix_${mi}_${mo}_delay_ms`] = ''
				vals[`matrix_${mi}_${mo}_delay_bypass`] = ''
				vals[`matrix_${mi}_${mo}_delay_type`] = ''
			}
		}
		for (let i = 1; i <= 32; i++) {
			vals[`matrix_input_${i}_meter_dbfs`] = ''
		}
		for (let id = 0; id <= SNAPSHOT_MAX; id++) {
			for (const field of SNAPSHOT_FIELDS) vals[`snapshot_${id}_${field}`] = ''
		}
		for (const field of SNAPSHOT_ACTIVE_FIELDS) vals[`snapshot_active_${field}`] = ''

		for (const key of ENTITY_PATHS) vals[key] = ''
		for (const leaf of Object.keys(CLOCK_AES_STATUS_PATHS)) vals[CLOCK_AES_STATUS_PATHS[leaf]] = ''
		for (const idx of CLOCK_INPUT_INDEXES)
			for (const leaf of CLOCK_INPUT_LEAVES) vals[`clock_input_${idx}_${leaf}`] = ''
		for (const leaf of Object.keys(CLOCK_SYSTEM_PATHS)) vals[CLOCK_SYSTEM_PATHS[leaf]] = ''
		for (const leaf of Object.keys(WORD_CLOCK_PATHS)) vals[WORD_CLOCK_PATHS[leaf]] = ''
		vals[RTC_VAR] = ''
		for (const iface of NET_IFACES) {
			for (const leaf of NET_LEAVES) vals[`status_network_${iface}_${leaf}`] = ''
		}
		vals['status_model_string'] = ''
		vals['front_panel_lockout'] = ''
		vals['front_panel_brightness'] = this._getDisplayPreferenceLabel('brightness', this.displayPrefs?.brightness)
		vals['front_panel_display_color'] = this._getDisplayPreferenceLabel(
			'display_color',
			this.displayPrefs?.display_color,
		)
		vals['access_privilege'] = ''
		vals['identify_active'] = ''
		vals['speaker_test'] = 'Off'
		vals['speaker_test_delay_ms'] = '0'

		// U-Shaping knob selection variables
		vals['ushaping_selected_input'] = 'Input 1'
		vals['ushaping_selected_input_num'] = '1'
		vals['ushaping_selected_band'] = 'Band 1 (20-2500Hz)'
		vals['ushaping_selected_band_num'] = '1'

		// U-Shaping dynamic current value variables
		vals['ushaping_current_gain'] = '---'
		vals['ushaping_current_frequency'] = '---'
		vals['ushaping_current_slope'] = '---'

		// Parametric EQ knob selection variables
		vals['eq_selected_input'] = 'Input 1'
		vals['eq_selected_input_num'] = '1'
		vals['eq_selected_band'] = 'Band 1 (default 32 Hz)'
		vals['eq_selected_band_num'] = '1'

		// Parametric EQ dynamic current value variables
		vals['eq_current_gain'] = '---'
		vals['eq_current_frequency'] = '---'
		vals['eq_current_bandwidth'] = '---'

		// Output U-Shaping knob selection variables
		vals['ushaping_selected_output'] = 'Output 1'
		vals['ushaping_selected_output_num'] = '1'
		vals['ushaping_selected_output_band'] = 'Band 1'
		vals['ushaping_selected_output_band_num'] = '1'

		// Output U-Shaping dynamic current value variables
		vals['ushaping_output_current_gain'] = '---'
		vals['ushaping_output_current_frequency'] = '---'
		vals['ushaping_output_current_slope'] = '---'

		// Output Parametric EQ knob selection variables
		vals['eq_selected_output'] = 'Output 1'
		vals['eq_selected_output_num'] = '1'
		vals['eq_selected_output_band'] = 'Band 1'
		vals['eq_selected_output_band_num'] = '1'

		// Output Parametric EQ dynamic current value variables
		vals['eq_output_current_gain'] = '---'
		vals['eq_output_current_frequency'] = '---'
		vals['eq_output_current_bandwidth'] = '---'

		this.setVariableValues(vals)
	}

	_applyInMute(ch, val) {
		if (this.inMute[ch] === val) return
		this.inMute[ch] = val
		this.setVariableValues({ [`input_${ch}_mute`]: String(val) })
		this.checkFeedbacks('input_muted')
		this.checkFeedbacks('mute_all')
	}
	_applyOutMute(ch, val) {
		if (this.outMute[ch] === val) return
		this.outMute[ch] = val
		this.setVariableValues({ [`output_${ch}_mute`]: String(val) })
		this.checkFeedbacks('output_muted')
		this.checkFeedbacks('mute_all')
	}

	_applyOutputPolarity(ch, val) {
		const state = !!val
		if (this.outputPolarity[ch] === state) return
		this.outputPolarity[ch] = state
		this.setVariableValues({ [`output_${ch}_polarity`]: state ? 'Reverse' : 'Normal' })
		this.checkFeedbacks('output_polarity_reversed')
	}

	_applyOutputFilter(filter, ch, field, value) {
		const kind = filter === 'lowpass' ? 'lowpass' : 'highpass'
		const store = kind === 'lowpass' ? (this.outputLowpass ||= {}) : (this.outputHighpass ||= {})
		if (!store[ch]) store[ch] = { bypass: true, frequency: null, type: null }

		if (field === 'bypass') {
			const state = !!value
			if (store[ch].bypass === state) return
			store[ch].bypass = state
			const active = !state
			this.setVariableValues({ [`output_${ch}_${kind}`]: active ? 'ON' : 'OFF' })
			this.checkFeedbacks(kind === 'lowpass' ? 'output_lowpass_active' : 'output_highpass_active')
			return
		}

		if (field === 'frequency') {
			const num = Number(value)
			if (!Number.isFinite(num)) return
			if (store[ch].frequency === num) return
			store[ch].frequency = num
			const str = num % 1 === 0 ? String(Math.round(num)) : num.toFixed(2)
			this.setVariableValues({ [`output_${ch}_${kind}_frequency`]: str })
			return
		}

		if (field === 'type') {
			const id = Number(value)
			if (!Number.isFinite(id)) return
			if (store[ch].type === id) return
			store[ch].type = id
			const label = kind === 'highpass' && id === 11 ? '2nd Order (Legacy)' : formatFilterType(id)
			this.setVariableValues({ [`output_${ch}_${kind}_type`]: label })
		}
	}

	_applyOutputAllpass(ch, band, field, value) {
		if (!this.outputAllpass[ch]) this.outputAllpass[ch] = {}
		if (!this.outputAllpass[ch][band]) this.outputAllpass[ch][band] = { band_bypass: true, frequency: null, q: null }

		const store = this.outputAllpass[ch][band]

		if (field === 'band_bypass') {
			const state = !!value
			if (store.band_bypass === state) return
			store.band_bypass = state
			this.setVariableValues({ [`output_${ch}_allpass${band}`]: state ? 'OFF' : 'ON' })
			this.checkFeedbacks('output_allpass_active')
			return
		}

		if (field === 'frequency') {
			const hz = Number(value)
			if (!Number.isFinite(hz)) return
			if (store.frequency === hz) return
			store.frequency = hz
			const str = hz % 1 === 0 ? String(Math.round(hz)) : hz.toFixed(2)
			this.setVariableValues({ [`output_${ch}_allpass${band}_frequency`]: str })
			return
		}

		if (field === 'q') {
			const qVal = Number(value)
			if (!Number.isFinite(qVal)) return
			if (store.q === qVal) return
			store.q = qVal
			const str = qVal % 1 === 0 ? String(Math.round(qVal)) : qVal.toFixed(2)
			this.setVariableValues({ [`output_${ch}_allpass${band}_q`]: str })
		}
	}

	_applyInputGain(ch, val) {
		const rounded = roundTenth(clampDb(val))
		this._maybeCapturePrev('input', ch, rounded)
		if (this.inputGain[ch] === rounded) return
		this.inputGain[ch] = rounded
		this.setVariableValues({ [`input_${ch}_gain_db`]: rounded.toFixed(1) })
		this.checkFeedbacks('input_gain_level')
	}

	_applyOutputGain(ch, val) {
		const rounded = roundTenth(clampDb(val))
		this._maybeCapturePrev('output', ch, rounded)
		if (this.outputGain[ch] === rounded) return
		this.outputGain[ch] = rounded
		this.setVariableValues({ [`output_${ch}_gain_db`]: rounded.toFixed(1) })
		this.checkFeedbacks('output_gain_level')
	}

	_applyInputMeter(ch, val) {
		const n = Number(val)
		if (!Number.isFinite(n)) return
		this.inputMeter[ch] = n
		const str = n.toFixed(1)
		if (this._meterRateMs > 0) {
			this._meterPending.in[ch] = str
			this._scheduleMeterFlush()
		} else {
			this.setVariableValues({ [`input_${ch}_meter_dbfs`]: str })
		}
	}

	_applyOutputMeter(ch, val) {
		const n = Number(val)
		if (!Number.isFinite(n)) return
		this.outputMeter[ch] = n
		const str = n.toFixed(1)
		if (this._meterRateMs > 0) {
			this._meterPending.out[ch] = str
			this._scheduleMeterFlush()
		} else {
			this.setVariableValues({ [`output_${ch}_meter_dbfs`]: str })
		}
	}

	_applyMatrixInputMeter(idx, val) {
		const n = Number(val)
		if (!Number.isFinite(n)) return
		this.matrixInMeter[idx] = n
		const str = n.toFixed(1)
		if (this._meterRateMs > 0) {
			if (!this._meterPending) this._meterPending = { in: {}, out: {}, mxin: {} }
			if (!this._meterPending.mxin) this._meterPending.mxin = {}
			this._meterPending.mxin[idx] = str
			this._scheduleMeterFlush?.()
		} else {
			this.setVariableValues({ [`matrix_input_${idx}_meter_dbfs`]: str })
		}
	}

	_applyEntityValue(key, value) {
		if (this.entityValues[key] === value) return
		this.entityValues[key] = value
		this.setVariableValues({ [key]: value })
	}

	_applyInputLinkGroupBypass(group, value) {
		if (!this.inputLinkGroupBypass) this.inputLinkGroupBypass = {}
		if (this.inputLinkGroupBypass[group] === value) return
		this.inputLinkGroupBypass[group] = value
		const varId = `input_link_group_${group}_bypass`
		const displayValue = value ? 'Bypassed' : 'Enabled'
		this.setVariableValues({ [varId]: displayValue })
		this.checkFeedbacks('input_link_group_bypassed')
	}

	_applyOutputLinkGroupBypass(group, value) {
		if (!this.outputLinkGroupBypass) this.outputLinkGroupBypass = {}
		if (this.outputLinkGroupBypass[group] === value) return
		this.outputLinkGroupBypass[group] = value
		const varId = `output_link_group_${group}_bypass`
		const displayValue = value ? 'Bypassed' : 'Enabled'
		this.setVariableValues({ [varId]: displayValue })
		this.checkFeedbacks('output_link_group_bypassed')
	}

	_applyInputLinkGroupAssign(ch, group) {
		if (!this.inputLinkGroupAssign) this.inputLinkGroupAssign = {}
		if (this.inputLinkGroupAssign[ch] === group) return
		this.inputLinkGroupAssign[ch] = group
		const varId = `input_${ch}_link_group`
		const displayValue = group === 0 ? 'Unassigned' : `Group ${group}`
		this.setVariableValues({ [varId]: displayValue })
		this.checkFeedbacks('input_link_group_assigned')
	}

	_applyOutputLinkGroupAssign(ch, group) {
		if (!this.outputLinkGroupAssign) this.outputLinkGroupAssign = {}
		if (this.outputLinkGroupAssign[ch] === group) return
		this.outputLinkGroupAssign[ch] = group
		const varId = `output_${ch}_link_group`
		const displayValue = group === 0 ? 'Unassigned' : `Group ${group}`
		this.setVariableValues({ [varId]: displayValue })
		this.checkFeedbacks('output_link_group_assigned')
	}

	_applyMatrixCrosspointsUsed(count) {
		if (this.matrixCrosspointsUsed === count) return
		this.matrixCrosspointsUsed = count
		this.setVariableValues({ matrix_crosspoints_used: String(count) })
	}

	_applyClockAesValue(varId, value) {
		if (this.clockAesValues[varId] === value) return
		this.clockAesValues[varId] = value
		this.setVariableValues({ [varId]: value })
	}
	_applyClockInputValue(varId, value) {
		if (this.clockInputValues[varId] === value) return
		this.clockInputValues[varId] = value
		this.setVariableValues({ [varId]: value })
	}
	_applyClockSystemValue(varId, value) {
		if (this.clockSystemValues[varId] === value) return
		this.clockSystemValues[varId] = value
		this.setVariableValues({ [varId]: value })
	}
	_applyWordClockValue(varId, value) {
		if (this.wordClockValues[varId] === value) return
		this.wordClockValues[varId] = value
		this.setVariableValues({ [varId]: value })
	}
	_getDisplayPreferenceLabel(key, value) {
		const str = value == null ? '' : String(value)
		if (str === '') return '---'
		if (key === 'brightness') return DISPLAY_BRIGHTNESS_LABELS[str] || `Level ${str}`
		if (key === 'display_color') return DISPLAY_COLOR_LABELS[str] || `Color ${str}`
		return str
	}
	_applyDisplayPreference(key, value) {
		if (!key) return
		this.displayPrefs = this.displayPrefs || { brightness: null, display_color: null }
		const normalized = value == null ? '' : String(value)
		if (this.displayPrefs[key] === normalized) return
		this.displayPrefs[key] = normalized
		const varId = key === 'brightness' ? 'front_panel_brightness' : 'front_panel_display_color'
		const label = this._getDisplayPreferenceLabel(key, normalized)
		try {
			this.setVariableValues({ [varId]: label })
		} catch {}
		if (typeof this.checkFeedbacks === 'function') {
			if (key === 'brightness') this.checkFeedbacks('front_panel_brightness_state')
			else if (key === 'display_color') this.checkFeedbacks('front_panel_display_color')
		}
	}
	_applyMiscValue(varId, value) {
		if (this.miscValues[varId] === value) return
		this.miscValues[varId] = value
		this.setVariableValues({ [varId]: value })
	}

	_applyInputName(ch, name) {
		if (this.inputName[ch] === name) return
		this.inputName[ch] = name
		this.setVariableValues({ [`input_${ch}_name`]: name })
		this._scheduleActionsRefresh()
		this._scheduleFeedbacksRefresh()
	}
	_applyOutputName(ch, name) {
		if (this.outputName[ch] === name) return
		this.outputName[ch] = name
		this.setVariableValues({ [`output_${ch}_name`]: name })
		this._scheduleActionsRefresh()
	}
	_applyStatusNetworkValue(varId, value) {
		if (this.statusNetwork[varId] === value) return
		this.statusNetwork[varId] = value
		this.setVariableValues({ [varId]: value })
	}

	_applySnapshotValue(varId, value) {
		if (this.snapshotValues[varId] === value) return
		this.snapshotValues[varId] = value
		this.setVariableValues({ [varId]: value })

		const affectsActions =
			/^snapshot_\d+_(name|comment|locked)$/.test(varId) || /^snapshot_active_(id|name|comment)$/.test(varId)

		const affectsVariables =
			/^snapshot_\d+_(comment|created|last_updated|locked|modified|name)$/.test(varId) ||
			/^snapshot_active_(comment|created|id|last_updated|locked|modified|name)$/.test(varId)

		if (affectsActions) {
			this._scheduleActionsRefresh?.()
			this._scheduleFeedbacksRefresh?.()
			this._schedulePresetsRefresh?.()
		}

		if (affectsVariables) {
			this._scheduleVariablesRefresh?.()
		}

		if (varId === 'snapshot_active_id') {
			this.checkFeedbacks?.('snapshot_is_active')
		}

		if (/^snapshot_\d+_locked$/.test(varId)) {
			this.checkFeedbacks?.('snapshot_locked')
		}
	}

	_applySnapshotBootId(value) {
		const normalized = value == null ? '' : String(value)
		if (this.snapshotValues?.snapshot_boot_id === normalized) return
		this.snapshotValues = this.snapshotValues || {}
		this.snapshotValues.snapshot_boot_id = normalized
		this.setVariableValues({ snapshot_boot_id: normalized })
		this._scheduleActionsRefresh?.()
		this._scheduleFeedbacksRefresh?.()
		this._schedulePresetsRefresh?.()
		this.checkFeedbacks?.('snapshot_is_boot')
	}

	_applyBeamControlErrorCode(arrayIndex, value) {
		if (!this.beamControlStatus) this.beamControlStatus = {}
		if (!this.beamControlStatus[arrayIndex]) this.beamControlStatus[arrayIndex] = {}
		if (this.beamControlStatus[arrayIndex].errorCode === value) return
		this.beamControlStatus[arrayIndex].errorCode = value
		// Error code labels for reference
		const errorCodeLabels = {
			0: 'ACTIVE',
			1: 'BYPASS',
			2: 'ERROR_CALCULATION',
			3: 'ERROR_OUTPUT_RANGE',
			4: 'ERROR_NUMBER_OF_OUTPUTS',
			5: 'ERROR_NUMBER_OF_ELEMENTS',
			6: 'ERROR_ARRAY_SPLAY',
			7: 'ERROR_MAINTENANCE_FREQ',
			8: 'WARNING_GRATING_LOBES',
		}
		this.beamControlStatus[arrayIndex].errorCodeLabel = errorCodeLabels[value] || `Unknown (${value})`

		// Update variables for all arrays (1-4)
		if (arrayIndex >= 1 && arrayIndex <= 4) {
			this.setVariableValues({
				[`lmbc_${arrayIndex}_error_code`]: String(value),
				[`lmbc_${arrayIndex}_error_status`]: this.beamControlStatus[arrayIndex].errorCodeLabel,
			})
			// Refresh action panel to update static-text display
			this.updateActions?.()
			// Check feedbacks
			this.checkFeedbacks?.('lmbc_enabled', 'lmbc_bypassed')
		}
	}

	_applyBeamControlErrorString(arrayIndex, value) {
		if (!this.beamControlStatus) this.beamControlStatus = {}
		if (!this.beamControlStatus[arrayIndex]) this.beamControlStatus[arrayIndex] = {}
		if (this.beamControlStatus[arrayIndex].errorString === value) return
		this.beamControlStatus[arrayIndex].errorString = value

		// Update variables for all arrays (1-4)
		if (arrayIndex >= 1 && arrayIndex <= 4) {
			this.setVariableValues({
				[`lmbc_${arrayIndex}_error_string`]: value,
			})
			// Refresh action panel to update static-text display
			this.updateActions?.()
		}
	}

	_applyInputMode(ch, mode) {
		const v = Number(mode)
		if (!Number.isFinite(v)) return
		if (this.inputMode[ch] === v) return
		this.inputMode[ch] = v
		if (ch >= 1 && ch <= NUM_INPUTS) {
			this.setVariableValues({ [`input_${ch}_mode`]: String(v) })
		}
		this.checkFeedbacks && this.checkFeedbacks('input_mode')
	}

	_applyOutputDelay(ch, samples) {
		if (!this.outputDelay) this.outputDelay = {}
		const s = Number(samples)
		if (!Number.isFinite(s)) return
		const ms = s / SAMPLES_PER_MS
		this.outputDelay[ch] = { samples: s, ms }
		this.setVariableValues({ [`output_${ch}_delay_ms`]: String(ms) })
	}

	_applyInputDelay(ch, samples) {
		if (!this.inputDelay) this.inputDelay = {}
		const s = Number(samples)
		if (!Number.isFinite(s)) return
		const ms = s / SAMPLES_PER_MS
		this.inputDelay[ch] = { samples: s, ms }
		this.setVariableValues({ [`input_${ch}_delay_ms`]: ms.toFixed(2) })
	}

	_applyInputUShapingBypass(ch, value) {
		if (!this.inputUShaping) this.inputUShaping = {}
		if (!this.inputUShaping[ch]) this.inputUShaping[ch] = {}

		const state = !!value
		if (this.inputUShaping[ch].bypass === state) return

		this.inputUShaping[ch].bypass = state
		this.setVariableValues({ [`input_${ch}_ushaping_bypass`]: state ? 'ON' : 'OFF' })
	}

	_applyInputUShaping(ch, band, param, value) {
		if (!this.inputUShaping) this.inputUShaping = {}
		if (!this.inputUShaping[ch]) this.inputUShaping[ch] = {}
		if (!this.inputUShaping[ch][band]) this.inputUShaping[ch][band] = {}

		// Handle band_bypass as boolean
		if (param === 'band_bypass') {
			const state = !!value
			if (this.inputUShaping[ch][band].band_bypass === state) return
			this.inputUShaping[ch][band].band_bypass = state
			this.setVariableValues({ [`input_${ch}_ushaping_band${band}_bypass`]: state ? 'ON' : 'OFF' })
			return
		}

		const val = Number(value)
		if (!Number.isFinite(val)) return

		if (this.inputUShaping[ch][band][param] === val) return

		this.inputUShaping[ch][band][param] = val

		const vars = {}
		if (param === 'gain') {
			vars[`input_${ch}_ushaping_band${band}_gain`] = val.toFixed(1)
		} else if (param === 'frequency') {
			vars[`input_${ch}_ushaping_band${band}_frequency`] = Math.round(val).toString()
		} else if (param === 'slope') {
			vars[`input_${ch}_ushaping_band${band}_slope`] = Math.round(val).toString()
		}

		if (Object.keys(vars).length > 0) {
			this.setVariableValues(vars)
		}

		// Update dynamic current value variables if this is the selected input/band
		this._updateUShapingCurrentValues()
	}

	_applyInputEQBypass(ch, value) {
		if (!this.inputEQ) this.inputEQ = {}
		if (!this.inputEQ[ch]) this.inputEQ[ch] = {}

		const state = !!value
		if (this.inputEQ[ch].bypass === state) return

		this.inputEQ[ch].bypass = state
		this.setVariableValues({ [`input_${ch}_eq_bypass`]: state ? 'ON' : 'OFF' })
	}

	_applyInputEQ(ch, band, param, value) {
		if (!this.inputEQ) this.inputEQ = {}
		if (!this.inputEQ[ch]) this.inputEQ[ch] = {}
		if (!this.inputEQ[ch][band]) this.inputEQ[ch][band] = {}

		// Handle band_bypass as boolean
		if (param === 'band_bypass') {
			const state = !!value
			if (this.inputEQ[ch][band].band_bypass === state) return
			this.inputEQ[ch][band].band_bypass = state
			this.setVariableValues({ [`input_${ch}_eq_band${band}_bypass`]: state ? 'ON' : 'OFF' })
			return
		}

		const val = Number(value)
		if (!Number.isFinite(val)) return

		if (this.inputEQ[ch][band][param] === val) return

		this.inputEQ[ch][band][param] = val

		const vars = {}
		if (param === 'gain') {
			vars[`input_${ch}_eq_band${band}_gain`] = val.toFixed(1)
		} else if (param === 'frequency') {
			// 0.01 Hz precision below 100 Hz, 1 Hz above
			const freqStr = val < 100 ? val.toFixed(2) : Math.round(val).toString()
			vars[`input_${ch}_eq_band${band}_frequency`] = freqStr
		} else if (param === 'bandwidth') {
			vars[`input_${ch}_eq_band${band}_bandwidth`] = val.toFixed(2)
		}

		if (Object.keys(vars).length > 0) {
			this.setVariableValues(vars)
		}

		// Update dynamic current value variables if this is the selected input/band
		this._updateEQCurrentValues()
	}

	_applyOutputUShapingBypass(ch, value) {
		if (!this.outputUShaping) this.outputUShaping = {}
		if (!this.outputUShaping[ch]) this.outputUShaping[ch] = {}

		const state = !!value
		if (this.outputUShaping[ch].bypass === state) return

		this.outputUShaping[ch].bypass = state
		this.setVariableValues({ [`output_${ch}_ushaping_bypass`]: state ? 'ON' : 'OFF' })
	}

	_applyOutputUShaping(ch, band, param, value) {
		if (!this.outputUShaping) this.outputUShaping = {}
		if (!this.outputUShaping[ch]) this.outputUShaping[ch] = {}
		if (!this.outputUShaping[ch][band]) this.outputUShaping[ch][band] = {}

		// Handle band_bypass as boolean
		if (param === 'band_bypass') {
			const state = !!value
			if (this.outputUShaping[ch][band].band_bypass === state) return
			this.outputUShaping[ch][band].band_bypass = state
			this.setVariableValues({ [`output_${ch}_ushaping_band${band}_bypass`]: state ? 'ON' : 'OFF' })
			return
		}

		const val = Number(value)
		if (!Number.isFinite(val)) return

		if (this.outputUShaping[ch][band][param] === val) return

		this.outputUShaping[ch][band][param] = val

		const vars = {}
		if (param === 'gain') {
			vars[`output_${ch}_ushaping_band${band}_gain`] = val.toFixed(1)
		} else if (param === 'frequency') {
			vars[`output_${ch}_ushaping_band${band}_frequency`] = Math.round(val).toString()
		} else if (param === 'slope') {
			vars[`output_${ch}_ushaping_band${band}_slope`] = Math.round(val).toString()
		}

		if (Object.keys(vars).length > 0) {
			this.setVariableValues(vars)
		}

		// Update dynamic current value variables if this is the selected output/band
		this._updateUShapingOutputCurrentValues()
	}

	_applyOutputEQBypass(ch, value) {
		if (!this.outputEQ) this.outputEQ = {}
		if (!this.outputEQ[ch]) this.outputEQ[ch] = {}

		const state = !!value
		if (this.outputEQ[ch].bypass === state) return

		this.outputEQ[ch].bypass = state
		this.setVariableValues({ [`output_${ch}_eq_bypass`]: state ? 'ON' : 'OFF' })
	}

	_applyOutputEQ(ch, band, param, value) {
		if (!this.outputEQ) this.outputEQ = {}
		if (!this.outputEQ[ch]) this.outputEQ[ch] = {}
		if (!this.outputEQ[ch][band]) this.outputEQ[ch][band] = {}

		// Handle band_bypass as boolean
		if (param === 'band_bypass') {
			const state = !!value
			if (this.outputEQ[ch][band].band_bypass === state) return
			this.outputEQ[ch][band].band_bypass = state
			this.setVariableValues({ [`output_${ch}_eq_band${band}_bypass`]: state ? 'ON' : 'OFF' })
			return
		}

		const val = Number(value)
		if (!Number.isFinite(val)) return

		if (this.outputEQ[ch][band][param] === val) return

		this.outputEQ[ch][band][param] = val

		const vars = {}
		if (param === 'gain') {
			vars[`output_${ch}_eq_band${band}_gain`] = val.toFixed(1)
		} else if (param === 'frequency') {
			// 0.01 Hz precision below 100 Hz, 1 Hz above
			const freqStr = val < 100 ? val.toFixed(2) : Math.round(val).toString()
			vars[`output_${ch}_eq_band${band}_frequency`] = freqStr
		} else if (param === 'bandwidth') {
			vars[`output_${ch}_eq_band${band}_bandwidth`] = val.toFixed(2)
		}

		if (Object.keys(vars).length > 0) {
			this.setVariableValues(vars)
		}

		// Update dynamic current value variables if this is the selected output/band
		this._updateEQOutputCurrentValues()
	}

	// ===== Dynamic current value updaters =====

	_updateUShapingCurrentValues() {
		if (!this._ushapingKnobControl) return

		const chs = this._ushapingKnobControl.selectedInputs || [1]
		const band = this._ushapingKnobControl.selectedBand || 1

		// For multiple channels, show first channel's values or "Mixed" if different
		const ch = chs[0]

		const vars = {}

		// Gain
		if (this.inputUShaping?.[ch]?.[band]?.gain !== undefined) {
			const gain = this.inputUShaping[ch][band].gain
			vars['ushaping_current_gain'] = gain.toFixed(1) + ' dB'
		} else {
			vars['ushaping_current_gain'] = '---'
		}

		// Frequency (bands 1-4 only)
		if (band <= 4) {
			if (this.inputUShaping?.[ch]?.[band]?.frequency !== undefined) {
				const freq = this.inputUShaping[ch][band].frequency
				vars['ushaping_current_frequency'] = Math.round(freq) + ' Hz'
			} else {
				vars['ushaping_current_frequency'] = '---'
			}
		} else {
			vars['ushaping_current_frequency'] = 'N/A'
		}

		// Slope
		if (this.inputUShaping?.[ch]?.[band]?.slope !== undefined) {
			const slope = this.inputUShaping[ch][band].slope
			vars['ushaping_current_slope'] = Math.round(slope) + ' dB/oct'
		} else {
			vars['ushaping_current_slope'] = '---'
		}

		this.setVariableValues(vars)
	}

	_updateEQCurrentValues() {
		if (!this._eqKnobControl) return

		const chs = this._eqKnobControl.selectedInputs || [1]
		const band = this._eqKnobControl.selectedBand || 1

		// For multiple channels, show first channel's values or "Mixed" if different
		const ch = chs[0]

		const vars = {}

		// Gain
		if (this.inputEQ?.[ch]?.[band]?.gain !== undefined) {
			const gain = this.inputEQ[ch][band].gain
			vars['eq_current_gain'] = gain.toFixed(1) + ' dB'
		} else {
			vars['eq_current_gain'] = '---'
		}

		// Frequency (0.01 Hz precision below 100 Hz, 1 Hz above)
		if (this.inputEQ?.[ch]?.[band]?.frequency !== undefined) {
			const freq = this.inputEQ[ch][band].frequency
			const freqStr = freq < 100 ? freq.toFixed(2) : Math.round(freq).toString()
			vars['eq_current_frequency'] = freqStr + ' Hz'
		} else {
			vars['eq_current_frequency'] = '---'
		}

		// Bandwidth (0.01 precision)
		if (this.inputEQ?.[ch]?.[band]?.bandwidth !== undefined) {
			const bw = this.inputEQ[ch][band].bandwidth
			vars['eq_current_bandwidth'] = bw.toFixed(2)
		} else {
			vars['eq_current_bandwidth'] = '---'
		}

		this.setVariableValues(vars)
	}

	_updateUShapingOutputCurrentValues() {
		if (!this._ushapingKnobControlOutput) return

		const chs = this._ushapingKnobControlOutput.selectedOutputs || [1]
		const band = this._ushapingKnobControlOutput.selectedBand || 1

		// For multiple channels, show first channel's values or "Mixed" if different
		const ch = chs[0]

		const vars = {}

		// Gain
		if (this.outputUShaping?.[ch]?.[band]?.gain !== undefined) {
			const gain = this.outputUShaping[ch][band].gain
			vars['ushaping_output_current_gain'] = gain.toFixed(1) + ' dB'
		} else {
			vars['ushaping_output_current_gain'] = '---'
		}

		// Frequency (bands 1-4 only)
		if (band <= 4) {
			if (this.outputUShaping?.[ch]?.[band]?.frequency !== undefined) {
				const freq = this.outputUShaping[ch][band].frequency
				vars['ushaping_output_current_frequency'] = Math.round(freq) + ' Hz'
			} else {
				vars['ushaping_output_current_frequency'] = '---'
			}
		} else {
			vars['ushaping_output_current_frequency'] = 'N/A'
		}

		// Slope
		if (this.outputUShaping?.[ch]?.[band]?.slope !== undefined) {
			const slope = this.outputUShaping[ch][band].slope
			vars['ushaping_output_current_slope'] = Math.round(slope) + ' dB/oct'
		} else {
			vars['ushaping_output_current_slope'] = '---'
		}

		this.setVariableValues(vars)
	}

	_updateEQOutputCurrentValues() {
		if (!this._eqKnobControlOutput) return

		const chs = this._eqKnobControlOutput.selectedOutputs || [1]
		const band = this._eqKnobControlOutput.selectedBand || 1

		// For multiple channels, show first channel's values or "Mixed" if different
		const ch = chs[0]

		const vars = {}

		// Gain
		if (this.outputEQ?.[ch]?.[band]?.gain !== undefined) {
			const gain = this.outputEQ[ch][band].gain
			vars['eq_output_current_gain'] = gain.toFixed(1) + ' dB'
		} else {
			vars['eq_output_current_gain'] = '---'
		}

		// Frequency (0.01 Hz precision below 100 Hz, 1 Hz above)
		if (this.outputEQ?.[ch]?.[band]?.frequency !== undefined) {
			const freq = this.outputEQ[ch][band].frequency
			const freqStr = freq < 100 ? freq.toFixed(2) : Math.round(freq).toString()
			vars['eq_output_current_frequency'] = freqStr + ' Hz'
		} else {
			vars['eq_output_current_frequency'] = '---'
		}

		// Bandwidth (0.01 precision)
		if (this.outputEQ?.[ch]?.[band]?.bandwidth !== undefined) {
			const bw = this.outputEQ[ch][band].bandwidth
			vars['eq_output_current_bandwidth'] = bw.toFixed(2)
		} else {
			vars['eq_output_current_bandwidth'] = '---'
		}

		this.setVariableValues(vars)
	}

	// ---- Parsing helpers ----
	_parseAnyMuteLoose(text) {
		if (!text) return undefined
		const m = text.match(/=?\s*\/processing\/(input|output)\/(\d+)\/mute\b/i)
		if (!m) return undefined
		const kind = m[1].toLowerCase()
		const ch = Number(m[2])
		if (kind === 'input' && (ch < 1 || ch > NUM_INPUTS)) return undefined
		if (kind === 'output' && (ch < 1 || ch > NUM_OUTPUTS)) return undefined
		const start = (m.index ?? 0) + m[0].length
		const tail = text.slice(start)
		let b = tail.match(/\b(true|false)\b/i)
		if (b) return { kind, ch, value: b[1].toLowerCase() === 'true' }
		b = tail.match(/\b(1|0|on|off)\b/i)
		if (b) return { kind, ch, value: /^(1|on)$/i.test(b[1]) }
		b = tail.match(/["']?value["']?\s*:\s*["']?(true|false|1|0|on|off)["']?/i)
		if (b) return { kind, ch, value: /^(true|1|on)$/i.test(b[1]) }
		b = tail.match(/[=\s:]+(true|false|1|0|on|off)\b/i)
		if (b) return { kind, ch, value: /^(true|1|on)$/i.test(b[1]) }
		return undefined
	}

	_parseInputMode(text) {
		const m = text.match(/\/device\/input\/(\d+)\/mode\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (!Number.isInteger(ch) || ch < 1 || ch > 32) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { ch, value: val }
	}

	_parseInputGain(text) {
		const m = text.match(/\/processing\/input\/(\d+)\/gain\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_INPUTS) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { ch, value: val }
	}
	_parseOutputGain(text) {
		const m = text.match(/\/processing\/output\/(\d+)\/gain\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { ch, value: val }
	}
	_parseInputMeter(text) {
		const m = text.match(/\/status\/meter\/input\/(\d+)\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_INPUTS) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { ch, value: val }
	}

	_parseOutputMeter(text) {
		const m = text.match(/\/status\/meter\/output\/(\d+)\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { ch, value: val }
	}
	_parseMatrixInputMeter(text) {
		const m = text.match(/\/status\/meter\/matrix_input\/(\d+)\b/i)
		if (!m) return undefined
		const idx = Number(m[1])
		if (idx < 1 || idx > 32) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { idx, value: val }
	}

	_parseOutputDelay(text) {
		const m = text.match(/\/processing\/output\/(\d+)\/delay\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const samples = Number(rhs)
		if (!Number.isFinite(samples)) return undefined
		return { ch, samples }
	}
	_parseInputDelay(text) {
		const m = text.match(/\/processing\/input\/(\d+)\/delay\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_INPUTS) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const samples = Number(rhs)
		if (!Number.isFinite(samples)) return undefined
		return { ch, samples }
	}
	_parseOutputPolarity(text) {
		const m = text.match(/\/processing\/output\/(\d+)\/polarity_reversal\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const lowered = String(rhs).trim().toLowerCase()
		let value
		if (['true', '1', 'on'].includes(lowered)) value = true
		else if (['false', '0', 'off'].includes(lowered)) value = false
		else return undefined
		return { ch, value }
	}
	_parseOutputHighpass(text) {
		const base = text.match(/\/processing\/output\/(\d+)\/highpass\/(bypass|frequency|type)\b/i)
		if (!base) return undefined
		const ch = Number(base[1])
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		const field = base[2].toLowerCase()
		if (field === 'bypass') {
			const rhs = this._extractRightHandBool(text)
			if (rhs == null) return undefined
			return { ch, field: 'bypass', value: rhs }
		}
		if (field === 'frequency') {
			const rhs = this._extractRightHandValue(text)
			if (rhs == null) return undefined
			const val = Number(rhs)
			if (!Number.isFinite(val)) return undefined
			return { ch, field: 'frequency', value: val }
		}
		if (field === 'type') {
			const rhs = this._extractRightHandValue(text)
			if (rhs == null) return undefined
			const val = Number(rhs)
			if (!Number.isFinite(val)) return undefined
			return { ch, field: 'type', value: val }
		}
		return undefined
	}
	_parseOutputLowpass(text) {
		const base = text.match(/\/processing\/output\/(\d+)\/lowpass\/(bypass|frequency|type)\b/i)
		if (!base) return undefined
		const ch = Number(base[1])
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		const field = base[2].toLowerCase()
		if (field === 'bypass') {
			const rhs = this._extractRightHandBool(text)
			if (rhs == null) return undefined
			return { ch, field: 'bypass', value: rhs }
		}
		if (field === 'frequency') {
			const rhs = this._extractRightHandValue(text)
			if (rhs == null) return undefined
			const val = Number(rhs)
			if (!Number.isFinite(val)) return undefined
			return { ch, field: 'frequency', value: val }
		}
		if (field === 'type') {
			const rhs = this._extractRightHandValue(text)
			if (rhs == null) return undefined
			const val = Number(rhs)
			if (!Number.isFinite(val)) return undefined
			return { ch, field: 'type', value: val }
		}
		return undefined
	}
	_parseOutputAllpass(text) {
		const base = text.match(/\/processing\/output\/(\d+)\/allpass\/(\d+)\/(band_bypass|frequency|q)\b/i)
		if (!base) return undefined
		const ch = Number(base[1])
		const band = Number(base[2])
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		if (band < 1 || band > 3) return undefined
		const field = base[3].toLowerCase()
		if (field === 'band_bypass') {
			const rhs = this._extractRightHandBool(text)
			if (rhs == null) return undefined
			return { ch, band, field: 'band_bypass', value: rhs }
		}
		if (field === 'frequency') {
			const rhs = this._extractRightHandValue(text)
			if (rhs == null) return undefined
			const val = Number(rhs)
			if (!Number.isFinite(val)) return undefined
			return { ch, band, field: 'frequency', value: val }
		}
		if (field === 'q') {
			const rhs = this._extractRightHandValue(text)
			if (rhs == null) return undefined
			const val = Number(rhs)
			if (!Number.isFinite(val)) return undefined
			return { ch, band, field: 'q', value: val }
		}
		return undefined
	}
	_parseMatrixGain(text) {
		const m = text.match(/\/processing\/matrix\/(\d+)\/(\d+)\/gain\b/i)
		if (!m) return undefined
		const mi = Number(m[1])
		const mo = Number(m[2])
		if (mi < 1 || mi > MATRIX_INPUTS) return undefined
		if (mo < 1 || mo > NUM_OUTPUTS) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { mi, mo, value: val }
	}

	_parseMatrixDelay(text) {
		const m = text.match(/\/processing\/matrix\/(\d+)\/(\d+)\/delay\b/i)
		if (!m) return undefined
		const mi = Number(m[1])
		const mo = Number(m[2])
		if (mi < 1 || mi > MATRIX_INPUTS) return undefined
		if (mo < 1 || mo > NUM_OUTPUTS) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const samples = Number(rhs)
		if (!Number.isFinite(samples)) return undefined
		return { mi, mo, samples }
	}

	_parseMatrixDelayBypass(text) {
		const m = text.match(/\/processing\/matrix\/(\d+)\/(\d+)\/delay_bypass\b/i)
		if (!m) return undefined
		const mi = Number(m[1])
		const mo = Number(m[2])
		if (mi < 1 || mi > MATRIX_INPUTS) return undefined
		if (mo < 1 || mo > NUM_OUTPUTS) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const lowered = String(rhs).trim().toLowerCase()
		let bypass
		if (lowered === 'true' || lowered === '1') bypass = true
		else if (lowered === 'false' || lowered === '0') bypass = false
		else return undefined
		return { mi, mo, bypass }
	}

	_parseMatrixDelayType(text) {
		const m = text.match(/\/processing\/matrix\/(\d+)\/(\d+)\/delay_type\b/i)
		if (!m) return undefined
		const mi = Number(m[1])
		const mo = Number(m[2])
		if (mi < 1 || mi > MATRIX_INPUTS) return undefined
		if (mo < 1 || mo > NUM_OUTPUTS) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const typeId = Number(rhs)
		if (!Number.isFinite(typeId) || typeId < 0 || typeId > 6) return undefined
		return { mi, mo, type: typeId }
	}

	_parseEntityValue(text) {
		const m = text.match(/\/entity\/([a-z0-9_]+)\b/i)
		if (!m) return undefined
		const key = m[1].toLowerCase()
		if (!ENTITY_PATHS.includes(key)) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		return { key, value: val }
	}

	_parseInputLinkGroupBypass(text) {
		const m = text.match(/\/device\/input_link_group\/([1-4])\/bypass\b/i)
		if (!m) return undefined
		const group = Number(m[1])
		if (group < 1 || group > 4) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		const value = String(val).toLowerCase() === 'true'
		return { group, value }
	}

	_parseOutputLinkGroupBypass(text) {
		const m = text.match(/\/device\/output_link_group\/([1-8])\/bypass\b/i)
		if (!m) return undefined
		const group = Number(m[1])
		if (group < 1 || group > 8) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		const value = String(val).toLowerCase() === 'true'
		return { group, value }
	}

	_parseInputLinkGroupAssign(text) {
		const m = text.match(/\/device\/input\/(\d+)\/input_link_group\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_INPUTS) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		const group = Number(val)
		if (!Number.isFinite(group) || group < 0 || group > 4) return undefined
		return { ch, group }
	}

	_parseOutputLinkGroupAssign(text) {
		const m = text.match(/\/device\/output\/(\d+)\/output_link_group\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		// Remove quotes if present (e.g., '0' becomes 0)
		const cleanVal = String(val).replace(/'/g, '')
		const group = Number(cleanVal)
		if (!Number.isFinite(group) || group < 0 || group > 8) return undefined
		return { ch, group }
	}

	_parseMatrixCrosspointsUsed(text) {
		const m = text.match(/\/status\/matrix_crosspoints_used\b/i)
		if (!m) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		const count = Number(val)
		if (!Number.isFinite(count) || count < 0 || count > 232) return undefined
		return count
	}

	_parseClockAesValue(text) {
		const m = text.match(/\/status\/clock\/aes_output\/([a-z0-9_]+)\b/i)
		if (!m) return undefined
		const leaf = m[1].toLowerCase()
		const varId = CLOCK_AES_STATUS_PATHS[leaf]
		if (!varId) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		return { varId, value: val }
	}
	_parseClockInputValue(text) {
		const m = text.match(/\/status\/clock\/input\/(\d+)\/(sample_rate|sync)\b/i)
		if (!m) return undefined
		const idx = Number(m[1])
		const leaf = m[2].toLowerCase()
		if (!CLOCK_INPUT_INDEXES.includes(idx)) return undefined
		if (!CLOCK_INPUT_LEAVES.includes(leaf)) return undefined
		const varId = `clock_input_${idx}_${leaf}`
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		return { varId, value: val }
	}
	_parseClockSystemValue(text) {
		const m = text.match(/\/status\/clock\/system\/([a-z0-9_]+)\b/i)
		if (!m) return undefined
		const leaf = m[1].toLowerCase()
		const varId = CLOCK_SYSTEM_PATHS[leaf]
		if (!varId) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		return { varId, value: val }
	}
	_parseWordClockValue(text) {
		const m = text.match(/\/status\/clock\/word_clock\/([a-z0-9_]+)\b/i)
		if (!m) return undefined
		const leaf = m[1].toLowerCase()
		const varId = WORD_CLOCK_PATHS[leaf]
		if (!varId) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		return { varId, value: val }
	}
	_parseRtcValue(text) {
		if (!/\/status\/clock\/rtc\/date_and_time\b/i.test(text)) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		return { value: val }
	}

	_parseLogMessage(text) {
		if (!/\/status\/log_message\b/i.test(text)) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null || val === '') return undefined
		return val
	}

	_parseNameValue(text) {
		let m = text.match(/\/device\/(input|output)\/(\d+)\/name\b/i)
		if (!m) return undefined
		const kind = m[1].toLowerCase()
		const ch = Number(m[2])
		if (kind === 'input' && (ch < 1 || ch > 32)) return undefined
		if (kind === 'output' && (ch < 1 || ch > NUM_OUTPUTS)) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		return { kind, ch, value: val }
	}

	_parseFanStatus(text) {
		const m = text.match(/\/status\/hardware\/board\/digital\/fan\/(\d+)\/(stalled|tach)\b/i)
		if (!m) return undefined
		const index = Number(m[1])
		if (!Number.isFinite(index) || index < 1 || index > 4) return undefined
		const key = m[2].toLowerCase()
		const raw = this._extractRightHandValue(text)
		if (raw == null) return undefined
		if (key === 'stalled') {
			const v = /^(true|1|on)$/i.test(raw)
			return { index, key, value: v }
		}
		if (key === 'tach') {
			const n = Number(raw)
			if (!Number.isFinite(n)) return undefined
			return { index, key, value: n }
		}
		return undefined
	}

	_parseStatusNetworkValue(text) {
		const m = text.match(/\/status\/network\/(\d+)\/([a-z_]+)\b/i)
		if (!m) return undefined
		const iface = Number(m[1])
		const leaf = m[2].toLowerCase()
		if (!NET_IFACES.includes(iface) || !NET_LEAVES.includes(leaf)) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		const varId = `status_network_${iface}_${leaf}`
		return { varId, value: val }
	}
	_parseModelString(text) {
		if (!/\/status\/model_string\b/i.test(text)) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		return { value: val }
	}

	_parseDisplayPreference(text) {
		const m = text.match(/\/device\/preferences\/(brightness|display_color)\b/i)
		if (!m) return undefined
		const key = m[1].toLowerCase()
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		return { key, value: val }
	}

	_parseFrontPanelLockout(text) {
		const m = text.match(/\/system\/hardware\/front_panel_lockout\b/i)
		if (!m) return undefined
		const rhs = this._extractRightHandBool(text)
		if (rhs == null) return undefined
		return { value: rhs }
	}

	_parseIdentifyActive(text) {
		if (!/\/status\/identify_active\b/i.test(text)) return undefined
		const rhs = this._extractRightHandBool(text)
		if (rhs == null) return undefined
		return { value: rhs }
	}

	_parseAccessPrivilege(text) {
		if (!/\/system\/access\/1\/privilege\b/i.test(text)) return undefined
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const v = BigInt(rhs)
		return v
	}
	_parseSnapshotValue(text) {
		let m = text.match(/\/project\/snapshot\/(active|\d+)\/([a-z_]+)\b/i)
		if (!m) return undefined
		const idRaw = m[1].toLowerCase()
		const field = m[2].toLowerCase()

		if (idRaw === 'active') {
			if (!SNAPSHOT_ACTIVE_FIELDS.includes(field)) return undefined
			const val = this._extractRightHandValue(text)
			if (val == null) return undefined
			const varId = `snapshot_active_${field}`
			return { varId, value: val }
		}

		const id = Number(idRaw)
		if (!Number.isInteger(id) || id < 0 || id > SNAPSHOT_MAX) return undefined
		if (!SNAPSHOT_FIELDS.includes(field)) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		const varId = `snapshot_${id}_${field}`
		return { varId, value: val }
	}

	_parseBootSnapshotId(text) {
		if (!/\/project\/boot_snapshot_id\b/i.test(text)) return undefined
		const val = this._extractRightHandValue(text)
		if (val == null) return undefined
		return val
	}

	_parseInputUShapingBypass(text) {
		const m = text.match(/\/processing\/input\/(\d+)\/ushaping\/bypass\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_INPUTS) return undefined
		const rhs = this._extractRightHandBool(text)
		if (rhs == null) return undefined
		return { ch, value: rhs }
	}

	_parseInputUShaping(text) {
		const m = text.match(/\/processing\/input\/(\d+)\/ushaping\/(\d+)\/(gain|frequency|slope|band_bypass)\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		const band = Number(m[2])
		const param = m[3].toLowerCase()
		if (ch < 1 || ch > NUM_INPUTS) return undefined
		if (band < 1 || band > 5) return undefined
		// Band 5 has no frequency parameter
		if (band === 5 && param === 'frequency') return undefined

		// band_bypass is a boolean
		if (param === 'band_bypass') {
			const rhs = this._extractRightHandBool(text)
			if (rhs == null) return undefined
			return { ch, band, param, value: rhs }
		}

		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { ch, band, param, value: val }
	}

	_parseInputEQBypass(text) {
		const m = text.match(/\/processing\/input\/(\d+)\/eq\/bypass\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_INPUTS) return undefined
		const rhs = this._extractRightHandBool(text)
		if (rhs == null) return undefined
		return { ch, value: rhs }
	}

	_parseInputEQ(text) {
		const m = text.match(/\/processing\/input\/(\d+)\/eq\/(\d+)\/(gain|frequency|bandwidth|band_bypass)\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		const band = Number(m[2])
		const param = m[3].toLowerCase()
		if (ch < 1 || ch > NUM_INPUTS) return undefined
		if (band < 1 || band > 5) return undefined

		// band_bypass is a boolean
		if (param === 'band_bypass') {
			const rhs = this._extractRightHandBool(text)
			if (rhs == null) return undefined
			return { ch, band, param, value: rhs }
		}

		// Other parameters are numeric
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { ch, band, param, value: val }
	}

	_parseOutputUShapingBypass(text) {
		const m = text.match(/\/processing\/output\/(\d+)\/ushaping\/bypass\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		const rhs = this._extractRightHandBool(text)
		if (rhs == null) return undefined
		return { ch, value: rhs }
	}

	_parseOutputUShaping(text) {
		const m = text.match(/\/processing\/output\/(\d+)\/ushaping\/(\d+)\/(gain|frequency|slope|band_bypass)\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		const band = Number(m[2])
		const param = m[3].toLowerCase()
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		if (band < 1 || band > 5) return undefined
		// Band 5 has no frequency parameter
		if (band === 5 && param === 'frequency') return undefined

		// band_bypass is a boolean
		if (param === 'band_bypass') {
			const rhs = this._extractRightHandBool(text)
			if (rhs == null) return undefined
			return { ch, band, param, value: rhs }
		}

		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { ch, band, param, value: val }
	}

	_parseOutputEQBypass(text) {
		const m = text.match(/\/processing\/output\/(\d+)\/eq\/bypass\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		const rhs = this._extractRightHandBool(text)
		if (rhs == null) return undefined
		return { ch, value: rhs }
	}

	_parseOutputEQ(text) {
		const m = text.match(/\/processing\/output\/(\d+)\/eq\/(\d+)\/(gain|frequency|bandwidth|band_bypass)\b/i)
		if (!m) return undefined
		const ch = Number(m[1])
		const band = Number(m[2])
		const param = m[3].toLowerCase()
		if (ch < 1 || ch > NUM_OUTPUTS) return undefined
		if (band < 1 || band > 10) return undefined // Outputs have 10 bands

		// band_bypass is a boolean
		if (param === 'band_bypass') {
			const rhs = this._extractRightHandBool(text)
			if (rhs == null) return undefined
			return { ch, band, param, value: rhs }
		}

		// Other parameters are numeric
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { ch, band, param, value: val }
	}

	_parseBeamControlErrorCode(text) {
		const m = text.match(/\/processing\/beam_control_array\/(\d+)\/error_code\b/i)
		if (!m) return undefined
		const arrayIndex = Number(m[1])
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		const val = Number(rhs)
		if (!Number.isFinite(val)) return undefined
		return { arrayIndex, value: val }
	}

	_parseBeamControlErrorString(text) {
		const m = text.match(/\/processing\/beam_control_array\/(\d+)\/error_string\b/i)
		if (!m) return undefined
		const arrayIndex = Number(m[1])
		const rhs = this._extractRightHandValue(text)
		if (rhs == null) return undefined
		return { arrayIndex, value: String(rhs) }
	}

	_extractRightHandValue(text) {
		const m = text.match(/[=\s:]+(.+)$/)
		if (!m || !m[1]) return null
		let v = m[1].trim()
		if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1)
		return v
	}
	_extractRightHandBool(text) {
		const v = this._extractRightHandValue(text)
		if (v == null) return null
		if (/^(true|1|on)$/i.test(v)) return true
		if (/^(false|0|off)$/i.test(v)) return false
		return null
	}

	// ---- Connection resolver (manual only) ----
	// ✅ IMPROVED: Better validation
	_resolveHostPortFromConfig() {
		// Check if Bonjour device is selected (format: "IP:PORT" or "[IPv6]:PORT")
		if (this.config?.bonjour_host) {
			const bonjourHost = this.config.bonjour_host.trim()
			let host, port

			// IPv6 format: [address]:port
			if (bonjourHost.startsWith('[')) {
				const match = bonjourHost.match(/^\[([^\]]+)\]:(\d+)$/)
				if (match) {
					host = match[1]
					port = Number(match[2])
				}
			} else {
				// IPv4 format: address:port
				// Split from the right to get the last colon (port separator)
				const lastColonIndex = bonjourHost.lastIndexOf(':')
				if (lastColonIndex !== -1) {
					host = bonjourHost.substring(0, lastColonIndex).trim()
					port = Number(bonjourHost.substring(lastColonIndex + 1))
				}
			}

			if (host && Number.isFinite(port) && port >= 1 && port <= 65535) {
				return { host, port }
			}
		}

		// Fall back to manual host/port
		const host = this.config?.host
		if (!host || typeof host !== 'string' || host.trim() === '') {
			return { host: null, port: null }
		}
		const port = Number(this.config?.port)
		if (!Number.isFinite(port) || port < 1 || port > 65535) {
			return { host: null, port: null }
		}
		return { host: host.trim(), port }
	}
}

// Attach data structures to the class so actions can access them via self.constructor
ModuleInstance.STARTING_POINTS_SOURCE = STARTING_POINTS_SOURCE
ModuleInstance.PRODUCT_INTEGRATION_DATA = PRODUCT_INTEGRATION_DATA

runEntrypoint(ModuleInstance, UpgradeScripts)
