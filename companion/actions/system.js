// actions/system.js
// System-level actions: identify, reboot, clock, AVB, SIM bus, access lock, speaker test, front panel

const {
	DISPLAY_NOCHANGE,
	DISPLAY_BRIGHTNESS_CHOICES,
	DISPLAY_COLOR_CHOICES,
	buildInputChoices,
	buildOutputChoices,
	nn,
} = require('../helpers')
const { buildMatrixInputChoices, safeGetChannels } = require('../actions-helpers')

/**
 * Register system-related actions
 * @param {Object} actions - Actions object to populate
 * @param {Object} self - Module instance
 * @param {number} NUM_INPUTS - Number of input channels
 * @param {number} NUM_OUTPUTS - Number of output channels
 */
function registerSystemActions(actions, self, NUM_INPUTS, NUM_OUTPUTS) {
	// Build choices arrays
	const inputChoices = buildInputChoices(self, NUM_INPUTS)
	const outputChoices = buildOutputChoices(self, NUM_OUTPUTS)
	const outputChoicesFriendly = outputChoices // Alias for clarity

	// =========================
	// ===== ENTITY INFO =======
	// =========================

	actions['set_group_name'] = {
		name: 'Entity: Set Group Name',
		options: [
			{
				type: 'textinput',
				id: 'group_name',
				label: 'Group Name',
				default: '',
			},
		],
		callback: (e) => {
			if (!self) return
			const groupName = String(e.options.group_name || '')
			self._cmdSendLine(`/entity/group_name='${groupName}'`)
			self.log?.('info', `Set group name to: ${groupName}`)
		},
	}

	// =========================
	// ===== INPUT MODE ========
	// =========================

	actions['system_input_mode_set'] = {
		name: 'System: Set input mode (Inputs 1-8)',
		options: [
			{
				type: 'multidropdown',
				id: 'chs',
				label: 'Device input channel(s)',
				default: [],
				choices: inputChoices,
				minSelection: 0,
			},
			{
				type: 'dropdown',
				id: 'mode',
				label: 'Mode',
				default: '1',
				choices: [
					{ id: '0', label: '0 - No Input' },
					{ id: '1', label: '1 - Analog' },
					{ id: '2', label: '2 - AES3L' },
					{ id: '3', label: '3 - AES3R' },
					{ id: '4', label: '4 - AVB' },
				],
			},
		],
		callback: (e) => {
			if (!self) return
			const mode = Number(e.options.mode)
			const chs = safeGetChannels(e.options, 'chs', NUM_INPUTS)
			if (chs.length === 0) {
				self.log?.('warn', 'No valid input channels selected')
				return
			}

			for (const ch of chs) {
				if (typeof self._setInputMode === 'function') {
					self._setInputMode(ch, mode)
				}
				if (typeof self._applyInputMode === 'function') {
					self._applyInputMode(ch, mode)
				}
			}
		},
	}

	// =========================
	// ===== SPEAKER TEST ======
	// =========================

	actions['system_chase_start'] = {
		name: 'Speaker test: Start',
		options: [
			{ type: 'dropdown', id: 'start', label: 'First output', default: '1', choices: outputChoicesFriendly },
			{
				type: 'dropdown',
				id: 'end',
				label: 'Last output',
				default: String(Math.min(8, NUM_OUTPUTS)),
				choices: outputChoicesFriendly,
			},
			{
				type: 'dropdown',
				id: 'delay',
				label: 'Delay per step',
				default: '1000',
				choices: [
					{ id: '250', label: '0.25 s' },
					{ id: '500', label: '0.5 s' },
					{ id: '1000', label: '1 s' },
					{ id: '2000', label: '2 s' },
					{ id: '3000', label: '3 s' },
					{ id: '5000', label: '5 s' },
					{ id: '10000', label: '10 s' },
					{ id: '15000', label: '15 s' },
				],
			},
			{
				type: 'dropdown',
				id: 'window',
				label: 'Speakers at a time',
				default: '1',
				choices: [
					{ id: '1', label: '1 (solo)' },
					{ id: '2', label: '2 (solo->pair->advance)' },
				],
			},
			{ type: 'checkbox', id: 'loop', label: 'Loop sequence', default: false },
		],
		callback: (e) => {
			if (!self || typeof self._startOutputChase !== 'function') return
			self._startOutputChase(
				Number(e.options.start),
				Number(e.options.end),
				Number(e.options.delay),
				Number(e.options.window),
				!!e.options.loop,
				e?.controlId || e?.event?.controlId || null,
			)
		},
	}

	actions['system_chase_stop'] = {
		name: 'Speaker test: Stop',
		options: [],
		callback: () => {
			if (!self || typeof self._stopOutputChase !== 'function') return
			self._stopOutputChase()
		},
	}

	// =========================
	// ======= AVB CONNECT =====
	// =========================

	actions['connect_avb_input'] = {
		name: 'AVB: Connect input stream',
		options: [
			{
				type: 'dropdown',
				id: 'input',
				label: 'Galaxy input / matrix input',
				default: '1',
				choices: buildMatrixInputChoices(self),
			},
			{ type: 'textinput', id: 'groupP', label: 'Primary group', default: 'HQ.Audio' },
			{ type: 'textinput', id: 'entityP', label: 'Primary entity', default: 'GX 1 L' },
			{ type: 'number', id: 'idxP', label: 'Primary index', default: 0, min: 0, max: 999, step: 1 },
			{ type: 'number', id: 'chanP', label: 'Primary channel', default: 0, min: 0, max: 999, step: 1 },
			{ type: 'textinput', id: 'groupS', label: 'Secondary group', default: 'HQ.Audio' },
			{ type: 'textinput', id: 'entityS', label: 'Secondary entity', default: 'GX 1 L' },
			{ type: 'number', id: 'idxS', label: 'Secondary index', default: 0, min: 0, max: 999, step: 1 },
			{ type: 'number', id: 'chanS', label: 'Secondary channel', default: 0, min: 0, max: 999, step: 1 },
		],
		callback: (e) => {
			if (!self || typeof self._sendConnectAvbInput !== 'function') return
			self._sendConnectAvbInput({
				input: Number(e.options.input),
				groupP: e.options.groupP,
				entityP: e.options.entityP,
				streamIndexP: e.options.idxP,
				streamChanP: e.options.chanP,
				groupS: e.options.groupS,
				entityS: e.options.entityS,
				streamIndexS: e.options.idxS,
				streamChanS: e.options.chanS,
			})
		},
	}

	// =========================
	// ======= SIM BUS =========
	// =========================

	const simProbeChoices = [
		{ id: '0', label: 'input post source select' },
		{ id: '1', label: 'input post processing' },
		{ id: '2', label: 'output post matrix' },
		{ id: '4', label: 'output post eq' },
		{ id: '5', label: 'output post processing' },
		{ id: '6', label: 'output post fir' },
	]
	const isInputPoint = (id) => id === '0' || id === '1'
	const validSimPoints = new Set(simProbeChoices.map((c) => c.id))

	actions['sim_enable_and_configure'] = {
		name: 'SIM: enable/disable + configure (console & processor)',
		options: [
			{
				type: 'checkbox',
				id: 'consoleEnable',
				label: 'console SIM bus enabled',
				default: true,
			},
			{
				type: 'dropdown',
				id: 'consolePoint',
				label: 'console probe point',
				default: '0',
				choices: simProbeChoices,
			},
			{
				type: 'dropdown',
				id: 'consoleChannelIn',
				label: 'console channel',
				default: '1',
				choices: inputChoices,
				isVisible: (o) => isInputPoint(String(nn(o?.consolePoint, '0'))),
			},
			{
				type: 'dropdown',
				id: 'consoleChannelOut',
				label: 'console channel',
				default: '1',
				choices: outputChoices,
				isVisible: (o) => !isInputPoint(String(nn(o?.consolePoint, '0'))),
			},
			{
				type: 'checkbox',
				id: 'processorEnable',
				label: 'processor SIM bus enabled',
				default: true,
			},
			{
				type: 'dropdown',
				id: 'processorPoint',
				label: 'processor probe point',
				default: '0',
				choices: simProbeChoices,
			},
			{
				type: 'dropdown',
				id: 'processorChannelIn',
				label: 'processor channel',
				default: '1',
				choices: inputChoices,
				isVisible: (o) => isInputPoint(String(nn(o?.processorPoint, '0'))),
			},
			{
				type: 'dropdown',
				id: 'processorChannelOut',
				label: 'processor channel',
				default: '1',
				choices: outputChoices,
				isVisible: (o) => !isInputPoint(String(nn(o?.processorPoint, '0'))),
			},
		],

		callback: (e) => {
			if (!self) return

			const pConsoleRaw = String(nn(e.options.consolePoint, '0'))
			const pConsole = validSimPoints.has(pConsoleRaw) ? pConsoleRaw : '0'
			const consoleEnabled = !!e.options.consoleEnable

			let chConsole = 1
			if (isInputPoint(pConsole)) {
				chConsole = Math.max(1, Math.min(NUM_INPUTS, Number(nn(e.options.consoleChannelIn, 1))))
			} else {
				chConsole = Math.max(1, Math.min(NUM_OUTPUTS, Number(nn(e.options.consoleChannelOut, 1))))
			}

			const pProcessorRaw = String(nn(e.options.processorPoint, '0'))
			const pProcessor = validSimPoints.has(pProcessorRaw) ? pProcessorRaw : '0'
			const processorEnabled = !!e.options.processorEnable

			let chProcessor = 1
			if (isInputPoint(pProcessor)) {
				chProcessor = Math.max(1, Math.min(NUM_INPUTS, Number(nn(e.options.processorChannelIn, 1))))
			} else {
				chProcessor = Math.max(1, Math.min(NUM_OUTPUTS, Number(nn(e.options.processorChannelOut, 1))))
			}

			const cmds = [
				`/device/sim/mute_relay/1=${consoleEnabled ? 'false' : 'true'}`,
				`/device/sim/mute_relay/2=${processorEnabled ? 'false' : 'true'}`,
				`/device/sim/probe/1/point=${pConsole}`,
				`/device/sim/probe/1/channel=${chConsole}`,
				`/device/sim/probe/2/point=${pProcessor}`,
				`/device/sim/probe/2/channel=${chProcessor}`,
			]

			if (typeof self._cmdSendBatch === 'function') {
				self._cmdSendBatch(cmds)
			} else if (typeof self._cmdSendLine === 'function') {
				cmds.forEach((c) => self._cmdSendLine(c))
			}

			const labelByPoint = {
				0: 'input post source select',
				1: 'input post processing',
				2: 'output post matrix',
				4: 'output post eq',
				5: 'output post processing',
				6: 'output post fir',
			}
			const inNm = (ch) => (self?.inputName?.[ch] ? ` - ${self.inputName[ch]}` : '')
			const outNm = (ch) => (self?.outputName?.[ch] ? ` - ${self.outputName[ch]}` : '')
			const consoleName = isInputPoint(pConsole) ? inNm(chConsole) : outNm(chConsole)
			const processorName = isInputPoint(pProcessor) ? inNm(chProcessor) : outNm(chProcessor)

			self.log?.(
				'info',
				[
					`SIM console: ${consoleEnabled ? 'enabled' : 'disabled'} (relay=${consoleEnabled ? 'false' : 'true'}), point=${pConsole} (${labelByPoint[pConsole]}), ch=${chConsole}${consoleName}`,
					`SIM processor: ${processorEnabled ? 'enabled' : 'disabled'} (relay=${processorEnabled ? 'false' : 'true'}), point=${pProcessor} (${labelByPoint[pProcessor]}), ch=${chProcessor}${processorName}`,
				].join(' | '),
			)
		},
	}

	// =========================
	// ===== ACCESS LOCK =======
	// =========================

	const privilegeChoices = [
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
	]

	// Single privilege toggle choices (without 'Lock ALL' and 'Everything')
	const singlePrivilegeChoices = privilegeChoices.filter((c) => c.id !== '0')

	actions['access_lock'] = {
		name: 'System: Access Lock',
		options: [
			{
				type: 'multidropdown',
				id: 'privs',
				label: 'Allowed privileges',
				default: ['1'],
				minSelection: 0,
				choices: [...privilegeChoices, { id: '9223372036854775807', label: 'Everything (unlock all)' }],
			},
		],
		callback: (e) => {
			if (!self || typeof self._cmdSendLine !== 'function') return

			let total = 0n
			if (Array.isArray(e.options.privs) && e.options.privs.length > 0) {
				if (e.options.privs.includes('0')) {
					total = 0n
				} else {
					for (const v of e.options.privs) {
						try {
							total += BigInt(v)
						} catch (err) {
							self.log?.('warn', `Invalid privilege value: ${v}`)
						}
					}
				}
			}

			try {
				self._cmdSendLine(`/system/access/1/privilege=${total.toString()}`)
				self.accessPrivilege = total
				if (typeof self.setVariableValues === 'function') {
					self.setVariableValues({ access_privilege: total.toString() })
				}
				if (typeof self.checkFeedbacks === 'function') {
					self.checkFeedbacks('access_priv_has', 'access_priv_equals')
				}
				self.log?.('info', `Access Lock: Set privileges = ${total.toString()}`)
			} catch (err) {
				self.log?.('error', `Access lock failed: ${err?.message || err}`)
			}
		},
	}

	actions['access_priv_toggle'] = {
		name: 'Access: Toggle privilege',
		options: [
			{
				type: 'dropdown',
				id: 'value',
				label: 'Privilege',
				default: '1',
				choices: singlePrivilegeChoices,
			},
		],
		callback: (evt) => {
			if (!self) return

			try {
				const bit = BigInt(evt.options.value)
				let now
				if (typeof self.accessPrivilege === 'bigint') {
					now = self.accessPrivilege
				} else if (typeof self.accessPrivilege === 'number') {
					now = BigInt(self.accessPrivilege)
				} else {
					const s = String(nn(self?.getVariableValue?.('access_privilege'), ''))
					try {
						now = BigInt(s)
					} catch {
						now = 0n
					}
				}
				const next = now ^ bit

				if (typeof self._cmdSendLine === 'function') {
					self._cmdSendLine(`/system/access/1/privilege=${next.toString()}`)
				}
				self.accessPrivilege = next
				if (typeof self.setVariableValues === 'function') {
					self.setVariableValues({ access_privilege: next.toString() })
				}
				if (typeof self.checkFeedbacks === 'function') {
					self.checkFeedbacks('access_priv_has', 'access_priv_equals')
				}
			} catch (e) {
				self.log?.('error', `Toggle privilege failed: ${e?.message || e}`)
			}
		},
	}

	// =========================
	// ===== FRONT PANEL =======
	// =========================

	actions['front_panel_display_prefs'] = {
		name: 'Front panel: Display preferences',
		description: 'Set Galaxy front panel LCD brightness (0–2) and LED color.',
		options: [
			{
				type: 'dropdown',
				id: 'brightness',
				label: 'Brightness',
				default: '2',
				choices: [{ id: DISPLAY_NOCHANGE, label: 'Leave unchanged' }, ...DISPLAY_BRIGHTNESS_CHOICES],
			},
			{
				type: 'dropdown',
				id: 'color',
				label: 'Display color',
				default: DISPLAY_NOCHANGE,
				choices: [{ id: DISPLAY_NOCHANGE, label: 'Leave unchanged' }, ...DISPLAY_COLOR_CHOICES],
			},
		],
		callback: (e) => {
			if (!self) return
			const cmds = []
			const brightness = String(e.options?.brightness ?? DISPLAY_NOCHANGE)
			const color = String(e.options?.color ?? DISPLAY_NOCHANGE)

			if (brightness !== DISPLAY_NOCHANGE) {
				cmds.push(`/device/preferences/brightness=${brightness}`)
			}
			if (color !== DISPLAY_NOCHANGE) {
				cmds.push(`/device/preferences/display_color=${color}`)
			}

			if (cmds.length === 0) {
				self.log?.('warn', 'Front panel display action invoked with no changes selected.')
				return
			}

			if (cmds.length === 1 || typeof self._cmdSendBatch !== 'function') {
				for (const cmd of cmds) {
					if (typeof self._cmdSendLine === 'function') self._cmdSendLine(cmd)
				}
			} else {
				self._cmdSendBatch(cmds)
			}

			if (typeof self._applyDisplayPreference === 'function') {
				if (brightness !== DISPLAY_NOCHANGE) self._applyDisplayPreference('brightness', brightness)
				if (color !== DISPLAY_NOCHANGE) self._applyDisplayPreference('display_color', color)
			}
		},
	}

	actions['front_panel_lockout_control'] = {
		name: 'System: Front panel lockout',
		options: [
			{
				type: 'dropdown',
				id: 'op',
				label: 'Operation',
				default: 'toggle',
				choices: [
					{ id: 'on', label: 'Lock (ON)' },
					{ id: 'off', label: 'Unlock (OFF)' },
					{ id: 'toggle', label: 'Toggle' },
				],
			},
		],
		callback: (e) => {
			if (!self || typeof self._cmdSendLine !== 'function') return

			const op = e.options.op
			if (op === 'toggle') {
				const cur = self?.miscValues?.front_panel_lockout
				const curBool = typeof cur === 'boolean' ? cur : /^(true|1|on)$/i.test(String(nn(cur, '')).trim())
				self._cmdSendLine(`/system/hardware/front_panel_lockout=${curBool ? 'false' : 'true'}`)
				return
			}
			const state = op === 'on'
			self._cmdSendLine(`/system/hardware/front_panel_lockout=${state ? 'true' : 'false'}`)
		},
	}

	// =========================
	// ===== IDENTIFY ==========
	// =========================

	actions['system_identify'] = {
		name: 'System: Identify (front panel blink)',
		options: [
			{
				type: 'dropdown',
				id: 'state',
				label: 'Operation',
				default: 'toggle',
				choices: [
					{ id: 'on', label: 'ON (blink / identify active)' },
					{ id: 'off', label: 'OFF (stop identify)' },
					{ id: 'toggle', label: 'Toggle' },
				],
			},
		],
		callback: (e) => {
			if (!self || typeof self._cmdSendLine !== 'function') return

			const op = e.options.state
			const cur = self?.miscValues?.identify_active
			const curBool = typeof cur === 'boolean' ? cur : /^(true|1|on)$/i.test(String(nn(cur, '')).trim())

			let nextState
			if (op === 'on') nextState = true
			else if (op === 'off') nextState = false
			else nextState = !curBool

			self._cmdSendLine(`/status/identify_active=${nextState ? 'true' : 'false'}`)
			self.miscValues = self.miscValues || {}
			self.miscValues.identify_active = nextState
			if (typeof self.setVariableValues === 'function') {
				self.setVariableValues({ identify_active: nextState ? 'true' : 'false' })
			}
			if (typeof self.checkFeedbacks === 'function') {
				self.checkFeedbacks('identify_active')
			}
			self.log?.('info', `Identify: ${nextState ? 'activated' : 'deactivated'}`)
		},
	}

	// =========================
	// ======= LCD TEXT ========
	// =========================

	actions['lcd_text_override'] = {
		name: 'Front panel: LCD text',
		description: 'Set or clear the Galaxy front panel LCD text.',
		options: [
			{
				type: 'dropdown',
				id: 'mode',
				label: 'Operation',
				default: 'set',
				choices: [
					{ id: 'set', label: 'Set custom text' },
					{ id: 'clear', label: 'Clear text' },
				],
			},
			{
				type: 'textinput',
				id: 'line1',
				label: 'Line 1',
				default: '',
				isVisible: (o) => o.mode !== 'clear',
			},
			{
				type: 'textinput',
				id: 'line2',
				label: 'Line 2',
				default: '',
				isVisible: (o) => o.mode !== 'clear',
			},
		],
		callback: (e) => {
			if (!self || typeof self._cmdSendBatch !== 'function') return
			const mode = e.options.mode === 'clear' ? 'clear' : 'set'
			let cmds
			if (mode === 'clear') {
				cmds = ['/device/lcd_text_override/1=""', '/device/lcd_text_override/2=""']
				self._cmdSendBatch(cmds)
				self.log?.('info', 'LCD override cleared')
			} else {
				const l1 = String(e.options.line1 ?? '')
				const l2 = String(e.options.line2 ?? '')
				cmds = [
					`/device/lcd_text_override/1="${l1.replace(/"/g, '\\"')}"`,
					`/device/lcd_text_override/2="${l2.replace(/"/g, '\\"')}"`,
				]
				self._cmdSendBatch(cmds)
				self.log?.('info', `LCD override set: [${l1}] | [${l2}]`)
			}
		},
	}

	// =========================
	// ======= LOG =============
	// =========================

	actions['system_log_history'] = {
		name: 'System: Fetch log history',
		options: [],
		callback: () => {
			if (!self || typeof self._fetchLogHistory !== 'function') return
			self._fetchLogHistory()
		},
	}

	actions['system_clear_log_history'] = {
		name: 'System: Clear log history',
		options: [],
		callback: () => {
			if (!self || typeof self._cmdSendLine !== 'function') return
			self._cmdSendLine(':clear_log_history')
			self.log?.('info', 'Galaxy log history cleared')
		},
	}

	actions['system_add_log_message'] = {
		name: 'System: Post log message',
		description: 'Send a custom message into the Galaxy system log.',
		options: [
			{
				type: 'textinput',
				id: 'message',
				label: 'Log message',
				default: 'Companion connected',
			},
		],
		callback: (e) => {
			if (!self || typeof self._cmdSendLine !== 'function') return
			const msg = String(e?.message || e?.options?.message || '').trim()
			if (!msg) {
				self.log?.('warn', 'Add log message skipped: message is empty')
				return
			}
			const safe = msg.replace(/"/g, '\\"')
			self._cmdSendLine(`:add_log_message "${safe}"`)
			self.log?.('info', `Galaxy log message queued: ${msg}`)
		},
	}

	// =========================
	// ======= REBOOT ==========
	// =========================

	actions['system_reboot'] = {
		name: 'System: Reboot Galaxy',
		description: 'Reboot the Galaxy into a selected mode. Use with care!',
		options: [
			{
				type: 'dropdown',
				id: 'mode',
				label: 'Reboot mode',
				default: 'running',
				choices: [
					{ id: 'running', label: 'Running (normal)' },
					{ id: 'recovery', label: 'Recovery' },
					{ id: 'defaults', label: 'Factory defaults' },
					//{ id: 'diagnostic', label: 'Diagnostic' },
					{ id: 'core', label: 'Core' },
				],
			},
			{
				type: 'checkbox',
				id: 'confirm',
				label: 'Yes, reboot the Galaxy now',
				default: false,
			},
		],
		callback: (e) => {
			if (!self || typeof self._cmdSendLine !== 'function') return
			if (!e.options.confirm) {
				self.log?.('warn', 'Reboot skipped: confirmation checkbox not checked')
				return
			}
			const mode = String(e.options.mode || '').toLowerCase()
			if (!['running', 'recovery', 'defaults', 'diagnostic', 'core'].includes(mode)) {
				self.log?.('warn', `Reboot skipped: invalid mode "${e.options.mode}"`)
				return
			}
			self._cmdSendLine(`:reboot ${mode}`)
			self.log?.('info', `Galaxy reboot requested (mode=${mode})`)
		},
	}

	// =========================
	// ===== CLOCK SOURCE ======
	// =========================

	actions['system_set_clock_source'] = {
		name: 'System: Set clock source',
		description: 'Change the Galaxy system clock source (optional input for AES/AVB/CRF).',
		options: [
			{
				type: 'dropdown',
				id: 'source',
				label: 'Clock source',
				default: 'internal',
				choices: [
					{ id: 'internal', label: 'Internal' },
					{ id: 'aes', label: 'AES (digital)' },
					{ id: 'avb', label: 'AVB' },
					{ id: 'crf', label: 'CRF' },
					{ id: 'bnc', label: 'BNC (Word Clock)' },
				],
			},
			{
				type: 'dropdown',
				id: 'input',
				label: 'Input number',
				default: '1',
				choices: [
					{ id: '1', label: 'Input A (1)' },
					{ id: '2', label: 'Input B (2)' },
					{ id: '3', label: 'Input C (3)' },
				],
				isVisible: (o) => o.source === 'aes' || o.source === 'avb' || o.source === 'crf',
			},
			{
				type: 'static-text',
				id: 'bncInfo',
				label: 'BNC/Internal note',
				value: 'BNC and Internal sources ignore the input number.',
				isVisible: (o) => o.source === 'bnc' || o.source === 'internal',
			},
		],
		callback: (e) => {
			if (!self || typeof self._cmdSendLine !== 'function') return
			const src = String(e.options.source || '').toLowerCase()
			if (!['aes', 'avb', 'crf', 'bnc', 'internal'].includes(src)) {
				self.log?.('warn', `Clock source change skipped: invalid source "${e.options.source}"`)
				return
			}

			let inputNum = ''
			if (src === 'aes' || src === 'avb' || src === 'crf') {
				const chosen = Number(e.options.input)
				if (!Number.isInteger(chosen) || chosen < 1) {
					self.log?.('warn', `Clock source change skipped: invalid input number "${e.options.input}"`)
					return
				}
				inputNum = String(chosen)
			} else {
				inputNum = ''
			}

			const cmd = inputNum ? `:set_clock_source ${src} ${inputNum}` : `:set_clock_source ${src}`
			self._cmdSendLine(cmd)
			self.log?.('info', `Clock source command sent: ${cmd}`)
		},
	}
}

module.exports = { registerSystemActions }
