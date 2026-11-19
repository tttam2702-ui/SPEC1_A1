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
  { lines: ["SPECIAL", "EDITION"], color: "#EE2724", text: "#FFF6DF" }
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
    return Math.floor(normalizeWheelAngle(POINTER_ANGLE - WHEEL_START - angle) / (FULL_TURN / this.count)) % this.count;
  }

  spin(now) {
    if (this.spinning) return false;
    const step = FULL_TURN / this.count;
    const chosen = Math.min(this.count - 1, Math.floor(this.random() * this.count));
    const jitter = (this.random() - 0.5) * step * 0.38;
    const target = normalizeWheelAngle(POINTER_ANGLE - WHEEL_START - (chosen + 0.5) * step + jitter);
    const turns = 5 + Math.floor(this.random() * 4);
    this.from = this.rotation;
    this.to = this.from + turns * FULL_TURN + normalizeWheelAngle(target - this.from);
    this.startedAt = now;
    this.duration = 6400 + this.random() * 1400;
    this.spinning = true;
    this.winner = null;
    return true;
  }

  update(now) {
    if (!this.spinning) { this.speed = 0; return null; }
    const progress = Math.max(0, Math.min(1, (now - this.startedAt) / this.duration));
    this.lastRotation = this.rotation;
    this.rotation = this.from + (this.to - this.from) * (1 - Math.pow(1 - progress, 4));
    this.speed = Math.abs(this.rotation - this.lastRotation);
    if (progress < 1) return null;
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
  const canvas = createCanvas(OFFER_WIDTH, OFFER_HEIGHT);
  canvas.parent("offer-stage");
  pixelDensity(1);
  frameRate(60);
  canvas.elt.setAttribute("role", "img");
  canvas.elt.setAttribute("aria-label", "ME-MARRT special offer wheel. Use the Spin button to reveal your offer.");
  const stage = document.getElementById("offer-stage");
  offerAudio = new ChallengeAudio({
    paths: { prize: "sounds/prize.wav" },
    onState: state => { stage.dataset.audioState = state; },
    onPlay: name => { if (name === "prize") stage.dataset.audioPrize = String(++prizeSoundCount); }
  });
  wheelMotion = new WheelMotion(WHEEL_OFFERS.length);
  wheelFace = makeWheelFace();
  wheelBackground = makeWheelBackground();
  spinButton = document.getElementById("wheel-spin");
  resultOutput = document.getElementById("wheel-result");
  wheelStatus = document.getElementById("wheel-status");
  dailyOfferDialog = document.getElementById("daily-offer-dialog");
  dailyOfferValue = document.getElementById("daily-offer-value");
  dailyOfferClaim = document.getElementById("daily-offer-claim");
  viewOfferButton = document.getElementById("offer-view-button");
  document.getElementById("daily-offer-close").addEventListener("click", () => dailyOfferDialog.close());
  dailyOfferDialog.addEventListener("click", event => {
    if (event.target === dailyOfferDialog) dailyOfferDialog.close();
  });
  dailyOfferDialog.addEventListener("close", () => {
    spinButton.focus({ preventScroll: true });
  });
  viewOfferButton.addEventListener("click", () => {
    if (wheelMotion.winner !== null) {
      showDailyOffer(wheelMotion.winner);
      retryPrizeFromGesture();
    }
  });
  window.addEventListener("resize", positionDailyOffer);
  window.addEventListener("scroll", positionDailyOffer, { passive: true });
  document.addEventListener("site:aboutchange", event => {
    if (event.detail.open) offerAudio.pause();
    else if (offerAudioEnabled && !document.hidden) offerAudio.resume();
    if (!event.detail.open && pendingOfferIndex !== null) showDailyOffer(pendingOfferIndex);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) offerAudio.pause();
    else if (offerAudioEnabled && !document.body.classList.contains("about-open")) {
      offerAudio.resume();
      // A result reached while hidden has not yet had its first visible attempt.
      if (!prizeAttempted) playPrizeForResult();
    }
  });
  document.addEventListener("pointerdown", retryPrizeFromGesture, { capture: true });
  document.addEventListener("keydown", retryPrizeFromGesture, { capture: true });
  window.addEventListener("pagehide", () => offerAudio.stopAll());
  spinButton.addEventListener("click", startOfferSpin);
  spinButton.disabled = false;
  canvas.elt.addEventListener("pointerdown", event => {
    if (event.button !== 0 || document.body.classList.contains("about-open")) return;
    const rect = canvas.elt.getBoundingClientRect();
    const x = (event.clientX - rect.left) * OFFER_WIDTH / rect.width;
    const y = (event.clientY - rect.top) * OFFER_HEIGHT / rect.height;
    if (Math.hypot(x - OFFER_WHEEL.x, y - OFFER_WHEEL.y) <= OFFER_WHEEL.r) {
      event.preventDefault();
      startOfferSpin();
    }
  });
}

