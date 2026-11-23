// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted project implementation, revised into named scene, input and vector helpers.
// p5 paints the artwork; native buttons provide pointer and keyboard interaction.
const CHALLENGE_CANVAS_LABELS = {
  collect: "A shopping cart with falling, collectable objects",
  melting: "Click different areas to glitch the picture and make its pixels melt downward",
  notifications: "A continuously melting collage of the cart, objects and error-window fragments",
};
const CHALLENGE_BACKGROUND_STOPS = [
  [0, "#FF2396"],
  [0.1, "#FF8423"],
  [0.24, "#FFFF00"],
  [0.79, "#FFFF00"],
  [0.91, "#FF8423"],
  [1, "#FF2396"],
];
const CHALLENGE_BASKET_POINTS = [
  [425, 140],
  [890, 140],
  [990, 807],
  [365, 807],
];
const CHALLENGE_ICON_METHODS = {
  clothes: "drawClothes",
  book: "drawBook",
  journal: "drawBook",
  skincare: "drawSkincare",
  shoe: "drawShoe",
  bottle: "drawBottle",
  headphones: "drawHeadphones",
  plant: "drawPlant",
};
const CHALLENGE_VECTOR_POINTS = {
  // Static path coordinates keep each vector's drawing order easy to read.
  clothesHem: [
    [84, 200],
    [172, 200],
  ],
  bookSpine: [
    [69, 40],
    [69, 194],
  ],
  bookPages: [
    [80, 201],
    [202, 201],
    [202, 209],
    [84, 209],
  ],
  bookUnderline: [
    [93, 153],
    [156, 153],
  ],
  skincareSpark: [
    [103, 42],
    [103, 27],
    [120, 34],
  ],
  skincareRay: [
    [158, 47],
    [169, 32],
  ],
  shoeLaces: [
    [111, 137],
    [95, 152],
    [126, 144],
    [114, 160],
    [143, 152],
  ],
  shoeToe: [
    [152, 171],
    [184, 168],
    [196, 176],
  ],
  headphoneNote: [
    [113, 142],
    [113, 182],
    [140, 172],
    [140, 132],
  ],
  plantStem: [
    [128, 169],
    [128, 54],
  ],
  plantLeaves: [
    [87, 82, -0.7],
    [162, 60, 0.7],
    [91, 128, -0.7],
    [164, 112, 0.7],
  ],

  clothes: [
    [89, 47],
    [106, 61],
    [150, 61],
    [167, 47],
    [222, 82],
    [199, 126],
    [177, 114],
    [181, 214],
    [75, 214],
    [79, 114],
    [57, 126],
    [34, 82],
  ],
  bookBack: [
    [57, 40],
    [182, 40],
    [211, 63],
    [211, 218],
    [78, 218],
    [48, 194],
  ],
  bookCover: [
    [48, 40],
    [180, 40],
    [180, 194],
    [48, 194],
  ],
  shoe: [
    [30, 167],
    [47, 104],
    [88, 96],
    [123, 132],
    [165, 145],
    [213, 155],
    [228, 187],
    [225, 207],
    [28, 207],
    [23, 186],
  ],
  shoeSole: [
    [26, 185],
    [226, 185],
    [225, 207],
    [28, 207],
  ],
  shoeHeel: [
    [52, 110],
    [78, 109],
    [94, 131],
    [48, 145],
  ],
  plantPot: [
    [74, 163],
    [182, 163],
    [167, 223],
    [89, 223],
  ],
};

class ChallengeScene {
  constructor() {
    this.initializeSceneData();
    this.findElements();
    this.initializeRuntime();
    this.initializeAudio();
    this.initializeFlow();
    this.showOfferContext();
    this.bindEvents();
  }

  initializeSceneData() {
    this.W = CHALLENGE_WIDTH;
    this.H = CHALLENGE_HEIGHT;
    this.round = new ChallengeRound();
    this.buttons = new Map();
    this.icons = new Map();
    this.cartBox = { width: (1364 / 1080) * 1120, height: 1120, y: -40 };
    this.cartBox.x = (this.W - this.cartBox.width) / 2;
    this.vectors = new ChallengeVectors();
  }

