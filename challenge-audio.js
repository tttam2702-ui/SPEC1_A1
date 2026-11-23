// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted implementation, revised into named helpers for this project.
// Web Audio time drives the melting and notification cues, even when frames skip.
const CHALLENGE_NOTIFICATION_BEATS = [0.045, 0.456, 0.688, 0.905, 1.11];
const CHALLENGE_DATAMOSH_BEATS = [
  0.025, 0.299, 0.586, 0.874, 1.161, 1.442, 1.729, 2.015, 2.302, 2.589, 2.876, 3.157, 3.444, 3.729,
  4.011,
];
const CHALLENGE_SOUND_PATHS = {
  item: "sounds/challenge_click.wav",
  notification: "sounds/notification_end.wav",
  ok: "sounds/ok_click.ogg",
  start: "sounds/game-start.ogg",
  datamosh: "sounds/datamosh.wav",
  transition: "sounds/transition.wav",
};

async function fetchSoundBuffer(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error("Audio file unavailable: " + path);
    return await response.arrayBuffer();
  } catch (_) {
    return null; // The visual experience remains available if sound cannot load.
  }
}

class ChallengeAudio {
  context = null;
  buffers = {};
  sources = new Set();
  trackSerial = 0;
  generation = 0;
  notificationTrack = null;
  datamoshTrack = null;

  constructor({ onState, onPlay, paths, now = () => performance.now() } = {}) {
    this.onState = onState;
    this.onPlay = onPlay;
    this.now = now;
    this.paths = paths || CHALLENGE_SOUND_PATHS;
    this.raw = Object.fromEntries(
      Object.entries(this.paths).map(([name, path]) => [name, fetchSoundBuffer(path)]),
    );
  }

