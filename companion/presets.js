const DISPLAY_NOCHANGE = 'nochange'
const SNAPSHOT_MAX = 255
const DISPLAY_BRIGHTNESS_CHOICES = [
	{ id: '0', label: 'Level 0 (Dim)' },
	{ id: '1', label: 'Level 1 (Normal)' },
	{ id: '2', label: 'Level 2 (Bright)' },
]
const DISPLAY_COLOR_CHOICES = [
	{ id: '0', label: 'Green', color: 0x000000, bgcolor: 0x66bb6a },
	{ id: '1', label: 'Blue', color: 0xffffff, bgcolor: 0x1e88e5 },
	{ id: '2', label: 'Yellow', color: 0x000000, bgcolor: 0xffeb3b },
	{ id: '3', label: 'Cyan', color: 0x000000, bgcolor: 0x4dd0e1 },
	{ id: '4', label: 'Magenta', color: 0xffffff, bgcolor: 0xd500f9 },
	{ id: '5', label: 'Red', color: 0xffffff, bgcolor: 0xd32f2f },
]

function inputMutePreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Inputs/Mute',
		name: `Mute Input ${ch}`,
		style: {
			text: `In ${ch}\n$(${inst}:input_${ch}_name)\n$(${inst}:input_${ch}_gain_db) dB`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000, // black default
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_mute_control',
						options: { operation: 'toggle', chs: [String(ch)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'input_muted',
				options: { ch: String(ch) },
				style: { color: 0xffffff, bgcolor: 0xff0000 }, // red when muted
			},
		],
	}
}

function inputSoloPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Inputs/Solo',
		name: `Solo Input ${ch}`,
		style: {
			text: `Solo\nIn ${ch}\n$(${inst}:input_${ch}_name)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000, // black default
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_solo',
						options: { operation: 'toggle', chs: [String(ch)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'input_muted',
				options: { ch: String(ch) },
				style: { color: 0xffffff, bgcolor: 0xff0000 }, // red when muted
			},
			{
				feedbackId: 'input_soloed',
				options: { ch: String(ch) },
				style: { color: 0x000000, bgcolor: 0xffff00 }, // yellow when soloed (overrides red)
			},
		],
	}
}

function inputLinkGroupBypassPreset(self, group) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Inputs/Link Groups',
		name: `Link Group ${group} Bypass`,
		style: {
			text: `Link Group ${group}\nEnabled`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x5a7c3c, // green when enabled
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_link_group_bypass',
						options: { operation: 'toggle', groups: [String(group)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'input_link_group_bypassed',
				options: { group: String(group) },
				style: { color: 0x000000, bgcolor: 0xe7d24b, text: `Link Group ${group}\nBypassed` }, // yellow when bypassed
			},
		],
	}
}

function outputLinkGroupBypassPreset(self, group) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Outputs/Link Groups',
		name: `Link Group ${group} Bypass`,
		style: {
			text: `Link Group ${group}\nEnabled`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x5a7c3c, // green when enabled
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_link_group_bypass',
						options: { operation: 'toggle', groups: [String(group)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'output_link_group_bypassed',
				options: { group: String(group) },
				style: { color: 0x000000, bgcolor: 0xe7d24b, text: `Link Group ${group}\nBypassed` }, // yellow when bypassed
			},
		],
	}
}

function inputLinkGroupAssignPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Inputs/Link Group Assignment',
		name: `Input ${ch} Link Group`,
		style: {
			text: `Input ${ch}\n$(${inst}:input_${ch}_link_group)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x333333,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_link_group_assign',
						options: { channels: [String(ch)], link_group: '1' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function inputDelayPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Inputs/Delay',
		name: `Input ${ch} Delay`,
		style: {
			text: `In ${ch}\n$(${inst}:input_${ch}_name)\nDelay\n$(${inst}:input_${ch}_delay_ms) ms`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x1a5490,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_delay_set',
						options: { chs: [String(ch)], ms: '0.00' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function outputLinkGroupAssignPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Outputs/Link Group Assignment',
		name: `Output ${ch} Link Group`,
		style: {
			text: `Output ${ch}\n$(${inst}:output_${ch}_link_group)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x333333,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_link_group_assign',
						options: { channels: [String(ch)], link_group: '1' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function outputDelayPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Outputs/Delay',
		name: `Output ${ch} Delay`,
		style: {
			text: `Out ${ch}\n$(${inst}:output_${ch}_name)\nDelay\n$(${inst}:output_${ch}_delay_ms) ms`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x1a5490,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_delay_set',
						options: { chs: [String(ch)], ms: '0.00' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function outputMutePreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Outputs/Mute',
		name: `Mute Output ${ch}`,
		style: {
			text: `Out ${ch}\n$(${inst}:output_${ch}_name)\n$(${inst}:output_${ch}_gain_db) dB`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_mute_control',
						options: { operation: 'toggle', chs: [String(ch)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'output_muted',
				options: { ch: String(ch) },
				style: { color: 0xffffff, bgcolor: 0xff0000 },
			},
		],
	}
}

function outputSoloPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Outputs/Solo',
		name: `Solo Output ${ch}`,
		style: {
			text: `Solo\nOut ${ch}\n$(${inst}:output_${ch}_name)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000, // black default
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_solo',
						options: { operation: 'toggle', chs: [String(ch)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'output_muted',
				options: { ch: String(ch) },
				style: { color: 0xffffff, bgcolor: 0xff0000 }, // red when muted
			},
			{
				feedbackId: 'output_soloed',
				options: { ch: String(ch) },
				style: { color: 0x000000, bgcolor: 0xffff00 }, // yellow when soloed (overrides red)
			},
		],
	}
}

function outputPolarityPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Outputs/Polarity',
		name: `Polarity Output ${ch}`,
		style: {
			text: `Out ${ch}\nPolarity\n$(${inst}:output_${ch}_polarity)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x313132,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_polarity_control',
						options: { operation: 'toggle', chs: [String(ch)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'output_polarity_reversed',
				options: { ch: String(ch) },
				style: { color: 0x000000, bgcolor: 0xa0a0a0 },
			},
		],
	}
}

function outputHighpassPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Outputs/High-pass',
		name: `High-pass Output ${ch}`,
		style: {
			text: `Out ${ch}\n$(${inst}:output_${ch}_name)\nHigh-pass\n$(${inst}:output_${ch}_highpass)`,
			size: '14',
			color: 0x000000,
			bgcolor: 0xe7d24b,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_highpass_bypass',
						options: { operation: 'toggle', chs: [String(ch)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'output_highpass_active',
				options: { ch: String(ch) },
				style: { color: 0xffffff, bgcolor: 0x4f4b23 },
			},
		],
	}
}

function outputLowpassPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Outputs/Low-pass',
		name: `Low-pass Output ${ch}`,
		style: {
			text: `Out ${ch}\n$(${inst}:output_${ch}_name)\nLow-pass\n$(${inst}:output_${ch}_lowpass)`,
			size: '14',
			color: 0x000000,
			bgcolor: 0xe7d24b,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_lowpass_bypass',
						options: { operation: 'toggle', chs: [String(ch)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'output_lowpass_active',
				options: { ch: String(ch) },
				style: { color: 0xffffff, bgcolor: 0x4f4b23 },
			},
		],
	}
}

function outputAllpassPreset(self, ch, band) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Outputs/All-pass',
		name: `All-pass ${band} Output ${ch}`,
		style: {
			text: `Out ${ch}\n$(${inst}:output_${ch}_name)\nAll-pass ${band}\n$(${inst}:output_${ch}_allpass${band})`,
			size: '14',
			color: 0x000000,
			bgcolor: 0xe7d24b,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_allpass_bypass',
						options: { operation: 'toggle', chs: [String(ch)], band: String(band) },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'output_allpass_active',
				options: { ch: String(ch), band: String(band) },
				style: { color: 0xffffff, bgcolor: 0x4f4b23 },
			},
		],
	}
}

function frontPanelColorPreset(self, colorId) {
	const inst = self.label || 'Galaxy'
	const meta = DISPLAY_COLOR_CHOICES.find((c) => c.id === colorId) || {
		id: colorId,
		label: `Color ${colorId}`,
		color: 0xffffff,
		bgcolor: 0x424242,
	}

	return {
		type: 'button',
		category: 'System/Display',
		name: `Display Color ${meta.label}`,
		style: {
			text: `Display Color\n${meta.label}\nCurrent: $(${inst}:front_panel_display_color)`,
			size: '14',
			color: meta.color ?? 0xffffff,
			bgcolor: meta.bgcolor ?? 0x424242,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'front_panel_display_prefs',
						options: { brightness: '2', color: colorId },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'front_panel_display_color',
				options: { color: colorId },
				style: { color: meta.color ?? 0xffffff, bgcolor: meta.bgcolor ?? 0x424242 },
			},
		],
	}
}

function presetSection(category, title, description = '') {
	const text = description ? `${title}\n${description}` : title
	return {
		type: 'text',
		category,
		name: title,
		text,
		size: '18',
	}
}

function frontPanelPreset(self) {
	return {
		type: 'button',
		category: 'Presets: System',
		name: 'Front Panel Lockout',
		style: {
			text: 'Front Panel\nLockout',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000, // black default
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'front_panel_lockout_control',
						options: { op: 'toggle' },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'front_panel_lockout',
				options: {},
				style: { color: 0xffffff, bgcolor: 0xff0000 }, // red when locked
			},
		],
	}
}

function identifyPreset(self) {
	return {
		type: 'button',
		category: 'Presets: System',
		name: 'Identify Device',
		style: {
			text: 'Identify\n(Flash)',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'system_identify',
						options: { state: 'toggle' },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'identify_active',
				options: {},
			},
		],
	}
}

function groupNamePreset(self) {
	const inst = self.label || 'Galaxy'
	return {
		type: 'button',
		category: 'Presets: System',
		name: 'Set Group Name',
		style: {
			text: `Group Name\n$(${inst}:group_name)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x1a5490,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'set_group_name',
						options: { group_name: '' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function logHistoryPreset(self) {
	return {
		type: 'button',
		category: 'Presets: System',
		name: 'Fetch Galaxy Log History',
		style: {
			text: 'Fetch\nLog History',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x1a1a1a,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'system_log_history',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function logMessagePreset(self) {
	const inst = self.label || 'Galaxy'
	return {
		type: 'button',
		category: 'Presets: System',
		name: 'Post Log Message',
		style: {
			text: `Log: Companion\n$(${inst}:status_model_string)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x444444,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'system_add_log_message',
						options: { message: 'Companion $(internal:installation_name) connected' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function logClearPreset(self) {
	return {
		type: 'button',
		category: 'Presets: System',
		name: 'Clear Galaxy Log History',
		style: {
			text: 'Clear\\nLog History',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x660000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'system_clear_log_history',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function lcdOverridePreset(self) {
	return {
		type: 'button',
		category: 'Presets: System',
		name: 'Front Panel: LCD Text',
		style: {
			text: 'LCD\nOverride',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x0d47a1,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'lcd_text_override',
						options: { mode: 'set', line1: '', line2: '' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function rebootPreset(self) {
	return {
		type: 'button',
		category: 'Presets: System',
		name: 'Reboot Galaxy',
		style: {
			text: 'Reboot\nGalaxy',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x8b0000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'system_reboot',
						options: { mode: 'running', confirm: false },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

/* ===== System — Toggle Mute All (fixed action id) ===== */
function toggleMuteAllPreset(self) {
	return {
		type: 'button',
		category: 'Presets: System',
		name: 'Toggle Mute All',
		style: {
			text: 'Mute\nAll',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x1e3113, // dark gray idle
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'mute_all',
						options: { op: 'toggle' },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'mute_all',
				options: {},
				style: {
					text: 'All\nMuted',
					color: 0xffffff,
					bgcolor: 0xff0000, // red when every input & output is muted
				},
			},
		],
	}
}

/* ===== Speaker Test Presets ===== */

function speakerTestStartPreset(self, start, end, label) {
	const inst = self.label || 'Galaxy'
	return {
		type: 'button',
		category: 'Presets: Speaker Test',
		name: `Speaker Test: ${label}`,
		style: {
			// Default is RED so the invoker-aware flash toggles RED ↔ BLACK
			text: `Speaker Test\n${label}`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0xff0000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_chase_start',
						options: {
							start: String(start),
							end: String(end),
							delay: '1000', // default 1 s; edit options menu to choose another preset value
							window: '2', // 1 = solo; 2 = solo→pair→advance
							loop: false, // per-button loop default; can still be changed in the action UI
						},
					},
				],
				up: [],
			},
			{
				down: [
					{
						actionId: 'output_chase_stop',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			// Invoker-aware flash: only this button flashes while *its* chase is running
			{ feedbackId: 'speaker_test_flash', options: {} },
		],
	}
}

function speakerTestStopPreset(self) {
	const inst = self.label || 'Galaxy'
	return {
		type: 'button',
		category: 'Presets: Speaker Test',
		name: 'Speaker Test: Stop',
		style: {
			text: `Stop\nSpeaker Test\n$(${inst}:speaker_test)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [{ actionId: 'output_chase_stop', options: {} }],
				up: [],
			},
		],
		feedbacks: [],
	}
}

/* ===== Snapshot Presets ===== */

function snapshotRecallPreset(self) {
	const inst = self?.label ?? 'internal'
	return {
		type: 'button',
		category: 'Presets: Snapshots',
		name: 'Snapshot: Recall',
		style: {
			text: `Recall\nSnapshot 0\n$(${inst}:snapshot_0_name)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'snapshot_combined',
						options: {
							operation: 'recall',
							snapshot_id: '0',
							exclude_input_channel_types: false,
							exclude_voltage_ranges: false,
							exclude_mute: false,
							exclude_update_active: false,
							exclude_sim3_bus: false,
							exclude_sim3_probe: false,
							exclude_clock_sync: false,
							exclude_avb: false,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function snapshotDeletePreset(self) {
	return {
		type: 'button',
		category: 'Presets: Snapshots',
		name: 'Snapshot: Delete',
		style: {
			text: 'Delete\nSnapshot',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x330000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'snapshot_combined',
						options: { operation: 'delete', snapshot_id: '', confirm_delete: true },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function snapshotRenamePreset(self) {
	return {
		type: 'button',
		category: 'Presets: Snapshots',
		name: 'Snapshot: Rename/Comment',
		style: {
			text: 'Rename &\nComment',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x003366,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'snapshot_combined',
						options: { operation: 'rename', snapshot_id_rename: '', snapshot_name: '', snapshot_comment: '' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function snapshotBootPreset(self) {
	return {
		type: 'button',
		category: 'Presets: Snapshots',
		name: 'Snapshot: Set Boot',
		style: {
			text: 'Set Boot\\nSnapshot',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x2e7d32,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'snapshot_combined',
						options: { operation: 'set_boot', snapshot_id_boot: '-1' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function snapshotUpdatePreset(self) {
	return {
		type: 'button',
		category: 'Presets: Snapshots',
		name: 'Snapshot: Update',
		style: {
			text: 'Update\nSnapshot',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x222244,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'snapshot_combined',
						options: { operation: 'update', snapshot_id_update: 'active' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function snapshotLockPreset(self) {
	return {
		type: 'button',
		category: 'Presets: Snapshots',
		name: 'Snapshot: Lock/Unlock',
		style: {
			text: 'Lock/Unlock\nSnapshot',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x552200,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'snapshot_combined',
						options: { operation: 'lock', snapshot_id: '' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function snapshotCreatePreset(self) {
	return {
		type: 'button',
		category: 'Presets: Snapshots',
		name: 'Snapshot: Create',
		style: {
			text: 'Create\nSnapshot',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x004433,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'snapshot_combined',
						options: { operation: 'create', snapshot_name: '', snapshot_comment: '' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function snapshotDuplicatePreset(self) {
	return {
		type: 'button',
		category: 'Presets: Snapshots',
		name: 'Snapshot: Duplicate',
		style: {
			text: 'Duplicate\nSnapshot',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x442255,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'snapshot_combined',
						options: { operation: 'duplicate', snapshot_id: '' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function parseSnapshotNumeric(self, key, allowNegative = false) {
	let raw = self?.snapshotValues?.[key]
	if (raw == null && typeof self?.getVariableValue === 'function') {
		raw = self.getVariableValue(key)
	}
	const match = String(raw ?? '').match(allowNegative ? /-?\d+/ : /\d+/)
	if (!match) return null
	const value = Number(match[0])
	return Number.isFinite(value) ? value : null
}

function buildSnapshotRecallPresets(self) {
	const presets = []
	const bootId = parseSnapshotNumeric(self, 'snapshot_boot_id', true)
	const inst = self?.label ?? 'internal'

	for (let id = 0; id <= SNAPSHOT_MAX; id++) {
		const name = String(self?.snapshotValues?.[`snapshot_${id}_name`] ?? '').trim()
		if (!name) continue

		const lockedRaw = String(self?.snapshotValues?.[`snapshot_${id}_locked`] ?? '').trim()
		const isLocked = /^(true|1|on)$/i.test(lockedRaw)
		const isBoot = Number.isFinite(bootId) && bootId >= 0 && bootId === id

		const lines = [`Snapshot ${id}`, `$(${inst}:snapshot_${id}_name)`]
		if (isLocked) lines.push('(Locked)')
		if (isBoot) lines.push('(Boot Snapshot)')

		const preset = {
			type: 'button',
			category: 'Presets: Snapshots',
			name: `Snapshot Recall ${id}`,
			style: {
				text: lines.join('\n'),
				size: '14',
				color: 0xffffff,
				bgcolor: 0x000000,
				alignment: 'center:middle',
			},
			steps: [
				{
					down: [
						{
							actionId: 'snapshot_combined',
							options: {
								operation: 'recall',
								snapshot_id: String(id),
								exclude_input_channel_types: false,
								exclude_voltage_ranges: false,
								exclude_mute: false,
								exclude_update_active: false,
								exclude_sim3_bus: false,
								exclude_sim3_probe: false,
								exclude_clock_sync: false,
								exclude_avb: false,
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'snapshot_is_active',
					options: { snapshot_id: String(id) },
					style: { color: 0x000000, bgcolor: 0x66bb6a },
				},
				{
					feedbackId: 'snapshot_is_boot',
					options: { snapshot_id: String(id) },
					style: { color: 0x000000, bgcolor: 0xffeb3b },
				},
				{
					feedbackId: 'snapshot_locked',
					options: { snapshot_id: String(id) },
					style: { color: 0xffffff, bgcolor: 0x8d6e63 },
				},
			],
		}

		presets.push(preset)
	}

	return presets
}

/* ===== U-Shaping & Parametric EQ Control Presets ===== */

function ushapingInputSelectPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Inputs/U-Shaping',
		name: `U-Shaping: Select Input ${ch}`,
		style: {
			text: `U-Shp In ${ch}\n$(${inst}:input_${ch}_name)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_ushaping_select_input',
						options: { chs: [String(ch)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'ushaping_input_selected',
				options: { ch: String(ch) },
				style: { color: 0x000000, bgcolor: 0x00ff00 },
			},
		],
	}
}

function ushapingBandSelectPreset(self, band) {
	const bandLabels = {
		1: 'Band 1',
		2: 'Band 2',
		3: 'Band 3',
		4: 'Band 4',
		5: 'Band 5',
	}

	return {
		type: 'button',
		category: 'Inputs/U-Shaping',
		name: `U-Shaping: Select Band ${band}`,
		style: {
			text: `U-Shp ${bandLabels[band]}`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_ushaping_select_band',
						options: { band: band },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'ushaping_band_selected',
				options: { band: String(band) },
				style: { color: 0x000000, bgcolor: 0x00ff00 },
			},
		],
	}
}

function ushapingKnobPreset(self, param) {
	const inst = self.label || 'Galaxy'
	const labels = {
		gain: {
			text: (label) => `U-Shaping\n$(${label}:ushaping_selected_input)\nGain\n$(${label}:ushaping_current_gain)`,
			name: 'Gain Knob',
		},
		frequency: {
			text: (label) =>
				`U-Shaping\n$(${label}:ushaping_selected_input)\nFrequency\n$(${label}:ushaping_current_frequency)`,
			name: 'Frequency Knob',
		},
		slope: {
			text: (label) => `U-Shaping\n$(${label}:ushaping_selected_input)\nSlope\n$(${label}:ushaping_current_slope)`,
			name: 'Slope Knob',
		},
	}

	const deltas = {
		gain: 1,
		frequency: 10,
		slope: 1, // Will cycle through discrete values
	}

	return {
		type: 'button',
		category: 'Inputs/U-Shaping',
		name: `U-Shaping: ${labels[param].name}`,
		style: {
			text: labels[param].text(inst),
			size: '14',
			color: 0xffffff,
			bgcolor: 0x0000ff,
			alignment: 'center:middle',
		},
		options: {
			rotaryActions: true,
			stepAutoProgress: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_ushaping_knob_band_bypass',
						options: {},
					},
				],
				up: [],
				rotate_left: [
					{
						actionId: `input_ushaping_knob_${param}`,
						options: param === 'slope' ? { delta: -1, direction: 'down' } : { delta: -deltas[param] },
					},
				],
				rotate_right: [
					{
						actionId: `input_ushaping_knob_${param}`,
						options: param === 'slope' ? { delta: 1, direction: 'up' } : { delta: deltas[param] },
					},
				],
			},
		],
		feedbacks: [],
	}
}

function ushapingBandBypassKnobPreset(self) {
	const inst = self.label || 'Galaxy'
	return {
		type: 'button',
		category: 'Inputs/U-Shaping',
		name: 'U-Shaping: Band Bypass (Push)',
		style: {
			text: `U-Shaping\n$(${inst}:ushaping_selected_input)\nBand Bypass\n$(${inst}:ushaping_selected_band)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0xff0000,
			alignment: 'center:middle',
		},
		options: {},
		steps: [
			{
				down: [
					{
						actionId: 'input_ushaping_knob_band_bypass',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function ushapingRotaryPreset(self, param, ch, band) {
	const inst = self.label || 'Galaxy'
	const header = `In ${ch}\n$(${inst}:input_${ch}_name)`

	const bandLabels = {
		1: 'Band 1',
		2: 'Band 2',
		3: 'Band 3',
		4: 'Band 4',
		5: 'Band 5',
	}

	const paramLabels = {
		gain: { short: 'Gain', var: 'gain' },
		frequency: { short: 'Freq', var: 'frequency' },
		slope: { short: 'Slope', var: 'slope' },
	}

	const deltas = {
		gain: 1,
		frequency: 10,
		slope: 1,
	}

	return {
		type: 'button',
		category: 'Inputs/U-Shaping (Rotary)',
		name: `U-Shaping: In${ch} B${band} ${paramLabels[param].short}`,
		style: {
			text: `${header}\nB${band} ${bandLabels[band]}\n${paramLabels[param].short}\n$(${inst}:input_${ch}_ushaping_band${band}_${paramLabels[param].var})`,
			size: '10',
			color: 0xffffff,
			bgcolor: 0x0000aa,
			alignment: 'center:middle',
		},
		options: {
			rotaryActions: true,
			stepAutoProgress: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_ushaping_select_input',
						options: { chs: [String(ch)] },
					},
					{
						actionId: 'input_ushaping_select_band',
						options: { band: band },
					},
				],
				up: [],
				rotate_left: [
					{
						actionId: `input_ushaping_knob_${param}`,
						options: param === 'slope' ? { delta: -1, direction: 'down' } : { delta: -deltas[param] },
					},
				],
				rotate_right: [
					{
						actionId: `input_ushaping_knob_${param}`,
						options: param === 'slope' ? { delta: 1, direction: 'up' } : { delta: deltas[param] },
					},
				],
			},
		],
		feedbacks: [
			{
				feedbackId: 'ushaping_input_selected',
				options: { ch: String(ch) },
				style: { color: 0x000000, bgcolor: 0x00ff00 },
			},
			{
				feedbackId: 'ushaping_band_selected',
				options: { band: String(band) },
				style: { color: 0xffffff, bgcolor: 0x00aa00 },
			},
		],
	}
}

function eqInputSelectPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Inputs/Parametric EQ',
		name: `Parametric EQ: Select Input ${ch}`,
		style: {
			text: `PEQ In ${ch}\n$(${inst}:input_${ch}_name)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_eq_select_input',
						options: { chs: [String(ch)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'eq_input_selected',
				options: { ch: String(ch) },
				style: { color: 0x000000, bgcolor: 0x00ff00 },
			},
		],
	}
}

function eqBandSelectPreset(self, band) {
	const bandLabels = {
		1: 'Band 1',
		2: 'Band 2',
		3: 'Band 3',
		4: 'Band 4',
		5: 'Band 5',
	}

	return {
		type: 'button',
		category: 'Inputs/Parametric EQ',
		name: `Parametric EQ: Select Band ${band}`,
		style: {
			text: `PEQ ${bandLabels[band]}`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_eq_select_band',
						options: { band: band },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'eq_band_selected',
				options: { band: String(band) },
				style: { color: 0x000000, bgcolor: 0x00ff00 },
			},
		],
	}
}

function eqKnobPreset(self, param) {
	const inst = self.label || 'Galaxy'
	const labels = {
		gain: {
			text: (label) => `PEQ\n$(${label}:eq_selected_input)\nGain\n$(${label}:eq_current_gain)`,
			name: 'Gain Knob',
		},
		frequency: {
			text: (label) => `PEQ\n$(${label}:eq_selected_input)\nFrequency\n$(${label}:eq_current_frequency)`,
			name: 'Frequency Knob',
		},
		bandwidth: {
			text: (label) => `PEQ\n$(${label}:eq_selected_input)\nBW/Q\n$(${label}:eq_current_bandwidth)`,
			name: 'Bandwidth Knob',
		},
	}

	const deltas = {
		gain: 0.1,
		frequency: 1,
		bandwidth: 0.01,
	}

	return {
		type: 'button',
		category: 'Inputs/Parametric EQ',
		name: `Parametric EQ: ${labels[param].name}`,
		style: {
			text: labels[param].text(inst),
			size: '14',
			color: 0xffffff,
			bgcolor: 0x0000ff,
			alignment: 'center:middle',
		},
		options: {
			rotaryActions: true,
			stepAutoProgress: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_eq_knob_band_bypass',
						options: {},
					},
				],
				up: [],
				rotate_left: [
					{
						actionId: `input_eq_knob_${param}`,
						options: { delta: -deltas[param] },
					},
				],
				rotate_right: [
					{
						actionId: `input_eq_knob_${param}`,
						options: { delta: deltas[param] },
					},
				],
			},
		],
		feedbacks: [],
	}
}

function eqBandBypassKnobPreset(self) {
	const inst = self.label || 'Galaxy'
	return {
		type: 'button',
		category: 'Inputs/Parametric EQ',
		name: 'Parametric EQ: Band Bypass (Push)',
		style: {
			text: `PEQ\n$(${inst}:eq_selected_input)\nBand Bypass\n$(${inst}:eq_selected_band)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0xff0000,
			alignment: 'center:middle',
		},
		options: {},
		steps: [
			{
				down: [
					{
						actionId: 'input_eq_knob_band_bypass',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function eqRotaryPreset(self, param, ch, band) {
	const inst = self.label || 'Galaxy'
	const header = `In ${ch}\n$(${inst}:input_${ch}_name)`

	const bandLabels = {
		1: 'Band 1',
		2: 'Band 2',
		3: 'Band 3',
		4: 'Band 4',
		5: 'Band 5',
	}

	const paramLabels = {
		gain: { short: 'Gain', var: 'gain' },
		frequency: { short: 'Freq', var: 'frequency' },
		bandwidth: { short: 'BW/Q', var: 'bandwidth' },
	}

	const deltas = {
		gain: 0.1,
		frequency: 1,
		bandwidth: 0.01,
	}

	return {
		type: 'button',
		category: 'Inputs/Parametric EQ (Rotary)',
		name: `Parametric EQ: In${ch} B${band} ${paramLabels[param].short}`,
		style: {
			text: `${header}\nB${band} ${bandLabels[band]}\n${paramLabels[param].short}\n$(${inst}:input_${ch}_eq_band${band}_${paramLabels[param].var})`,
			size: '10',
			color: 0xffffff,
			bgcolor: 0xaa0000,
			alignment: 'center:middle',
		},
		options: {
			rotaryActions: true,
			stepAutoProgress: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_eq_select_input',
						options: { chs: [String(ch)] },
					},
					{
						actionId: 'input_eq_select_band',
						options: { band: band },
					},
				],
				up: [],
				rotate_left: [
					{
						actionId: `input_eq_knob_${param}`,
						options: { delta: -deltas[param] },
					},
				],
				rotate_right: [
					{
						actionId: `input_eq_knob_${param}`,
						options: { delta: deltas[param] },
					},
				],
			},
		],
		feedbacks: [
			{
				feedbackId: 'eq_input_selected',
				options: { ch: String(ch) },
				style: { color: 0x000000, bgcolor: 0x00ff00 },
			},
			{
				feedbackId: 'eq_band_selected',
				options: { band: String(band) },
				style: { color: 0xffffff, bgcolor: 0x00aa00 },
			},
		],
	}
}

/* ===== Output U-Shaping Control Presets ===== */

function ushapingOutputSelectPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Outputs/U-Shaping',
		name: `U-Shaping: Select Output ${ch}`,
		style: {
			text: `U-Shp Output ${ch}\n$(${inst}:output_${ch}_name)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_ushaping_select_output',
						options: { chs: [String(ch)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'ushaping_output_selected',
				options: { ch: String(ch) },
				style: { color: 0x000000, bgcolor: 0x00ff00 },
			},
		],
	}
}

function ushapingOutputBandSelectPreset(self, band) {
	const bandLabels = {
		1: 'Band 1',
		2: 'Band 2',
		3: 'Band 3',
		4: 'Band 4',
		5: 'Band 5',
	}

	return {
		type: 'button',
		category: 'Outputs/U-Shaping',
		name: `U-Shaping: Select Band ${band}`,
		style: {
			text: `U-Shp ${bandLabels[band]}`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_ushaping_select_band',
						options: { band: band },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'ushaping_output_band_selected',
				options: { band: String(band) },
				style: { color: 0x000000, bgcolor: 0x00ff00 },
			},
		],
	}
}

function ushapingOutputKnobPreset(self, param) {
	const inst = self.label || 'Galaxy'
	const labels = {
		gain: {
			text: (label) =>
				`U-Shaping\n$(${label}:ushaping_selected_output)\nGain\n$(${label}:ushaping_output_current_gain)`,
			name: 'Gain Knob',
		},
		frequency: {
			text: (label) =>
				`U-Shaping\n$(${label}:ushaping_selected_output)\nFrequency\n$(${label}:ushaping_output_current_frequency)`,
			name: 'Frequency Knob',
		},
		slope: {
			text: (label) =>
				`U-Shaping\n$(${label}:ushaping_selected_output)\nSlope\n$(${label}:ushaping_output_current_slope)`,
			name: 'Slope Knob',
		},
	}

	const deltas = {
		gain: 1,
		frequency: 10,
		slope: 1, // Will cycle through discrete values
	}

	return {
		type: 'button',
		category: 'Outputs/U-Shaping',
		name: `U-Shaping: ${labels[param].name}`,
		style: {
			text: labels[param].text(inst),
			size: '14',
			color: 0xffffff,
			bgcolor: 0x0000ff,
			alignment: 'center:middle',
		},
		options: {
			rotaryActions: true,
			stepAutoProgress: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_ushaping_knob_band_bypass',
						options: {},
					},
				],
				up: [],
				rotate_left: [
					{
						actionId: `output_ushaping_knob_${param}`,
						options: param === 'slope' ? { delta: -1, direction: 'down' } : { delta: -deltas[param] },
					},
				],
				rotate_right: [
					{
						actionId: `output_ushaping_knob_${param}`,
						options: param === 'slope' ? { delta: 1, direction: 'up' } : { delta: deltas[param] },
					},
				],
			},
		],
		feedbacks: [],
	}
}