  findElements() {
    this.stage = document.getElementById("challenge-stage");
    this.targets = document.getElementById("challenge-targets");
    this.intro = document.getElementById("challenge-intro");
    this.start = document.getElementById("challenge-start");
    this.pause = document.getElementById("challenge-pause");
    this.restart = document.getElementById("challenge-restart");
    this.counter = document.getElementById("challenge-count");
    this.timer = document.getElementById("challenge-time");
    this.mode = document.getElementById("challenge-mode");
    this.melt = document.getElementById("challenge-melt");
  }

  initializeRuntime() {
    this.ready = false;
    this.lastHud = "";
    this.aboutPaused = false;
    this.ending = null;
    this.soundCounts = { item: 0, notification: 0, ok: 0 };
  }

  initializeAudio() {
    this.sound = new ChallengeAudio({
      onState: (state) => {
        this.stage.dataset.audioState = state;
      },
      onPlay: (name) => this.recordSound(name),
    });
  }

  recordSound(name) {
    this.soundCounts[name] = (this.soundCounts[name] || 0) + 1;
    const key = "audio" + name[0].toUpperCase() + name.slice(1);
    this.stage.dataset[key] = String(this.soundCounts[name]);
  }

  initializeFlow() {
    this.notices = new ChallengeNotifications(this.stage, {
      audio: this.sound,
      onAccept: (packet) => this.acceptNotice(packet),
    });
    this.returnTransition = new ChallengeReturn(this.stage, {
      duration: 1900,
      getCanvas: () => this.canvas,
      onBegin: () => this.beginReturn(),
    });
  }

  acceptNotice(packet) {
    this.ending?.meltNotification(packet);
    this.returnTransition.arm();
  }

  beginReturn() {
    if (document.body.classList.contains("about-open"))
      document.querySelector(".about-close")?.click();
    this.notices.setExiting?.();
    this.sound.stopAll();
    this.sound.playTransition();
    this.meltVisibleNotices();
    this.ending.draw(drawingContext, 0);
    this.round.paused = true;
    this.setStatus("Returning to ME-MARRT.");
  }

  meltVisibleNotices() {
    const stageRect = this.stage.getBoundingClientRect();
    for (const record of this.notices.windows.slice(-14)) this.meltNoticeRecord(record, stageRect);
  }

  meltNoticeRecord(record, stageRect) {
    const bounds = record.element.getBoundingClientRect();
    this.ending.meltNotification({
      title: record.title,
      message: record.message,
      x: (bounds.left - stageRect.left) / stageRect.width,
      y: (bounds.top - stageRect.top) / stageRect.height,
      width: bounds.width / stageRect.width,
      height: bounds.height / stageRect.height,
    });
  }

  showOfferContext() {
    const offer = new URLSearchParams(location.search).get("label");
    if (!offer) return;
    const context = document.getElementById("challenge-offer");
    context.textContent = "TODAY'S OFFER: " + offer.slice(0, 160);
    context.hidden = false;
  }

  bindEvents() {
    window.setup = () => this.setup();
    window.draw = () => this.draw();
    addEventListener("resize", () => this.positionIntro());
    addEventListener("scroll", () => this.positionIntro(), { passive: true });
    this.intro.addEventListener("cancel", (event) => event.preventDefault());
    this.bindControls();
    document.addEventListener("site:aboutchange", (event) => this.aboutChanged(event));
    addEventListener("pagehide", () => this.sound.stopAll());
    this.bindMelting();
  }

  bindControls() {
    this.start.addEventListener("click", () => this.startRound());
    this.pause.addEventListener("click", () => this.togglePause());
    this.restart.addEventListener("click", () => this.restartRound());
  }

  bindMelting() {
    this.melt.addEventListener("pointerdown", (event) => this.meltPointer(event));
    this.melt.addEventListener("click", (event) => {
      if (event.detail === 0) this.damage(Math.random() * this.W, Math.random() * this.H);
    });
  }

  surface() {
    const result = document.createElement("canvas");
    result.width = this.W;
    result.height = this.H;
    return result;
  }