function startOfferSpin() {
  if (document.body.classList.contains("about-open") || dailyOfferDialog.open || !wheelMotion.spin(millis())) return;
  prizeSpinSerial++;
  offerAudio.stopAll();
  void offerAudio.unlock().then(() => { offerAudioEnabled = true; });
  pendingPrizeSound = false;
  prizeAttempt = null;
  prizeAttempted = false;
  document.getElementById("offer-stage").dataset.prizeSound = "waiting-for-result";
  spinButton.disabled = true;
  viewOfferButton.hidden = true;
  resultOutput.textContent = "HERE\nIT\nCOMES…";
  wheelStatus.textContent = "YOUR SPECIAL OFFER IS ON ITS WAY";
}

function draw() {
  const winner = wheelMotion.update(millis());
  if (winner !== null) {
    const offer = WHEEL_OFFERS[winner];
    resultOutput.textContent = offer.lines.join("\n");
    wheelStatus.textContent = "ALL YOURS. SPIN AGAIN?";
    spinButton.disabled = false;
    viewOfferButton.hidden = false;
    pendingPrizeSound = true;
    showDailyOffer(winner);
  }
  const ctx = drawingContext;
  ctx.drawImage(wheelBackground, 0, 0);

  const { x, y, r, hub } = OFFER_WHEEL;
  ctx.save();
  ctx.translate(x + 9, y + 14);
  ctx.fillStyle = "rgba(17,17,17,0.25)";
  ctx.beginPath();ctx.arc(0, 0, r + 12, 0, FULL_TURN);ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wheelMotion.rotation);
  ctx.drawImage(wheelFace, -wheelFace.width / 2, -wheelFace.height / 2);
  if (wheelMotion.winner !== null) {
    const step = FULL_TURN / WHEEL_OFFERS.length;
    const start = WHEEL_START + wheelMotion.winner * step;
    ctx.beginPath();ctx.moveTo(0, 0);ctx.arc(0, 0, r - 3, start, start + step);ctx.closePath();
    ctx.strokeStyle = "#08BEFF";ctx.lineWidth = 5;ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();ctx.arc(x, y, hub + 5, 0, FULL_TURN);
  ctx.fillStyle = "#111111";ctx.fill();
  ctx.strokeStyle = "#FFF6DF";ctx.lineWidth = 3;ctx.stroke();
  ctx.restore();
  drawWheelPointer(ctx);
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
  const offer = WHEEL_OFFERS[index];
  dailyOfferValue.textContent = offer.lines.join("\n");
  const params = new URLSearchParams({ offer: String(index), label: offer.lines.join(" ") });
  dailyOfferClaim.href = `challenge.html?${params.toString()}`;
  if (!dailyOfferDialog.open) dailyOfferDialog.showModal();
  positionDailyOffer();
  dailyOfferClaim.focus({ preventScroll: true });
  if (!prizeAttempted) playPrizeForResult();
}

function playPrizeForResult() {
  if (!pendingPrizeSound || prizeAttempt || !dailyOfferDialog.open || document.hidden
      || document.body.classList.contains("about-open")) return;
  const serial = prizeSpinSerial;
  const stage = document.getElementById("offer-stage");
  prizeAttempted = true;
  stage.dataset.prizeSound = "scheduling";
  // Keep the one-shot pending until the audio engine confirms it was scheduled.
  // This short source is relatively quiet; give its chime a little more presence.
  const attempt = Promise.resolve(offerAudio.effect("prize",1.1,1));
  prizeAttempt = attempt;
  void attempt.then(played => {
    if (serial !== prizeSpinSerial) return;
    if (played === true) pendingPrizeSound = false;
    stage.dataset.prizeSound = played === true ? "played" : "awaiting-gesture";
  }).catch(() => {
    if (serial === prizeSpinSerial) stage.dataset.prizeSound = "awaiting-gesture";
  }).finally(() => {
    if (prizeAttempt === attempt) prizeAttempt = null;
  });
}

function retryPrizeFromGesture() {
  if (!pendingPrizeSound || !prizeAttempted || prizeAttempt || !dailyOfferDialog.open
      || document.hidden || document.body.classList.contains("about-open")) return;
  void offerAudio.unlock();
  playPrizeForResult();
}

function typeTexture(offer) {
  const texture = document.createElement("canvas");
  texture.width = 680;texture.height = 260;
  const ctx = texture.getContext("2d");
  ctx.font = '900 160px Impact, "Arial Narrow", "Arial Black", sans-serif';
  ctx.fillStyle = offer.text;
  ctx.textBaseline = "alphabetic";
  const row = texture.height / offer.lines.length;
  offer.lines.forEach((text, index) => {
    const metrics = ctx.measureText(text);
    const ascent = metrics.actualBoundingBoxAscent || 120;
    const descent = metrics.actualBoundingBoxDescent || 5;
    ctx.save();
    ctx.translate(7, row * (index + 0.5));
    ctx.scale((texture.width - 14) / Math.max(1, metrics.width), (row - 12) / (ascent + descent));
    ctx.fillText(text, 0, (ascent - descent) / 2);
    ctx.restore();
  });
  return texture;
}

