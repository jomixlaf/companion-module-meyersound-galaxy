const { filterTypeLabel, displayBrightnessLabel, displayColorLabel } = require('./helpers')

module.exports = function UpdateVariableDefinitions(self, NUM_INPUTS, NUM_OUTPUTS) {
	const vars = []
	const vals = {} // <-- we'll backfill live values here

	// ===== Per-input =====
	for (let ch = 1; ch <= NUM_INPUTS; ch++) {
		vars.push({ variableId: `input_${ch}_mute`, name: `Input ${ch} mute` })
		vars.push({ variableId: `input_${ch}_gain_db`, name: `Input ${ch} gain (dB)` })
		vars.push({ variableId: `input_${ch}_name`, name: `Input ${ch} name` })
		vars.push({ variableId: `input_${ch}_delay_ms`, name: `Input ${ch} delay (ms)` })
		vars.push({ variableId: `input_${ch}_mode`, name: `Input ${ch} mode` })
		vars.push({ variableId: `input_${ch}_meter_dbfs`, name: `Input ${ch} meter (dBFS)` })
		vars.push({ variableId: `input_${ch}_link_group`, name: `Input ${ch} link group` })

		// Backfill input link group assignment if available
		if (self?.inputLinkGroupAssign?.[ch] !== undefined) {
			const group = self.inputLinkGroupAssign[ch]
			vals[`input_${ch}_link_group`] = group === 0 ? 'Unassigned' : `Group ${group}`
		}

		// Backfill input delay if available
		if (self?.inputDelay?.[ch]?.ms !== null && self?.inputDelay?.[ch]?.ms !== undefined) {
			vals[`input_${ch}_delay_ms`] = self.inputDelay[ch].ms.toFixed(2)
		}

		// U-Shaping EQ variables per input
		vars.push({ variableId: `input_${ch}_ushaping_bypass`, name: `Input ${ch} U-Shaping bypass` })

		// U-Shaping bands 1-5
		for (let band = 1; band <= 5; band++) {
			vars.push({
				variableId: `input_${ch}_ushaping_band_${band}_gain`,
				name: `Input ${ch} U-Shaping Band ${band} gain (dB)`,
			})
			if (band <= 4) {
				// Bands 1-4 have frequency
				vars.push({
					variableId: `input_${ch}_ushaping_band_${band}_frequency`,
					name: `Input ${ch} U-Shaping Band ${band} frequency (Hz)`,
				})
			}
			// All bands have slope
			vars.push({
				variableId: `input_${ch}_ushaping_band_${band}_slope`,
				name: `Input ${ch} U-Shaping Band ${band} slope (dB/oct)`,
			})
		}

		// Backfill U-Shaping values if available
		if (self?.inputUShaping?.[ch]) {
			const bypass = self.inputUShaping[ch].bypass
			vals[`input_${ch}_ushaping_bypass`] =
				typeof bypass === 'boolean' ? (bypass ? 'ON' : 'OFF') : String(bypass ?? 'OFF')

			for (let band = 1; band <= 5; band++) {
				if (self.inputUShaping[ch][band]) {
					const gain = self.inputUShaping[ch][band].gain
					if (typeof gain === 'number') {
						vals[`input_${ch}_ushaping_band_${band}_gain`] = gain.toFixed(1)
					}

					if (band <= 4) {
						const freq = self.inputUShaping[ch][band].frequency
						if (typeof freq === 'number') {
							vals[`input_${ch}_ushaping_band_${band}_frequency`] = Math.round(freq).toString()
						}
					}

					const slope = self.inputUShaping[ch][band].slope
					if (typeof slope === 'number') {
						vals[`input_${ch}_ushaping_band_${band}_slope`] = Math.round(slope).toString()
					}
				}
			}
		}

		// Parametric EQ variables per input
		vars.push({ variableId: `input_${ch}_eq_bypass`, name: `Input ${ch} Parametric EQ bypass` })

		// Parametric EQ bands 1-5
		for (let band = 1; band <= 5; band++) {
			vars.push({
				variableId: `input_${ch}_eq_band_${band}_gain`,
				name: `Input ${ch} Parametric EQ Band ${band} gain (dB)`,
			})
			vars.push({
				variableId: `input_${ch}_eq_band_${band}_frequency`,
				name: `Input ${ch} Parametric EQ Band ${band} frequency (Hz)`,
			})
			vars.push({
				variableId: `input_${ch}_eq_band_${band}_bandwidth`,
				name: `Input ${ch} Parametric EQ Band ${band} bandwidth (Q)`,
			})
			vars.push({
				variableId: `input_${ch}_eq_band_${band}_bypass`,
				name: `Input ${ch} Parametric EQ Band ${band} bypass`,
			})
		}

		// Backfill Parametric EQ values if available
		if (self?.inputEQ?.[ch]) {
			const bypass = self.inputEQ[ch].bypass
			vals[`input_${ch}_eq_bypass`] = typeof bypass === 'boolean' ? (bypass ? 'ON' : 'OFF') : String(bypass ?? 'OFF')

			for (let band = 1; band <= 5; band++) {
				if (self.inputEQ[ch][band]) {
					const gain = self.inputEQ[ch][band].gain
					if (typeof gain === 'number') {
						vals[`input_${ch}_eq_band_${band}_gain`] = gain.toFixed(1)
					}

					const freq = self.inputEQ[ch][band].frequency
					if (typeof freq === 'number') {
						vals[`input_${ch}_eq_band_${band}_frequency`] = Math.round(freq).toString()
					}

					const bandwidth = self.inputEQ[ch][band].bandwidth
					if (typeof bandwidth === 'number') {
						vals[`input_${ch}_eq_band_${band}_bandwidth`] = bandwidth.toFixed(1)
					}

					const bandBypass = self.inputEQ[ch][band].band_bypass
					vals[`input_${ch}_eq_band_${band}_bypass`] =
						typeof bandBypass === 'boolean' ? (bandBypass ? 'ON' : 'OFF') : String(bandBypass ?? 'OFF')
				}
			}
		}
	}

	// ===== Input Link Groups =====
	for (let group = 1; group <= 4; group++) {
		vars.push({
			variableId: `input_link_group_${group}_bypass`,
			name: `Input Link Group ${group} bypass`,
		})

		// Backfill value if available
		if (self?.inputLinkGroupBypass?.[group] !== undefined) {
			const bypass = self.inputLinkGroupBypass[group]
			vals[`input_link_group_${group}_bypass`] =
				typeof bypass === 'boolean' ? (bypass ? 'Bypassed' : 'Enabled') : String(bypass ?? 'Enabled')
		}
	}

	// ===== Per-output =====
	for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
		vars.push({ variableId: `output_${ch}_mute`, name: `Output ${ch} mute` })
		vars.push({ variableId: `output_${ch}_gain_db`, name: `Output ${ch} gain (dB)` })
		vars.push({ variableId: `output_${ch}_name`, name: `Output ${ch} name` })
		vars.push({ variableId: `output_${ch}_delay_ms`, name: `Output ${ch} delay (ms)` })
		vars.push({ variableId: `output_${ch}_meter_dbfs`, name: `Output ${ch} meter (dBFS)` })
		vars.push({ variableId: `output_${ch}_polarity`, name: `Output ${ch} polarity` })
		vars.push({ variableId: `output_${ch}_link_group`, name: `Output ${ch} link group` })

		// Backfill output link group assignment if available
		if (self?.outputLinkGroupAssign?.[ch] !== undefined) {
			const group = self.outputLinkGroupAssign[ch]
			vals[`output_${ch}_link_group`] = group === 0 ? 'Unassigned' : `Group ${group}`
		}
		vars.push({ variableId: `output_${ch}_highpass`, name: `Output ${ch} high-pass` })
		vars.push({ variableId: `output_${ch}_highpass_frequency`, name: `Output ${ch} high-pass frequency (Hz)` })
		vars.push({ variableId: `output_${ch}_highpass_type`, name: `Output ${ch} high-pass type` })
		vars.push({ variableId: `output_${ch}_lowpass`, name: `Output ${ch} low-pass` })
		vars.push({ variableId: `output_${ch}_lowpass_frequency`, name: `Output ${ch} low-pass frequency (Hz)` })
		vars.push({ variableId: `output_${ch}_lowpass_type`, name: `Output ${ch} low-pass type` })
		for (let band = 1; band <= 3; band++) {
			vars.push({ variableId: `output_${ch}_allpass_${band}`, name: `Output ${ch} all-pass ${band}` })
			vars.push({
				variableId: `output_${ch}_allpass_${band}_frequency`,
				name: `Output ${ch} all-pass ${band} frequency (Hz)`,
			})
			vars.push({ variableId: `output_${ch}_allpass_${band}_q`, name: `Output ${ch} all-pass ${band} Q` })
		}

		// U-Shaping EQ variables per output
		vars.push({ variableId: `output_${ch}_ushaping_bypass`, name: `Output ${ch} U-Shaping bypass` })

		// U-Shaping bands 1-5
		for (let band = 1; band <= 5; band++) {
			vars.push({
				variableId: `output_${ch}_ushaping_band_${band}_gain`,
				name: `Output ${ch} U-Shaping Band ${band} gain (dB)`,
			})
			if (band <= 4) {
				// Bands 1-4 have frequency
				vars.push({
					variableId: `output_${ch}_ushaping_band_${band}_frequency`,
					name: `Output ${ch} U-Shaping Band ${band} frequency (Hz)`,
				})
			}
			// All bands have slope
			vars.push({
				variableId: `output_${ch}_ushaping_band_${band}_slope`,
				name: `Output ${ch} U-Shaping Band ${band} slope (dB/oct)`,
			})
		}

		// Backfill U-Shaping values if available
		if (self?.outputUShaping?.[ch]) {
			const bypass = self.outputUShaping[ch].bypass
			vals[`output_${ch}_ushaping_bypass`] =
				typeof bypass === 'boolean' ? (bypass ? 'ON' : 'OFF') : String(bypass ?? 'OFF')

			for (let band = 1; band <= 5; band++) {
				if (self.outputUShaping[ch][band]) {
					const gain = self.outputUShaping[ch][band].gain
					if (typeof gain === 'number') {
						vals[`output_${ch}_ushaping_band_${band}_gain`] = gain.toFixed(1)
					}

					if (band <= 4) {
						const freq = self.outputUShaping[ch][band].frequency
						if (typeof freq === 'number') {
							vals[`output_${ch}_ushaping_band_${band}_frequency`] = Math.round(freq).toString()
						}
					}

					const slope = self.outputUShaping[ch][band].slope
					if (typeof slope === 'number') {
						vals[`output_${ch}_ushaping_band_${band}_slope`] = Math.round(slope).toString()
					}
				}
			}
		}

		// Parametric EQ variables per output
		vars.push({ variableId: `output_${ch}_eq_bypass`, name: `Output ${ch} Parametric EQ bypass` })

		// Parametric EQ bands 1-10 (outputs have 10 bands)
		for (let band = 1; band <= 10; band++) {
			vars.push({
				variableId: `output_${ch}_eq_band_${band}_gain`,
				name: `Output ${ch} Parametric EQ Band ${band} gain (dB)`,
			})
			vars.push({
				variableId: `output_${ch}_eq_band_${band}_frequency`,
				name: `Output ${ch} Parametric EQ Band ${band} frequency (Hz)`,
			})
			vars.push({
				variableId: `output_${ch}_eq_band_${band}_bandwidth`,
				name: `Output ${ch} Parametric EQ Band ${band} bandwidth (Q)`,
			})
			vars.push({
				variableId: `output_${ch}_eq_band_${band}_bypass`,
				name: `Output ${ch} Parametric EQ Band ${band} bypass`,
			})
		}

		// Backfill Parametric EQ values if available
		if (self?.outputEQ?.[ch]) {
			const bypass = self.outputEQ[ch].bypass
			vals[`output_${ch}_eq_bypass`] = typeof bypass === 'boolean' ? (bypass ? 'ON' : 'OFF') : String(bypass ?? 'OFF')

			for (let band = 1; band <= 10; band++) {
				if (self.outputEQ[ch][band]) {
					const gain = self.outputEQ[ch][band].gain
					if (typeof gain === 'number') {
						vals[`output_${ch}_eq_band_${band}_gain`] = gain.toFixed(1)
					}

					const freq = self.outputEQ[ch][band].frequency
					if (typeof freq === 'number') {
						vals[`output_${ch}_eq_band_${band}_frequency`] = Math.round(freq).toString()
					}

					const bandwidth = self.outputEQ[ch][band].bandwidth
					if (typeof bandwidth === 'number') {
						vals[`output_${ch}_eq_band_${band}_bandwidth`] = bandwidth.toFixed(1)
					}

					const bandBypass = self.outputEQ[ch][band].band_bypass
					vals[`output_${ch}_eq_band_${band}_bypass`] =
						typeof bandBypass === 'boolean' ? (bandBypass ? 'ON' : 'OFF') : String(bandBypass ?? 'OFF')
				}
			}
		}

		if (self?.outputPolarity && typeof self.outputPolarity[ch] === 'boolean') {
			vals[`output_${ch}_polarity`] = self.outputPolarity[ch] ? 'Reverse' : 'Normal'
		} else {
			vals[`output_${ch}_polarity`] = 'Normal'
		}

		if (self?.outputHighpass?.[ch]) {
			const hp = self.outputHighpass[ch]
			if (typeof hp.bypass === 'boolean') {
				vals[`output_${ch}_highpass`] = hp.bypass ? 'Bypassed' : 'Enabled'
			}
			if (typeof hp.frequency === 'number') {
				vals[`output_${ch}_highpass_frequency`] =
					hp.frequency % 1 === 0 ? String(Math.round(hp.frequency)) : hp.frequency.toFixed(2)
			}
			if (hp.type != null) {
				vals[`output_${ch}_highpass_type`] = filterTypeLabel(hp.type, 'highpass')
			}
		} else {
			vals[`output_${ch}_highpass`] = 'OFF'
			vals[`output_${ch}_highpass_frequency`] = '---'
			vals[`output_${ch}_highpass_type`] = '---'
		}

		if (self?.outputLowpass?.[ch]) {
			const lp = self.outputLowpass[ch]
			if (typeof lp.bypass === 'boolean') {
				vals[`output_${ch}_lowpass`] = lp.bypass ? 'OFF' : 'ON'
			}
			if (typeof lp.frequency === 'number') {
				vals[`output_${ch}_lowpass_frequency`] =
					lp.frequency % 1 === 0 ? String(Math.round(lp.frequency)) : lp.frequency.toFixed(2)
			}
			if (lp.type != null) {
				vals[`output_${ch}_lowpass_type`] = filterTypeLabel(lp.type, 'lowpass')
			}
		} else {
			vals[`output_${ch}_lowpass`] = 'OFF'
			vals[`output_${ch}_lowpass_frequency`] = '---'
			vals[`output_${ch}_lowpass_type`] = '---'
		}

		for (let band = 1; band <= 3; band++) {
			const ap = self?.outputAllpass?.[ch]?.[band]
			if (ap) {
				if (typeof ap.band_bypass === 'boolean') {
					vals[`output_${ch}_allpass_${band}`] = ap.band_bypass ? 'OFF' : 'ON'
				}
				if (typeof ap.frequency === 'number') {
					const hz = ap.frequency
					vals[`output_${ch}_allpass_${band}_frequency`] = hz % 1 === 0 ? String(Math.round(hz)) : hz.toFixed(2)
				}
				if (typeof ap.q === 'number') {
					const qVal = ap.q
					vals[`output_${ch}_allpass_${band}_q`] = qVal % 1 === 0 ? String(Math.round(qVal)) : qVal.toFixed(2)
				}
			} else {
				vals[`output_${ch}_allpass_${band}`] = 'OFF'
				vals[`output_${ch}_allpass_${band}_frequency`] = '---'
				vals[`output_${ch}_allpass_${band}_q`] = '---'
			}
		}
	}

	// ===== Output Link Groups =====
	for (let group = 1; group <= 8; group++) {
		vars.push({
			variableId: `output_link_group_${group}_bypass`,
			name: `Output Link Group ${group} bypass`,
		})

		// Backfill value if available
		if (self?.outputLinkGroupBypass?.[group] !== undefined) {
			const bypass = self.outputLinkGroupBypass[group]
			vals[`output_link_group_${group}_bypass`] =
				typeof bypass === 'boolean' ? (bypass ? 'Bypassed' : 'Enabled') : String(bypass ?? 'Enabled')
		}
	}

	// ===== Matrix input meters (1..32) =====
	for (let i = 1; i <= 32; i++) {
		vars.push({ variableId: `matrix_input_${i}_meter_dbfs`, name: `Matrix input ${i} meter (dBFS)` })
	}

	// ===== Matrix gains =====
	const MATRIX_INPUTS = 32
	for (let mi = 1; mi <= MATRIX_INPUTS; mi++) {
		for (let mo = 1; mo <= NUM_OUTPUTS; mo++) {
			const id = `matrix_${mi}_${mo}_gain_db`
			vars.push({ variableId: id, name: `Matrix In ${mi} → Out ${mo} gain (dB)` })
			if (self?.matrixGain) {
				const key = `${mi}-${mo}`
				const cur = self.matrixGain[key]
				if (typeof cur === 'number') vals[id] = (Math.round(cur * 10) / 10).toFixed(1)
			}
		}
	}

	// ===== Matrix delays =====
	const DELAY_TYPE_LABELS = ['ms', 'feet', 'meters', 'frames (24fps)', 'frames (25fps)', 'frames (30fps)', 'samples']
	for (let mi = 1; mi <= MATRIX_INPUTS; mi++) {
		for (let mo = 1; mo <= NUM_OUTPUTS; mo++) {
			const delayId = `matrix_${mi}_${mo}_delay_ms`
			const bypassId = `matrix_${mi}_${mo}_delay_bypass`
			const typeId = `matrix_${mi}_${mo}_delay_type`
			vars.push({ variableId: delayId, name: `Matrix In ${mi} → Out ${mo} delay (ms)` })
			vars.push({ variableId: bypassId, name: `Matrix In ${mi} → Out ${mo} delay bypass` })
			vars.push({ variableId: typeId, name: `Matrix In ${mi} → Out ${mo} delay type` })

			// Backfill delay values if available
			if (self?.matrixDelay) {
				const key = `${mi}-${mo}`
				const delayData = self.matrixDelay[key]
				if (delayData?.ms !== null && delayData?.ms !== undefined) {
					vals[delayId] = delayData.ms.toFixed(2)
				}
				if (typeof delayData?.bypass === 'boolean') {
					vals[bypassId] = delayData.bypass ? 'Bypassed' : 'Active'
				}
				if (typeof delayData?.type === 'number' && delayData.type >= 0 && delayData.type <= 6) {
					vals[typeId] = DELAY_TYPE_LABELS[delayData.type] || 'ms'
				}
			}
		}
	}

	// ===== Matrix route summaries =====
	for (let mi = 1; mi <= MATRIX_INPUTS; mi++) {
		const id = `matrix_input_${mi}_routes`
		vars.push({ variableId: id, name: `Matrix In ${mi} routes` })
		if (self?._matrixInputRoutes?.[mi] !== undefined) {
			vals[id] = String(self._matrixInputRoutes[mi])
		}
	}
	for (let mo = 1; mo <= NUM_OUTPUTS; mo++) {
		const id = `matrix_output_${mo}_routes`
		vars.push({ variableId: id, name: `Matrix Out ${mo} routes` })
		if (self?._matrixOutputRoutes?.[mo] !== undefined) {
			vals[id] = String(self._matrixOutputRoutes[mo])
		}
	}

	// ===== Matrix Crosspoints =====
	vars.push({ variableId: 'matrix_crosspoints_used', name: 'Matrix crosspoints used' })
	if (typeof self?.matrixCrosspointsUsed === 'number') {
		vals['matrix_crosspoints_used'] = String(self.matrixCrosspointsUsed)
	}

	// ===== Snapshots (named only, dynamic) =====
	const SNAPSHOT_MAX = 255
	const SNAPSHOT_FIELDS = ['comment', 'created', 'last_updated', 'locked', 'modified', 'name']

	const snapCache = self?.snapshotValues || {}
	const namedIds = []
	for (let id = 0; id <= SNAPSHOT_MAX; id++) {
		const nm = String(snapCache[`snapshot_${id}_name`] ?? '').trim()
		if (nm) namedIds.push(id)
	}

	// Helper: show which IDs we consider “existing”
	vars.push({ variableId: 'snapshot_named_ids', name: 'Snapshot named IDs' })
	vals['snapshot_named_ids'] = namedIds.join(',')

	// Define + backfill values for named snapshots
	for (const id of namedIds) {
		for (const f of SNAPSHOT_FIELDS) {
			const varId = `snapshot_${id}_${f}`
			vars.push({ variableId: varId, name: `Snapshot ${id} ${f.replace(/_/g, ' ')}` })
			if (snapCache[varId] !== undefined) vals[varId] = String(snapCache[varId])
		}
	}

	// ===== Active snapshot (always present) =====
	for (const f of ['comment', 'created', 'id', 'last_updated', 'locked', 'modified', 'name']) {
		const varId = `snapshot_active_${f}`
		vars.push({ variableId: varId, name: `Snapshot active ${f.replace(/_/g, ' ')}` })
		if (snapCache[varId] !== undefined) vals[varId] = String(snapCache[varId])
	}

	vars.push({ variableId: 'snapshot_boot_id', name: 'Snapshot boot ID (-1 disables boot recall)' })
	if (snapCache.snapshot_boot_id !== undefined) {
		vals.snapshot_boot_id = String(snapCache.snapshot_boot_id)
	}

	// ===== Entity (/entity/*) =====
	for (const v of [
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
	]) {
		vars.push({ variableId: v, name: v.replace(/_/g, ' ') })
		if (self?.entityValues?.[v] !== undefined) vals[v] = String(self.entityValues[v])
	}

	// ===== Speaker test =====
	for (const [id, name] of [
		['speaker_test', 'Speaker Test (On/Off)'],
		['speaker_test_delay_ms', 'Speaker Test Delay (ms)'],
	]) {
		vars.push({ variableId: id, name })
		const cur = self?.getVariableValue?.(id)
		if (cur !== undefined && cur !== null) vals[id] = String(cur)
	}

	// ===== Clock AES Output =====
	for (const v of ['aes_output_input_number', 'aes_output_sample_rate', 'aes_output_source', 'aes_output_sync']) {
		vars.push({ variableId: v, name: `Clock AES output: ${v.split('_').slice(2).join(' ')}` })
		if (self?.clockAesValues?.[v] !== undefined) vals[v] = String(self.clockAesValues[v])
	}

	// ===== Clock inputs 1..3 =====
	for (let i = 1; i <= 3; i++) {
		for (const leaf of ['sample_rate', 'sync']) {
			const v = `clock_input_${i}_${leaf}`
			vars.push({ variableId: v, name: `Clock input ${i} ${leaf.replace(/_/g, ' ')}` })
			if (self?.clockInputValues?.[v] !== undefined) vals[v] = String(self.clockInputValues[v])
		}
	}

	// ===== Clock system =====
	for (const v of [
		'clock_system_input_number',
		'clock_system_sample_rate',
		'clock_system_source',
		'clock_system_sync',
	]) {
		vars.push({ variableId: v, name: v.replace(/_/g, ' ') })
		if (self?.clockSystemValues?.[v] !== undefined) vals[v] = String(self.clockSystemValues[v])
	}

	// ===== Word clock =====
	for (const v of ['word_clock_sample_rate', 'word_clock_sync', 'word_clock_termination']) {
		vars.push({ variableId: v, name: v.replace(/_/g, ' ') })
		if (self?.wordClockValues?.[v] !== undefined) vals[v] = String(self.wordClockValues[v])
	}

	// ===== Misc =====
	for (const v of ['rtc_date_and_time', 'identify_active']) {
		vars.push({ variableId: v, name: v.replace(/_/g, ' ') })
		const cur = self?.getVariableValue?.(v)
		if (cur !== undefined && cur !== null) vals[v] = String(cur)
	}

	// ===== Status network + model string =====
	for (const iface of [1, 2]) {
		for (const leaf of ['carrier', 'duplex', 'gateway', 'ip_address', 'mac_address', 'net_mask', 'speed']) {
			const v = `status_network_${iface}_${leaf}`
			vars.push({ variableId: v, name: `Status network ${iface} ${leaf.replace(/_/g, ' ')}` })
			if (self?.statusNetwork?.[v] !== undefined) vals[v] = String(self.statusNetwork[v])
		}
	}
	vars.push({ variableId: 'status_model_string', name: 'Status model string' })
	if (self?.miscValues?.status_model_string !== undefined) {
		vals['status_model_string'] = String(self.miscValues.status_model_string)
	}

	// ===== Front panel lockout =====
	vars.push({ variableId: 'front_panel_lockout', name: 'Front panel lockout' })
	if (self?.miscValues?.front_panel_lockout !== undefined) {
		vals['front_panel_lockout'] = String(self.miscValues.front_panel_lockout)
	}

	// ===== Front panel display =====
	vars.push({ variableId: 'front_panel_brightness', name: 'Front panel display brightness' })
	vars.push({ variableId: 'front_panel_display_color', name: 'Front panel display color' })
	if (self?.displayPrefs?.brightness !== undefined) {
		vals['front_panel_brightness'] = displayBrightnessLabel(self.displayPrefs.brightness)
	}
	if (self?.displayPrefs?.display_color !== undefined) {
		vals['front_panel_display_color'] = displayColorLabel(self.displayPrefs.display_color)
	}

	// ===== Access privilege =====
	vars.push({ variableId: 'access_privilege', name: 'Access privilege (mask)' })
	if (self?.accessPrivilege !== undefined) {
		vals['access_privilege'] = String(self.accessPrivilege)
	}

	// ===== Sub Assist preview =====
	vars.push({ variableId: 'subassist_spacing_ft', name: 'Subassist spacing (ft)' })
	vars.push({ variableId: 'subassist_spacing_m', name: 'Subassist spacing (m)' })

	// ===== System log snapshot =====
	vars.push({ variableId: 'system_log_last', name: 'System log last entry' })
	vars.push({ variableId: 'system_log_recent', name: 'System log recent entries' })
	if (self?._lastLogMessages?.length) {
		const last = self._lastLogMessages[self._lastLogMessages.length - 1]
		if (last) vals['system_log_last'] = last
		vals['system_log_recent'] = self._lastLogMessages.join(' • ')
	}

	// ===== Beam Control Array Status (Arrays 1-4) =====
	for (let arrayIdx = 1; arrayIdx <= 4; arrayIdx++) {
		vars.push({ variableId: `lmbc_${arrayIdx}_error_code`, name: `LMBC Array ${arrayIdx} Error Code` })
		vars.push({ variableId: `lmbc_${arrayIdx}_error_status`, name: `LMBC Array ${arrayIdx} Error Status` })
		vars.push({ variableId: `lmbc_${arrayIdx}_error_string`, name: `LMBC Array ${arrayIdx} Error String` })

		// Backfill beam control status if available
		if (self?.beamControlStatus?.[arrayIdx]) {
			const status = self.beamControlStatus[arrayIdx]
			if (status.errorCode !== undefined) {
				vals[`lmbc_${arrayIdx}_error_code`] = String(status.errorCode)
			}
			if (status.errorCodeLabel) {
				vals[`lmbc_${arrayIdx}_error_status`] = status.errorCodeLabel
			}
			if (status.errorString !== undefined) {
				vals[`lmbc_${arrayIdx}_error_string`] = status.errorString
			}
		}
	}

	// ===== Fan status =====
	for (let i = 1; i <= 4; i++) {
		const stalledId = `fan_${i}_stalled`
		const tachId = `fan_${i}_tach`
		vars.push({ variableId: stalledId, name: `Fan ${i} stalled` })
		vars.push({ variableId: tachId, name: `Fan ${i} tach (RPM)` })
		const fanState = self?.fanStatus?.[i]
		if (fanState) {
			if (fanState.stalled !== undefined) vals[stalledId] = fanState.stalled ? 'true' : 'false'
			if (fanState.tach !== undefined) vals[tachId] = String(fanState.tach)
		}
	}

	// Input U-Shaping selection variables
	vars.push({ variableId: 'ushaping_selected_input', name: 'Input U-Shaping Selected Input(s)' })
	vars.push({ variableId: 'ushaping_selected_input_num', name: 'Input U-Shaping Selected Input Number(s)' })
	vars.push({ variableId: 'ushaping_selected_band', name: 'Input U-Shaping Selected Band' })
	vars.push({ variableId: 'ushaping_selected_band_num', name: 'Input U-Shaping Selected Band Number' })

	// Input U-Shaping dynamic current value variables
	vars.push({ variableId: 'ushaping_current_gain', name: 'Input U-Shaping Current Gain (selected ch/band)' })
	vars.push({ variableId: 'ushaping_current_frequency', name: 'Input U-Shaping Current Frequency (selected ch/band)' })
	vars.push({ variableId: 'ushaping_current_slope', name: 'Input U-Shaping Current Slope (selected ch/band)' })

	// Input Parametric EQ selection variables
	vars.push({ variableId: 'eq_selected_input', name: 'Input Parametric EQ Selected Input(s)' })
	vars.push({ variableId: 'eq_selected_input_num', name: 'Input Parametric EQ Selected Input Number(s)' })
	vars.push({ variableId: 'eq_selected_band', name: 'Input Parametric EQ Selected Band' })
	vars.push({ variableId: 'eq_selected_band_num', name: 'Input Parametric EQ Selected Band Number' })

	// Input Parametric EQ dynamic current value variables
	vars.push({ variableId: 'eq_current_gain', name: 'Input Parametric EQ Current Gain (selected ch/band)' })
	vars.push({ variableId: 'eq_current_frequency', name: 'Input Parametric EQ Current Frequency (selected ch/band)' })
	vars.push({ variableId: 'eq_current_bandwidth', name: 'Input Parametric EQ Current Bandwidth (selected ch/band)' })

	// Output U-Shaping selection variables
	vars.push({ variableId: 'ushaping_selected_output', name: 'Output U-Shaping Selected Output(s)' })
	vars.push({ variableId: 'ushaping_selected_output_num', name: 'Output U-Shaping Selected Output Number(s)' })
	vars.push({ variableId: 'ushaping_selected_output_band', name: 'Output U-Shaping Selected Band' })
	vars.push({ variableId: 'ushaping_selected_output_band_num', name: 'Output U-Shaping Selected Band Number' })

	// Output U-Shaping dynamic current value variables
	vars.push({ variableId: 'ushaping_output_current_gain', name: 'Output U-Shaping Current Gain (selected ch/band)' })
	vars.push({
		variableId: 'ushaping_output_current_frequency',
		name: 'Output U-Shaping Current Frequency (selected ch/band)',
	})
	vars.push({ variableId: 'ushaping_output_current_slope', name: 'Output U-Shaping Current Slope (selected ch/band)' })

	// Output Parametric EQ selection variables
	vars.push({ variableId: 'eq_selected_output', name: 'Output Parametric EQ Selected Output(s)' })
	vars.push({ variableId: 'eq_selected_output_num', name: 'Output Parametric EQ Selected Output Number(s)' })
	vars.push({ variableId: 'eq_selected_output_band', name: 'Output Parametric EQ Selected Band' })
	vars.push({ variableId: 'eq_selected_output_band_num', name: 'Output Parametric EQ Selected Band Number' })

	// Output Parametric EQ dynamic current value variables
	vars.push({ variableId: 'eq_output_current_gain', name: 'Output Parametric EQ Current Gain (selected ch/band)' })
	vars.push({
		variableId: 'eq_output_current_frequency',
		name: 'Output Parametric EQ Current Frequency (selected ch/band)',
	})
	vars.push({
		variableId: 'eq_output_current_bandwidth',
		name: 'Output Parametric EQ Current Bandwidth (selected ch/band)',
	})

	// Apply defs, then push current values so UI shows them immediately
	self.setVariableDefinitions(vars)
	if (Object.keys(vals).length) self.setVariableValues(vals)
}
