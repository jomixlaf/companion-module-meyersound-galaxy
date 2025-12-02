// actions/index.js
// Main actions entry point that combines all action categories

const { registerInputActions } = require('./inputs')
const { registerOutputActions } = require('./outputs')
const { registerMatrixActions } = require('./matrix')
const { registerSnapshotActions } = require('./snapshots')
const { registerSystemActions } = require('./system')
const { registerArrayDesignActions } = require('./array-design')
const { registerSubwooferDesignActions } = require('./subwoofer-design')

/**
 * Register all action definitions
 * @param {Object} self - Module instance
 * @param {number} NUM_INPUTS - Number of input channels
 * @param {number} NUM_OUTPUTS - Number of output channels
 */
module.exports = function UpdateActions(self, NUM_INPUTS, NUM_OUTPUTS) {
	if (!self) {
		console.error('UpdateActions: self is required')
		return
	}
	if (!Number.isFinite(NUM_INPUTS) || NUM_INPUTS < 1) {
		console.error('UpdateActions: Invalid NUM_INPUTS')
		return
	}
	if (!Number.isFinite(NUM_OUTPUTS) || NUM_OUTPUTS < 1) {
		console.error('UpdateActions: Invalid NUM_OUTPUTS')
		return
	}

	// Initialize required properties
	self.snapshotValues = self.snapshotValues || {}
	self.inputName = self.inputName || {}
	self.outputName = self.outputName || {}
	self.inMute = self.inMute || {}
	self.outMute = self.outMute || {}

	const actions = {}

	// Register actions from each category
	registerInputActions(actions, self, NUM_INPUTS, NUM_OUTPUTS)
	registerOutputActions(actions, self, NUM_INPUTS, NUM_OUTPUTS)
	registerMatrixActions(actions, self, NUM_INPUTS, NUM_OUTPUTS)
	registerSnapshotActions(actions, self, NUM_INPUTS, NUM_OUTPUTS)
	registerSystemActions(actions, self, NUM_INPUTS, NUM_OUTPUTS)
	registerArrayDesignActions(actions, self, NUM_INPUTS, NUM_OUTPUTS)
	registerSubwooferDesignActions(actions, self, NUM_INPUTS, NUM_OUTPUTS)

	// Register all actions with Companion
	self.setActionDefinitions(actions)
}
