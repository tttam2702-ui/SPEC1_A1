// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted project implementation, revised into named transition and entry helpers.
// The first OK owns one wall-clock deadline; later OKs cannot restart it.
class ChallengeReturn {
  constructor(
    stage,
    {
      getCanvas,
      onBegin,
      duration = 1250,
      random = Math.random,
      now = () => performance.now(),
      setTimer = (fn, ms) => setTimeout(fn, ms),
      clearTimer = (id) => clearTimeout(id),
      navigate = () => location.assign("index.html"),
    } = {},
  ) {
    this.stage = stage;
    this.getCanvas = getCanvas;
    this.onBegin = onBegin;
    this.random = random;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.navigate = navigate;
    this.initializeState(duration);
    this.loadLogo();
  }

  initializeState(duration) {
    this.state = "idle";
    this.timers = [];
    this.raf = null;
    this.duration = duration;
  }

  loadLogo() {
    this.logo = new Image();
    this.logo.src = "assets/ME-MARTT_TITLE.png";
  }

  arm() {
    if (this.state !== "idle") return false;
    this.state = "armed";
    this.delay = 10000 + this.random() * 5000;
    this.deadline = this.now() + this.delay;
    this.stage.dataset.returnState = this.state;
    this.stage.dataset.returnDelayMs = String(Math.round(this.delay));
    this.timers.push(this.setTimer(() => this.begin(), this.delay - this.duration));
    this.timers.push(this.setTimer(() => this.finish(), this.delay));
    return true;
  }

  begin() {
    if (this.state !== "armed") return;
    this.state = "transition";
    this.stage.dataset.returnState = this.state;
    this.stage.classList.add("is-returning");
    if (this.onBegin) this.onBegin();
    this.createShroud();
    this.captureScene();
    this.paint();
  }

  createShroud() {
    this.root = createReturnShroud("challenge-return-shroud");
    this.canvas = createReturnCanvas();
    this.root.append(this.canvas);
    this.stage.append(this.root);
    this.ctx = this.canvas.getContext("2d");
  }

  captureScene() {
    this.snapshot = createReturnCanvas();
    const source = this.getCanvas?.();
    if (source) this.snapshot.getContext("2d").drawImage(source, 0, 0, 960, 540);
  }

  transitionProgress() {
    return Math.max(0, Math.min(1, 1 - (this.deadline - this.now()) / this.duration));
  }

  paint() {
    if (this.state !== "transition") return;
    const ctx = this.ctx;
    const progress = this.transitionProgress();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.snapshot, 0, 0);
    this.drawTears(ctx, progress);
    if (progress > 0.24) this.drawTrails(ctx, progress);
    if (progress > 0.58) this.drawStoreReveal(ctx, progress);
    this.raf = requestAnimationFrame(() => this.paint());
  }

  drawTears(ctx, progress) {
    const tears = 18 + Math.floor(progress * 36);
    for (let i = 0; i < tears; i++) {
      const y = Math.random() * 530;
      const h = 2 + Math.random() * (8 + progress * 60);
      const shift = (Math.random() - 0.5) * (70 + progress * 450);
      ctx.drawImage(this.snapshot, 0, y, 960, Math.min(h, 540 - y), shift, y, 960, h);
    }
  }

  drawTrails(ctx, progress) {
    for (let i = 0; i < 22; i++) this.drawVerticalTrail(ctx, progress);
    this.drawColourBands(ctx);
  }

  drawVerticalTrail(ctx, progress) {
    const x = Math.random() * 940;
    const y = Math.random() * 480;
    const w = 4 + Math.random() * 32;
    ctx.drawImage(this.snapshot, x, y, w, 12, x + Math.random() * 90, y, w, 40 + progress * 450);
  }

  drawColourBands(ctx) {
    ctx.globalAlpha = 0.18;
    ctx.globalCompositeOperation = "screen";
    ["#FF2396", "#087CFF", "#00E000"].forEach((color) => {
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.random() * 800,
        Math.random() * 530,
        160 + Math.random() * 300,
        3 + Math.random() * 24,
      );
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // Hard block cuts replace the final tears with the store colours and logo.
  drawStoreReveal(ctx, progress) {
    const coverage = (progress - 0.58) / 0.42;
    this.drawStoreBlocks(ctx, coverage);
    ctx.save();
    ctx.globalAlpha = Math.min(1, coverage * 1.6);
    this.drawBrand(ctx);
    ctx.restore();
  }

  drawStoreBlocks(ctx, coverage) {
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 30; col++) {
        const noise = Math.sin(col * 71 + row * 129) * 43758.5;
        if (noise - Math.floor(noise) < coverage) {
          ctx.fillStyle = (row + col) % 3 === 0 ? "#FF2396" : "#FFFF00";
          ctx.fillRect(col * 32, row * 30, 32, 30);
        }
      }
    }
  }

  drawBrand(ctx) {
    if (!this.logo.complete || !this.logo.naturalWidth) {
      this.drawFallbackBrand(ctx);
      return;
    }
    const width = 660;
    const height = (width * this.logo.naturalHeight) / this.logo.naturalWidth;
    ctx.drawImage(this.logo, 150, 270 - height / 2, width, height);
  }

  drawFallbackBrand(ctx) {
    ctx.font = "italic 900 120px Impact,Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#087CFF";
    ctx.lineWidth = 20;
    ctx.strokeText("ME-MARRT", 480, 310);
    ctx.fillStyle = "#FF0000";
    ctx.fillText("ME-MARRT", 480, 310);
  }

  finish() {
    if (this.state !== "armed" && this.state !== "transition") return;
    if (this.state === "armed") this.begin();
    this.state = "done";
    this.stage.dataset.returnState = this.state;
    this.stopAnimation();
    this.saveFrame();
    this.navigate();
  }

  saveFrame() {
    try {
      sessionStorage.setItem(
        "me-marrt-glitch-return",
        JSON.stringify({
          at: Date.now(),
          image: this.canvas.toDataURL("image/webp", 0.55),
        }),
      );
    } catch (_) {
      // Navigation still works when browser storage is unavailable.
    }
  }

  stopAnimation() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
  }

  reset() {
    for (const id of this.timers) this.clearTimer(id);
    this.timers = [];
    this.stopAnimation();
    this.root?.remove();
    this.root = null;
    this.raf = null;
    this.state = "idle";
    this.stage.classList.remove("is-returning");
    this.stage.dataset.returnState = "idle";
    delete this.stage.dataset.returnDelayMs;
  }
}

