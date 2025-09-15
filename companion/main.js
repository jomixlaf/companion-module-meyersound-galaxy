// main.js
const net = require('net')
const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
const UpgradeScripts = require('./upgrades')
const UpdatePresets = require('./presets')

const EOL_SPLIT = /\r\n|\n|\r/
const TX_EOL = '\n'
const NUM_INPUTS = 8
const NUM_OUTPUTS = 16
const MATRIX_INPUTS = 32

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
  return Math.max(-90, Math.min(10, n))
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

    // command socket (short-lived with queue)
    this.cmdSock = null
    this.cmdQueue = []
    this.cmdConnecting = false
    this.cmdTimer = null

    // state caches
    this.inMute = {}
    this.outMute = {}
    this.inputGain = {} // { ch: number (dB, 0.1) }
    this.outputGain = {} // { ch: number (dB, 0.1) }
    this.matrixGain = {} // { 'mi-mo': number }

    // metadata/clock caches
    this.entityValues = {}
    this.clockAesValues = {}
    this.clockInputValues = {}
    this.clockSystemValues = {}
    this.wordClockValues = {}
    this.miscValues = {}

    // names
    this.inputName = {} // { ch: string }
    this.outputName = {} // { ch: string }

    // status network + model
    this.statusNetwork = {} // { `status_network_${iface}_${leaf}`: value }
    this.modelString = '' // status_model_string

    // snapshots cache
    this.snapshotValues = {} // { snapshot_<id>_<field>: value, snapshot_active_<field>: value }

    // fades (generic)
    this._fades = new Map()

    // legacy per-type fade registries (kept for compatibility; not required)
    this._gainFadesIn = {}
    this._gainFadesOut = {}

    // Speaker test (output chase)
    this._chase = {
      running: false,
      timer: null,
      list: [],
      index: 0,
      delayMs: 1000,
      windowSize: 1, // 1 = solo steps, 2 = solo -> pair -> advance
      phase: 0, // for windowSize=2, 0=solo,1=pair then advance
      prevActive: new Set(),
    }
  }

  async init(config) {
    this.config = config
    this.updateStatus(InstanceStatus.Ok, 'Idle')

    this.updateActions()
    this.updateFeedbacks()
    this.updateVariableDefinitions()
    this.updatePresets()
    this._seedVariables()

    this._startSubscribe()
  }

  async destroy() {
    this._stopAllFades()
    this._stopAllInputFades()
    this._stopAllOutputFades()
    this._stopOutputChase()
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
  }

  // -------- Config UI --------
  getConfigFields() {
    return [
      { type: 'textinput', id: 'host', label: 'Galaxy IP', width: 8, default: '192.168.0.100', regex: Regex.IP },
      { type: 'number', id: 'port', label: 'Galaxy ASCII Port', width: 4, default: 25003, min: 1, max: 65535 },
    ]
  }

  // -------- Subscribe socket (~30ms default) --------
  _startSubscribe() {
    const host = this.config?.host
    const port = Number(this.config?.port)
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
      setTimeout(() => this._startSubscribe(), 1000)
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
      this.updateStatus(InstanceStatus.Ok, 'Subscribed')

      // Subscribe inputs
      for (let ch = 1; ch <= NUM_INPUTS; ch++) {
        this._subWrite(`+/processing/input/${ch}/mute`)
        this._subWrite(`+/processing/input/${ch}/gain`)
      }
      // Subscribe outputs
      for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
        this._subWrite(`+/processing/output/${ch}/mute`)
        this._subWrite(`+/processing/output/${ch}/gain`)
      }
      // Seed GETs
      for (let ch = 1; ch <= NUM_INPUTS; ch++) {
        this._subWrite(`/processing/input/${ch}/mute`)
        this._subWrite(`/processing/input/${ch}/gain`)
      }
      for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
        this._subWrite(`/processing/output/${ch}/mute`)
        this._subWrite(`/processing/output/${ch}/gain`)
      }

      // Matrix subscribe + seed (32 x 16)
      for (let mi = 1; mi <= MATRIX_INPUTS; mi++) {
        for (let mo = 1; mo <= NUM_OUTPUTS; mo++) {
          const addr = `/processing/matrix/${mi}/${mo}/gain`
          this._subWrite(`+${addr}`)
          this._subWrite(addr)
        }
      }

      // Entity & clocks
      for (const path of ENTITY_PATHS) {
        this._subWrite(`+/entity/${path}`)
        this._subWrite(`/entity/${path}`)
      }
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

      // Device names
      for (let ch = 1; ch <= 32; ch++) {
        const addr = `/device/input/${ch}/name`
        this._subWrite(`+${addr}`)
        this._subWrite(addr)
      }
      for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
        const addr = `/device/output/${ch}/name`
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
    })
  }

  _subWrite(cmd) {
    const s = this.subSock
    if (!s) return
    try {
      s.write(Buffer.from(cmd + TX_EOL, 'utf8'))
    } catch {}
  }

  _onSubLine(line) {
    // mutes
    const mute = this._parseAnyMuteLoose(line)
    if (mute && typeof mute.value === 'boolean') {
      if (mute.kind === 'input') this._applyInMute(mute.ch, mute.value)
      else if (mute.kind === 'output') this._applyOutMute(mute.ch, mute.value)
    }

    // input/output gains
    const ig = this._parseInputGain(line)
    if (ig) this._applyInputGain(ig.ch, ig.value)

    const og = this._parseOutputGain(line)
    if (og) this._applyOutputGain(og.ch, og.value)

    // matrix gains
    const mg = this._parseMatrixGain(line)
    if (mg) this._applyMatrixGain(mg.mi, mg.mo, mg.value)

    // names
    const nm = this._parseNameValue(line)
    if (nm) {
      if (nm.kind === 'input') this._applyInputName(nm.ch, nm.value)
      else if (nm.kind === 'output') this._applyOutputName(nm.ch, nm.value)
      return
    }

    // entity & clocks
    const entity = this._parseEntityValue(line)
    if (entity) {
      this._applyEntityValue(entity.key, entity.value)
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

    // front panel lockout
    const fpl = this._parseFrontPanelLockout(line)
    if (fpl) {
      this._applyMiscValue('front_panel_lockout', String(fpl.value))
      this.checkFeedbacks('front_panel_lockout')
      return
    }

    // snapshots
    const snap = this._parseSnapshotValue(line)
    if (snap) {
      this._applySnapshotValue(snap.varId, snap.value)
      return
    }
  }

  // -------- Command socket with queue (quiet) --------
  _ensureCmdSocket() {
    if (this.cmdSock || this.cmdConnecting) return
    const host = this.config?.host
    const port = Number(this.config?.port)
    if (!host || !port) return

    this.cmdConnecting = true
    const sock = new net.Socket()
    this.cmdSock = sock

    const retry = () => {
      this.cmdConnecting = false
      if (this.cmdSock === sock) this.cmdSock = null
      clearTimeout(this.cmdTimer)
      this.cmdTimer = setTimeout(() => this._ensureCmdSocket(), 800)
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
      }, 1500)
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
    }, 1500)
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

