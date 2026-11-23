// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted implementation, revised into named helpers for this project.
const OFFER_WIDTH = 1920;
const OFFER_HEIGHT = 1080;

// Edit each entry's lines to change BOTH the wheel label and the result.
// color and text control the slice and lettering colors. Labels are generated
// from this list, not a fixed image; every slice contains a positive offer.
const WHEEL_OFFERS = [
  { lines: ["100%", "OFF"], color: "#FFFF00", text: "#FF0000" },
  { lines: ["FREE", "GIFT"], color: "#087CFF", text: "#FFF6DF" },
  { lines: ["VIP", "SPECIAL"], color: "#111111", text: "#FFFF00" },
  { lines: ["90%", "OFF"], color: "#FF2396", text: "#111111" },
  { lines: ["FREE", "DELIVERY"], color: "#FFF6DF", text: "#111111" },
  { lines: ["MEGA", "OFFER"], color: "#EE2724", text: "#FFF6DF" },
  { lines: ["BUY 1", "GET 1 FREE"], color: "#00E000", text: "#111111" },
  { lines: ["FREE", "UPGRADE"], color: "#08BEFF", text: "#111111" },
  { lines: ["EXCLUSIVE", "DROP"], color: "#111111", text: "#FFF6DF" },
  { lines: ["95%", "OFF"], color: "#FFFF00", text: "#FF0000" },
  { lines: ["100%", "FREE"], color: "#FDCFDE", text: "#111111" },
  { lines: ["SPECIAL", "EDITION"], color: "#EE2724", text: "#FFF6DF" },
];

const OFFER_WHEEL = { x: 960, y: 520, r: 430, hub: 90 };
const WHEEL_START = -Math.PI / 2;
const POINTER_ANGLE = Math.PI / 2;
const FULL_TURN = Math.PI * 2;

