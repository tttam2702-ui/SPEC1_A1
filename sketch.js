// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted implementation, revised into named helpers for this project.
// This file composes the landing artwork; p5.js and Matter.js remain separate libraries.

const W = 1920;
const H = 1080;
const FRAME = 0.2;
const LOGO_WIDTH = 850;
const LOGO_Y = 155;

// The pink stage and central circle share the same fixed design coordinates.
const AREA = {
  left: W * FRAME,
  right: W * (1 - FRAME),
  top: H * FRAME,
  bottom: H * (1 - FRAME),
};
const YELLOW = { x: W / 2, y: 555, r: 280 };
const MIN_BARCODES = 3;
const MAX_BARCODES = 5;

// Physics tuning was inspired by the supplied gravity-fall reference.
// https://giangnguyenday.github.io/oart1033-a2-s4135042/gravityfall.js
const BODY_OPTIONS = {
  restitution: 0.72,
  friction: 0.08,
  frictionAir: 0.004,
  density: 0.0012,
};
const PHYSICS_STEP = 1000 / 120;
const CEILING_CATEGORY = 0x0002;
const DROP_INTERVAL = 130;
const DROP_SCALE = 0.85;
const LOOK_INTERVAL = 180;
const FACE_COLORS = ["#08BEFF", "#FF2396", "#FDCFDE", "#FF6919", "#EE2724"];
const WALL_OPTIONS = { isStatic: true, friction: 0.08, restitution: 0 };

const LANDING_ASSET_PATHS = {
  logo: "assets/ME-MARTT_TITLE.png",
  cart: "assets/cart.png",
  bodyStatic: "assets/body-static.png",
  top1: "assets/body_top_1.png",
  top2: "assets/body_top_2.png",
  top3: "assets/body_top_3.png",
  down1: "assets/body_down_1.png",
  down2: "assets/body_down_2.png",
  down3: "assets/body_down_3.png",
  headphone: "assets/headphone.png",
  hirono: "assets/hirono.png",
  kodak_camera: "assets/kodak_camera.png",
  macbook: "assets/macbook.png",
  offer: "assets/offer.png",
  text: "assets/text.png",
  text2: "assets/Group 14.png",
};

// Each row is [asset, initial x, initial y, maximum width, maximum height].
const LANDING_PRODUCTS = [
  ["text", 530, 310, 280, 125],
  ["offer", 555, 455, 190, 190],
  ["headphone", 525, 565, 200, 200],
  ["macbook", 565, 700, 230, 180],
  ["text2", 1385, 310, 285, 125],
  ["hirono", 1380, 520, 205, 205],
  ["kodak_camera", 1370, 700, 205, 205],
];

const LANDING_NEON_STOPS = [
  [0.0, "#FF2396"],
  [0.15, "#FF4173"],
  [0.3, "#FF6919"],
  [0.48, "#FF9B00"],
  [0.65, "#FFD200"],
  [0.8, "#FFFA00"],
  [0.91, "#FFFF64"],
  [1.0, "#FFFFD7"],
];

// Four trapezoids form the perspective tunnel around the rectangular stage.
const LANDING_FRAME_PLANES = [
  {
    points: [
      [0, 0],
      [W, 0],
      [AREA.right, AREA.top],
      [AREA.left, AREA.top],
    ],
    from: [0, 0],
    to: [0, AREA.top],
  },
  {
    points: [
      [0, H],
      [W, H],
      [AREA.right, AREA.bottom],
      [AREA.left, AREA.bottom],
    ],
    from: [0, H],
    to: [0, AREA.bottom],
  },
  {
    points: [
      [0, 0],
      [AREA.left, AREA.top],
      [AREA.left, AREA.bottom],
      [0, H],
    ],
    from: [0, 0],
    to: [AREA.left, 0],
  },
  {
    points: [
      [W, 0],
      [W, H],
      [AREA.right, AREA.bottom],
      [AREA.right, AREA.top],
    ],
    from: [W, 0],
    to: [AREA.right, 0],
  },
];

let bgLayer;
let logo = null;
let pictures = {};
let pictureCrops = {};
let bodies = [];
let engine;
let scenery = [];
let accumulator = 0;
let dropClock = 0;
let assetsReady = false;
let selected = null;
let dragConstraint = null;
let activePointerId = null;
let canvasElement;
let barcodeCount = 0;
let currentOutfit;
let nextOutfitAt = 0;
let headDesign;
let frameArt;
let cartPass;
let landingAudio;
let landingAudioEnabled = false;
let landingAudioUnlocking = null;
let landingAudioState = "locked";
let landingPopCount = 0;
let lastMessagePopAt = -Infinity;
let landingAudioLeaving = false;

