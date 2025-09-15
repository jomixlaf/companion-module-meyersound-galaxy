Control your Meyer Sound Galaxy processors directly from Bitfocus Companion.
This module provides full integration with real-time control, variables, and feedback for inputs, outputs, matrices, snapshots, hardware status and more.

I only implement what I needed so far but there is more to come. Let me know if something you need is missing!

⸻
🔧 Setup
	1.	In Companion, add the Meyer Sound Galaxy module.
	2.	Configure:
	•	IP Address of the Galaxy
	•	Port (default: 25003)
	3.	After connection, the module will automatically subscribe to all inputs, outputs, matrices, clocks, and status channels.
	4.	Variables, feedbacks, and presets are instantly available for use in your Companion buttons.


✨ Features Action's

	
•	Speaker Test: 
    Cycles through your outputs automatically so you can quickly test speaker lines. You can run it one output at a time        (solo) or in pairs (A+B). The timing between steps is adjustable, and outputs are muted/unmuted automatically during        the chase.
	
 Inputs
	  •	Mute/unmute/toggle one
	  •	Set, nudge, or fade gain (dB)
	  •	Variables for input name, mute state, and gain value
	  •	Feedback for mute status and gain levels
	
 Outputs
	  •	Mute/unmute/toggle one or multiple channels
	  •	Set, nudge, or fade gain (dB)
	  •	Variables for output name, mute state, and gain value
	  •	Feedback for mute status and gain levels
	
 Matrix
	•	Select multiple inputs and outputs at once
	•	Set, nudge, or fade crosspoint gains
	•	Variables and feedback for all crosspoints


Snapshots
	  •	Recall snapshots (0–255)
	  •	Variables for active snapshot (ID, name, timestamps, etc.)
	  •	Feedback for snapshot state
	
Presets
  	•	Auto-generated mute buttons for inputs and outputs
	  •	Labels show channel number, name, and gain
	  •	Feedback coloring (e.g. red when muted)
	
Front Panel Lockout
	•	Lock/unlock Galaxy hardware front panel
	•	Feedback shows live state

Status & System Info
	•	Device info (model, firmware, serial, group name)
	•	Clock & sync (AES, word clock, system clock)
	•	Network status (IP, MAC, speed, etc.)
	•	RTC date & time


📊 Variables

Example variables you can use in button labels:
	•	$(Galaxy:input_1_name) → Input 1 name
	•	$(Galaxy:input_1_gain_db) → Input 1 gain in dB
	•	$(Galaxy:input_1_mute) → true/false mute state
	•	$(Galaxy:output_3_name) → Output 3 name
	•	$(Galaxy:snapshot_active_id) → Currently active snapshot ID

⸻

🖲 Feedbacks
	•	Input/output mute status (turns red when muted)
	•	Gain threshold comparisons (equal, above, below target dB)
	•	Matrix crosspoint gain monitoring
	•	Front panel lock state


⸻

⚡ Notes
	•	Requires Companion v3 or newer
	•	Tested with Meyer Sound Galaxy hardware (firmware version 4.15)
	•	Community-driven, unofficial module. Use at your own risk, but stable in production.