  setup() {
    this.prepareCanvas();
    this.scene = this.surface();
    this.sceneContext = this.scene.getContext("2d");
    this.background = this.surface();
    this.paintBackground();
    this.showIntro();
    this.loadCart();
    this.syncHud();
  }

  prepareCanvas() {
    pixelDensity(1);
    const renderer = createCanvas(this.W, this.H);
    renderer.parent(this.stage);
    this.canvas = renderer.elt;
    this.setCanvasLabel("collect");
    frameRate(60);
  }

  paintBackground() {
    const ctx = this.background.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, this.H);
    CHALLENGE_BACKGROUND_STOPS.forEach(([position, color]) =>
      gradient.addColorStop(position, color),
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.W, this.H);
  }

  showIntro() {
    this.intro.showModal();
    this.positionIntro();
    document.getElementById("challenge-intro-title").focus({ preventScroll: true });
    this.intro.querySelector(".challenge-intro-card").scrollTop = 0;
  }

  loadCart() {
    this.cart = loadImage(
      "assets/cart_challenge.png",
      (loaded) => this.cartReady(loaded),
      () => this.cartFailed(),
    );
  }

  cartReady(cart) {
    this.cart = cart;
    this.ready = true;
    this.start.disabled = false;
    this.start.textContent = "LET'S GO SHOPPING →";
  }

  cartFailed() {
    this.start.disabled = false;
    this.start.textContent = "RELOAD CART ↻";
    this.intro.querySelector(".challenge-disclaimer").textContent =
      "The cart image could not load. Reload to try again.";
  }

  draw() {
    if (!this.sceneContext || this.round.paused) return;
    const dt = Math.min(deltaTime / 1000, 0.05);
    if (this.round.mode === "notifications") this.drawNotifications(dt);
    else this.drawRound(dt);
  }

  drawNotifications(dt) {
    this.ending.draw(drawingContext, dt);
    this.syncMeltBeat();
    this.notices.tick(dt);
  }

  drawRound(dt) {
    this.round.tick(dt);
    this.renderScene();
    if (this.ending) this.drawMelt(dt);
    else drawingContext.drawImage(this.scene, 0, 0);
    this.syncTargets();
    this.syncHud();
  }

  drawMelt(dt) {
    this.ending.draw(drawingContext, dt, this.scene);
    this.syncMeltBeat();
    this.stage.dataset.damageCoverage = this.ending.coverage.toFixed(3);
    this.stage.dataset.damageHits = String(this.ending.hits);
    if (this.ending.complete) this.beginNotifications();
  }

  positionIntro() {
    if (!this.intro.open) return;
    const bounds = this.introBounds();
    this.intro.style.left = bounds.left + "px";
    this.intro.style.top = bounds.top + "px";
    this.intro.style.width = bounds.width + "px";
    this.intro.style.height = bounds.height + "px";
  }

  introBounds() {
    const rect = this.stage.getBoundingClientRect();
    const barBottom = document.querySelector(".site-bar")?.getBoundingClientRect().bottom || 0;
    const top = Math.max(rect.top, barBottom, 0);
    const bottom = Math.min(rect.bottom, innerHeight);
    return {
      left: Math.max(0, rect.left),
      top,
      width: Math.min(rect.width, innerWidth),
      height: Math.max(0, this.introHeight(rect, top, bottom)),
    };
  }

  introHeight(rect, top, bottom) {
    return rect.width < 700
      ? Math.max(bottom - top, Math.min(460, innerHeight - top))
      : bottom - top;
  }

  startRound() {
    if (!this.ready) {
      location.reload();
      return;
    }
    void this.sound.unlock();
    this.sound.playStart();
    this.intro.close();
    this.round.start();
    this.pause.disabled = this.restart.disabled = false;
    this.pause.focus({ preventScroll: true });
    this.syncTargets();
    this.syncHud();
  }

  togglePause() {
    this.round.paused = !this.round.paused;
    if (this.round.paused) this.sound.pause();
    else this.sound.resume();
    this.syncTargets();
    this.syncHud();
  }

  restartRound() {
    this.resetRoundState();
    this.resetArtView();
    this.sound.stopAll();
    this.sound.resume();
    this.returnTransition.reset();
    this.resetReadouts();
    this.syncTargets();
    this.syncHud();
  }

  resetRoundState() {
    this.round.reset();
    this.round.start();
    this.aboutPaused = false;
    this.ending = null;
  }

  resetArtView() {
    this.stage.classList.remove("is-art-ending", "is-corrupting");
    this.targets.inert = false;
    this.notices.reset();
    this.melt.hidden = true;
  }

  resetReadouts() {
    this.setCanvasLabel("collect");
    this.stage.dataset.damageCoverage = "0";
    this.stage.dataset.damageHits = "0";
    this.setStatus("");
  }

  aboutChanged(event) {
    if (event.detail.open) this.pauseForAbout();
    else this.resumeAfterAbout();
    this.syncTargets();
    this.syncHud();
  }

  pauseForAbout() {
    this.aboutPaused = this.round.mode !== "intro" && !this.round.paused;
    if (!this.aboutPaused) return;
    this.round.paused = true;
    this.sound.pause();
  }

  resumeAfterAbout() {
    if (this.aboutPaused) {
      this.round.paused = false;
      this.sound.resume();
    }
    this.aboutPaused = false;
  }

  collect(id) {
    const item = this.round.collect(id);
    if (!item) return;
    this.sound.playItem();
    if (this.round.mode === "corrupting") this.damage(item.x, item.y);
    this.syncTargets();
    this.syncHud();
  }

  damage(x, y) {
    if (this.round.mode !== "corrupting" || this.round.paused) return;
    this.renderScene();
    if (!this.ending) this.initializeMelting();
    this.ending.addDamage(x, y, this.scene);
    this.stage.dataset.damageHits = String(this.ending.hits);
  }

  initializeMelting() {
    this.ending = new ChallengeDatamosh(this.scene, { track: this.sound.playDatamosh() });
    this.stage.classList.add("is-corrupting");
    this.melt.hidden = false;
    this.setCanvasLabel("melting");
    this.setStatus("Every click now melts another area. Click around the picture.");
  }

  syncMeltBeat() {
    if (this.stage.dataset.datamoshBeats === String(this.ending.beatCount)) return;
    this.stage.dataset.datamoshBeats = String(this.ending.beatCount);
    this.stage.dataset.datamoshCues = JSON.stringify(this.ending.beatLog);
  }

  meltPointer(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = this.stage.getBoundingClientRect();
    this.damage(
      ((event.clientX - rect.left) / rect.width) * this.W,
      ((event.clientY - rect.top) / rect.height) * this.H,
    );
  }

  beginNotifications() {
    this.round.mode = "notifications";
    this.stage.classList.add("is-art-ending");
    this.melt.hidden = true;
    this.targets.replaceChildren();
    this.buttons.clear();
    this.targets.inert = true;
    this.pause.disabled = this.restart.disabled = true;
    this.setCanvasLabel("notifications");
    this.setStatus(
      "The image has melted. Artwork notifications are appearing. Each OK creates more.",
    );
    this.notices.start();
  }

  syncTargets() {
    if (this.round.mode === "notifications") return;
    const active = new Set(this.round.items.map((item) => item.id));
    this.removeOldTargets(active);
    for (const item of this.round.items) this.syncTarget(item);
  }

  removeOldTargets(active) {
    for (const [id, button] of this.buttons) {
      if (active.has(id)) continue;
      button.remove();
      this.buttons.delete(id);
    }
  }

  syncTarget(item) {
    const button = this.buttons.get(item.id) || this.makeTarget(item);
    button.setAttribute("aria-label", "Collect " + item.label.toLowerCase());
    button.hidden = item.y < -item.size * 0.25 || item.y > this.H + item.size * 0.25;
    button.disabled = this.round.paused;
    this.positionTarget(button, item);
  }

  makeTarget(item) {
    const button = document.createElement("button");
    button.className = "collect-target";
    button.type = "button";
    button.addEventListener("pointerdown", (event) => this.collectPointer(event, item.id));
    button.addEventListener("click", () => this.collect(item.id));
    this.buttons.set(item.id, button);
    this.targets.append(button);
    return button;
  }

  collectPointer(event, id) {
    if (event.button !== 0) return;
    event.preventDefault();
    this.collect(id);
  }

  positionTarget(button, item) {
    button.style.left = (item.x / this.W) * 100 + "%";
    button.style.top = (item.y / this.H) * 100 + "%";
    button.style.width = (item.size / this.W) * 100 + "%";
    button.style.height = (item.size / this.H) * 100 + "%";
    button.style.transform = "translate(-50%,-50%) rotate(" + item.angle + "rad)";
  }

  syncHud() {
    const signature = [this.round.collected, this.round.mode, this.round.paused].join("/");
    if (this.lastHud !== signature) this.paintHud(signature);
    this.timer.textContent = this.round.time.toFixed(1) + "s";
  }

  paintHud(signature) {
    this.counter.value = String(this.round.collected).padStart(2, "0");
    this.mode.textContent = this.modeDescription();
    this.pause.textContent = this.round.paused ? "RESUME ▶" : "PAUSE";
    this.pause.setAttribute("aria-pressed", String(this.round.paused));
    this.stage.dataset.mode = this.round.mode;
    this.stage.dataset.paused = String(this.round.paused);
    this.lastHud = signature;
  }

  modeDescription() {
    return this.round.mode === "corrupting"
      ? "CLICK ANYWHERE / LET IT MELT."
      : "CATCH THE NEXT YOU.";
  }

  setCanvasLabel(key) {
    this.canvas.setAttribute("aria-label", CHALLENGE_CANVAS_LABELS[key]);
  }

  setStatus(text) {
    document.getElementById("challenge-art-status").textContent = text;
  }

  basketClip(ctx) {
    const scale = this.cartBox.height / 1080;
    ctx.beginPath();
    CHALLENGE_BASKET_POINTS.forEach(([x, y], index) => {
      ctx[index ? "lineTo" : "moveTo"](this.cartBox.x + x * scale, this.cartBox.y + y * scale);
    });
    ctx.closePath();
    ctx.clip();
  }

  renderScene() {
    const ctx = this.sceneContext;
    ctx.drawImage(this.background, 0, 0);
    const flights = this.round.flights.map((item) => this.round.flightPose(item));
    this.drawStoredLayer(ctx, flights);
    this.drawCart(ctx);
    this.drawForegroundLayer(ctx, flights);
    this.drawParticles(ctx);
    for (const label of this.round.labels)
      this.vectors.drawLabel(ctx, label, this.round.time - label.born);
  }

  drawStoredLayer(ctx, flights) {
    ctx.save();
    this.basketClip(ctx);
    for (const item of this.round.stored) this.drawItem(ctx, item);
    for (const item of flights) if (item.progress > 0.7) this.drawItem(ctx, item);
    ctx.restore();
  }

  drawCart(ctx) {
    if (!this.ready) return;
    const { x, y, width, height } = this.cartBox;
    ctx.drawImage(this.cart.canvas, x, y, width, height);
  }

  drawForegroundLayer(ctx, flights) {
    for (const item of this.round.items) this.drawItem(ctx, item);
    for (const item of flights) if (item.progress <= 0.7) this.drawItem(ctx, item);
  }

  drawParticles(ctx) {
    for (const particle of this.round.particles) {
      ctx.globalAlpha = Math.max(0, 1 - (this.round.time - particle.born) / particle.life);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size * 0.6);
    }
    ctx.globalAlpha = 1;
  }

  drawItem(ctx, item, opacity = 1) {
    const key = item.type + "/" + item.color;
    if (!this.icons.has(key)) this.icons.set(key, this.vectors.make(item.type, item.color));
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle);
    this.paintItemSprite(ctx, this.icons.get(key), item.size);
    ctx.restore();
  }

  paintItemSprite(ctx, sprite, size) {
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  }
}