// Setup keeps rendering, physics and page-scoped sound responsibilities separate.
function setup() {
  createLandingCanvas();
  prepareLandingBackground();
  createLandingAmbientArt();
  createLandingPhysics();
  setupLandingAudio();
  bindPointerInteractions();
  document.addEventListener("site:aboutchange", endDrag);
  loadAssets();
}

function createLandingCanvas() {
  const canvas = createCanvas(W, H);
  canvas.parent(document.querySelector("main"));
  canvasElement = canvas.elt;
  canvasElement.setAttribute("role", "img");
  canvasElement.setAttribute(
    "aria-label",
    "ME-MARRT. Drag and toss the objects inside the pink rectangle. R resets the scene; S saves an image.",
  );
  pixelDensity(1);
  frameRate(60);
}

function prepareLandingBackground() {
  bgLayer = createGraphics(W, H);
  bgLayer.pixelDensity(1);
  paintBackground(bgLayer.drawingContext);
}

function createLandingAmbientArt() {
  const logoBounds = { x: W / 2 - LOGO_WIDTH / 2 - 20, y: 18, w: LOGO_WIDTH + 40, h: 268 };
  frameArt = new FrameArt(W, H, AREA, logoBounds, {
    onMessageAppear: () => playLandingMessagePop("appear"),
    onMessageDismiss: () => playLandingMessagePop("dismiss"),
  });
  cartPass = new CartPass(W, H);
}

function createLandingPhysics() {
  engine = Matter.Engine.create({
    positionIterations: 10,
    velocityIterations: 8,
    constraintIterations: 4,
  });
  engine.gravity.y = 1.2;
}

// Message pops belong to this page and stop before an internal navigation.
function setupLandingAudio() {
  landingAudio = new ChallengeAudio({
    paths: { pop: "sounds/pop.wav" },
    onState: updateLandingAudioState,
    onPlay: recordLandingSound,
  });
  bindLandingAudioUnlock();
  bindLandingAudioLifecycle();
  document.addEventListener("click", handleLandingNavigation, { capture: true });
  document.querySelector("main").dataset.audioScope = "landing";
}

function updateLandingAudioState(state) {
  landingAudioState = state;
  document.querySelector("main").dataset.audioState = state;
}

function recordLandingSound(name) {
  if (name === "pop") document.querySelector("main").dataset.audioPop = String(++landingPopCount);
}

function bindLandingAudioUnlock() {
  document.addEventListener("pointerdown", unlockLandingAudio, { capture: true });
  document.addEventListener("keydown", unlockLandingAudio, { capture: true });
  document.addEventListener("touchstart", unlockLandingAudio, { capture: true, passive: true });
}

function unlockLandingAudio() {
  if (landingAudioBlocked()) return;
  if (landingAudioUnlocking || (landingAudioEnabled && landingAudioState === "running")) return;
  const generation = landingAudio.generation;
  const attempt = landingAudio
    .unlock()
    .then(() => enableLandingAudio(generation))
    .finally(() => clearLandingAudioUnlock(attempt));
  landingAudioUnlocking = attempt;
}

function landingAudioBlocked() {
  return landingAudioLeaving || document.hidden || document.body.classList.contains("about-open");
}

function enableLandingAudio(generation) {
  if (!landingAudioLeaving && generation === landingAudio.generation) landingAudioEnabled = true;
}

function clearLandingAudioUnlock(attempt) {
  if (landingAudioUnlocking === attempt) landingAudioUnlocking = null;
}

function bindLandingAudioLifecycle() {
  document.addEventListener("site:aboutchange", handleLandingAudioAbout);
  document.addEventListener("visibilitychange", handleLandingAudioVisibility);
  window.addEventListener("pagehide", stopLandingAudio);
  window.addEventListener("pageshow", handleLandingPageShow);
}

function handleLandingAudioAbout(event) {
  if (event.detail.open) landingAudio.pause();
  else if (landingAudioEnabled && !document.hidden) landingAudio.resume();
}

function handleLandingAudioVisibility() {
  if (document.hidden) landingAudio.pause();
  else if (landingAudioEnabled && !document.body.classList.contains("about-open"))
    landingAudio.resume();
}

function handleLandingPageShow(event) {
  if (!event.persisted) return;
  landingAudioLeaving = false;
  document.querySelector("main").dataset.audioScope = "landing";
}

function handleLandingNavigation(event) {
  const link = landingNavigationLink(event);
  if (link && leavesLandingDocument(link)) stopLandingAudio();
}

