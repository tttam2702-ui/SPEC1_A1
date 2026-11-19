// Edit this list to change the fictional messages in the artwork.
const CHALLENGE_NOTICES = [
  { title: "SELF-IMPROVEMENT UPDATE", message: "Your new self is ready. Your old self is still in the cart." },
  { title: "IDENTITY NOT FOUND", message: "We searched every aisle. Have you tried being someone else?" },
  { title: "CART CAPACITY EXCEEDED", message: "There is no more room for the person you are supposed to become." },
  { title: "ANOTHER BETTER YOU", message: "A newer version of you has just arrived. This version is already out of date." },
  { title: "UNEXPECTED ITEM", message: "An unpurchased feeling was found in the bagging area." },
  { title: "FIX IN PROGRESS", message: "Please wait. We are trying to fix something that was never broken." },
  { title: "SATISFACTION PENDING", message: "Your order was delivered. The feeling you ordered was not included." },
  { title: "SPECIAL OFFER", message: "Buy one new identity. Receive another expectation absolutely free." },
  { title: "COMPARISON LOOP", message: "Someone else has a better version. Would you like to keep looking?" },
  { title: "NOT ENOUGH, AGAIN", message: "You have everything you asked for. The list has just become longer." },
  { title: "RETURN REQUEST", message: "The old you has no receipt. Please keep it somewhere safe." },
  { title: "PERFECTION UNAVAILABLE", message: "This item is permanently out of stock. More alternatives are on the way." },
  { title: "RECOMMENDED FOR YOU", message: "Because you bought a better you, you may also like a different you." },
  { title: "STILL PROCESSING", message: "Your cart is full. Why does it still feel empty?" },
  { title: "ACCEPTANCE REQUIRED", message: "Click OK to accept yourself. Click OK to receive more things to change." },
  { title: "ME-MARRT REASSURANCE", message: "You do not need to buy your way into being a person." }
];

// Measured attacks in notification_end.wav (5 ms RMS / 1 ms hop).
const CHALLENGE_NOTICE_BEATS = [0.045, 0.456, 0.688, 0.905, 1.110];

class ChallengeNotifications {
  constructor(stage, { onAccept, audio = null } = {}) {
    this.stage = stage;
    this.audio = audio;
    this.onAccept = typeof onAccept === "function" ? onAccept : null;
    this.root = document.createElement("div");
    this.root.className = "challenge-notifications";
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", "ME-MARRT artwork notifications");
    this.root.hidden = true;
    stage.append(this.root);
    this.windows = [];
    this.echoes = [];
    this.pending = [];
    this.serial = 0;
    this.accepted = 0;
    this.time = 0;
    this.active = false;
    this.exiting = false;
    this.focusedRecord = null;
    this.nextPulse = 0.4;
    this.track = null;
    this.cueIndex = 0;
    this.beats = [];
    this.timelineSerial = 0;
    this.instance = ++ChallengeNotifications.instances;
    this.resizeObserver = new ResizeObserver(() => this.layoutAll());
    this.resizeObserver.observe(stage);
    this.updateCount();
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
    for (const record of [...this.windows]) {
      if (record.dismissAt !== null && record.dismissAt <= this.time) this.removeWindow(record);
      if (record.pulseUntil <= this.time) record.element.classList.remove("is-glitching");
    }
    for (const echo of [...this.echoes]) {
      if (echo.until <= this.time) {
        echo.element.remove(); this.echoes = this.echoes.filter(item => item !== echo);
      }
    }
    if (this.time >= this.responseUntil) this.root.classList.remove("is-responding");
    if (this.exiting) { this.updateCount(); return; }
    // Read the actual audio clock; a decoder still loading reports -1.
    const elapsed = this.track?.elapsed();
    if (Number.isFinite(elapsed) && elapsed >= 0) {
      while (this.cueIndex < this.beats.length && elapsed >= this.beats[this.cueIndex]) {
        this.fireBeat(this.cueIndex++);
      }
    }
    if (this.time >= this.nextPulse && this.windows.length) {
      this.nextPulse = this.time + 0.2 + Math.random() * 0.25;
      const candidates = this.windows.filter(record => record.dismissAt === null && record !== this.focusedRecord);
      const amount = Math.min(3, candidates.length);
      for (let i = 0; i < amount; i++) {
        const record = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
        record.pulseUntil = this.time + 0.14;
        record.element.classList.add("is-glitching");
      }
    }
    this.updateCount();
  }

  reset() {
    this.active = false;
    this.exiting = false;
    this.root.hidden = true;
    this.root.className = "challenge-notifications";
    this.root.replaceChildren();
    this.windows = [];
    this.echoes = [];
    this.pending = [];
    this.serial = 0;
    this.accepted = 0;
    this.time = 0;
    this.focusedRecord = null;
    this.nextPulse = 0.4;
    this.responseUntil = 0;
    this.track = null;
    this.beats = [];
    this.cueIndex = 0;
    this.focusOnNextBeat = false;
    this.updateCount();
  }

