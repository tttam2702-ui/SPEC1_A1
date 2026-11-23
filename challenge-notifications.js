// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted project implementation, revised into named notification and audio-cue helpers.
// Edit this list to change the fictional messages in the artwork.
const CHALLENGE_NOTICES = [
  {
    title: "SELF-IMPROVEMENT UPDATE",
    message: "Your new self is ready. Your old self is still in the cart.",
  },
  {
    title: "IDENTITY NOT FOUND",
    message: "We searched every aisle. Have you tried being someone else?",
  },
  {
    title: "CART CAPACITY EXCEEDED",
    message: "There is no more room for the person you are supposed to become.",
  },
  {
    title: "ANOTHER BETTER YOU",
    message: "A newer version of you has just arrived. This version is already out of date.",
  },
  { title: "UNEXPECTED ITEM", message: "An unpurchased feeling was found in the bagging area." },
  {
    title: "FIX IN PROGRESS",
    message: "Please wait. We are trying to fix something that was never broken.",
  },
  {
    title: "SATISFACTION PENDING",
    message: "Your order was delivered. The feeling you ordered was not included.",
  },
  {
    title: "SPECIAL OFFER",
    message: "Buy one new identity. Receive another expectation absolutely free.",
  },
  {
    title: "COMPARISON LOOP",
    message: "Someone else has a better version. Would you like to keep looking?",
  },
  {
    title: "NOT ENOUGH, AGAIN",
    message: "You have everything you asked for. The list has just become longer.",
  },
  {
    title: "RETURN REQUEST",
    message: "The old you has no receipt. Please keep it somewhere safe.",
  },
  {
    title: "PERFECTION UNAVAILABLE",
    message: "This item is permanently out of stock. More alternatives are on the way.",
  },
  {
    title: "RECOMMENDED FOR YOU",
    message: "Because you bought a better you, you may also like a different you.",
  },
  { title: "STILL PROCESSING", message: "Your cart is full. Why does it still feel empty?" },
  {
    title: "ACCEPTANCE REQUIRED",
    message: "Click OK to accept yourself. Click OK to receive more things to change.",
  },
  {
    title: "ME-MARRT REASSURANCE",
    message: "You do not need to buy your way into being a person.",
  },
];

// Measured attacks in notification_end.wav (5 ms RMS / 1 ms hop).
const CHALLENGE_NOTICE_BEATS = [0.045, 0.456, 0.688, 0.905, 1.11];

const CHALLENGE_NOTICE_ANCHORS = [
  [0.04, 0.06],
  [0.54, 0.13],
  [0.2, 0.57],
  [0.66, 0.59],
  [0.36, 0.32],
  [0.08, 0.37],
  [0.62, 0.03],
  [0.39, 0.68],
  [0.73, 0.34],
  [0.03, 0.7],
];
const CHALLENGE_NOTICE_STACKS = [
  [0.025, 0.025],
  [0.5, 0.055],
  [0.11, 0.49],
  [0.58, 0.43],
  [0.35, 0.25],
];
const CHALLENGE_NOTICE_GAPS = [
  [0.82, 0.06],
  [0.015, 0.34],
  [0.41, 0.78],
  [0.82, 0.72],
  [0.31, 0.015],
  [0.015, 0.78],
  [0.82, 0.4],
  [0.61, 0.78],
  [0.29, 0.75],
  [0.29, 0.36],
  [0.55, 0.015],
];

class ChallengeNotifications {
  constructor(stage, { onAccept, audio = null } = {}) {
    this.stage = stage;
    this.audio = audio;
    this.onAccept = typeof onAccept === "function" ? onAccept : null;
    this.createRoot();
    this.clearCollections();
    this.resetPlayback();
    this.active = false;
    this.exiting = false;
    this.timelineSerial = 0;
    this.instance = ++ChallengeNotifications.instances;
    this.observeStage();
    this.updateCount();
  }

  createRoot() {
    this.root = document.createElement("div");
    this.root.className = "challenge-notifications";
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", "ME-MARRT artwork notifications");
    this.root.hidden = true;
    this.stage.append(this.root);
  }

  observeStage() {
    this.resizeObserver = new ResizeObserver(() => this.layoutAll());
    this.resizeObserver.observe(this.stage);
  }

  clearCollections() {
    this.windows = [];
    this.echoes = [];
    this.pending = [];
    this.serial = 0;
    this.accepted = 0;
  }

  resetPlayback() {
    this.time = 0;
    this.focusedRecord = null;
    this.nextPulse = 0.4;
    this.responseUntil = 0;
    this.track = null;
    this.beats = [];
    this.cueIndex = 0;
    this.focusOnNextBeat = false;
  }

  start() {
    this.reset();
    this.active = true;
    this.root.hidden = false;
    this.restartTimeline(false);
  }

