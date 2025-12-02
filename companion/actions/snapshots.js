// actions/snapshots.js
// Snapshot management actions

const { SNAPSHOT_MAX, buildSnapshotChoices } = require('../helpers')
const { quoteSnapshotArg, buildActiveSnapshotLabel } = require('../actions-helpers')

/**
 * Register snapshot-related actions
 * @param {Object} actions - Actions object to populate
 * @param {Object} self - Module instance
 * @param {number} NUM_INPUTS - Number of input channels (unused but kept for consistency)
 * @param {number} NUM_OUTPUTS - Number of output channels (unused but kept for consistency)
 */
function registerSnapshotActions(actions, self, NUM_INPUTS, NUM_OUTPUTS) {
	// =========================
	// ===== SNAPSHOTS =========
	// =========================

	const activeSnapshotInfo = buildActiveSnapshotLabel(self)
	const allSnapshotChoices = buildSnapshotChoices(self)
	const snapshotDropdownChoices = allSnapshotChoices.length
		? [...allSnapshotChoices]
		: [{ id: '', label: 'No snapshots available' }]
	const snapshotBootChoices = [...snapshotDropdownChoices, { id: '-1', label: 'Clear boot snapshot (disable boot)' }]

	// Combined Snapshot Action
	actions['snapshot_combined'] = {
		name: 'Snapshot: Combined Operations',
		description: 'Perform various snapshot operations from a single action.',
		options: [
			{
				type: 'static-text',
				id: 'activeInfo',
				label: 'Current active snapshot',
				value: activeSnapshotInfo,
			},
			{
				type: 'dropdown',
				id: 'operation',
				label: 'Operation',
				default: 'recall',
				choices: [
					{ id: 'recall', label: 'Recall' },
					{ id: 'update', label: 'Update (rewrite)' },
					{ id: 'create', label: 'Create (new)' },
					{ id: 'duplicate', label: 'Duplicate' },
					{ id: 'rename', label: 'Rename (set name & comment)' },
					{ id: 'set_boot', label: 'Set boot snapshot' },
					{ id: 'delete', label: 'Delete' },
					{ id: 'lock', label: 'Lock' },
					{ id: 'unlock', label: 'Unlock' },
				],
			},
			{
				type: 'dropdown',
				id: 'snapshot_id',
				label: 'Snapshot',
				default: allSnapshotChoices[0]?.id ?? '',
				choices: snapshotDropdownChoices,
				isVisible: (options) => {
					const op = options.operation
					return ['recall', 'duplicate', 'delete', 'lock', 'unlock'].includes(op)
				},
			},
			{
				type: 'dropdown',
				id: 'snapshot_id_boot',
				label: 'Snapshot',
				default: '-1',
				choices: snapshotBootChoices,
				isVisible: (options) => options.operation === 'set_boot',
			},
			{
				type: 'dropdown',
				id: 'snapshot_id_update',
				label: 'Snapshot',
				default: 'active',
				choices: [
					{ id: 'active', label: activeSnapshotInfo },
					...allSnapshotChoices.filter((choice) => {
						const id = Number(choice.id)
						if (!Number.isFinite(id) || id < 1) return false
						const locked = String(self?.snapshotValues?.[`snapshot_${id}_locked`] ?? '').trim()
						return !/^(true|1|on)$/i.test(locked)
					}),
				],
				isVisible: (options) => options.operation === 'update',
			},
			{
				type: 'dropdown',
				id: 'snapshot_id_rename',
				label: 'Snapshot',
				default:
					allSnapshotChoices.filter((choice) => {
						const id = Number(choice.id)
						if (!Number.isFinite(id) || id < 1) return false
						const locked = String(self?.snapshotValues?.[`snapshot_${id}_locked`] ?? '').trim()
						return !/^(true|1|on)$/i.test(locked)
					})[0]?.id ?? '',
				choices: allSnapshotChoices.filter((choice) => {
					const id = Number(choice.id)
					if (!Number.isFinite(id) || id < 1) return false
					const locked = String(self?.snapshotValues?.[`snapshot_${id}_locked`] ?? '').trim()
					return !/^(true|1|on)$/i.test(locked)
				}),
				isVisible: (options) => options.operation === 'rename',
			},
			{
				type: 'textinput',
				id: 'snapshot_name',
				label: 'Snapshot name',
				default: '',
				useVariables: true,
				isVisible: (options) => ['create', 'rename'].includes(options.operation),
			},
			{
				type: 'textinput',
				id: 'snapshot_comment',
				label: 'Snapshot comment',
				default: '',
				useVariables: true,
				isVisible: (options) => ['create', 'rename'].includes(options.operation),
			},
			{
				type: 'checkbox',
				id: 'confirm_delete',
				label: 'YES — really delete this snapshot',
				default: false,
				isVisible: (options) => options.operation === 'delete',
			},
			{
				type: 'checkbox',
				id: 'exclude_input_channel_types',
				label: 'Exclude Input Channel Types',
				default: false,
				isVisible: (options) => options.operation === 'recall',
			},
			{
				type: 'checkbox',
				id: 'exclude_voltage_ranges',
				label: 'Exclude Input and Output Voltage Ranges',
				default: false,
				isVisible: (options) => options.operation === 'recall',
			},
			{
				type: 'checkbox',
				id: 'exclude_mute',
				label: 'Exclude Input and Output Mute',
				default: false,
				isVisible: (options) => options.operation === 'recall',
			},
			{
				type: 'checkbox',
				id: 'exclude_update_active',
				label: 'Exclude Update active snapshot before recall',
				default: false,
				isVisible: (options) => options.operation === 'recall',
			},
			{
				type: 'checkbox',
				id: 'exclude_sim3_bus',
				label: 'Exclude SIM3 Bus Address',
				default: false,
				isVisible: (options) => options.operation === 'recall',
			},
			{
				type: 'checkbox',
				id: 'exclude_sim3_probe',
				label: 'Exclude SIM3 Probe Point',
				default: false,
				isVisible: (options) => options.operation === 'recall',
			},
			{
				type: 'checkbox',
				id: 'exclude_clock_sync',
				label: 'Exclude Clock Sync Mode',
				default: false,
				isVisible: (options) => options.operation === 'recall',
			},
			{
				type: 'checkbox',
				id: 'exclude_avb',
				label: 'Exclude AVB Configuration',
				default: false,
				isVisible: (options) => options.operation === 'recall',
			},
		],
		callback: async (e) => {
			if (!self || typeof self._cmdSendLine !== 'function') return

			const operation = e.options.operation

			// RECALL
			if (operation === 'recall') {
				const id = Number(e.options.snapshot_id)
				if (!Number.isFinite(id) || id < 0 || id > SNAPSHOT_MAX) {
					self.log?.('warn', `Snapshot recall skipped: invalid id "${e.options.snapshot_id}"`)
					return
				}

				// Calculate exclusion code by summing selected checkboxes
				let exclusionCode = 1 // Default: nothing excluded (code 1)
				if (e.options.exclude_input_channel_types) exclusionCode += 2
				if (e.options.exclude_voltage_ranges) exclusionCode += 4
				if (e.options.exclude_mute) exclusionCode += 8
				if (e.options.exclude_update_active) exclusionCode += 16
				if (e.options.exclude_sim3_bus) exclusionCode += 32
				if (e.options.exclude_sim3_probe) exclusionCode += 64
				if (e.options.exclude_clock_sync) exclusionCode += 128
				if (e.options.exclude_avb) exclusionCode += 256

				// If any exclusion is selected, we don't add 1 (we just sum the selected codes)
				if (exclusionCode > 1) {
					exclusionCode -= 1 // Remove the default 1 since we have actual exclusions
				}

				self._cmdSendLine(`:recall_snapshot ${id} ${exclusionCode}`)
				self.log?.('info', `Snapshot: recalled id=${id} with exclusion code=${exclusionCode}`)
			}

			// UPDATE
			else if (operation === 'update') {
				const opt = String(e.options.snapshot_id_update ?? '').trim()
				let id = null
				let fromActive = false

				if (opt === 'active') {
					fromActive = true
					let raw = self?.snapshotValues?.snapshot_active_id
					if (raw == null && typeof self?.getVariableValue === 'function') {
						raw = self.getVariableValue('snapshot_active_id')
					}
					id = Number(raw)
				} else {
					id = Number(opt)
				}

				if (!Number.isFinite(id) || id < 1 || id > SNAPSHOT_MAX) {
					self.log?.('warn', `Snapshot update skipped: invalid id "${opt}"`)
					return
				}

				const locked = String(self?.snapshotValues?.[`snapshot_${id}_locked`] ?? '').trim()
				if (/^(true|1|on)$/i.test(locked)) {
					self.log?.('warn', `Snapshot update skipped: snapshot ${id} is locked`)
					return
				}

				self._cmdSendLine(`:update_snapshot ${id}`)
				self.log?.('info', `Snapshot: requested update of snapshot id=${id}${fromActive ? ' (active)' : ''}`)

				setTimeout(() => {
					try {
						if (typeof self.requestSnapshots === 'function') {
							self.requestSnapshots()
						}
					} catch (err) {
						self.log?.('debug', `Snapshot update refresh failed: ${err?.message || err}`)
					}
				}, 500)
			}

			// CREATE
			else if (operation === 'create') {
				const name = await self.parseVariablesInString(String(e.options.snapshot_name ?? ''))
				const comment = await self.parseVariablesInString(String(e.options.snapshot_comment ?? ''))

				self._cmdSendLine(`:create_snapshot ${quoteSnapshotArg(name)} ${quoteSnapshotArg(comment)}`)
				self.log?.('info', `Snapshot: create requested (name="${name}" comment="${comment}")`)

				setTimeout(() => {
					try {
						if (typeof self.requestSnapshots === 'function') {
							self.requestSnapshots()
						}
					} catch (err) {
						self.log?.('debug', `Snapshot create refresh failed: ${err?.message || err}`)
					}
				}, 500)
			}

			// DUPLICATE
			else if (operation === 'duplicate') {
				const id = Number(e.options.snapshot_id)
				if (!Number.isFinite(id) || id < 0 || id > SNAPSHOT_MAX) {
					self.log?.('warn', `Snapshot duplicate skipped: invalid id "${e.options.snapshot_id}"`)
					return
				}

				self._cmdSendLine(`:duplicate_snapshot ${id}`)
				self.log?.('info', `Snapshot: duplicate requested for id=${id}`)

				setTimeout(() => {
					try {
						if (typeof self.requestSnapshots === 'function') {
							self.requestSnapshots()
						}
					} catch (err) {
						self.log?.('debug', `Snapshot duplicate refresh failed: ${err?.message || err}`)
					}
				}, 500)
			}

			// SET BOOT SNAPSHOT
			else if (operation === 'set_boot') {
				const id = Number(e.options.snapshot_id_boot)
				if (!Number.isFinite(id) || id < -1 || id > SNAPSHOT_MAX) {
					self.log?.('warn', `Snapshot boot skipped: invalid id "${e.options.snapshot_id_boot}"`)
					return
				}

				self._cmdSendLine(`:set_boot_snapshot ${id}`)
				if (id === -1) {
					self.log?.('info', 'Snapshot: cleared boot snapshot (no snapshot at boot)')
				} else {
					self.log?.('info', `Snapshot: set boot snapshot id=${id}`)
				}
			}

			// RENAME (Set Name & Comment)
			else if (operation === 'rename') {
				const id = Number(e.options.snapshot_id_rename)
				if (!id) {
					self.log?.('warn', 'Snapshot rename skipped: no snapshot selected')
					return
				}
				const locked = String(self?.snapshotValues?.[`snapshot_${id}_locked`] ?? '').trim()
				if (/^(true|1|on)$/i.test(locked)) {
					self.log?.('warn', `Snapshot rename skipped: snapshot ${id} is locked`)
					return
				}
				if (!Number.isFinite(id) || id < 1 || id > SNAPSHOT_MAX) {
					self.log?.('warn', `Snapshot rename skipped: invalid id "${e.options.snapshot_id_rename}"`)
					return
				}

				const name = await self.parseVariablesInString(String(e.options.snapshot_name ?? ''))
				const comment = await self.parseVariablesInString(String(e.options.snapshot_comment ?? ''))

				if (name || comment) {
					self._cmdSendLine(
						`:set_snapshot_name ${id} ${quoteSnapshotArg(name)}`,
						`:set_snapshot_comment ${id} ${quoteSnapshotArg(comment)}`,
					)
				} else {
					self._cmdSendLine(`:set_snapshot_name ${id} ${quoteSnapshotArg(name)}`)
				}

				self.log?.('info', `Snapshot: set name/comment for id=${id} (name="${name}" comment="${comment}")`)

				if (typeof self._applySnapshotValue === 'function') {
					self._applySnapshotValue(`snapshot_${id}_name`, name)
					self._applySnapshotValue(`snapshot_${id}_comment`, comment)
					let activeRaw = self?.snapshotValues?.snapshot_active_id
					if (activeRaw == null && typeof self?.getVariableValue === 'function') {
						activeRaw = self.getVariableValue('snapshot_active_id')
					}
					const activeId = Number(activeRaw)
					if (Number.isFinite(activeId) && activeId === id) {
						self._applySnapshotValue('snapshot_active_name', name)
						self._applySnapshotValue('snapshot_active_comment', comment)
					}
				}

				setTimeout(() => {
					try {
						if (typeof self.requestSnapshots === 'function') {
							self.requestSnapshots()
						}
					} catch (err) {
						self.log?.('debug', `Snapshot rename refresh failed: ${err?.message || err}`)
					}
				}, 500)
			}

			// DELETE
			else if (operation === 'delete') {
				if (!e.options.confirm_delete) {
					self.log?.('warn', `Snapshot delete aborted — confirm box was not checked`)
					return
				}

				const id = Number(e.options.snapshot_id)
				if (!Number.isFinite(id) || id < 1 || id > SNAPSHOT_MAX) {
					self.log?.('warn', `Snapshot delete skipped: invalid id "${e.options.snapshot_id}"`)
					return
				}

				self._cmdSendLine(`:delete_snapshot ${id}`)
				self.log?.('info', `Snapshot: deleted id=${id}`)

				setTimeout(() => {
					try {
						if (typeof self.requestSnapshots === 'function') {
							self.requestSnapshots()
						}
					} catch (err) {
						self.log?.('debug', `Snapshot refresh failed: ${err?.message || err}`)
					}
				}, 500)
			}

			// LOCK
			else if (operation === 'lock') {
				const id = Number(e.options.snapshot_id)
				if (!Number.isFinite(id) || id < 1 || id > SNAPSHOT_MAX) {
					self.log?.('warn', `Snapshot lock skipped: invalid id "${e.options.snapshot_id}"`)
					return
				}

				self._cmdSendLine(`:lock_snapshot ${id}`)
				self.log?.('info', `Snapshot: lock id=${id}`)

				if (typeof self._applySnapshotValue === 'function') {
					self._applySnapshotValue(`snapshot_${id}_locked`, 'true')
					let raw = self?.snapshotValues?.snapshot_active_id
					if (raw == null && typeof self?.getVariableValue === 'function')
						raw = self.getVariableValue('snapshot_active_id')
					const activeId = Number(raw)
					if (Number.isFinite(activeId) && activeId === id) {
						self._applySnapshotValue('snapshot_active_locked', 'true')
					}
				}

				setTimeout(() => {
					try {
						if (typeof self.requestSnapshots === 'function') {
							self.requestSnapshots()
						}
					} catch (err) {
						self.log?.('debug', `Snapshot lock refresh failed: ${err?.message || err}`)
					}
				}, 500)
			}

			// UNLOCK
			else if (operation === 'unlock') {
				const id = Number(e.options.snapshot_id)
				if (!Number.isFinite(id) || id < 1 || id > SNAPSHOT_MAX) {
					self.log?.('warn', `Snapshot unlock skipped: invalid id "${e.options.snapshot_id}"`)
					return
				}

				self._cmdSendLine(`:unlock_snapshot ${id}`)
				self.log?.('info', `Snapshot: unlock id=${id}`)

				if (typeof self._applySnapshotValue === 'function') {
					self._applySnapshotValue(`snapshot_${id}_locked`, 'false')
					let raw = self?.snapshotValues?.snapshot_active_id
					if (raw == null && typeof self?.getVariableValue === 'function')
						raw = self.getVariableValue('snapshot_active_id')
					const activeId = Number(raw)
					if (Number.isFinite(activeId) && activeId === id) {
						self._applySnapshotValue('snapshot_active_locked', 'false')
					}
				}

				setTimeout(() => {
					try {
						if (typeof self.requestSnapshots === 'function') {
							self.requestSnapshots()
						}
					} catch (err) {
						self.log?.('debug', `Snapshot unlock refresh failed: ${err?.message || err}`)
					}
				}, 500)
			}
		},
	}
}

module.exports = { registerSnapshotActions }