function normalizeWheelAngle(angle) {
  return ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

class WheelMotion {
  constructor(count, random = Math.random) {
    this.count = count;
    this.random = random;
    this.rotation = Math.PI / count;
    this.spinning = false;
    this.winner = null;
    this.lastRotation = this.rotation;
    this.speed = 0;
  }

  indexAtPointer(angle = this.rotation) {
    const angleAtPointer = normalizeWheelAngle(POINTER_ANGLE - WHEEL_START - angle);
    return Math.floor(angleAtPointer / (FULL_TURN / this.count)) % this.count;
  }

  spin(now) {
    if (this.spinning) return false;
    const target = this.chooseTarget();
    const turns = 5 + Math.floor(this.random() * 4);
    this.from = this.rotation;
    this.to = this.from + turns * FULL_TURN + normalizeWheelAngle(target - this.from);
    this.startedAt = now;
    this.duration = 6400 + this.random() * 1400;
    this.spinning = true;
    this.winner = null;
    return true;
  }

  chooseTarget() {
    const step = FULL_TURN / this.count;
    const chosen = Math.min(this.count - 1, Math.floor(this.random() * this.count));
    const jitter = (this.random() - 0.5) * step * 0.38;
    return normalizeWheelAngle(POINTER_ANGLE - WHEEL_START - (chosen + 0.5) * step + jitter);
  }

  update(now) {
    if (!this.spinning) {
      this.speed = 0;
      return null;
    }
    const progress = Math.max(0, Math.min(1, (now - this.startedAt) / this.duration));
    this.lastRotation = this.rotation;
    this.rotation = this.from + (this.to - this.from) * (1 - Math.pow(1 - progress, 4));
    this.speed = Math.abs(this.rotation - this.lastRotation);
    return progress < 1 ? null : this.finishSpin();
  }

  finishSpin() {
    this.rotation = normalizeWheelAngle(this.to);
    this.winner = this.indexAtPointer();
    this.spinning = false;
    return this.winner;
  }
}

let wheelMotion;
let wheelFace;
let wheelBackground;
let spinButton;
let resultOutput;
let wheelStatus;
let dailyOfferDialog;
let dailyOfferValue;
let dailyOfferClaim;
let viewOfferButton;
let pendingOfferIndex = null;
let pendingPrizeSound = false;
let offerAudio;
let offerAudioEnabled = false;
let prizeSoundCount = 0;
let prizeSpinSerial = 0;
let prizeAttempt = null;
let prizeAttempted = false;

function setup() {
  const canvas = createOfferCanvas();
  setupOfferAudio();
  wheelMotion = new WheelMotion(WHEEL_OFFERS.length);
  wheelFace = makeWheelFace();
  wheelBackground = makeWheelBackground();
  bindOfferElements();
  bindOfferDialog();
  bindOfferAudioEvents();
  spinButton.addEventListener("click", startOfferSpin);
  spinButton.disabled = false;
  canvas.elt.addEventListener("pointerdown", (event) => spinAtCanvasPoint(event, canvas.elt));
}

function createOfferCanvas() {
  const canvas = createCanvas(OFFER_WIDTH, OFFER_HEIGHT);
  canvas.parent("offer-stage");
  pixelDensity(1);
  frameRate(60);
  canvas.elt.setAttribute("role", "img");
  canvas.elt.setAttribute(
    "aria-label",
    "ME-MARRT special offer wheel. Use the Spin button to reveal your offer.",
  );
  return canvas;
}

function setupOfferAudio() {
  const stage = document.getElementById("offer-stage");
  offerAudio = new ChallengeAudio({
    paths: { prize: "sounds/prize.wav" },
    onState: (state) => {
      stage.dataset.audioState = state;
    },
    onPlay: (name) => {
      if (name === "prize") stage.dataset.audioPrize = String(++prizeSoundCount);
    },
  });
}

function bindOfferElements() {
  spinButton = document.getElementById("wheel-spin");
  resultOutput = document.getElementById("wheel-result");
  wheelStatus = document.getElementById("wheel-status");
  dailyOfferDialog = document.getElementById("daily-offer-dialog");
  dailyOfferValue = document.getElementById("daily-offer-value");
  dailyOfferClaim = document.getElementById("daily-offer-claim");
  viewOfferButton = document.getElementById("offer-view-button");
}

function bindOfferDialog() {
  document
    .getElementById("daily-offer-close")
    .addEventListener("click", () => dailyOfferDialog.close());
  dailyOfferDialog.addEventListener("click", (event) => {
    if (event.target === dailyOfferDialog) dailyOfferDialog.close();
  });
  dailyOfferDialog.addEventListener("close", () => spinButton.focus({ preventScroll: true }));
  viewOfferButton.addEventListener("click", reopenDailyOffer);
  window.addEventListener("resize", positionDailyOffer);
  window.addEventListener("scroll", positionDailyOffer, { passive: true });
}

function reopenDailyOffer() {
  if (wheelMotion.winner === null) return;
  showDailyOffer(wheelMotion.winner);
  retryPrizeFromGesture();
}

function bindOfferAudioEvents() {
  document.addEventListener("site:aboutchange", handleOfferAboutChange);
  document.addEventListener("visibilitychange", handleOfferVisibility);
  document.addEventListener("pointerdown", retryPrizeFromGesture, { capture: true });
  document.addEventListener("keydown", retryPrizeFromGesture, { capture: true });
  window.addEventListener("pagehide", () => offerAudio.stopAll());
}

function handleOfferAboutChange(event) {
  if (event.detail.open) offerAudio.pause();
  else if (offerAudioEnabled && !document.hidden) offerAudio.resume();
  if (!event.detail.open && pendingOfferIndex !== null) showDailyOffer(pendingOfferIndex);
}

function handleOfferVisibility() {
  if (document.hidden) offerAudio.pause();
  else if (offerAudioEnabled && !document.body.classList.contains("about-open")) {
    offerAudio.resume();
    // A hidden result still needs its first visible playback attempt.
    if (!prizeAttempted) playPrizeForResult();
  }
}

function spinAtCanvasPoint(event, canvas) {
  if (event.button !== 0 || document.body.classList.contains("about-open")) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * OFFER_WIDTH) / rect.width;
  const y = ((event.clientY - rect.top) * OFFER_HEIGHT) / rect.height;
  if (Math.hypot(x - OFFER_WHEEL.x, y - OFFER_WHEEL.y) > OFFER_WHEEL.r) return;
  event.preventDefault();
  startOfferSpin();
}