function makeWheelFace() {
  const { r, hub } = OFFER_WHEEL;
  const face = document.createElement("canvas");
  face.width = face.height = (r + 18) * 2;
  const ctx = face.getContext("2d");
  ctx.translate(face.width / 2, face.height / 2);
  const step = FULL_TURN / WHEEL_OFFERS.length;
  WHEEL_OFFERS.forEach((offer, index) => {
    const start = WHEEL_START + index * step;
    ctx.save();
    ctx.beginPath();ctx.moveTo(0, 0);ctx.arc(0, 0, r, start, start + step);ctx.closePath();
    ctx.fillStyle = offer.color;ctx.fill();ctx.clip();
    ctx.rotate(start + step / 2);
    const texture = typeTexture(offer);
    const outer = r - 22;
    const depth = outer - hub - 12;
    ctx.translate(outer, 0);
    ctx.rotate(Math.PI);
    // Map the text a strip at a time into a tapering wedge. Letters are tall
    // at the rim and squeeze toward the hub, matching the reference lettering.
    for (let x = 0; x < depth; x += 1.6) {
      const strip = Math.min(1.6, depth - x);
      const halfHeight = (outer - x - strip / 2) * Math.tan(step / 2) - 5;
      ctx.drawImage(texture, x / depth * texture.width, 0,
        strip / depth * texture.width, texture.height,
        x, -halfHeight, strip + 0.25, halfHeight * 2);
    }
    ctx.restore();
  });
  ctx.beginPath();ctx.arc(0, 0, r + 3, 0, FULL_TURN);
  ctx.strokeStyle = "#111111";ctx.lineWidth = 18;ctx.stroke();
  ctx.beginPath();ctx.arc(0, 0, r + 3, 0, FULL_TURN);
  ctx.strokeStyle = "#FFF6DF";ctx.lineWidth = 12;ctx.stroke();
  for (let index = 0; index < WHEEL_OFFERS.length; index++) {
    const angle = WHEEL_START + index * step;
    ctx.beginPath();ctx.arc(Math.cos(angle) * (r - 11), Math.sin(angle) * (r - 11), 10, 0, FULL_TURN);
    ctx.fillStyle = "#111111";ctx.fill();
  }
  return face;
}

function drawWheelPointer(ctx) {
  const { x, y, r } = OFFER_WHEEL;
  const step = FULL_TURN / WHEEL_OFFERS.length;
  const phase = normalizeWheelAngle(wheelMotion.rotation + WHEEL_START - POINTER_ANGLE) / step;
  const wiggle = wheelMotion.spinning ? Math.sin(phase * FULL_TURN) * Math.min(0.18, wheelMotion.speed * 1.2) : 0;
  ctx.save();
  ctx.translate(x, y + r + 24);
  ctx.rotate(wiggle);
  ctx.beginPath();
  ctx.moveTo(0, -43);
  ctx.lineTo(-19, 8);
  ctx.bezierCurveTo(-29, 40, 20, 49, 23, 19);
  ctx.bezierCurveTo(25, 7, 10, -23, 0, -43);
  ctx.closePath();
  ctx.fillStyle = "#FFF6DF";ctx.fill();
  ctx.strokeStyle = "#111111";ctx.lineWidth = 3;ctx.stroke();
  ctx.restore();
}

function makeWheelBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = OFFER_WIDTH;canvas.height = OFFER_HEIGHT;
  const ctx = canvas.getContext("2d");
  const inner = { l:384, r:1536, t:216, b:864 };
  const stops = [[0,"#FF2396"],[0.15,"#FF4173"],[0.3,"#FF6919"],[0.48,"#FF9B00"],[0.65,"#FFD200"],[0.8,"#FFFA00"],[0.91,"#FFFF64"],[1,"#FFFFD7"]];
  const side = (points,x1,y1,x2,y2) => {
    const g=ctx.createLinearGradient(x1,y1,x2,y2);
    for(const [position,color] of stops) g.addColorStop(position,color);
    ctx.beginPath();ctx.moveTo(...points[0]);
    for(const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();ctx.fillStyle=g;ctx.fill();
  };
  side([[0,0],[1920,0],[inner.r,inner.t],[inner.l,inner.t]],0,0,0,inner.t);
  side([[0,1080],[1920,1080],[inner.r,inner.b],[inner.l,inner.b]],0,1080,0,inner.b);
  side([[0,0],[inner.l,inner.t],[inner.l,inner.b],[0,1080]],0,0,inner.l,0);
  side([[1920,0],[1920,1080],[inner.r,inner.b],[inner.r,inner.t]],1920,0,inner.r,0);
  const middle=ctx.createLinearGradient(0,inner.t,0,inner.b);
  middle.addColorStop(0,"#FDCFDE");middle.addColorStop(0.5,"#FFE1E0");middle.addColorStop(1,"#FFF6DF");
  ctx.fillStyle=middle;ctx.fillRect(inner.l,inner.t,inner.r-inner.l,inner.b-inner.t);
  return canvas;
}