function ushapingOutputBandBypassKnobPreset(self) {
	const inst = self.label || 'Galaxy'
	return {
		type: 'button',
		category: 'Outputs/U-Shaping',
		name: 'U-Shaping Output: Band Bypass (Push)',
		style: {
			text: `U-Shaping Output\n$(${inst}:ushaping_selected_output)\nBand Bypass\n$(${inst}:ushaping_selected_output_band)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0xff0000,
			alignment: 'center:middle',
		},
		options: {},
		steps: [
			{
				down: [
					{
						actionId: 'output_ushaping_knob_band_bypass',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

/* ===== Output Parametric EQ Control Presets ===== */

function eqOutputSelectPreset(self, ch) {
	const inst = self.label || 'Galaxy'

	return {
		type: 'button',
		category: 'Outputs/Parametric EQ',
		name: `Parametric EQ: Select Output ${ch}`,
		style: {
			text: `PEQ Output ${ch}\n$(${inst}:output_${ch}_name)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_eq_select_output',
						options: { chs: [String(ch)] },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'eq_output_selected',
				options: { ch: String(ch) },
				style: { color: 0x000000, bgcolor: 0x00ff00 },
			},
		],
	}
}

function eqOutputBandSelectPreset(self, band) {
	const bandLabels = {
		1: 'Band 1',
		2: 'Band 2',
		3: 'Band 3',
		4: 'Band 4',
		5: 'Band 5',
		6: 'Band 6',
		7: 'Band 7',
		8: 'Band 8',
		9: 'Band 9',
		10: 'Band 10',
	}

	return {
		type: 'button',
		category: 'Outputs/Parametric EQ',
		name: `Parametric EQ: Select Band ${band}`,
		style: {
			text: `PEQ ${bandLabels[band]}`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_eq_select_band',
						options: { band: band },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'eq_output_band_selected',
				options: { band: String(band) },
				style: { color: 0x000000, bgcolor: 0x00ff00 },
			},
		],
	}
}