function startOfferSpin() {
  if (document.body.classList.contains("about-open") || dailyOfferDialog.open) return;
  if (!wheelMotion.spin(millis())) return;
  resetPrizePlayback();
  spinButton.disabled = true;
  viewOfferButton.hidden = true;
  resultOutput.textContent = "HERE\nIT\nCOMES…";
  wheelStatus.textContent = "YOUR SPECIAL OFFER IS ON ITS WAY";
}

function resetPrizePlayback() {
  prizeSpinSerial++;
  offerAudio.stopAll();
  void offerAudio.unlock().then(() => {
    offerAudioEnabled = true;
  });
  pendingPrizeSound = false;
  prizeAttempt = null;
  prizeAttempted = false;
  document.getElementById("offer-stage").dataset.prizeSound = "waiting-for-result";
}

function draw() {
  const winner = wheelMotion.update(millis());
  if (winner !== null) revealWheelResult(winner);
  const ctx = drawingContext;
  ctx.drawImage(wheelBackground, 0, 0);
  drawWheelShadow(ctx);
  drawRotatingWheel(ctx);
  drawWheelHub(ctx);
  drawWheelPointer(ctx);
}

function revealWheelResult(winner) {
  resultOutput.textContent = WHEEL_OFFERS[winner].lines.join("\n");
  wheelStatus.textContent = "ALL YOURS. SPIN AGAIN?";
  spinButton.disabled = false;
  viewOfferButton.hidden = false;
  pendingPrizeSound = true;
  showDailyOffer(winner);
}

function drawWheelShadow(ctx) {
  const { x, y, r } = OFFER_WHEEL;
  ctx.save();
  ctx.translate(x + 9, y + 14);
  ctx.fillStyle = "rgba(17,17,17,0.25)";
  ctx.beginPath();
  ctx.arc(0, 0, r + 12, 0, FULL_TURN);
  ctx.fill();
  ctx.restore();
}

function drawRotatingWheel(ctx) {
  ctx.save();
  ctx.translate(OFFER_WHEEL.x, OFFER_WHEEL.y);
  ctx.rotate(wheelMotion.rotation);
  ctx.drawImage(wheelFace, -wheelFace.width / 2, -wheelFace.height / 2);
  if (wheelMotion.winner !== null) drawWinningSlice(ctx);
  ctx.restore();
}

function drawWinningSlice(ctx) {
  const step = FULL_TURN / WHEEL_OFFERS.length;
  const start = WHEEL_START + wheelMotion.winner * step;
  wheelSlicePath(ctx, OFFER_WHEEL.r - 3, start, step);
  ctx.strokeStyle = "#08BEFF";
  ctx.lineWidth = 5;
  ctx.stroke();
}

function drawWheelHub(ctx) {
  const { x, y, hub } = OFFER_WHEEL;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, hub + 5, 0, FULL_TURN);
  ctx.fillStyle = "#111111";
  ctx.fill();
  ctx.strokeStyle = "#FFF6DF";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function positionDailyOffer() {
  if (!dailyOfferDialog?.open) return;
  const stage = document.getElementById("offer-stage").getBoundingClientRect();
  const navBottom = document.querySelector(".site-bar")?.getBoundingClientRect().bottom || 0;
  const top = Math.max(navBottom, stage.top, 0);
  const bottom = Math.min(window.innerHeight, stage.bottom);
  dailyOfferDialog.style.left = `${stage.left}px`;
  dailyOfferDialog.style.top = `${top}px`;
  dailyOfferDialog.style.width = `${stage.width}px`;
  dailyOfferDialog.style.height = `${Math.max(140, bottom - top)}px`;
}

function showDailyOffer(index) {
  if (document.body.classList.contains("about-open")) {
    pendingOfferIndex = index;
    return;
  }
  pendingOfferIndex = null;
  setDailyOfferContent(index);
  if (!dailyOfferDialog.open) dailyOfferDialog.showModal();
  positionDailyOffer();
  dailyOfferClaim.focus({ preventScroll: true });
  if (!prizeAttempted) playPrizeForResult();
}

function setDailyOfferContent(index) {
  const offer = WHEEL_OFFERS[index];
  dailyOfferValue.textContent = offer.lines.join("\n");
  const params = new URLSearchParams({ offer: String(index), label: offer.lines.join(" ") });
  dailyOfferClaim.href = `challenge.html?${params.toString()}`;
}