// Debounced refresh so action dropdown labels (with names) stay current
_scheduleActionsRefresh() {
  clearTimeout(this._actionsRefreshTimer)
  this._actionsRefreshTimer = setTimeout(() => {
    try { this.updateActions() } catch {}
  }, 150)
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
    this.setVariableValues({ [`matrix_${mi}_${mo}_gain_db`]: rounded.toFixed(1) })
    this.checkFeedbacks('matrix_gain_level')
  }
  _setMatrixGain(mi, mo, gainDb) {
    const i = Math.max(1, Math.min(MATRIX_INPUTS, Number(mi)))
    const o = Math.max(1, Math.min(NUM_OUTPUTS, Number(mo)))
    const g = roundTenth(clampDb(gainDb))
    this._cmdSendLine(`/processing/matrix/${i}/${o}/gain=${g}`)
    this._applyMatrixGain(i, o, g)
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

    // Use first target as timing reference (all move together)
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
  _runChaseStep() {
    if (!this._chase.running) return
    const { list, index, delayMs, windowSize } = this._chase
    if (index >= list.length) {
      this._muteAllOutputs()
      this._stopOutputChase()
      return
    }

    if (windowSize === 1) {
      // Solo only
      const current = list[index]
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
    const base = list[index]
    const hasNext = index + 1 < list.length
    const next = hasNext ? list[index + 1] : null

    if (phase === 0) {
      const desired = new Set([base])
      const lines = []
      for (const ch of this._chase.prevActive) if (!desired.has(ch)) lines.push(`/processing/output/${ch}/mute=true`)
      for (const ch of desired) if (!this._chase.prevActive.has(ch)) lines.push(`/processing/output/${ch}/mute=false`)
      if (lines.length) this._cmdSendBatch(lines)
      this._chase.prevActive = desired
      if (!hasNext) {
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

  _startOutputChase(startCh, endCh, delayMs, windowSize) {
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
    }
    for (let ch = 1; ch <= NUM_OUTPUTS; ch++) {
      vals[`output_${ch}_mute`] = ''
      vals[`output_${ch}_gain_db`] = ''
      vals[`output_${ch}_name`] = ''
    }
    // Matrix 32x16
    for (let mi = 1; mi <= MATRIX_INPUTS; mi++) {
      for (let mo = 1; mo <= NUM_OUTPUTS; mo++) vals[`matrix_${mi}_${mo}_gain_db`] = ''
    }
    // Snapshots (0..255)
    for (let id = 0; id <= SNAPSHOT_MAX; id++) {
      for (const field of SNAPSHOT_FIELDS) vals[`snapshot_${id}_${field}`] = ''
    }
    // Active snapshot
    for (const field of SNAPSHOT_ACTIVE_FIELDS) vals[`snapshot_active_${field}`] = ''

    // entity/clock
    for (const key of ENTITY_PATHS) vals[key] = ''
    for (const leaf of Object.keys(CLOCK_AES_STATUS_PATHS)) vals[CLOCK_AES_STATUS_PATHS[leaf]] = ''
    for (const idx of CLOCK_INPUT_INDEXES) for (const leaf of CLOCK_INPUT_LEAVES) vals[`clock_input_${idx}_${leaf}`] = ''
    for (const leaf of Object.keys(CLOCK_SYSTEM_PATHS)) vals[CLOCK_SYSTEM_PATHS[leaf]] = ''
    for (const leaf of Object.keys(WORD_CLOCK_PATHS)) vals[WORD_CLOCK_PATHS[leaf]] = ''
    vals[RTC_VAR] = ''
    // network + model string
    for (const iface of NET_IFACES) {
      for (const leaf of NET_LEAVES) vals[`status_network_${iface}_${leaf}`] = ''
    }
    vals['status_model_string'] = ''
    // front panel lockout
    vals['front_panel_lockout'] = ''
    this.setVariableValues(vals)
  }

  _applyInMute(ch, val) {
    if (this.inMute[ch] === val) return
    this.inMute[ch] = val
    this.setVariableValues({ [`input_${ch}_mute`]: String(val) })
    this.checkFeedbacks('input_muted')
  }
  _applyOutMute(ch, val) {
    if (this.outMute[ch] === val) return
    this.outMute[ch] = val
    this.setVariableValues({ [`output_${ch}_mute`]: String(val) })
    this.checkFeedbacks('output_muted')
  }

  _applyInputGain(ch, val) {
    const rounded = roundTenth(clampDb(val))
    if (this.inputGain[ch] === rounded) return
    this.inputGain[ch] = rounded
    this.setVariableValues({ [`input_${ch}_gain_db`]: rounded.toFixed(1) })
    this.checkFeedbacks('input_gain_level')
  }
  _applyOutputGain(ch, val) {
    const rounded = roundTenth(clampDb(val))
    if (this.outputGain[ch] === rounded) return
    this.outputGain[ch] = rounded
    this.setVariableValues({ [`output_${ch}_gain_db`]: rounded.toFixed(1) })
    this.checkFeedbacks('output_gain_level')
  }

  _applyEntityValue(key, value) {
    if (this.entityValues[key] === value) return
    this.entityValues[key] = value
    this.setVariableValues({ [key]: value })
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

  _parseEntityValue(text) {
    const m = text.match(/\/entity\/([a-z0-9_]+)\b/i)
    if (!m) return undefined
    const key = m[1].toLowerCase()
    if (!ENTITY_PATHS.includes(key)) return undefined
    const val = this._extractRightHandValue(text)
    if (val == null) return undefined
    return { key, value: val }
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

  _parseNameValue(text) {
    // /device/input/1/name  or /device/output/1/name
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

  _parseStatusNetworkValue(text) {
    // /status/network/{1|2}/{leaf}
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

  _parseFrontPanelLockout(text) {
    const m = text.match(/\/system\/hardware\/front_panel_lockout\b/i)
    if (!m) return undefined
    const rhs = this._extractRightHandBool(text)
    if (rhs == null) return undefined
    return { value: rhs }
  }

  _parseSnapshotValue(text) {
    // /project/snapshot/<id>/<field>   OR   /project/snapshot/active/<field>
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
}

runEntrypoint(ModuleInstance, UpgradeScripts)