  restartTimeline(isReplay) {
    this.pending = []; // Discard every unplayed wave from the preceding sound.
    const serial = ++this.timelineSerial;
    const started = performance.now();
    const fallback = {
      id: `visual-${serial}`, beats: CHALLENGE_NOTICE_BEATS,
      elapsed: () => (performance.now() - started) / 1000
    };
    let track;
    try { track = this.audio?.playNotification(); } catch (_) { /* Keep the same visual rhythm without audio. */ }
    this.track = track && typeof track.elapsed === "function" ? track : fallback;
    const beats = Array.isArray(this.track.beats) ? this.track.beats : CHALLENGE_NOTICE_BEATS;
    this.beats = beats.filter(beat => Number.isFinite(beat) && beat >= 0).slice().sort((a, b) => a - b);
    if (!this.beats.length) this.beats = [...CHALLENGE_NOTICE_BEATS];
    this.cueIndex = 0;
    this.waveSize = isReplay ? 3 + this.accepted % 2 : 3;
    this.focusOnNextBeat = isReplay;
    this.cueLog = [];
    this.stage.dataset.notificationCues = "[]";
  }

  fireBeat(index) {
    this.cueLog.push({beat:this.beats[index],at:Number(this.track.elapsed().toFixed(3))});
    this.stage.dataset.notificationCues = JSON.stringify(this.cueLog);
    // Begin as a stack, then let individual errors escape into the outer gaps.
    const stackCount = index < 3 ? this.waveSize : Math.max(1, this.waveSize-1);
    for (let slot = 0; slot < stackCount; slot++) {
      this.createWindow({ arrival: true, wave: index % 5, slot,
        focus: this.focusOnNextBeat && slot === stackCount - 1 });
    }
    const singles = index === 0 ? 0 : index < 3 ? 1 : 2;
    for (let slot = 0; slot < singles; slot++) this.createWindow({ scattered:true });
    this.focusOnNextBeat = false;
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

  createWindow({ focus = false, wave = 0, slot = 0, arrival = false, scattered = false } = {}) {
    if (!this.active || this.exiting) return;
    // Twenty live/dismissing windows plus four inert echoes bound the DOM.
    while (this.windows.length >= 20) {
      const retire = this.windows.find(record => record.dismissAt === null && record !== this.focusedRecord)
        || this.windows.find(record => record !== this.focusedRecord) || this.windows[0];
      this.removeWindow(retire);
    }
    const serial = ++this.serial;
    const content = CHALLENGE_NOTICES[(serial - 1) % CHALLENGE_NOTICES.length];
    const headingId = `me-notice-${this.instance}-${serial}`;
    const element = document.createElement("section");
    element.className = scattered ? "me-notice is-scattered" : "me-notice";
    element.setAttribute("role", "group");
    element.setAttribute("aria-labelledby", headingId);
    element.dataset.serial = String(serial);
    element.dataset.placement = scattered ? "scattered" : "stacked";

    const bar = document.createElement("div");
    bar.className = "me-notice-bar";
    const mark = document.createElement("span");
    mark.className = "me-notice-app";
    mark.textContent = "M";
    mark.setAttribute("aria-hidden", "true");
    const heading = document.createElement("h2");
    heading.id = headingId;
    heading.textContent = content.title;
    bar.append(mark, heading);

    const body = document.createElement("div");
    body.className = "me-notice-body";
    const warning = document.createElement("span");
    warning.className = "me-notice-warning";
    warning.textContent = "!";
    warning.setAttribute("aria-hidden", "true");
    const message = document.createElement("p");
    message.textContent = content.message;
    body.append(warning, message);

    const footer = document.createElement("div");
    footer.className = "me-notice-footer";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "OK";
    button.setAttribute("aria-label", `OK — ${content.title}`);
    footer.append(button);
    element.append(bar, body, footer);

    const anchors = [[0.04,0.06],[0.54,0.13],[0.2,0.57],[0.66,0.59],[0.36,0.32],
      [0.08,0.37],[0.62,0.03],[0.39,0.68],[0.73,0.34],[0.03,0.7]];
    const stacks = [[0.025,0.025],[0.50,0.055],[0.11,0.49],[0.58,0.43],[0.35,0.25]];
    const anchor = arrival ? stacks[wave] : anchors[(serial - 1) % anchors.length];
    const record = { element, button, serial, ...content,
      x: anchor[0] + (arrival ? slot * 0.022 : (Math.random() - 0.5) * 0.08),
      y: anchor[1] + (arrival ? slot * 0.039 : (Math.random() - 0.5) * 0.08),
      dismissAt: null, pulseUntil: 0 };
    element.style.zIndex = "1";
    this.root.append(element);
    if (scattered) Object.assign(record, this.scatterPosition(element));
    this.windows.push(record);
    this.layout(record);
    button.addEventListener("click", () => this.accept(record));
    button.addEventListener("focus", () => this.protectFocus(record));
    button.addEventListener("blur", () => {
      if (this.focusedRecord === record) this.focusedRecord = null;
      if (record.dismissAt === null) record.element.style.zIndex = "1";
    });
    if (arrival && slot === 0) this.createEcho(record);
    if (focus) { this.protectFocus(record); button.focus({ preventScroll: true }); }
    this.updateCount();
  }

  scatterPosition(element) {
    const width = Math.max(1,this.stage.clientWidth), height = Math.max(1,this.stage.clientHeight);
    const w = element.offsetWidth/width, h = element.offsetHeight/height;
    const gaps = [[.82,.06],[.015,.34],[.41,.78],[.82,.72],[.31,.015],
      [.015,.78],[.82,.4],[.61,.78],[.29,.75],[.29,.36],[.55,.015]];
    let best = null;
    for (const [gx,gy] of gaps) {
      const x = Math.max(0,Math.min(1-w-6/width,gx+(Math.random()-.5)*.035));
      const y = Math.max(0,Math.min(1-h-6/height,gy+(Math.random()-.5)*.035));
      let score = Math.random()*.04;
      for (const record of this.windows) {
        const rw=record.element.offsetWidth/width, rh=record.element.offsetHeight/height;
        const overlap=Math.max(0,Math.min(x+w,record.x+rw)-Math.max(x,record.x))
          *Math.max(0,Math.min(y+h,record.y+rh)-Math.max(y,record.y));
        score += overlap/Math.max(.001,w*h)*(record.element.dataset.placement === "scattered" ? 3 : 1);
      }
      if (!best || score < best.score) best = {x,y,score};
    }
    return {x:best.x,y:best.y};
  }

  accept(record) {
    if (!this.active || this.exiting || record.dismissAt !== null || !this.windows.includes(record)) return;
    const bounds = record.element.getBoundingClientRect();
    const stageBounds = this.stage.getBoundingClientRect();
    const unit = value => Math.max(0, Math.min(1, value));
    const packet = {
      title: record.title, message: record.message, serial: record.serial,
      x: unit((bounds.left - stageBounds.left) / Math.max(1, stageBounds.width)),
      y: unit((bounds.top - stageBounds.top) / Math.max(1, stageBounds.height)),
      width: unit(bounds.width / Math.max(1, stageBounds.width)),
      height: unit(bounds.height / Math.max(1, stageBounds.height))
    };
    record.dismissAt = this.time + 0.27;
    record.button.disabled = true;
    record.element.classList.add("is-dismissed");
    record.element.setAttribute("aria-hidden", "true");
    this.accepted++;
    this.root.classList.add("is-responding");
    this.responseUntil = this.time + 0.3;
    this.updateCount();
    // The owner starts its fixed return timer on this first synchronous callback.
    if (this.onAccept) this.onAccept(packet);
    this.createEcho(record);
    try { this.audio?.playOK(); } catch (_) { /* The visual response remains available. */ }
    this.restartTimeline(true);
    this.updateCount();
  }

  removeWindow(record) {
    record.element.remove();
    this.windows = this.windows.filter(window => window !== record);
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
    const element = document.createElement("div");
    element.className = "me-notice-echo";
    element.setAttribute("aria-hidden", "true"); element.inert = true;
    const bar = document.createElement("div"); bar.className = "me-notice-echo-bar";
    bar.textContent = record.title;
    const body = document.createElement("div"); body.className = "me-notice-echo-body";
    body.textContent = record.message;
    const ok = document.createElement("span"); ok.className = "me-notice-echo-ok"; ok.textContent = "OK";
    element.append(bar, body, ok); this.root.prepend(element);
    const echo = { element, x: record.x + 0.013, y: record.y + 0.024, until: this.time + 4 };
    this.echoes.push(echo); this.layout(echo);
  }

  layout(record) {
    const width = this.stage.clientWidth, height = this.stage.clientHeight;
    record.element.style.left = `${Math.min(Math.max(4, record.x * width), Math.max(4, width - record.element.offsetWidth - 6))}px`;
    record.element.style.top = `${Math.min(Math.max(4, record.y * height), Math.max(4, height - record.element.offsetHeight - 6))}px`;
  }

  layoutAll() { for (const record of [...this.windows, ...this.echoes]) this.layout(record); }

  getCount() { return this.windows.filter(record => record.dismissAt === null).length; }

  updateCount() {
    this.stage.dataset.notifications = String(this.getCount());
    this.stage.dataset.noticeAcknowledgements = String(this.accepted);
    this.stage.dataset.notificationDom = String(this.windows.length + this.echoes.length);
    this.stage.dataset.notificationExiting = String(this.exiting);
  }
}

ChallengeNotifications.instances = 0;