function canPlayPrize() {
  return (
    pendingPrizeSound &&
    !prizeAttempt &&
    dailyOfferDialog.open &&
    !document.hidden &&
    !document.body.classList.contains("about-open")
  );
}

// The pending flag clears only after Web Audio confirms a source was scheduled.
function playPrizeForResult() {
  if (!canPlayPrize()) return;
  const serial = prizeSpinSerial;
  const stage = document.getElementById("offer-stage");
  prizeAttempted = true;
  stage.dataset.prizeSound = "scheduling";
  const attempt = Promise.resolve(offerAudio.effect("prize", 1.1, 1));
  prizeAttempt = attempt;
  observePrizePlayback(attempt, serial, stage);
}

function observePrizePlayback(attempt, serial, stage) {
  void attempt
    .then((played) => finishPrizePlayback(played, serial, stage))
    .catch(() => {
      if (serial === prizeSpinSerial) stage.dataset.prizeSound = "awaiting-gesture";
    })
    .finally(() => {
      if (prizeAttempt === attempt) prizeAttempt = null;
    });
}

function finishPrizePlayback(played, serial, stage) {
  if (serial !== prizeSpinSerial) return;
  if (played === true) pendingPrizeSound = false;
  stage.dataset.prizeSound = played === true ? "played" : "awaiting-gesture";
}

function retryPrizeFromGesture() {
  if (!prizeAttempted || !canPlayPrize()) return;
  void offerAudio.unlock();
  playPrizeForResult();
}

function typeTexture(offer) {
  const texture = document.createElement("canvas");
  texture.width = 680;
  texture.height = 260;
  const ctx = texture.getContext("2d");
  ctx.font = '900 160px Impact, "Arial Narrow", "Arial Black", sans-serif';
  ctx.fillStyle = offer.text;
  ctx.textBaseline = "alphabetic";
  const row = texture.height / offer.lines.length;
  offer.lines.forEach((text, index) => paintOfferLine(ctx, texture, text, index, row));
  return texture;
}

function paintOfferLine(ctx, texture, text, index, row) {
  const metrics = ctx.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent || 120;
  const descent = metrics.actualBoundingBoxDescent || 5;
  ctx.save();
  ctx.translate(7, row * (index + 0.5));
  ctx.scale((texture.width - 14) / Math.max(1, metrics.width), (row - 12) / (ascent + descent));
  ctx.fillText(text, 0, (ascent - descent) / 2);
  ctx.restore();
}

function makeWheelFace() {
  const face = document.createElement("canvas");
  face.width = face.height = (OFFER_WHEEL.r + 18) * 2;
  const ctx = face.getContext("2d");
  ctx.translate(face.width / 2, face.height / 2);
  const step = FULL_TURN / WHEEL_OFFERS.length;
  WHEEL_OFFERS.forEach((offer, index) => paintWheelSlice(ctx, offer, index, step));
  strokeWheelRim(ctx, "#111111", 18);
  strokeWheelRim(ctx, "#FFF6DF", 12);
  WHEEL_OFFERS.forEach((_, index) => paintWheelPeg(ctx, index, step));
  return face;
}

function wheelSlicePath(ctx, radius, start, step) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, start, start + step);
  ctx.closePath();
}

function paintWheelSlice(ctx, offer, index, step) {
  const start = WHEEL_START + index * step;
  ctx.save();
  wheelSlicePath(ctx, OFFER_WHEEL.r, start, step);
  ctx.fillStyle = offer.color;
  ctx.fill();
  ctx.clip();
  ctx.rotate(start + step / 2);
  paintTaperedOffer(ctx, typeTexture(offer), step);
  ctx.restore();
}

// Drawing thin strips squeezes lettering toward the hub instead of using an image.
function paintTaperedOffer(ctx, texture, step) {
  const outer = OFFER_WHEEL.r - 22;
  const depth = outer - OFFER_WHEEL.hub - 12;
  ctx.translate(outer, 0);
  ctx.rotate(Math.PI);
  for (let x = 0; x < depth; x += 1.6) paintOfferStrip(ctx, texture, { x, depth, outer, step });
}