  async unlock() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return this.onState?.("unavailable");
    if (!this.context && !this.openContext(Context)) return;
    const resume =
      this.context.state === "running" ? Promise.resolve() : this.context.resume().catch(() => {});
    this.onState?.(this.context.state);
    await Promise.all([resume, this.decoded]);
  }

  openContext(Context) {
    try {
      this.context = new Context({ latencyHint: "interactive" });
      this.connectMaster();
      this.context.onstatechange = () => this.onState?.(this.context.state);
      this.decoded = Promise.all(Object.entries(this.raw).map((entry) => this.decodeBuffer(entry)));
      return true;
    } catch (_) {
      this.onState?.("unavailable");
      return false;
    }
  }

  connectMaster() {
    this.master = this.context.createGain();
    this.master.gain.value = 0.8;
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.12;
    this.master.connect(compressor);
    compressor.connect(this.context.destination);
  }

  async decodeBuffer([name, promise]) {
    const data = await promise;
    if (!data) return;
    try {
      this.buffers[name] = await this.context.decodeAudioData(data.slice(0));
    } catch (_) {
      // Codec failure falls back to silent, clocked visual cues.
    }
  }

  audibleTime() {
    const context = this.context;
    if (!context) return 0;
    if (context.state === "running" && context.getOutputTimestamp) {
      const stamp = context.getOutputTimestamp();
      if (stamp.performanceTime > 0) return this.timestampTime(stamp);
    }
    return Math.max(
      0,
      context.currentTime - (context.baseLatency || 0) - (context.outputLatency || 0),
    );
  }

  timestampTime(stamp) {
    return Math.min(
      this.context.currentTime,
      stamp.contextTime + (this.now() - stamp.performanceTime) / 1000,
    );
  }

  makeVoice(name, at, volume, { loop = false } = {}) {
    if (!this.context || !this.buffers[name]) return null;
    const voice = this.connectVoice(name, volume, loop);
    voice.source.onended = () => this.disconnectVoice(voice);
    this.sources.add(voice);
    voice.source.start(at);
    this.onPlay?.(name);
    return voice;
  }

  connectVoice(name, volume, loop) {
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers[name];
    source.loop = loop;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.master);
    return { source, gain, name };
  }

  disconnectVoice(voice) {
    this.sources.delete(voice);
    voice.source.disconnect();
    voice.gain.disconnect();
  }

  stopVoice(voice) {
    if (!voice || !this.sources.has(voice)) return;
    const at = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(at);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, at);
    voice.gain.gain.linearRampToValueAtTime(0, at + 0.008);
    try {
      voice.source.stop(at + 0.01); // A short ramp prevents an abrupt audio click.
    } catch (_) {}
  }

  async effect(name, volume, limit) {
    const generation = this.generation;
    try {
      await this.unlock();
      if (generation !== this.generation || !this.canPlay(name)) return false;
      const voices = [...this.sources].filter((voice) => voice.name === name);
      while (voices.length >= limit) this.stopVoice(voices.shift());
      return Boolean(this.makeVoice(name, this.context.currentTime + 0.005, volume));
    } catch (_) {
      return false;
    }
  }

  canPlay(name) {
    return this.context?.state === "running" && Boolean(this.buffers[name]);
  }

  playItem() {
    this.effect("item", 0.72, 6);
  }
  playOK() {
    this.effect("ok", 0.6, 3);
  }
  playStart() {
    this.effect("start", 0.75, 1);
  }
  playTransition() {
    this.effect("transition", 0.8, 1);
  }

  playNotification() {
    this.stopNotification();
    return this.timedTrack("notification", CHALLENGE_NOTIFICATION_BEATS, {
      duration: 1.289646,
      volume: 0.8,
    });
  }

  playDatamosh() {
    if (this.datamoshTrack && !this.datamoshTrack.stopped) return this.datamoshTrack;
    return this.timedTrack("datamosh", CHALLENGE_DATAMOSH_BEATS, {
      duration: 4.280979,
      volume: 0.07,
      loop: true,
    });
  }

  timedTrack(name, beats, options) {
    const track = this.createTrack(beats, options);
    this[name + "Track"] = track;
    void this.startTrack(name, track, options, this.generation);
    return track;
  }

  createTrack(beats, { duration, loop = false }) {
    const track = {
      id: ++this.trackSerial,
      beats: [...beats],
      duration,
      loop,
      startAt: null,
      fallbackAt: null,
      stopped: false,
      voice: null,
    };
    track.elapsed = () => this.trackElapsed(track);
    return track;
  }

  trackElapsed(track) {
    if (track.stopped) return -1;
    if (track.startAt !== null) return this.audibleTime() - track.startAt;
    return track.fallbackAt === null ? -1 : this.now() / 1000 - track.fallbackAt;
  }

  async startTrack(name, track, { volume, loop = false }, generation) {
    try {
      await this.unlock();
      if (generation !== this.generation || track !== this[name + "Track"] || track.stopped) return;
      if (this.canPlay(name)) this.scheduleTrack(name, track, volume, loop);
      else track.fallbackAt = this.now() / 1000;
    } catch (_) {
      if (!track.stopped) track.fallbackAt = this.now() / 1000;
    }
  }

  scheduleTrack(name, track, volume, loop) {
    track.startAt = this.context.currentTime + 0.015;
    track.duration = this.buffers[name].duration;
    track.voice = this.makeVoice(name, track.startAt, volume, { loop });
  }

  stopNotification() {
    if (!this.notificationTrack) return;
    this.notificationTrack.stopped = true;
    this.stopVoice(this.notificationTrack.voice);
    this.notificationTrack = null;
  }

  stopDatamosh() {
    if (!this.datamoshTrack) return;
    this.datamoshTrack.stopped = true;
    for (const voice of this.sources) if (voice.name === "datamosh") this.stopVoice(voice);
    this.datamoshTrack = null;
  }

  pause() {
    if (this.context?.state === "running") void this.context.suspend().catch(() => {});
  }

  resume() {
    if (this.context) void this.context.resume().catch(() => {});
  }

  stopAll() {
    this.generation++; // Invalidate asynchronous unlocks when leaving a page.
    this.stopNotification();
    this.stopDatamosh();
    for (const voice of this.sources) this.stopVoice(voice);
  }
}