  tick(dt) {
    if (!this.active) return;
    this.time += Math.max(0, Math.min(dt, 0.1));
    this.updateDismissals();
    this.updateEchoes();
    if (this.time >= this.responseUntil) this.root.classList.remove("is-responding");
    if (this.exiting) {
      this.updateCount();
      return;
    }
    this.readAudioCues();
    this.pulseWindows();
    this.updateCount();
  }

  updateDismissals() {
    for (const record of [...this.windows]) {
      if (record.dismissAt !== null && record.dismissAt <= this.time) this.removeWindow(record);
      if (record.pulseUntil <= this.time) record.element.classList.remove("is-glitching");
    }
  }

  updateEchoes() {
    for (const echo of [...this.echoes]) {
      if (echo.until > this.time) continue;
      echo.element.remove();
      this.echoes = this.echoes.filter((item) => item !== echo);
    }
  }

  // Audio time, rather than animation time, keeps each burst on its recorded attack.
  readAudioCues() {
    const elapsed = this.track?.elapsed();
    if (!Number.isFinite(elapsed) || elapsed < 0) return;
    while (this.cueIndex < this.beats.length && elapsed >= this.beats[this.cueIndex]) {
      this.fireBeat(this.cueIndex++);
    }
  }

  pulseWindows() {
    if (this.time < this.nextPulse || !this.windows.length) return;
    this.nextPulse = this.time + 0.2 + Math.random() * 0.25;
    const candidates = this.windows.filter((record) => this.canPulse(record));
    const amount = Math.min(3, candidates.length);
    for (let i = 0; i < amount; i++) {
      const record = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
      record.pulseUntil = this.time + 0.14;
      record.element.classList.add("is-glitching");
    }
  }

  canPulse(record) {
    return record.dismissAt === null && record !== this.focusedRecord;
  }

  reset() {
    this.active = false;
    this.exiting = false;
    this.root.hidden = true;
    this.root.className = "challenge-notifications";
    this.root.replaceChildren();
    this.clearCollections();
    this.resetPlayback();
    this.updateCount();
  }

  restartTimeline(isReplay) {
    this.pending = [];
    const fallback = this.fallbackTrack();
    this.track = this.readAudioTrack(fallback);
    this.beats = this.validBeats(this.track.beats);
    this.cueIndex = 0;
    this.waveSize = isReplay ? 3 + (this.accepted % 2) : 3;
    this.focusOnNextBeat = isReplay;
    this.cueLog = [];
    this.stage.dataset.notificationCues = "[]";
  }

  fallbackTrack() {
    const serial = ++this.timelineSerial;
    const started = performance.now();
    return {
      id: "visual-" + serial,
      beats: CHALLENGE_NOTICE_BEATS,
      elapsed: () => (performance.now() - started) / 1000,
    };
  }

  readAudioTrack(fallback) {
    try {
      const track = this.audio?.playNotification();
      return track && typeof track.elapsed === "function" ? track : fallback;
    } catch (_) {
      return fallback;
    }
  }

  validBeats(values) {
    const beats = Array.isArray(values) ? values : CHALLENGE_NOTICE_BEATS;
    const filtered = beats.filter((beat) => Number.isFinite(beat) && beat >= 0);
    return filtered.length ? filtered.slice().sort((a, b) => a - b) : [...CHALLENGE_NOTICE_BEATS];
  }

  fireBeat(index) {
    this.logCue(index);
    const stackCount = index < 3 ? this.waveSize : Math.max(1, this.waveSize - 1);
    this.createStackWave(index, stackCount);
    const singles = index === 0 ? 0 : index < 3 ? 1 : 2;
    for (let slot = 0; slot < singles; slot++) this.createWindow({ scattered: true });
    this.focusOnNextBeat = false;
  }

  logCue(index) {
    this.cueLog.push({ beat: this.beats[index], at: Number(this.track.elapsed().toFixed(3)) });
    this.stage.dataset.notificationCues = JSON.stringify(this.cueLog);
  }

  createStackWave(index, count) {
    for (let slot = 0; slot < count; slot++) {
      this.createWindow({
        arrival: true,
        wave: index % 5,
        slot,
        focus: this.focusOnNextBeat && slot === count - 1,
      });
    }
  }

  setExiting() {
    this.exiting = true;
    this.pending = [];
    this.track = null;
    this.beats = [];
    this.root.classList.add("is-exiting");
    for (const record of this.windows) record.button.disabled = true;
    this.updateCount();
  }

  createWindow(options = {}) {
    if (!this.active || this.exiting) return;
    this.retireOverflow();
    const settings = this.windowOptions(options);
    const serial = ++this.serial;
    const content = CHALLENGE_NOTICES[(serial - 1) % CHALLENGE_NOTICES.length];
    const nodes = this.buildWindow(content, serial, settings.scattered);
    const record = this.makeWindowRecord(nodes, content, serial, settings);
    this.attachWindow(record, settings.scattered);
    this.bindWindow(record);
    this.finishWindow(record, settings);
    this.updateCount();
  }

