// variables.js
module.exports = function UpdateVariableDefinitions(self, NUM_INPUTS, NUM_OUTPUTS) {
  const vars = []

  // ===== Per-input =====
  for (let ch = 1; ch <= NUM_INPUTS; ch++) {
    vars.push({ variableId: `input_${ch}_mute`,    name: `Input ${ch} mute` })
    vars.push({ variableId: `input_${ch}_gain_db`, name: `Input ${ch} gain (dB)` })
    vars.push({ variableId: `input_${ch}_name`,    name: `Input ${ch} name` })
  }

  // ===== Per-output =====
  for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
    vars.push({ variableId: `output_${ch}_mute`,    name: `Output ${ch} mute` })
    vars.push({ variableId: `output_${ch}_gain_db`, name: `Output ${ch} gain (dB)` })
    vars.push({ variableId: `output_${ch}_name`,    name: `Output ${ch} name` })
  }

  // ===== Matrix gains (32 x NUM_OUTPUTS) =====
  const MATRIX_INPUTS = 32
  for (let mi = 1; mi <= MATRIX_INPUTS; mi++) {
    for (let mo = 1; mo <= NUM_OUTPUTS; mo++) {
      vars.push({
        variableId: `matrix_${mi}_${mo}_gain_db`,
        name: `Matrix In ${mi} → Out ${mo} gain (dB)`,
      })
    }
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
  }

  // ===== Clock AES Output =====
  vars.push({ variableId: 'aes_output_input_number', name: 'Clock AES output: input number' })
  vars.push({ variableId: 'aes_output_sample_rate',  name: 'Clock AES output: sample rate' })
  vars.push({ variableId: 'aes_output_source',       name: 'Clock AES output: source' })
  vars.push({ variableId: 'aes_output_sync',         name: 'Clock AES output: sync' })

  // ===== Clock inputs 1..3 =====
  for (let i = 1; i <= 3; i++) {
    vars.push({ variableId: `clock_input_${i}_sample_rate`, name: `Clock input ${i} sample rate` })
    vars.push({ variableId: `clock_input_${i}_sync`,        name: `Clock input ${i} sync` })
  }

  // ===== Clock system =====
  vars.push({ variableId: 'clock_system_input_number', name: 'Clock system input number' })
  vars.push({ variableId: 'clock_system_sample_rate',  name: 'Clock system sample rate' })
  vars.push({ variableId: 'clock_system_source',       name: 'Clock system source' })
  vars.push({ variableId: 'clock_system_sync',         name: 'Clock system sync' })

  // ===== Word clock =====
  vars.push({ variableId: 'word_clock_sample_rate', name: 'Word clock sample rate' })
  vars.push({ variableId: 'word_clock_sync',        name: 'Word clock sync' })
  vars.push({ variableId: 'word_clock_termination', name: 'Word clock termination' })

  // ===== RTC =====
  vars.push({ variableId: 'rtc_date_and_time', name: 'RTC date and time' })

  // ===== NEW: Status model string =====
  vars.push({ variableId: 'model_string', name: 'Model string' })

  // ===== NEW: Status network (replacing old /system/network/*) =====
  for (const i of [1, 2]) {
    for (const leaf of ['carrier', 'duplex', 'gateway', 'ip_address', 'mac_address', 'net_mask', 'speed']) {
      vars.push({ variableId: `net_${i}_${leaf}`, name: `Net ${i} ${leaf.replace(/_/g, ' ')}` })
    }
  }

  // Front panel lockout (already used by feedback/action)
  vars.push({ variableId: 'front_panel_lockout', name: 'Front panel lockout' })

  self.setVariableDefinitions(vars)
}