function eqOutputKnobPreset(self, param) {
	const inst = self.label || 'Galaxy'
	const labels = {
		gain: {
			text: (label) => `PEQ\n$(${label}:eq_selected_output)\nGain\n$(${label}:eq_output_current_gain)`,
			name: 'Gain Knob',
		},
		frequency: {
			text: (label) => `PEQ\n$(${label}:eq_selected_output)\nFrequency\n$(${label}:eq_output_current_frequency)`,
			name: 'Frequency Knob',
		},
		bandwidth: {
			text: (label) => `PEQ\n$(${label}:eq_selected_output)\nBW/Q\n$(${label}:eq_output_current_bandwidth)`,
			name: 'Bandwidth Knob',
		},
	}

	const deltas = {
		gain: 0.1,
		frequency: 1,
		bandwidth: 0.01,
	}

	return {
		type: 'button',
		category: 'Outputs/Parametric EQ',
		name: `Parametric EQ: ${labels[param].name}`,
		style: {
			text: labels[param].text(inst),
			size: '14',
			color: 0xffffff,
			bgcolor: 0x0000ff,
			alignment: 'center:middle',
		},
		options: {
			rotaryActions: true,
			stepAutoProgress: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'output_eq_knob_band_bypass',
						options: {},
					},
				],
				up: [],
				rotate_left: [
					{
						actionId: `output_eq_knob_${param}`,
						options: { delta: -deltas[param] },
					},
				],
				rotate_right: [
					{
						actionId: `output_eq_knob_${param}`,
						options: { delta: deltas[param] },
					},
				],
			},
		],
		feedbacks: [],
	}
}