// Flat vector products retain their colours, coordinates and layer order.
class ChallengeVectors {
  constructor() {
    this.cream = "#FFF6DF";
    this.blue = "#087CFF";
    this.red = "#EE2724";
  }

  make(type, color) {
    const result = document.createElement("canvas");
    result.width = result.height = 256;
    const ctx = result.getContext("2d");
    this.prepareContext(ctx);
    const method = CHALLENGE_ICON_METHODS[type];
    if (method) this[method](ctx, color, type);
    return result;
  }

  prepareContext(ctx) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 5;
  }

  polygon(ctx, points, fill, stroke = "#111111", lineWidth = 5) {
    ctx.beginPath();
    points.forEach(([x, y], index) => ctx[index ? "lineTo" : "moveTo"](x, y));
    ctx.closePath();
    this.fillShape(ctx, fill);
    this.strokeShape(ctx, stroke, lineWidth);
  }

  fillShape(ctx, color) {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fill();
  }

  strokeShape(ctx, color, width) {
    if (!color) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  box(ctx, x, y, width, height, fill, radius = 8) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  }

  line(ctx, points, color = "#111111", width = 5) {
    ctx.beginPath();
    points.forEach(([x, y], index) => ctx[index ? "lineTo" : "moveTo"](x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  iconText(ctx, text, x, y, font, color) {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
  }

  drawClothes(ctx, color) {
    this.polygon(ctx, CHALLENGE_VECTOR_POINTS.clothes, color);
    ctx.beginPath();
    ctx.ellipse(128, 60, 25, 16, 0, 0, Math.PI);
    ctx.stroke();
    this.box(ctx, 103, 105, 50, 50, this.cream, 0);
    this.iconText(ctx, "NEW", 128, 138, "900 19px Arial", this.red);
    this.line(ctx, CHALLENGE_VECTOR_POINTS.clothesHem, this.cream, 4);
  }

  drawBook(ctx, color, type) {
    this.polygon(ctx, CHALLENGE_VECTOR_POINTS.bookBack, this.cream);
    this.polygon(ctx, CHALLENGE_VECTOR_POINTS.bookCover, color);
    this.line(ctx, CHALLENGE_VECTOR_POINTS.bookSpine);
    this.line(ctx, CHALLENGE_VECTOR_POINTS.bookPages, "#111111", 3);
    this.bookText(ctx, type);
    this.bookBinding(ctx, type);
  }

  bookText(ctx, type) {
    ctx.fillStyle = this.cream;
    ctx.font = "900 24px Impact,Arial";
    ctx.textAlign = "center";
    ctx.fillText(type === "book" ? "BETTER" : "NEW ME", 125, 99);
    ctx.fillText(type === "book" ? "YOU!" : "JOURNAL", 125, 128);
  }

  bookBinding(ctx, type) {
    if (type === "journal") {
      for (let y = 58; y < 185; y += 23) this.journalRing(ctx, y);
    } else this.line(ctx, CHALLENGE_VECTOR_POINTS.bookUnderline, this.cream, 4);
  }

  journalRing(ctx, y) {
    ctx.beginPath();
    ctx.ellipse(55, y, 12, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawSkincare(ctx, color) {
    this.box(ctx, 62, 94, 132, 119, color, 18);
    this.box(ctx, 56, 66, 144, 38, this.cream, 6);
    for (let x = 69; x < 194; x += 13) this.skincareCapRidge(ctx, x);
    this.box(ctx, 77, 125, 102, 57, this.cream, 0);
    this.iconText(ctx, "GLOW UP", 128, 161, "900 22px Impact,Arial", "#111111");
    this.line(ctx, CHALLENGE_VECTOR_POINTS.skincareSpark, this.red, 4);
    this.line(ctx, CHALLENGE_VECTOR_POINTS.skincareRay, this.red, 4);
  }

  skincareCapRidge(ctx, x) {
    this.line(
      ctx,
      [
        [x, 74],
        [x, 97],
      ],
      "#111111",
      2,
    );
  }

  drawShoe(ctx, color) {
    this.polygon(ctx, CHALLENGE_VECTOR_POINTS.shoe, color);
    this.polygon(ctx, CHALLENGE_VECTOR_POINTS.shoeSole, this.cream);
    this.polygon(ctx, CHALLENGE_VECTOR_POINTS.shoeHeel, this.cream);
    this.line(ctx, CHALLENGE_VECTOR_POINTS.shoeLaces, this.cream, 6);
    this.line(ctx, CHALLENGE_VECTOR_POINTS.shoeToe, "#111111", 4);
  }

  drawBottle(ctx, color) {
    this.box(ctx, 104, 27, 48, 30, this.cream, 4);
    this.bottleOutline(ctx, color);
    this.box(ctx, 74, 130, 109, 49, this.cream, 0);
    this.iconText(ctx, "REFRESH", 128, 162, "900 23px Impact,Arial", this.blue);
  }

  bottleOutline(ctx, color) {
    ctx.beginPath();
    ctx.moveTo(102, 57);
    ctx.lineTo(154, 57);
    ctx.lineTo(154, 79);
    ctx.bezierCurveTo(184, 101, 187, 116, 183, 137);
    ctx.lineTo(183, 214);
    ctx.quadraticCurveTo(128, 233, 73, 214);
    ctx.lineTo(73, 137);
    ctx.bezierCurveTo(69, 116, 72, 101, 102, 79);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
  }

  drawHeadphones(ctx, color) {
    this.headphoneArch(ctx, color);
    this.headphoneCups(ctx, color);
    this.headphoneNotes(ctx);
  }

  headphoneArch(ctx, color) {
    ctx.beginPath();
    ctx.arc(128, 130, 76, Math.PI, Math.PI * 2);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 30;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 20;
    ctx.stroke();
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 5;
  }

  headphoneCups(ctx, color) {
    this.box(ctx, 36, 117, 43, 85, color, 15);
    this.box(ctx, 177, 117, 43, 85, color, 15);
    this.box(ctx, 67, 124, 19, 72, this.cream, 7);
    this.box(ctx, 170, 124, 19, 72, this.cream, 7);
    this.line(ctx, CHALLENGE_VECTOR_POINTS.headphoneNote, this.red, 6);
  }

  headphoneNotes(ctx) {
    ctx.beginPath();
    ctx.ellipse(102, 184, 12, 8, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = this.red;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(129, 174, 12, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPlant(ctx, color) {
    this.line(ctx, CHALLENGE_VECTOR_POINTS.plantStem, "#111111", 7);
    CHALLENGE_VECTOR_POINTS.plantLeaves.forEach((leaf) => this.drawLeaf(ctx, leaf, color));
    this.polygon(ctx, CHALLENGE_VECTOR_POINTS.plantPot, this.red);
    this.box(ctx, 66, 155, 124, 22, this.cream, 3);
  }

  drawLeaf(ctx, [x, y, angle], color) {
    ctx.beginPath();
    ctx.ellipse(x, y, 42, 19, angle, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
  }

  drawLabel(ctx, label, age) {
    if (age < 0) return;
    ctx.save();
    this.transformLabel(ctx, label, age);
    ctx.font = label.large ? "900 39px Impact,Arial Narrow,Arial" : "italic 900 25px Arial";
    const width = ctx.measureText(label.text).width + (label.large ? 30 : 22);
    this.labelShape(ctx, label, width);
    this.labelText(ctx, label.text);
    ctx.restore();
  }

  transformLabel(ctx, label, age) {
    const scale = Math.max(0.05, 1 - Math.exp(-age * 13) * Math.cos(age * 21));
    ctx.translate(label.x, label.y - age * 76);
    ctx.rotate(label.angle);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.min(1, (label.life - age) * 5);
  }

  labelShape(ctx, label, width) {
    if (label.large) this.polygon(ctx, this.burstPoints(width), label.color, this.cream, 3);
    else {
      const points = [
        [-width / 2, -20],
        [width / 2, -20],
        [width / 2, 20],
        [-width / 2, 20],
      ];
      this.polygon(ctx, points, label.color, this.cream, 2);
    }
  }

  burstPoints(width) {
    const points = [];
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const radius = i % 2 ? 0.72 : 1;
      points.push([Math.cos(angle) * (width / 2 + 16) * radius, Math.sin(angle) * 54 * radius]);
    }
    return points;
  }

  labelText(ctx, text) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 5;
    ctx.strokeText(text, 0, 1);
    ctx.fillStyle = "#FFFF00";
    ctx.fillText(text, 0, 1);
  }
}

new ChallengeScene();