  windowOptions({ focus = false, wave = 0, slot = 0, arrival = false, scattered = false }) {
    return { focus, wave, slot, arrival, scattered };
  }

  // Keep the focused OK reachable while retiring older windows at the DOM limit.
  retireOverflow() {
    while (this.windows.length >= 20) {
      const retire =
        this.windows.find((record) => this.canPulse(record)) ||
        this.windows.find((record) => record !== this.focusedRecord) ||
        this.windows[0];
      this.removeWindow(retire);
    }
  }

  buildWindow(content, serial, scattered) {
    const headingId = "me-notice-" + this.instance + "-" + serial;
    const element = this.buildWindowShell(serial, headingId, scattered);
    const bar = this.buildTitle(content.title, headingId);
    const body = this.buildBody(content.message);
    const { footer, button } = this.buildFooter(content.title);
    element.append(bar, body, footer);
    return { element, button };
  }

  buildWindowShell(serial, headingId, scattered) {
    const element = document.createElement("section");
    element.className = scattered ? "me-notice is-scattered" : "me-notice";
    element.setAttribute("role", "group");
    element.setAttribute("aria-labelledby", headingId);
    element.dataset.serial = String(serial);
    element.dataset.placement = scattered ? "scattered" : "stacked";
    return element;
  }

  element(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  buildTitle(title, headingId) {
    const bar = this.element("div", "me-notice-bar");
    const mark = this.element("span", "me-notice-app", "M");
    mark.setAttribute("aria-hidden", "true");
    const heading = this.element("h2", "", title);
    heading.id = headingId;
    bar.append(mark, heading);
    return bar;
  }

  buildBody(messageText) {
    const body = this.element("div", "me-notice-body");
    const warning = this.element("span", "me-notice-warning", "!");
    warning.setAttribute("aria-hidden", "true");
    const message = this.element("p", "", messageText);
    body.append(warning, message);
    return body;
  }

  buildFooter(title) {
    const footer = this.element("div", "me-notice-footer");
    const button = this.element("button", "", "OK");
    button.type = "button";
    button.setAttribute("aria-label", "OK — " + title);
    footer.append(button);
    return { footer, button };
  }

  windowAnchor(serial, settings) {
    return settings.arrival
      ? CHALLENGE_NOTICE_STACKS[settings.wave]
      : CHALLENGE_NOTICE_ANCHORS[(serial - 1) % CHALLENGE_NOTICE_ANCHORS.length];
  }

  makeWindowRecord(nodes, content, serial, settings) {
    const anchor = this.windowAnchor(serial, settings);
    const x = anchor[0] + this.windowOffset(0.022, settings);
    const y = anchor[1] + this.windowOffset(0.039, settings);
    return { ...nodes, serial, ...content, x, y, dismissAt: null, pulseUntil: 0 };
  }

  windowOffset(step, settings) {
    return settings.arrival ? settings.slot * step : (Math.random() - 0.5) * 0.08;
  }

  attachWindow(record, scattered) {
    record.element.style.zIndex = "1";
    this.root.append(record.element);
    if (scattered) Object.assign(record, this.scatterPosition(record.element));
    this.windows.push(record);
    this.layout(record);
  }

  bindWindow(record) {
    record.button.addEventListener("click", () => this.accept(record));
    record.button.addEventListener("focus", () => this.protectFocus(record));
    record.button.addEventListener("blur", () => this.releaseFocus(record));
  }

  finishWindow(record, settings) {
    if (settings.arrival && settings.slot === 0) this.createEcho(record);
    if (settings.focus) {
      this.protectFocus(record);
      record.button.focus({ preventScroll: true });
    }
  }

  releaseFocus(record) {
    if (this.focusedRecord === record) this.focusedRecord = null;
    if (record.dismissAt === null) record.element.style.zIndex = "1";
  }

  scatterPosition(element) {
    const size = this.windowSize(element);
    let best = null;
    for (const [gx, gy] of CHALLENGE_NOTICE_GAPS) {
      const candidate = this.scatterCandidate(gx, gy, size);
      candidate.score = this.scatterScore(candidate, size);
      if (!best || candidate.score < best.score) best = candidate;
    }
    return { x: best.x, y: best.y };
  }

  windowSize(element) {
    const width = Math.max(1, this.stage.clientWidth);
    const height = Math.max(1, this.stage.clientHeight);
    return { width, height, w: element.offsetWidth / width, h: element.offsetHeight / height };
  }

  scatterCandidate(gx, gy, { width, height, w, h }) {
    const x = Math.max(0, Math.min(1 - w - 6 / width, gx + (Math.random() - 0.5) * 0.035));
    const y = Math.max(0, Math.min(1 - h - 6 / height, gy + (Math.random() - 0.5) * 0.035));
    return { x, y };
  }

  scatterScore(candidate, size) {
    let score = Math.random() * 0.04;
    for (const record of this.windows) {
      const weight = record.element.dataset.placement === "scattered" ? 3 : 1;
      score +=
        (this.windowOverlap(candidate, size, record) / Math.max(0.001, size.w * size.h)) * weight;
    }
    return score;
  }

  windowOverlap({ x, y }, { width, height, w, h }, record) {
    const rw = record.element.offsetWidth / width;
    const rh = record.element.offsetHeight / height;
    const overlapX = Math.max(0, Math.min(x + w, record.x + rw) - Math.max(x, record.x));
    const overlapY = Math.max(0, Math.min(y + h, record.y + rh) - Math.max(y, record.y));
    return overlapX * overlapY;
  }

  canAccept(record) {
    return (
      this.active && !this.exiting && record.dismissAt === null && this.windows.includes(record)
    );
  }

  accept(record) {
    if (!this.canAccept(record)) return;
    const packet = this.windowPacket(record);
    this.markDismissed(record);
    this.accepted++;
    this.root.classList.add("is-responding");
    this.responseUntil = this.time + 0.3;
    this.updateCount();
    if (this.onAccept) this.onAccept(packet);
    this.createEcho(record);
    this.playAcceptSound();
    this.restartTimeline(true);
    this.updateCount();
  }

  windowPacket(record) {
    const bounds = record.element.getBoundingClientRect();
    const stageBounds = this.stage.getBoundingClientRect();
    const unit = (value) => Math.max(0, Math.min(1, value));
    return {
      title: record.title,
      message: record.message,
      serial: record.serial,
      x: unit((bounds.left - stageBounds.left) / Math.max(1, stageBounds.width)),
      y: unit((bounds.top - stageBounds.top) / Math.max(1, stageBounds.height)),
      width: unit(bounds.width / Math.max(1, stageBounds.width)),
      height: unit(bounds.height / Math.max(1, stageBounds.height)),
    };
  }

  markDismissed(record) {
    record.dismissAt = this.time + 0.27;
    record.button.disabled = true;
    record.element.classList.add("is-dismissed");
    record.element.setAttribute("aria-hidden", "true");
  }

  playAcceptSound() {
    try {
      this.audio?.playOK();
    } catch (_) {
      // The visual acknowledgement still works when sound is unavailable.
    }
  }

  removeWindow(record) {
    record.element.remove();
    this.windows = this.windows.filter((window) => window !== record);
    if (this.focusedRecord === record) this.focusedRecord = null;
  }

  protectFocus(record) {
    if (record.dismissAt !== null) return;
    for (const window of this.windows) window.element.style.zIndex = "1";
    record.element.style.zIndex = "5";
    this.focusedRecord = record;
  }

  createEcho(record) {
    while (this.echoes.length >= 4) this.echoes.shift().element.remove();
    const element = this.buildEcho(record);
    this.root.prepend(element);
    const echo = this.makeEchoRecord(element, record);
    this.echoes.push(echo);
    this.layout(echo);
  }

  buildEcho(record) {
    const element = this.element("div", "me-notice-echo");
    element.setAttribute("aria-hidden", "true");
    element.inert = true;
    const bar = this.element("div", "me-notice-echo-bar", record.title);
    const body = this.element("div", "me-notice-echo-body", record.message);
    const ok = this.element("span", "me-notice-echo-ok", "OK");
    element.append(bar, body, ok);
    return element;
  }

  makeEchoRecord(element, record) {
    return { element, x: record.x + 0.013, y: record.y + 0.024, until: this.time + 4 };
  }

  layout(record) {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;
    record.element.style.left =
      this.clampedPosition(record.x, width, record.element.offsetWidth) + "px";
    record.element.style.top =
      this.clampedPosition(record.y, height, record.element.offsetHeight) + "px";
  }

  clampedPosition(position, extent, itemExtent) {
    return Math.min(Math.max(4, position * extent), Math.max(4, extent - itemExtent - 6));
  }

  layoutAll() {
    for (const record of [...this.windows, ...this.echoes]) this.layout(record);
  }

  getCount() {
    return this.windows.filter((record) => record.dismissAt === null).length;
  }

  updateCount() {
    this.stage.dataset.notifications = String(this.getCount());
    this.stage.dataset.noticeAcknowledgements = String(this.accepted);
    this.stage.dataset.notificationDom = String(this.windows.length + this.echoes.length);
    this.stage.dataset.notificationExiting = String(this.exiting);
  }
}

ChallengeNotifications.instances = 0;