function eqOutputBandBypassKnobPreset(self) {
	const inst = self.label || 'Galaxy'
	return {
		type: 'button',
		category: 'Outputs/Parametric EQ',
		name: 'Parametric EQ Output: Band Bypass (Push)',
		style: {
			text: `PEQ Output\n$(${inst}:eq_selected_output)\nBand Bypass\n$(${inst}:eq_selected_output_band)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0xff0000,
			alignment: 'center:middle',
		},
		options: {},
		steps: [
			{
				down: [
					{
						actionId: 'output_eq_knob_band_bypass',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

/* ===== Matrix Presets ===== */

function matrixGainSetPreset(self, input, output) {
	const inst = self.label || 'Galaxy'
	const inputName = self?.inputName?.[input]
	const outputName = self?.outputName?.[output]
	const inputLabel = inputName ? `In ${input} (${inputName})` : `In ${input}`
	const outputLabel = outputName ? `Out ${output} (${outputName})` : `Out ${output}`

	return {
		type: 'button',
		category: 'Matrix',
		name: `Matrix: In ${input} → Out ${output}`,
		style: {
			text: `Matrix\n${inputLabel}\n→ ${outputLabel}\n$(${inst}:matrix_${input}_${output}_gain_db) dB`,
			size: '10',
			color: 0xffffff,
			bgcolor: 0x1a1a1a,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'matrix_gain_set',
						options: {
							matrix_inputs: [String(input)],
							matrix_outputs: [String(output)],
							gain: 0,
							fadeMs: 0,
							curve: 'linear',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'matrix_gain_color',
				options: { matrix_input: String(input), matrix_output: String(output) },
			},
		],
	}
}

function matrixGainNudgePreset(self, input, output) {
	const inst = self.label || 'Galaxy'
	const inputName = self?.inputName?.[input]
	const outputName = self?.outputName?.[output]
	const inputLabel = inputName ? `In ${input}` : `In ${input}`
	const outputLabel = outputName ? `Out ${output}` : `Out ${output}`

	return {
		type: 'button',
		category: 'Matrix',
		name: `Matrix Nudge: In ${input} → Out ${output}`,
		style: {
			text: `Matrix\n${inputLabel} → ${outputLabel}\n$(${inst}:matrix_${input}_${output}_gain_db) dB\n▲▼ Nudge`,
			size: '10',
			color: 0xffffff,
			bgcolor: 0x222244,
			alignment: 'center:middle',
		},
		options: {
			rotaryActions: true,
			stepAutoProgress: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'matrix_gain_set',
						options: {
							matrix_inputs: [String(input)],
							matrix_outputs: [String(output)],
							gain: 0,
							fadeMs: 0,
							curve: 'linear',
						},
					},
				],
				up: [],
				rotate_left: [
					{
						actionId: 'matrix_gain_nudge',
						options: {
							matrix_inputs: [String(input)],
							matrix_outputs: [String(output)],
							delta: -1,
						},
					},
				],
				rotate_right: [
					{
						actionId: 'matrix_gain_nudge',
						options: {
							matrix_inputs: [String(input)],
							matrix_outputs: [String(output)],
							delta: 1,
						},
					},
				],
			},
		],
		feedbacks: [
			{
				feedbackId: 'matrix_gain_color',
				options: { matrix_input: String(input), matrix_output: String(output) },
			},
		],
	}
}

function matrixDelaySetPreset(self, input, output) {
	const inst = self.label || 'Galaxy'
	const inputName = self?.inputName?.[input]
	const outputName = self?.outputName?.[output]
	const inputLabel = inputName ? `In ${input}` : `In ${input}`
	const outputLabel = outputName ? `Out ${output}` : `Out ${output}`

	return {
		type: 'button',
		category: 'Matrix/Delay',
		name: `Matrix Delay: In ${input} → Out ${output}`,
		style: {
			text: `Matrix Delay\n${inputLabel} → ${outputLabel}\n$(${inst}:matrix_${input}_${output}_delay_ms) ms\n$(${inst}:matrix_${input}_${output}_delay_bypass)`,
			size: '10',
			color: 0xffffff,
			bgcolor: 0x1a5490,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'matrix_delay_set',
						options: {
							matrix_inputs: [String(input)],
							matrix_outputs: [String(output)],
							ms: 0,
							relative: false,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'matrix_delay_bypassed',
				options: { matrix_input: String(input), matrix_output: String(output) },
				style: { bgcolor: 0xff9800 },
			},
		],
	}
}

function matrixDelayBypassPreset(self, input, output) {
	const inst = self.label || 'Galaxy'
	const inputName = self?.inputName?.[input]
	const outputName = self?.outputName?.[output]
	const inputLabel = inputName ? `In ${input}` : `In ${input}`
	const outputLabel = outputName ? `Out ${output}` : `Out ${output}`

	return {
		type: 'button',
		category: 'Matrix/Delay',
		name: `Matrix Delay Bypass: In ${input} → Out ${output}`,
		style: {
			text: `Matrix Delay\n${inputLabel} → ${outputLabel}\nBypass\n$(${inst}:matrix_${input}_${output}_delay_bypass)`,
			size: '10',
			color: 0xffffff,
			bgcolor: 0x444444,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'matrix_delay_bypass',
						options: {
							matrix_inputs: [String(input)],
							matrix_outputs: [String(output)],
							operation: 'toggle',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'matrix_delay_bypassed',
				options: { matrix_input: String(input), matrix_output: String(output) },
				style: { bgcolor: 0xff9800 },
			},
		],
	}
}

function matrixRowPreset(self, input, numOutputs) {
	const inputName = self?.inputName?.[input]
	const inputLabel = inputName ? `In ${input} (${inputName})` : `In ${input}`

	// Build output array for all outputs
	const outputs = []
	for (let o = 1; o <= numOutputs; o++) {
		outputs.push(String(o))
	}

	return {
		type: 'button',
		category: 'Matrix',
		name: `Matrix Row: In ${input} → All Outputs`,
		style: {
			text: `Matrix\n${inputLabel}\n→ All Outputs\nSet 0 dB`,
			size: '10',
			color: 0xffffff,
			bgcolor: 0x333366,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'matrix_gain_set',
						options: {
							matrix_inputs: [String(input)],
							matrix_outputs: outputs,
							gain: 0,
							fadeMs: 0,
							curve: 'linear',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function matrixColumnPreset(self, output, numInputs) {
	const outputName = self?.outputName?.[output]
	const outputLabel = outputName ? `Out ${output} (${outputName})` : `Out ${output}`

	// Build input array for all inputs (matrix supports up to 32)
	const inputs = []
	for (let i = 1; i <= Math.min(32, numInputs); i++) {
		inputs.push(String(i))
	}

	return {
		type: 'button',
		category: 'Matrix',
		name: `Matrix Column: All Inputs → Out ${output}`,
		style: {
			text: `Matrix\nAll Inputs\n→ ${outputLabel}\nSet 0 dB`,
			size: '10',
			color: 0xffffff,
			bgcolor: 0x663333,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'matrix_gain_set',
						options: {
							matrix_inputs: inputs,
							matrix_outputs: [String(output)],
							gain: 0,
							fadeMs: 0,
							curve: 'linear',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

function matrixClearAllPreset(_self, numInputs, numOutputs) {
	// Build arrays for all inputs and outputs
	const inputs = []
	for (let i = 1; i <= Math.min(32, numInputs); i++) {
		inputs.push(String(i))
	}
	const outputs = []
	for (let o = 1; o <= numOutputs; o++) {
		outputs.push(String(o))
	}

	return {
		type: 'button',
		category: 'Matrix',
		name: 'Matrix: Clear All (-90 dB)',
		style: {
			text: `Matrix\nClear All\n(-90 dB)`,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x660000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'matrix_gain_set',
						options: {
							matrix_inputs: inputs,
							matrix_outputs: outputs,
							gain: -90,
							fadeMs: 0,
							curve: 'linear',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}
}

/* ===== Access Privilege Presets (toggles with feedback) ===== */

// Single privilege toggle preset (no "Access" in text)
function accessPrivTogglePreset(label, value) {
	return {
		type: 'button',
		category: 'Presets: Access',
		name: label,
		style: {
			text: label,
			size: '14',
			color: 0xffffff,
			bgcolor: 0x1e3113, // idle
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [
					{
						actionId: 'access_priv_toggle',
						options: { value: String(value) },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				// Light up when THIS privilege bit is present
				feedbackId: 'access_priv_has',
				options: { privs: [String(value)] },
				style: { color: 0xffffff, bgcolor: 0x006600 }, // green when allowed
			},
		],
	}
}

// Keep “Lock ALL” / “Unlock ALL” helpers, but remove “Access” from labels
function accessLockPresetAllLock() {
	return {
		type: 'button',
		category: 'Presets: Access',
		name: 'Lock ALL',
		style: {
			text: 'Lock ALL',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x660000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [{ actionId: 'access_lock', options: { privs: ['0'] } }],
				up: [],
			},
		],
		feedbacks: [
			{
				// active when mask equals 0
				feedbackId: 'access_priv_equals',
				options: { privs: ['0'] },
				style: { color: 0xffffff, bgcolor: 0xff0000 },
			},
		],
	}
}

function accessLockPresetAllUnlock() {
	return {
		type: 'button',
		category: 'Presets: Access',
		name: 'Unlock ALL',
		style: {
			text: 'Unlock ALL',
			size: '14',
			color: 0xffffff,
			bgcolor: 0x000000,
			alignment: 'center:middle',
		},
		steps: [
			{
				down: [{ actionId: 'access_lock', options: { privs: ['9223372036854775807'] } }],
				up: [],
			},
		],
		feedbacks: [
			{
				// active when mask equals Everything
				feedbackId: 'access_priv_equals',
				options: { privs: ['9223372036854775807'] },
				style: { color: 0xffffff, bgcolor: 0x00aa66 },
			},
		],
	}
}

module.exports = function UpdatePresets(self, NUM_INPUTS, NUM_OUTPUTS) {
	const presets = []

	const maxIn = Math.min(8, NUM_INPUTS)
	const maxOut = Math.min(16, NUM_OUTPUTS)

	const pushPreset = (preset, category) => {
		if (!preset) return
		if (category) preset.category = category
		presets.push(preset)
	}

	const addInput = (preset) => pushPreset(preset, 'Inputs')
	const addOutput = (preset) => pushPreset(preset, 'Outputs')
	const addSection = (category, title, description) => presets.push(presetSection(category, title, description))

	// ----- Inputs -----
	addSection('Inputs', 'Input Mute', 'Quick toggles for muting each input channel.')
	for (let ch = 1; ch <= maxIn; ch++) addInput(inputMutePreset(self, ch))

	addSection('Inputs', 'Solo', 'Solo buttons for each input channel.')
	for (let ch = 1; ch <= maxIn; ch++) addInput(inputSoloPreset(self, ch))

	addSection('Inputs', 'Link Groups', 'Toggle bypass for input link groups 1-4.')
	for (let group = 1; group <= 4; group++) addInput(inputLinkGroupBypassPreset(self, group))

	addSection('Inputs', 'Link Group Assignment', 'Assign each input channel to a link group or unassign.')
	for (let ch = 1; ch <= NUM_INPUTS; ch++) addInput(inputLinkGroupAssignPreset(self, ch))

	addSection('Inputs', 'Delay', 'Set delay for each input channel with variable display.')
	for (let ch = 1; ch <= NUM_INPUTS; ch++) addInput(inputDelayPreset(self, ch))

	addSection('Inputs', 'U-Shaping', 'Choose the target input/band and adjust U-Shaping parameters.')
	for (let ch = 1; ch <= NUM_INPUTS; ch++) addInput(ushapingInputSelectPreset(self, ch))
	for (let band = 1; band <= 5; band++) addInput(ushapingBandSelectPreset(self, band))
	addInput(ushapingKnobPreset(self, 'gain'))
	addInput(ushapingKnobPreset(self, 'frequency'))
	addInput(ushapingKnobPreset(self, 'slope'))
	addInput(ushapingBandBypassKnobPreset(self))

	addSection('Inputs', 'Parametric EQ', 'Select the input/band and modify gain, frequency, bandwidth, or bypass.')
	for (let ch = 1; ch <= NUM_INPUTS; ch++) addInput(eqInputSelectPreset(self, ch))
	for (let band = 1; band <= 5; band++) addInput(eqBandSelectPreset(self, band))
	addInput(eqKnobPreset(self, 'gain'))
	addInput(eqKnobPreset(self, 'frequency'))
	addInput(eqKnobPreset(self, 'bandwidth'))
	addInput(eqBandBypassKnobPreset(self))

	// ----- Outputs -----
	addSection('Outputs', 'Output Mute', 'Quick mute toggles for each output channel.')
	for (let ch = 1; ch <= maxOut; ch++) addOutput(outputMutePreset(self, ch))

	addSection('Outputs', 'Solo', 'Solo buttons for each output channel.')
	for (let ch = 1; ch <= maxOut; ch++) addOutput(outputSoloPreset(self, ch))

	addSection('Outputs', 'Link Groups', 'Toggle bypass for output link groups 1-8.')
	for (let group = 1; group <= 8; group++) addOutput(outputLinkGroupBypassPreset(self, group))

	addSection('Outputs', 'Link Group Assignment', 'Assign each output channel to a link group or unassign.')
	for (let ch = 1; ch <= NUM_OUTPUTS; ch++) addOutput(outputLinkGroupAssignPreset(self, ch))

	addSection('Outputs', 'Delay', 'Set delay for each output channel with variable display.')
	for (let ch = 1; ch <= NUM_OUTPUTS; ch++) addOutput(outputDelayPreset(self, ch))

	addSection('Outputs', 'Polarity', 'Flip the polarity of an output with a single preset.')
	for (let ch = 1; ch <= maxOut; ch++) addOutput(outputPolarityPreset(self, ch))

	addSection('Outputs', 'High-pass Filters', 'Enable or bypass the high-pass filter for each output.')
	for (let ch = 1; ch <= maxOut; ch++) addOutput(outputHighpassPreset(self, ch))

	addSection('Outputs', 'Low-pass Filters', 'Enable or bypass the low-pass filter for each output.')
	for (let ch = 1; ch <= maxOut; ch++) addOutput(outputLowpassPreset(self, ch))

	addSection('Outputs', 'All-pass Filters', 'Toggle the all-pass bands for each output.')
	for (let ch = 1; ch <= maxOut; ch++) {
		for (let band = 1; band <= 3; band++) addOutput(outputAllpassPreset(self, ch, band))
	}

	addSection('Outputs', 'U-Shaping', 'Choose the target output/band and adjust U-Shaping parameters.')
	for (let ch = 1; ch <= NUM_OUTPUTS; ch++) addOutput(ushapingOutputSelectPreset(self, ch))
	for (let band = 1; band <= 5; band++) addOutput(ushapingOutputBandSelectPreset(self, band))
	addOutput(ushapingOutputKnobPreset(self, 'gain'))
	addOutput(ushapingOutputKnobPreset(self, 'frequency'))
	addOutput(ushapingOutputKnobPreset(self, 'slope'))
	addOutput(ushapingOutputBandBypassKnobPreset(self))

	addSection('Outputs', 'Parametric EQ', 'Select the output/band and adjust gain, frequency, bandwidth, or bypass.')
	for (let ch = 1; ch <= NUM_OUTPUTS; ch++) addOutput(eqOutputSelectPreset(self, ch))
	for (let band = 1; band <= 10; band++) addOutput(eqOutputBandSelectPreset(self, band))
	addOutput(eqOutputKnobPreset(self, 'gain'))
	addOutput(eqOutputKnobPreset(self, 'frequency'))
	addOutput(eqOutputKnobPreset(self, 'bandwidth'))
	addOutput(eqOutputBandBypassKnobPreset(self))

	// ----- System Utilities -----
	addSection('System', 'Device Controls', 'Front panel lockout, log management, and reboot options.')
	pushPreset(frontPanelPreset(self), 'System')
	pushPreset(toggleMuteAllPreset(self), 'System')
	pushPreset(identifyPreset(self), 'System')
	pushPreset(groupNamePreset(self), 'System')
	pushPreset(logHistoryPreset(self), 'System')
	pushPreset(logMessagePreset(self), 'System')
	pushPreset(logClearPreset(self), 'System')
	pushPreset(lcdOverridePreset(self), 'System')
	pushPreset(rebootPreset(self), 'System')

	addSection('System', 'Front Panel Display', 'Adjust LCD brightness and display color.')
	for (const choice of DISPLAY_COLOR_CHOICES) {
		pushPreset(frontPanelColorPreset(self, choice.id), 'System')
	}

	addSection('System', 'Speaker Test', 'Automate speaker verification using the chase presets.')
	if (NUM_OUTPUTS >= 8) pushPreset(speakerTestStartPreset(self, 1, Math.min(16, NUM_OUTPUTS), '1–16'), 'System')
	pushPreset(speakerTestStopPreset(self), 'System')

	addSection('Snapshots', 'Snapshot Management', 'Recall, update, duplicate, and manage Galaxy snapshots.')
	pushPreset(snapshotRecallPreset(self), 'Snapshots')
	pushPreset(snapshotDeletePreset(self), 'Snapshots')
	pushPreset(snapshotRenamePreset(self), 'Snapshots')
	pushPreset(snapshotBootPreset(self), 'Snapshots')
	pushPreset(snapshotUpdatePreset(self), 'Snapshots')
	pushPreset(snapshotLockPreset(self), 'Snapshots')
	pushPreset(snapshotCreatePreset(self), 'Snapshots')
	pushPreset(snapshotDuplicatePreset(self), 'Snapshots')
	const dynamicSnapshots = buildSnapshotRecallPresets(self)
	if (dynamicSnapshots.length > 0) {
		addSection('Snapshots', 'Snapshots (Auto Recall)', 'Auto-generated recall buttons for every named snapshot.')
		for (const preset of dynamicSnapshots) pushPreset(preset, 'Snapshots')
	}

	// ----- Matrix -----
	addSection('Matrix', 'Matrix Routing', 'Set gain for individual crosspoints or entire rows/columns.')
	pushPreset(matrixClearAllPreset(self, NUM_INPUTS, NUM_OUTPUTS), 'Matrix')

	// Matrix row presets (one input to all outputs)
	for (let i = 1; i <= Math.min(8, NUM_INPUTS); i++) {
		pushPreset(matrixRowPreset(self, i, NUM_OUTPUTS), 'Matrix')
	}

	// Matrix column presets (all inputs to one output)
	for (let o = 1; o <= Math.min(8, NUM_OUTPUTS); o++) {
		pushPreset(matrixColumnPreset(self, o, NUM_INPUTS), 'Matrix')
	}

	// Individual crosspoint presets (limited to 8x8 grid for sanity)
	addSection('Matrix', 'Matrix Crosspoints', 'Individual crosspoint gain controls (8x8 grid).')
	for (let i = 1; i <= Math.min(8, NUM_INPUTS); i++) {
		for (let o = 1; o <= Math.min(8, NUM_OUTPUTS); o++) {
			pushPreset(matrixGainSetPreset(self, i, o), 'Matrix')
		}
	}

	// Rotary/nudge presets for crosspoints
	addSection('Matrix', 'Matrix Crosspoints (Rotary)', 'Crosspoint gain with rotary encoder support.')
	for (let i = 1; i <= Math.min(4, NUM_INPUTS); i++) {
		for (let o = 1; o <= Math.min(4, NUM_OUTPUTS); o++) {
			pushPreset(matrixGainNudgePreset(self, i, o), 'Matrix')
		}
	}

	// Matrix delay presets (limited to 4x4 grid)
	addSection('Matrix', 'Matrix Delay', 'Individual crosspoint delay controls (4x4 grid).')
	for (let i = 1; i <= Math.min(4, NUM_INPUTS); i++) {
		for (let o = 1; o <= Math.min(4, NUM_OUTPUTS); o++) {
			pushPreset(matrixDelaySetPreset(self, i, o), 'Matrix')
		}
	}

	// Matrix delay bypass presets (limited to 4x4 grid)
	addSection('Matrix', 'Matrix Delay Bypass', 'Individual crosspoint delay bypass controls (4x4 grid).')
	for (let i = 1; i <= Math.min(4, NUM_INPUTS); i++) {
		for (let o = 1; o <= Math.min(4, NUM_OUTPUTS); o++) {
			pushPreset(matrixDelayBypassPreset(self, i, o), 'Matrix')
		}
	}

	addSection('Access', 'Access Privileges', 'Toggle Meyer Sound Galaxy access rights.')
	pushPreset(accessLockPresetAllLock(), 'Access')
	pushPreset(accessLockPresetAllUnlock(), 'Access')

	const PRIVS = [
		['Project', 1],
		['Recall Snapshots', 2],
		['Input Types', 4],
		['Environment', 8],
		['Network Settings', 16],
		['Channel Labels', 32],
		['Atmospheric Corrections', 64],
		['Polarity', 128],
		['Input Channel EQ Bypass', 256],
		['Output Channel EQ Bypass', 512],
		['Input Gain', 1024],
		['Output Gain', 2048],
		['Input Parametric EQ', 4096],
		['Output Parametric EQ', 8192],
		['Input Mute', 16384],
		['Output Mute', 32768],
		['Input U-Shaping', 65536],
		['Output U-Shaping', 131072],
		['Output High/Low Pass', 262144],
		['Output All Pass', 524288],
		['Input Delays', 1048576],
		['Output Delays', 2097152],
		['SIM3 Settings', 4194304],
		['Summing Matrix', 8388608],
		['Delay Matrix', 16777216],
		['Link Groups', 33554432],
		['Input/Output Voltage Range', 67108864],
		['Upload Firmware', 134217728],
		['Product Integration', 536870912],
		['Low-Mid Beam Control', 1073741824],
		['System Clock', 2147483648],
	]
	for (const [label, value] of PRIVS) {
		pushPreset(accessPrivTogglePreset(label, value), 'Access')
	}

	self.setPresetDefinitions(presets)
}
