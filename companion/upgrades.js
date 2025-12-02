module.exports = [
	/*
	 * Place your upgrade scripts here
	 * Remember that once it has been added it cannot be removed!
	 */

	// V1: Rename action IDs and parameters for consistency
	function (_context, props) {
		const updatedActions = []
		const updatedFeedbacks = []

		// Action ID renames (remove _multi suffixes and standardize prefixes)
		const actionRenames = {
			'inputs_mute_control_multi': 'input_mute_control',
			'inputs_mute_control': 'input_mute_control',
			'inputs_solo': 'input_solo',
			'outputs_mute_control_multi': 'output_mute_control',
			'outputs_mute_control': 'output_mute_control',
			'outputs_solo': 'output_solo',
			'matrix_gain_set_multi': 'matrix_gain_set',
			'matrix_gain_nudge_multi': 'matrix_gain_nudge',
			'matrix_delay_set_multi': 'matrix_delay_set',
			'system_input_mode_set_multi': 'system_input_mode_set',
			'output_chase_start': 'system_chase_start',
			'output_chase_stop': 'system_chase_stop',
		}

		// Parameter renames for actions
		const actionParamRenames = {
			// Matrix actions: mi/mo → matrix_inputs/matrix_outputs
			'matrix_gain_set': { 'mi': 'matrix_inputs', 'mo': 'matrix_outputs' },
			'matrix_gain_nudge': { 'mi': 'matrix_inputs', 'mo': 'matrix_outputs' },
			'matrix_delay_set': { 'mi': 'matrix_inputs', 'mo': 'matrix_outputs' },
			// Link group actions: channels → chs
			'input_link_group_assign': { 'channels': 'chs' },
			'output_link_group_assign': { 'channels': 'chs' },
			// EQ actions: freq_value/freq_delta → frequency_value/frequency_delta
			'input_eq_knob_frequency': { 'freq_value': 'frequency_value' },
			'input_eq_nudge_frequency': { 'freq_delta': 'frequency_delta' },
		}

		// Feedback ID renames
		const feedbackRenames = {
			'speakerTestFlash': 'speaker_test_flash',
		}

		// Parameter renames for feedbacks
		const feedbackParamRenames = {
			// Matrix feedbacks: mi/mo → matrix_input/matrix_output
			'matrix_gain_level': { 'mi': 'matrix_input', 'mo': 'matrix_output' },
			'matrix_delay_bypassed': { 'mi': 'matrix_input', 'mo': 'matrix_output' },
			'matrix_gain_color': { 'mi': 'matrix_input', 'mo': 'matrix_output' },
		}

		// Upgrade actions
		for (const action of props.actions) {
			let changed = false
			const newAction = { ...action }

			// Rename action ID if needed
			if (actionRenames[action.actionId]) {
				newAction.actionId = actionRenames[action.actionId]
				changed = true
			}

			// Rename action parameters if needed
			const currentActionId = newAction.actionId
			if (actionParamRenames[currentActionId]) {
				const renames = actionParamRenames[currentActionId]
				for (const [oldParam, newParam] of Object.entries(renames)) {
					if (newAction.options && oldParam in newAction.options) {
						newAction.options[newParam] = newAction.options[oldParam]
						delete newAction.options[oldParam]
						changed = true
					}
				}
			}

			if (changed) {
				updatedActions.push(newAction)
			}
		}

		// Upgrade feedbacks
		for (const feedback of props.feedbacks) {
			let changed = false
			const newFeedback = { ...feedback }

			// Rename feedback ID if needed
			if (feedbackRenames[feedback.feedbackId]) {
				newFeedback.feedbackId = feedbackRenames[feedback.feedbackId]
				changed = true
			}

			// Rename feedback parameters if needed
			const currentFeedbackId = newFeedback.feedbackId
			if (feedbackParamRenames[currentFeedbackId]) {
				const renames = feedbackParamRenames[currentFeedbackId]
				for (const [oldParam, newParam] of Object.entries(renames)) {
					if (newFeedback.options && oldParam in newFeedback.options) {
						newFeedback.options[newParam] = newFeedback.options[oldParam]
						delete newFeedback.options[oldParam]
						changed = true
					}
				}
			}

			if (changed) {
				updatedFeedbacks.push(newFeedback)
			}
		}

		return {
			updatedConfig: null,
			updatedActions,
			updatedFeedbacks,
		}
	},
]