function createReturnShroud(className) {
  const root = document.createElement("div");
  root.className = className;
  root.setAttribute("aria-hidden", "true");
  return root;
}

function createReturnCanvas() {
  const canvas = document.createElement("canvas");
  canvas.className = "challenge-return-canvas";
  canvas.width = 960;
  canvas.height = 540;
  return canvas;
}

function readReturnFrame() {
  try {
    const raw = sessionStorage.getItem("me-marrt-glitch-return");
    sessionStorage.removeItem("me-marrt-glitch-return");
    if (!raw) return null;
    const record = JSON.parse(raw);
    return validReturnFrame(record) ? record : null;
  } catch (_) {
    return null;
  }
}

function validReturnFrame(record) {
  return !(Date.now() - record.at > 15000) && record.image?.startsWith("data:image/");
}

// Carry the last torn frame across navigation until the landing canvas is ready.
class ChallengeReturnEntry {
  constructor(stage, record) {
    this.stage = stage;
    this.root = createReturnShroud("challenge-return-shroud is-entry");
    this.canvas = createReturnCanvas();
    this.root.append(this.canvas);
    this.stage.append(this.root);
    this.ctx = this.canvas.getContext("2d");
    this.image = new Image();
    this.image.src = record.image;
    this.started = performance.now();
    this.revealAt = null;
  }

  start() {
    requestAnimationFrame((now) => this.draw(now));
  }

  draw(now) {
    this.paintFrame();
    if (this.reveal(now)) return;
    requestAnimationFrame((next) => this.draw(next));
  }

  paintFrame() {
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = "#FFFF00";
    this.ctx.fillRect(0, 0, 960, 540);
    if (this.image.complete && this.image.naturalWidth)
      this.ctx.drawImage(this.image, 0, 0, 960, 540);
  }

  sceneReady(now) {
    return this.stage.querySelector("canvas[data-scene-ready='true']") || now - this.started > 2500;
  }

  reveal(now) {
    if (this.revealAt === null && this.sceneReady(now)) this.revealAt = now;
    if (this.revealAt === null) return false;
    const progress = Math.min(1, (now - this.revealAt) / 700);
    this.ctx.globalCompositeOperation = "destination-out";
    this.clearBlocks(progress);
    if (progress !== 1) return false;
    this.root.remove();
    return true;
  }

  clearBlocks(progress) {
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 30; col++) {
        const noise = Math.sin(col * 83 + row * 117) * 43758.5;
        if (noise - Math.floor(noise) < progress) this.ctx.fillRect(col * 32, row * 30, 33, 31);
      }
    }
  }
}

function startChallengeReturnEntry() {
  const stage = document.querySelector("[data-return-entry]");
  if (!stage) return;
  const record = readReturnFrame();
  if (record) new ChallengeReturnEntry(stage, record).start();
}

startChallengeReturnEntry();