function landingNavigationLink(event) {
  const link = event.target.closest?.("a[href]");
  if (!link || link.hasAttribute("download")) return null;
  if (link.target && link.target !== "_self") return null;
  if (event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    return null;
  return link;
}

function leavesLandingDocument(link) {
  const target = new URL(link.href, location.href);
  const current = new URL(location.href);
  if (!["http:", "https:"].includes(target.protocol)) return false;
  const samePage = target.origin === current.origin && target.pathname === current.pathname;
  return !(samePage && target.search === current.search && target.hash);
}

function stopLandingAudio() {
  landingAudioLeaving = true;
  landingAudioEnabled = false;
  landingAudioUnlocking = null;
  landingAudio?.stopAll();
  document.querySelector("main").dataset.audioScope = "off";
}

function playLandingMessagePop(kind) {
  if (!landingAudio || landingAudioBlocked()) return;
  if (kind === "appear" && (!landingAudioEnabled || landingAudioState !== "running")) return;
  const now = performance.now();
  if (now - lastMessagePopAt < 100) return;
  lastMessagePopAt = now;
  document.querySelector("main").dataset.lastPopEvent = kind;
  landingAudio.effect("pop", kind === "dismiss" ? 0.1 : 0.14, 2);
}

// Cache dimensions before constructing colliders; a late image must not resize a body.
function loadAssets() {
  Promise.all(Object.entries(LANDING_ASSET_PATHS).map(loadLandingAsset)).then(finishLandingAssets);
}

function loadLandingAsset([id, path]) {
  return new Promise((resolve) => {
    loadImage(
      path,
      (image) => acceptLandingAsset(id, image, resolve),
      (error) => acceptMissingLandingAsset(path, error, resolve),
    );
  });
}

function acceptLandingAsset(id, image, resolve) {
  cacheLandingAsset(id, image);
  resolve();
}

function cacheLandingAsset(id, image) {
  if (id === "logo") logo = image;
  else {
    pictures[id] = image;
    pictureCrops[id] = alphaBounds(image);
  }
}

function acceptMissingLandingAsset(path, error, resolve) {
  console.warn("Image not found: " + path, error);
  resolve();
}

function finishLandingAssets() {
  assetsReady = true;
  createScene();
  canvasElement.dataset.sceneReady = "true";
}

function fullImageBounds(image) {
  return { x: 0, y: 0, w: image.width, h: image.height };
}

function alphaBounds(img) {
  const full = fullImageBounds(img);
  try {
    img.loadPixels();
    if (!validImagePixels(img)) return full;
    const step = Math.max(1, Math.floor(Math.max(img.width, img.height) / 650));
    const bounds = scanAlphaBounds(img, step);
    return bounds.maxX < 0 ? full : padAlphaBounds(img, bounds, step);
  } catch (_) {
    return full;
  }
}

function validImagePixels(img) {
  return img.pixels && img.pixels.length >= img.width * img.height * 4;
}

function scanAlphaBounds(img, step) {
  const bounds = { minX: img.width, minY: img.height, maxX: -1, maxY: -1 };
  for (let y = 0; y < img.height; y += step) {
    for (let x = 0; x < img.width; x += step) includeOpaquePixel(img, bounds, x, y);
  }
  return bounds;
}

function includeOpaquePixel(img, bounds, x, y) {
  if (img.pixels[4 * (y * img.width + x) + 3] <= 20) return;
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function padAlphaBounds(img, bounds, step) {
  const x = Math.max(0, bounds.minX - step);
  const y = Math.max(0, bounds.minY - step);
  const right = Math.min(img.width, bounds.maxX + step + 1);
  const bottom = Math.min(img.height, bounds.maxY + step + 1);
  return { x, y, w: right - x, h: bottom - y };
}

function fitImageBody(b, crop) {
  const scale = Math.min(b.maxW / crop.w, b.maxH / crop.h);
  b.w = crop.w * scale;
  b.h = crop.h * scale;
}

function addBody(id, x, y, maxW, maxH, texture = null) {
  if (!texture && !pictures[id]) return;
  const b = makeLandingBodyRecord(id, maxW, maxH, texture);
  b.body = Matter.Bodies.rectangle(x, y, b.w, b.h, landingBodyOptions(id));
  bodies.push(b);
}

function makeLandingBodyRecord(id, maxW, maxH, texture) {
  const body = { id, maxW, maxH, w: maxW, h: maxH, crop: null, texture };
  if (pictures[id]) {
    body.crop = pictureCrops[id];
    fitImageBody(body, body.crop);
  }
  return body;
}

function landingBodyOptions(id) {
  return { ...BODY_OPTIONS, label: id, angle: random(-0.25, 0.25) };
}

function createScene() {
  if (!assetsReady) return;
  resetLandingPhysics();
  createLandingScenery();
  chooseStartingOutfit();
  headDesign = makeHeadDesign();
  createOriginalProducts();
  createSceneBarcodes();
  startEntrance();
  console.log("Random barcodes: " + barcodeCount);
}

function resetLandingPhysics() {
  endDrag();
  for (const body of bodies) if (body.texture) body.texture.remove();
  bodies = [];
  accumulator = 0;
  dropClock = 0;
  Matter.Composite.clear(engine.world, false);
  Matter.Engine.clear(engine);
}

function createLandingScenery() {
  scenery = [
    makeTopWall(),
    makeBottomWall(),
    makeLeftWall(),
    makeRightWall(),
    makeYellowObstacle(),
  ];
  Matter.Composite.add(engine.world, scenery);
}

function createLandingWall(x, y, width, height, options = {}) {
  return Matter.Bodies.rectangle(x, y, width, height, { ...WALL_OPTIONS, ...options });
}

function makeTopWall() {
  const x = (AREA.left + AREA.right) / 2;
  const width = AREA.right - AREA.left + 320;
  return createLandingWall(x, AREA.top - 80, width, 160, {
    collisionFilter: { category: CEILING_CATEGORY },
  });
}

function makeBottomWall() {
  const x = (AREA.left + AREA.right) / 2;
  return createLandingWall(x, AREA.bottom + 80, AREA.right - AREA.left + 320, 160);
}

function makeLeftWall() {
  const y = (AREA.top + AREA.bottom) / 2;
  return createLandingWall(AREA.left - 80, y, 160, AREA.bottom - AREA.top + 320);
}

function makeRightWall() {
  const y = (AREA.top + AREA.bottom) / 2;
  return createLandingWall(AREA.right + 80, y, 160, AREA.bottom - AREA.top + 320);
}

function makeYellowObstacle() {
  return Matter.Bodies.circle(
    YELLOW.x,
    YELLOW.y,
    YELLOW.r,
    {
      ...WALL_OPTIONS,
      label: "Fixed yellow circle",
    },
    80,
  );
}

function createOriginalProducts() {
  for (const [id, x, y, width, height] of LANDING_PRODUCTS) {
    addBody(id, x, y, width, height);
  }
}

function createSceneBarcodes() {
  barcodeCount = Math.floor(random(MIN_BARCODES, MAX_BARCODES + 1));
  for (let index = 0; index < barcodeCount; index++) addRandomBarcode(index);
}

function addRandomBarcode(index) {
  const blue = random() < 0.5;
  const id = "barcode_" + index;
  const width = random(170, 235);
  const height = random(58, 84);
  const x = index % 2 === 0 ? random(485, 630) : random(1290, 1435);
  const y = random(260, 740);
  const texture = makeBarcode(blue ? "#08BEFF" : "#FFF000");
  addBody(id, x, y, width, height, texture);
}

// The painting order keeps physics products behind the central character and title.
function draw() {
  imageMode(CORNER);
  image(bgLayer, 0, 0);
  frameArt.draw(drawingContext, millis());
  stepPhysics();
  drawYellowCircle();
  drawClippedBodies();
  drawCharacter();
  frameArt.drawTrackingLinks(drawingContext);
  drawLandingLogo();
  cartPass.draw(drawingContext, pictures.cart?.canvas, millis());
}

function drawYellowCircle() {
  noStroke();
  fill("#FFFF00");
  circle(YELLOW.x, YELLOW.y, YELLOW.r * 2);
}

function clipAssetRectangle(ctx) {
  ctx.beginPath();
  ctx.rect(AREA.left, AREA.top, AREA.right - AREA.left, AREA.bottom - AREA.top);
  ctx.clip();
}

function drawClippedBodies() {
  const ctx = drawingContext;
  ctx.save();
  clipAssetRectangle(ctx);
  for (const body of bodies) drawBody(body);
  ctx.restore();
}

function drawLandingLogo() {
  if (!logo || logo.width <= 0) return;
  const height = (LOGO_WIDTH * logo.height) / logo.width;
  imageMode(CENTER);
  image(logo, W / 2, LOGO_Y, LOGO_WIDTH, height);
  imageMode(CORNER);
}

function drawBody(b) {
  if (b.pending) return;
  const picture = b.texture || pictures[b.id];
  if (!picture || picture.width <= 0 || picture.height <= 0) return;
  push();
  translate(b.body.position.x, b.body.position.y);
  rotate(b.body.angle);
  imageMode(CORNER);
  drawBodyPicture(b, picture);
  trackBodyPicture(b, picture);
  pop();
}

function drawBodyPicture(body, picture) {
  if (body.crop && !body.texture) {
    drawCroppedImage(picture, -body.w / 2, -body.h / 2, body.w, body.h, body.crop);
  } else image(picture, -body.w / 2, -body.h / 2, body.w, body.h);
}

function drawCroppedImage(picture, x, y, width, height, crop) {
  image(picture, x, y, width, height, crop.x, crop.y, crop.w, crop.h);
}

function trackBodyPicture(body, picture) {
  if (body.entering) return;
  const crop = body.crop || fullImageBounds(picture);
  frameArt.trackImage(drawingContext, picture.canvas, crop, body.w, body.h, "asset:" + body.id);
}

function outfitLayer(asset, width, bottom) {
  const image = pictures[asset];
  const crop = pictureCrops[asset];
  if (!image || !crop) return;
  const height = (width * crop.h) / crop.w;
  push();
  imageMode(CORNER);
  drawCroppedImage(image, YELLOW.x - width / 2, bottom - height, width, height, crop);
  trackOutfitLayer(asset, image, crop, width, height, bottom);
  pop();
}

function trackOutfitLayer(asset, image, crop, width, height, bottom) {
  drawingContext.save();
  drawingContext.translate(YELLOW.x, bottom - height / 2);
  frameArt.trackImage(drawingContext, image.canvas, crop, width, height, "outfit:" + asset, 2);
  drawingContext.restore();
}

function chooseStartingOutfit() {
  currentOutfit = {
    top: Math.floor(random(1, 4)),
    bottom: Math.floor(random(1, 4)),
  };
  nextOutfitAt = millis() + LOOK_INTERVAL;
}

function chooseNextOutfit() {
  // Each cut chooses a different member of both garment groups.
  currentOutfit = {
    top: ((currentOutfit.top - 1 + Math.floor(random(1, 3))) % 3) + 1,
    bottom: ((currentOutfit.bottom - 1 + Math.floor(random(1, 3))) % 3) + 1,
  };
  headDesign = makeHeadDesign();
}

function drawOutfit() {
  drawOutfitPants();
  outfitLayer("top" + currentOutfit.top, 394, YELLOW.y + 4);
}

function drawOutfitPants() {
  const asset = "down" + currentOutfit.bottom;
  const crop = pictureCrops[asset];
  if (!crop) return;
  const height = 240;
  const top = YELLOW.y - 18;
  outfitLayer(asset, (height * crop.w) / crop.h, top + height);
}

function drawCharacter() {
  if (!pictures.bodyStatic || !currentOutfit) return;
  const now = millis();
  updateCharacterLook(now);
  clipCharacterCircle();
  drawRotatingBody(now);
  drawGenerativeHead();
  drawOutfit();
  drawingContext.restore();
}

function updateCharacterLook(now) {
  if (now < nextOutfitAt) return;
  chooseNextOutfit();
  nextOutfitAt = now + LOOK_INTERVAL;
}

function clipCharacterCircle() {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.arc(YELLOW.x, YELLOW.y, YELLOW.r - 4, 0, Math.PI * 2);
  drawingContext.clip();
}

function drawRotatingBody(now) {
  const bodyImage = pictures.bodyStatic;
  // Fitting the full PNG diagonal prevents clipping while the image rotates.
  const scale = ((YELLOW.r - 12) * 2) / Math.hypot(bodyImage.width, bodyImage.height);
  const width = bodyImage.width * scale;
  const height = bodyImage.height * scale;
  push();
  translate(YELLOW.x, YELLOW.y);
  rotate(now * 0.000075);
  imageMode(CORNER);
  image(bodyImage, -width / 2, -height / 2, width, height);
  trackRotatingBody(bodyImage, width, height);
  pop();
}

function trackRotatingBody(image, width, height) {
  frameArt.trackImage(
    drawingContext,
    image.canvas,
    fullImageBounds(image),
    width,
    height,
    "rotating-body",
    3,
  );
}

function distortedFaceShape(shape, width, height) {
  const count = [12, 4, 4, 3, 14][shape];
  const design = {
    shape,
    width,
    height,
    count,
    phase: shape === 1 ? (-Math.PI * 3) / 4 : -Math.PI / 2,
    skew: random(-0.28, 0.28),
    pinch: Math.floor(random(count)),
  };
  return Array.from({ length: count }, (_, index) => distortedFacePoint(design, index));
}

function distortedFacePoint(design, index) {
  const angle = design.phase + (index * Math.PI * 2) / design.count;
  let radius = random(0.78, 1.2);
  if (design.shape === 4 && index % 2) radius *= random(0.48, 0.72);
  if (index === design.pinch) radius *= random(0.58, 0.8);
  const y = ((Math.sin(angle) * design.height) / 2) * radius;
  return { x: ((Math.cos(angle) * design.width) / 2) * radius + y * design.skew, y };
}

function makeHeadDesign() {
  const previous = headDesign;
  const shape = previous ? (previous.shape + Math.floor(random(1, 5))) % 5 : Math.floor(random(5));
  const availableColors = FACE_COLORS.filter((color) => color !== previous?.color);
  return {
    shape,
    color: random(availableColors),
    outline: distortedFaceShape(shape, random(94, 113), random(94, 112)),
  };
}

function paintDistortedShape(points, color, smooth = false) {
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  if (smooth) traceSmoothFace(ctx, points);
  else traceAngularFace(ctx, points);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function traceSmoothFace(ctx, points) {
  const last = points[points.length - 1];
  ctx.moveTo((last.x + points[0].x) / 2, (last.y + points[0].y) / 2);
  for (let index = 0; index < points.length; index++) traceFaceCurve(ctx, points, index);
}

function traceFaceCurve(ctx, points, index) {
  const point = points[index];
  const next = points[(index + 1) % points.length];
  ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
}

function traceAngularFace(ctx, points) {
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
}

function drawGenerativeHead() {
  if (!headDesign) return;
  const design = headDesign;
  push();
  translate(YELLOW.x, YELLOW.y - 181);
  noStroke();
  fill(design.color);
  rect(-9, 12, 18, 52);
  paintDistortedShape(design.outline, design.color, design.shape === 0);
  pop();
}

// Balance the falling shower by body area, while retaining normal Matter contacts.
function startEntrance() {
  for (const body of bodies) scaleEntranceBody(body);
  const largestFirst = [...bodies].sort((a, b) => b.body.area - a.body.area);
  const sideArea = [0, 0];
  const laneWidth = (AREA.right - AREA.left - YELLOW.r * 2) / 2;
  largestFirst.forEach((body, index) => placeEntranceBody(body, index, sideArea, laneWidth));
}

function scaleEntranceBody(body) {
  body.w *= DROP_SCALE;
  body.h *= DROP_SCALE;
  Matter.Body.scale(body.body, DROP_SCALE, DROP_SCALE);
}

function placeEntranceBody(body, index, sideArea, laneWidth) {
  const side = sideArea[0] <= sideArea[1] ? 0 : 1;
  sideArea[side] += body.body.area;
  Matter.Body.setPosition(body.body, entrancePosition(body.body, side, laneWidth));
  configureFallingBody(body, index);
}

function entrancePosition(body, side, laneWidth) {
  const halfWidth = (body.bounds.max.x - body.bounds.min.x) / 2;
  const halfHeight = (body.bounds.max.y - body.bounds.min.y) / 2;
  const centerX = side === 0 ? AREA.left + laneWidth / 2 : AREA.right - laneWidth / 2;
  const jitter = Math.max(0, Math.min(14, laneWidth / 2 - halfWidth - 4));
  return { x: centerX + random(-jitter, jitter), y: AREA.top - halfHeight - 36 };
}

function configureFallingBody(body, index) {
  Matter.Body.setAngularVelocity(body.body, random(-0.03, 0.03));
  body.dropVelocity = { x: random(-0.35, 0.35), y: 1.8 };
  body.dropAt = index * DROP_INTERVAL;
  body.pending = true;
  body.entering = true;
  // Disable only the ceiling until this body has completely entered the stage.
  body.body.collisionFilter.mask &= ~CEILING_CATEGORY;
}

function releaseFallingBodies() {
  for (const body of bodies) {
    if (!body.pending || dropClock < body.dropAt) continue;
    body.pending = false;
    Matter.Body.setVelocity(body.body, body.dropVelocity);
    Matter.Composite.add(engine.world, body.body);
  }
}

function closeEntranceBehindBodies() {
  for (const body of bodies) {
    if (body.pending || !body.entering || !body.body.vertices.every(insideEntrance)) continue;
    body.entering = false;
    body.body.collisionFilter.mask |= CEILING_CATEGORY;
  }
}

function insideEntrance(vertex) {
  return vertex.y >= AREA.top - 8;
}

function freeCaughtEntrants() {
  for (const body of bodies) {
    if (body.pending || !body.entering || dropClock - body.dropAt < 1600) continue;
    nudgeEntrant(body);
  }
}

function nudgeEntrant(body) {
  const direction = body.body.position.x < YELLOW.x ? 1 : -1;
  Matter.Body.applyForce(
    body.body,
    {
      x: body.body.position.x,
      y: body.body.position.y - body.h / 3,
    },
    { x: direction * body.body.mass * 0.0005, y: body.body.mass * 0.0001 },
  );
}

// Fixed steps keep drags consistent; long inactive-tab gaps are discarded.
function stepPhysics(elapsed = deltaTime) {
  accumulator += Math.min(Math.max(elapsed, 0), 50);
  while (accumulator >= PHYSICS_STEP) advanceLandingPhysics();
}

function advanceLandingPhysics() {
  dropClock += PHYSICS_STEP;
  releaseFallingBodies();
  freeCaughtEntrants();
  Matter.Engine.update(engine, PHYSICS_STEP);
  closeEntranceBehindBodies();
  keepInsideScenery();
  accumulator -= PHYSICS_STEP;
}

function keepInsideScenery() {
  // Correct static penetration after drag springs; dynamic contacts stay with Matter.
  for (const body of bodies) keepBodyOutsideScenery(body);
}

function keepBodyOutsideScenery(body) {
  if (body.pending) return;
  const obstacles = body.entering ? scenery.slice(1) : scenery;
  for (let iteration = 0; iteration < 6; iteration++) {
    const collisions = Matter.Query.collides(body.body, obstacles);
    if (!collisions.length) break;
    const deepest = collisions.reduce((a, b) => (b.depth > a.depth ? b : a));
    separateFromScenery(body, deepest);
  }
}

function separateFromScenery(body, collision) {
  const direction = collision.bodyA === body.body ? 1 : -1;
  const normal = { x: collision.normal.x * direction, y: collision.normal.y * direction };
  Matter.Body.translate(body.body, {
    x: normal.x * (collision.depth + 0.01),
    y: normal.y * (collision.depth + 0.01),
  });
  if (body === selected) removeInwardDragVelocity(body.body, normal);
}

function removeInwardDragVelocity(body, normal) {
  const speed = body.velocity.x * normal.x + body.velocity.y * normal.y;
  if (speed >= 0) return;
  Matter.Body.setVelocity(body, {
    x: body.velocity.x - speed * normal.x,
    y: body.velocity.y - speed * normal.y,
  });
}

// Pointer positions are transformed back to the 1920 x 1080 design space.
function scenePoint(event) {
  const rect = canvasElement.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * W) / rect.width,
    y: ((event.clientY - rect.top) * H) / rect.height,
  };
}

function bodyAtPoint(point) {
  if (!pointInAssetArea(point)) return null;
  for (let index = bodies.length - 1; index >= 0; index--) {
    const body = bodies[index];
    if (body.pending || body.entering) continue;
    if (Matter.Query.point([body.body], point).length) return body;
  }
  return null;
}

function pointInAssetArea(point) {
  return (
    point.x >= AREA.left &&
    point.x <= AREA.right &&
    point.y >= AREA.top &&
    point.y <= AREA.bottom &&
    Math.hypot(point.x - YELLOW.x, point.y - YELLOW.y) > YELLOW.r
  );
}

function moveDrag(point) {
  if (!dragConstraint) return;
  const anchor = dragConstraint.pointB;
  const bounds = dragBounds(selected.body, anchor);
  dragConstraint.pointA.x = constrain(point.x, bounds.minX, bounds.maxX);
  dragConstraint.pointA.y = constrain(point.y, bounds.minY, bounds.maxY);
}

function dragBounds(body, anchor) {
  return {
    minX: AREA.left + body.position.x - body.bounds.min.x + anchor.x,
    maxX: AREA.right - body.bounds.max.x + body.position.x + anchor.x,
    minY: AREA.top + body.position.y - body.bounds.min.y + anchor.y,
    maxY: AREA.bottom - body.bounds.max.y + body.position.y + anchor.y,
  };
}

function beginDrag(point) {
  selected = bodyAtPoint(point);
  if (!selected) return false;
  dragConstraint = makeDragConstraint(selected.body, point);
  Matter.Composite.add(engine.world, dragConstraint);
  canvasElement.style.cursor = "grabbing";
  return true;
}

function makeDragConstraint(body, point) {
  return Matter.Constraint.create({
    pointA: { x: point.x, y: point.y },
    bodyB: body,
    pointB: bodyRelativePoint(body, point),
    length: 0,
    stiffness: 0.2,
    damping: 0.1,
  });
}

function bodyRelativePoint(body, point) {
  return { x: point.x - body.position.x, y: point.y - body.position.y };
}

function endDrag() {
  if (dragConstraint) Matter.Composite.remove(engine.world, dragConstraint);
  const pointerId = activePointerId;
  selected = null;
  dragConstraint = null;
  activePointerId = null;
  if (!canvasElement) return;
  canvasElement.style.cursor = "default";
  if (pointerId !== null && canvasElement.hasPointerCapture(pointerId)) {
    canvasElement.releasePointerCapture(pointerId);
  }
  // Retain velocity so releasing the spring becomes a throw.
}

function bindPointerInteractions() {
  canvasElement.addEventListener("pointerdown", startLandingPointer);
  canvasElement.addEventListener("pointermove", moveLandingPointer);
  canvasElement.addEventListener("pointerup", releaseLandingPointer);
  canvasElement.addEventListener("pointercancel", releaseLandingPointer);
  canvasElement.addEventListener("lostpointercapture", releaseLandingPointer);
  canvasElement.addEventListener("pointerleave", leaveLandingPointer);
  window.addEventListener("blur", endDrag);
  document.addEventListener("visibilitychange", hideLandingPointer);
}

function startLandingPointer(event) {
  if (activePointerId !== null || event.button !== 0) return;
  const point = scenePoint(event);
  if (dismissLandingMessage(point, event) || !beginDrag(point)) return;
  activePointerId = event.pointerId;
  canvasElement.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function dismissLandingMessage(point, event) {
  if (!frameArt.dismissMessageAt(point, millis())) return false;
  canvasElement.style.cursor = "default";
  event.preventDefault();
  return true;
}

function moveLandingPointer(event) {
  const point = scenePoint(event);
  if (activePointerId === event.pointerId) {
    moveDrag(point);
    event.preventDefault();
  } else if (activePointerId === null) updateLandingCursor(point);
}

function updateLandingCursor(point) {
  canvasElement.style.cursor = frameArt.messageAtPoint(point)
    ? "pointer"
    : bodyAtPoint(point)
      ? "grab"
      : "default";
}

function releaseLandingPointer(event) {
  if (event.pointerId === activePointerId) endDrag();
}

function leaveLandingPointer() {
  if (activePointerId === null) canvasElement.style.cursor = "default";
}

function hideLandingPointer() {
  if (!document.hidden) return;
  endDrag();
  accumulator = 0;
}

// Barcode bars and their twelve digits are generated afresh on each reset.
function makeBarcode(bgColor) {
  const graphics = createGraphics(260, 95);
  graphics.pixelDensity(1);
  graphics.background(bgColor);
  graphics.noStroke();
  graphics.fill(0);
  drawBarcodeBars(graphics);
  drawBarcodeDigits(graphics);
  return graphics;
}

function drawBarcodeBars(graphics) {
  let x = 12;
  while (x < 248) {
    const width = Math.floor(random(1, 6));
    const gap = Math.floor(random(1, 5));
    graphics.rect(x, 9, Math.min(width, 248 - x), 62);
    x += width + gap;
  }
}

function drawBarcodeDigits(graphics) {
  const digits = barcodeDigits();
  graphics.textFont("monospace");
  graphics.textSize(13);
  graphics.textAlign(CENTER, CENTER);
  graphics.text(digits, 130, 83);
}

function barcodeDigits() {
  let digits = "";
  for (let index = 0; index < 12; index++) digits += Math.floor(random(10));
  return digits;
}

function paintBackground(ctx) {
  for (const plane of LANDING_FRAME_PLANES) {
    gradientSide(ctx, plane.points, ...plane.from, ...plane.to);
  }
  paintPastelCenter(ctx);
}

function paintPastelCenter(ctx) {
  const gradient = ctx.createLinearGradient(0, AREA.top, 0, AREA.bottom);
  gradient.addColorStop(0, "#FDCFDE");
  gradient.addColorStop(0.5, "#FFE1E0");
  gradient.addColorStop(1, "#FFF6DF");
  ctx.fillStyle = gradient;
  ctx.fillRect(AREA.left, AREA.top, AREA.right - AREA.left, AREA.bottom - AREA.top);
}

function gradientSide(ctx, points, x1, y1, x2, y2) {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const [stop, color] of LANDING_NEON_STOPS) gradient.addColorStop(stop, color);
  traceBackgroundPolygon(ctx, points);
  ctx.fillStyle = gradient;
  ctx.fill();
}

function traceBackgroundPolygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
}

function keyPressed() {
  if (document.body.classList.contains("about-open")) return;
  if (key === "r" || key === "R") createScene();
  if (key === "s" || key === "S") saveCanvas("ME_MARRT_2D_1920x1080", "png");
}