function paintOfferStrip(ctx, texture, { x, depth, outer, step }) {
  const strip = Math.min(1.6, depth - x);
  const halfHeight = (outer - x - strip / 2) * Math.tan(step / 2) - 5;
  ctx.drawImage(
    texture,
    (x / depth) * texture.width,
    0,
    (strip / depth) * texture.width,
    texture.height,
    x,
    -halfHeight,
    strip + 0.25,
    halfHeight * 2,
  );
}

function strokeWheelRim(ctx, color, width) {
  ctx.beginPath();
  ctx.arc(0, 0, OFFER_WHEEL.r + 3, 0, FULL_TURN);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function paintWheelPeg(ctx, index, step) {
  const angle = WHEEL_START + index * step;
  const radius = OFFER_WHEEL.r - 11;
  ctx.beginPath();
  ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 10, 0, FULL_TURN);
  ctx.fillStyle = "#111111";
  ctx.fill();
}

function drawWheelPointer(ctx) {
  const { x, y, r } = OFFER_WHEEL;
  ctx.save();
  ctx.translate(x, y + r + 24);
  ctx.rotate(wheelPointerWiggle());
  wheelPointerPath(ctx);
  ctx.fillStyle = "#FFF6DF";
  ctx.fill();
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function wheelPointerWiggle() {
  const step = FULL_TURN / WHEEL_OFFERS.length;
  const phase = normalizeWheelAngle(wheelMotion.rotation + WHEEL_START - POINTER_ANGLE) / step;
  return wheelMotion.spinning
    ? Math.sin(phase * FULL_TURN) * Math.min(0.18, wheelMotion.speed * 1.2)
    : 0;
}

function wheelPointerPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, -43);
  ctx.lineTo(-19, 8);
  ctx.bezierCurveTo(-29, 40, 20, 49, 23, 19);
  ctx.bezierCurveTo(25, 7, 10, -23, 0, -43);
  ctx.closePath();
}

const WHEEL_BACKGROUND_STOPS = [
  [0, "#FF2396"],
  [0.15, "#FF4173"],
  [0.3, "#FF6919"],
  [0.48, "#FF9B00"],
  [0.65, "#FFD200"],
  [0.8, "#FFFA00"],
  [0.91, "#FFFF64"],
  [1, "#FFFFD7"],
];

function makeWheelBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = OFFER_WIDTH;
  canvas.height = OFFER_HEIGHT;
  const ctx = canvas.getContext("2d");
  const inner = { l: 384, r: 1536, t: 216, b: 864 };
  paintWheelBackgroundSides(ctx);
  paintWheelBackgroundMiddle(ctx, inner);
  return canvas;
}

const WHEEL_BACKGROUND_SIDES = [
  {
    points: [
      [0, 0],
      [1920, 0],
      [1536, 216],
      [384, 216],
    ],
    gradient: [0, 0, 0, 216],
  },
  {
    points: [
      [0, 1080],
      [1920, 1080],
      [1536, 864],
      [384, 864],
    ],
    gradient: [0, 1080, 0, 864],
  },
  {
    points: [
      [0, 0],
      [384, 216],
      [384, 864],
      [0, 1080],
    ],
    gradient: [0, 0, 384, 0],
  },
  {
    points: [
      [1920, 0],
      [1920, 1080],
      [1536, 864],
      [1536, 216],
    ],
    gradient: [1920, 0, 1536, 0],
  },
];

function paintWheelBackgroundSides(ctx) {
  for (const side of WHEEL_BACKGROUND_SIDES) paintBackgroundSide(ctx, side.points, side.gradient);
}

function paintBackgroundSide(ctx, points, coordinates) {
  const gradient = ctx.createLinearGradient(...coordinates);
  for (const [position, color] of WHEEL_BACKGROUND_STOPS) gradient.addColorStop(position, color);
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
}

function paintWheelBackgroundMiddle(ctx, inner) {
  const gradient = ctx.createLinearGradient(0, inner.t, 0, inner.b);
  gradient.addColorStop(0, "#FDCFDE");
  gradient.addColorStop(0.5, "#FFE1E0");
  gradient.addColorStop(1, "#FFF6DF");
  ctx.fillStyle = gradient;
  ctx.fillRect(inner.l, inner.t, inner.r - inner.l, inner.b - inner.t);
}
