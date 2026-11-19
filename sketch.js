
const W = 1920;
const H = 1080;
const FRAME = 0.20;

// ===== LOGO =====
const LOGO_WIDTH = 850;
const LOGO_Y = 155;

// ===== PINK AREA =====
const AREA = {
  left: W * FRAME,
  right: W * (1 - FRAME),
  top: H * FRAME,
  bottom: H * (1 - FRAME)
};

// ===== YELLOW CIRCLE =====
const YELLOW = {
  x: W / 2,
  y: 555,
  r: 280
};

// ===== PHYSICS SETTINGS =====
const MIN_BARCODES = 3;
const MAX_BARCODES = 5;

// Match the reference's Matter.js gravity, bounce, friction and drag spring.
// https://giangnguyenday.github.io/oart1033-a2-s4135042/gravityfall.js
const BODY_OPTIONS = {
  restitution: 0.72,
  friction: 0.08,
  frictionAir: 0.004,
  density: 0.0012
};
const PHYSICS_STEP = 1000 / 120;
const CEILING_CATEGORY = 0x0002;
const DROP_INTERVAL = 130;
const DROP_SCALE = 0.85;
const LOOK_INTERVAL = 180;
const FACE_COLORS = ["#08BEFF", "#FF2396", "#FDCFDE", "#FF6919", "#EE2724"];

// ===== VARIABLES =====
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

// =====================================
// SETUP
// =====================================

function setup() {
  const canvas = createCanvas(W, H);
  canvas.parent(document.querySelector("main"));
  canvasElement = canvas.elt;
  canvasElement.setAttribute("role", "img");
  canvasElement.setAttribute("aria-label", "ME-MARRT. Drag and toss the objects inside the pink rectangle. R resets the scene; S saves an image.");
  pixelDensity(1);
  frameRate(60);

  bgLayer = createGraphics(W, H);
  bgLayer.pixelDensity(1);

  paintBackground(bgLayer.drawingContext);

  frameArt = new FrameArt(W, H, AREA, {
    x: W / 2 - LOGO_WIDTH / 2 - 20,
    y: 18,
    w: LOGO_WIDTH + 40,
    h: 268
  }, {
    onMessageAppear: () => playLandingMessagePop("appear"),
    onMessageDismiss: () => playLandingMessagePop("dismiss")
  });
  cartPass = new CartPass(W, H);

  engine = Matter.Engine.create({
    positionIterations: 10,
    velocityIterations: 8,
    constraintIterations: 4
  });
  engine.gravity.y = 1.2;
  setupLandingAudio();

  bindPointerInteractions();
  document.addEventListener("site:aboutchange", endDrag);
  loadAssets();
}

// Message pops are scoped to this landing document and its navigation lifetime.
function setupLandingAudio() {
  const stage = document.querySelector("main");
  landingAudio = new ChallengeAudio({
    paths: { pop: "sounds/pop.wav" },
    onState: state => { landingAudioState = state; stage.dataset.audioState = state; },
    onPlay: name => {
      if (name === "pop") stage.dataset.audioPop = String(++landingPopCount);
    }
  });
  const unlock = () => {
    if (landingAudioLeaving || document.hidden || document.body.classList.contains("about-open")) return;
    if (landingAudioUnlocking || landingAudioEnabled && landingAudioState === "running") return;
    const generation = landingAudio.generation;
    const attempt = landingAudio.unlock().then(() => {
      if (!landingAudioLeaving && generation === landingAudio.generation) landingAudioEnabled = true;
    }).finally(() => { if (landingAudioUnlocking === attempt) landingAudioUnlocking = null; });
    landingAudioUnlocking = attempt;
  };
  document.addEventListener("pointerdown", unlock, { capture: true });
  document.addEventListener("keydown", unlock, { capture: true });
  document.addEventListener("touchstart", unlock, { capture: true, passive: true });
  document.addEventListener("site:aboutchange", event => {
    if (event.detail.open) landingAudio.pause();
    else if (landingAudioEnabled && !document.hidden) landingAudio.resume();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) landingAudio.pause();
    else if (landingAudioEnabled && !document.body.classList.contains("about-open")) landingAudio.resume();
  });
  document.addEventListener("click", event => {
    const link = event.target.closest?.("a[href]");
    if (!link || link.hasAttribute("download") || link.target && link.target !== "_self"
        || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = new URL(link.href, location.href), current = new URL(location.href);
    if (!["http:", "https:"].includes(target.protocol)) return;
    if (target.origin === current.origin && target.pathname === current.pathname
        && target.search === current.search && target.hash) return;
    stopLandingAudio();
  }, { capture: true });
  window.addEventListener("pagehide", stopLandingAudio);
  window.addEventListener("pageshow", event => {
    if (event.persisted) { landingAudioLeaving = false; stage.dataset.audioScope = "landing"; }
  });
  stage.dataset.audioScope = "landing";
}

function stopLandingAudio() {
  landingAudioLeaving = true;
  landingAudioEnabled = false;
  landingAudioUnlocking = null;
  landingAudio?.stopAll();
  document.querySelector("main").dataset.audioScope = "off";
}

function playLandingMessagePop(kind) {
  if (!landingAudio || landingAudioLeaving || document.hidden || document.body.classList.contains("about-open")) return;
  if (kind === "appear" && (!landingAudioEnabled || landingAudioState !== "running")) return;
  const now = performance.now();
  if (now-lastMessagePopAt < 100) return;
  lastMessagePopAt=now;
  document.querySelector("main").dataset.lastPopEvent=kind;
  landingAudio.effect("pop",kind === "dismiss" ? .1 : .14,2);
}

// =====================================
// LOAD ASSETS
// =====================================

function loadAssets() {
  const paths = {
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
    text2: "assets/Group 14.png"
  };

  // Finish sizing every image before creating colliders, so loading cannot
  // resize bodies in the middle of a collision.
  Promise.all(Object.entries(paths).map(([id, path]) => new Promise(resolve => {
    loadImage(path, img => {
      if (id === "logo") {
        logo = img;
      } else {
        pictures[id] = img;
        pictureCrops[id] = alphaBounds(img);
      }
      resolve();
    }, err => {
      console.warn("Image not found: " + path, err);
      resolve();
    });
  }))).then(() => {
    assetsReady = true;
    createScene();
    canvasElement.dataset.sceneReady = "true";
  });
}

// =====================================
// DETECT VISIBLE PNG AREA
// =====================================

function alphaBounds(img) {
  const full = {
    x: 0,
    y: 0,
    w: img.width,
    h: img.height
  };

  try {
    img.loadPixels();

    const pix = img.pixels;

    if (
      !pix ||
      pix.length < img.width * img.height * 4
    ) {
      return full;
    }

    const step = Math.max(
      1,
      Math.floor(
        Math.max(img.width, img.height) / 650
      )
    );

    let minX = img.width;
    let minY = img.height;
    let maxX = -1;
    let maxY = -1;

    for (
      let y = 0;
      y < img.height;
      y += step
    ) {
      for (
        let x = 0;
        x < img.width;
        x += step
      ) {
        const alpha =
          pix[4 * (y * img.width + x) + 3];

        if (alpha > 20) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < 0) return full;

    minX = Math.max(0, minX - step);
    minY = Math.max(0, minY - step);

    maxX = Math.min(
      img.width,
      maxX + step + 1
    );

    maxY = Math.min(
      img.height,
      maxY + step + 1
    );

    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY
    };

  } catch (e) {
    return full;
  }
}

// =====================================
// FIT ORIGINAL PNG PROPORTIONS
// =====================================

function fitImageBody(b, crop) {
  const scale = Math.min(
    b.maxW / crop.w,
    b.maxH / crop.h
  );

  b.w = crop.w * scale;
  b.h = crop.h * scale;
}

// =====================================
// CREATE PHYSICS BODY
// =====================================

function addBody(
  id,
  x,
  y,
  maxW,
  maxH,
  texture = null
) {
  if (!texture && !pictures[id]) return;

  const b = {
    id,
    maxW,
    maxH,
    w: maxW,
    h: maxH,
    crop: null,
    texture
  };

  if (pictures[id]) {
    b.crop = pictureCrops[id];
    fitImageBody(b, b.crop);
  }

  b.body = Matter.Bodies.rectangle(x, y, b.w, b.h, {
    ...BODY_OPTIONS,
    label: id,
    angle: random(-0.25, 0.25)
  });

  bodies.push(b);
}

// =====================================
// CREATE SCENE
// =====================================

function createScene() {
  if (!assetsReady) return;

  endDrag();
  for (const b of bodies) {
    if (b.texture) b.texture.remove();
  }
  bodies = [];
  accumulator = 0;
  dropClock = 0;
  Matter.Composite.clear(engine.world, false);
  Matter.Engine.clear(engine);

  const thickness = 160;
  const width = AREA.right - AREA.left;
  const height = AREA.bottom - AREA.top;
  const middleX = (AREA.left + AREA.right) / 2;
  const middleY = (AREA.top + AREA.bottom) / 2;
  const wallOptions = { isStatic: true, friction: 0.08, restitution: 0 };

  // The four inner edges line up exactly with the pink rectangle.
  scenery = [
    Matter.Bodies.rectangle(middleX, AREA.top - thickness / 2, width + 2 * thickness, thickness, {
      ...wallOptions,
      collisionFilter: { category: CEILING_CATEGORY }
    }),
    Matter.Bodies.rectangle(middleX, AREA.bottom + thickness / 2, width + 2 * thickness, thickness, wallOptions),
    Matter.Bodies.rectangle(AREA.left - thickness / 2, middleY, thickness, height + 2 * thickness, wallOptions),
    Matter.Bodies.rectangle(AREA.right + thickness / 2, middleY, thickness, height + 2 * thickness, wallOptions),
    Matter.Bodies.circle(YELLOW.x, YELLOW.y, YELLOW.r, {
      ...wallOptions,
      label: "Fixed yellow circle"
    }, 80)
  ];
  Matter.Composite.add(engine.world, scenery);

  chooseStartingOutfit();
  headDesign = makeHeadDesign();

  // ===== LARGER ORIGINAL PNGS =====
  // Left side

  addBody(
    "text",
    530, 310,
    280, 125
  );

  addBody(
    "offer",
    555, 455,
    190, 190
  );

  addBody(
    "headphone",
    525, 565,
    200, 200
  );

  addBody(
    "macbook",
    565, 700,
    230, 180
  );

  // Right side

  addBody(
    "text2",
    1385, 310,
    285, 125
  );

  addBody(
    "hirono",
    1380, 520,
    205, 205
  );

  addBody(
    "kodak_camera",
    1370, 700,
    205, 205
  );

  // ===== RANDOM NUMBER OF BARCODES =====

  barcodeCount = Math.floor(
    random(
      MIN_BARCODES,
      MAX_BARCODES + 1
    )
  );

  for (let i = 0; i < barcodeCount; i++) {

    const blue = random() < 0.5;

    const id = "barcode_" + i;

    const barWidth = random(170, 235);
    const barHeight = random(58, 84);

    const side = i % 2;

    // Distributed on both sides
    const x = side === 0
      ? random(485, 630)
      : random(1290, 1435);

    const y = random(260, 740);

    const texture = makeBarcode(
      blue ? "#08BEFF" : "#FFF000"
    );

    addBody(
      id,
      x,
      y,
      barWidth,
      barHeight,
      texture
    );
  }

  startEntrance();

  console.log(
    "Random barcodes: " + barcodeCount
  );
}

// =====================================
// MAIN DRAW LOOP
// =====================================

function draw() {

  // 1. Original gradient
  imageMode(CORNER);
  image(bgLayer, 0, 0);

  frameArt.draw(drawingContext, millis());

  // 2. Update physics
  stepPhysics();

  // 3. The original circle stays still while its central character animates.
  noStroke();
  fill("#FFFF00");
  circle(YELLOW.x, YELLOW.y, YELLOW.r * 2);

  // 4. Clip to pink rectangle
  const ctx = drawingContext;

  ctx.save();
  ctx.beginPath();

  ctx.rect(
    AREA.left,
    AREA.top,
    AREA.right - AREA.left,
    AREA.bottom - AREA.top
  );

  ctx.clip();

  // 5. Draw surrounding PNGs
  for (const b of bodies) {
    drawBody(b);
  }

  ctx.restore();

  drawCharacter();
  frameArt.drawTrackingLinks(drawingContext);

  // Original title logo
  if (logo && logo.width > 0) {

    const logoH =
      LOGO_WIDTH * logo.height / logo.width;

    imageMode(CENTER);

    image(
      logo,
      W / 2,
      LOGO_Y,
      LOGO_WIDTH,
      logoH
    );

    imageMode(CORNER);
  }

  // The cart is painted on the canvas; the HTML offer button stays above it.
  cartPass.draw(drawingContext, pictures.cart?.canvas, millis());
}

// =====================================
// DRAW PNG — NO EXTRA EFFECTS
// =====================================

function drawBody(b) {
  if (b.pending) return;

  const pic =
    b.texture || pictures[b.id];

  if (
    !pic ||
    pic.width <= 0 ||
    pic.height <= 0
  ) {
    return;
  }

  push();
  translate(b.body.position.x, b.body.position.y);
  rotate(b.body.angle);
  imageMode(CORNER);

  if (b.crop && !b.texture) {

    // Draw only visible part of PNG
    image(
      pic,
      -b.w / 2,
      -b.h / 2,
      b.w,
      b.h,
      b.crop.x,
      b.crop.y,
      b.crop.w,
      b.crop.h
    );

  } else {

    image(
      pic,
      -b.w / 2,
      -b.h / 2,
      b.w,
      b.h
    );
  }
  if (!b.entering) {
    frameArt.trackImage(drawingContext, pic.canvas,
      b.crop || { x: 0, y: 0, w: pic.width, h: pic.height },
      b.w, b.h, `asset:${b.id}`);
  }
  pop();
}

function outfitLayer(asset, width, bottom) {
  const img = pictures[asset];
  const crop = pictureCrops[asset];
  if (!img || !crop) return;

  const height = width * crop.h / crop.w;
  push();
  imageMode(CORNER);
  image(
    img,
    YELLOW.x - width / 2,
    bottom - height,
    width,
    height,
    crop.x,
    crop.y,
    crop.w,
    crop.h
  );
  drawingContext.save();
  drawingContext.translate(YELLOW.x, bottom - height / 2);
  frameArt.trackImage(drawingContext, img.canvas, crop, width, height, `outfit:${asset}`, 2);
  drawingContext.restore();
  pop();
}

function chooseStartingOutfit() {
  currentOutfit = {
    top: Math.floor(random(1, 4)),
    bottom: Math.floor(random(1, 4))
  };
  nextOutfitAt = millis() + LOOK_INTERVAL;
}

function chooseNextOutfit() {
  // Both groups change on every cut, with no immediate repeated garment.
  currentOutfit = {
    top: (currentOutfit.top - 1 + Math.floor(random(1, 3))) % 3 + 1,
    bottom: (currentOutfit.bottom - 1 + Math.floor(random(1, 3))) % 3 + 1
  };
  headDesign = makeHeadDesign();
}

function drawOutfit() {
  const pants = `down${currentOutfit.bottom}`;
  const pantsCrop = pictureCrops[pants];
  if (pantsCrop) {
    const pantsHeight = 240;
    // The waistband begins above the shirt hem, keeping every pairing joined.
    const pantsTop = YELLOW.y - 18;
    outfitLayer(pants, pantsHeight * pantsCrop.w / pantsCrop.h, pantsTop + pantsHeight);
  }
  outfitLayer(`top${currentOutfit.top}`, 394, YELLOW.y + 4);
}

function drawCharacter() {
  if (!pictures.bodyStatic || !currentOutfit) return;

  const now = millis();
  if (now >= nextOutfitAt) {
    chooseNextOutfit();
    nextOutfitAt = now + LOOK_INTERVAL;
  }

  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(YELLOW.x, YELLOW.y, YELLOW.r - 4, 0, Math.PI * 2);
  ctx.clip();

  // Draw the whole PNG. Its full diagonal fits inside the circle, so no part
  // gets cut off as it rotates. Image source coordinates always start at 0,0.
  const bodyImage = pictures.bodyStatic;
  const bodyScale = (YELLOW.r - 12) * 2 / Math.hypot(bodyImage.width, bodyImage.height);
  const bodyWidth = bodyImage.width * bodyScale;
  const bodyHeight = bodyImage.height * bodyScale;
  push();
  translate(YELLOW.x, YELLOW.y);
  rotate(now * 0.000075);
  imageMode(CORNER);
  image(bodyImage, -bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight);
  frameArt.trackImage(drawingContext, bodyImage.canvas,
    { x: 0, y: 0, w: bodyImage.width, h: bodyImage.height },
    bodyWidth, bodyHeight, "rotating-body", 3);
  pop();

  // Layer order: rotating body, generated head shape, then clothing.
  drawGenerativeHead();
  drawOutfit();
  ctx.restore();
}

function distortedFaceShape(shape, width, height) {
  const count = [12, 4, 4, 3, 14][shape];
  const phase = shape === 1 ? -Math.PI * 3 / 4 : -Math.PI / 2;
  const skew = random(-0.28, 0.28);
  const pinch = Math.floor(random(count));

  return Array.from({ length: count }, (_, index) => {
    const angle = phase + index * Math.PI * 2 / count;
    let radius = random(0.78, 1.2);
    if (shape === 4 && index % 2) radius *= random(0.48, 0.72);
    if (index === pinch) radius *= random(0.58, 0.8);
    // Every outline is newly stretched, dented and skewed rather than picked
    // from a fixed collection of perfect shapes.
    const y = Math.sin(angle) * height / 2 * radius;
    return {
      x: Math.cos(angle) * width / 2 * radius + y * skew,
      y
    };
  });
}

function makeHeadDesign() {
  const previous = headDesign;
  const shape = previous
    ? (previous.shape + Math.floor(random(1, 5))) % 5
    : Math.floor(random(5));
  const availableColors = FACE_COLORS.filter(color => color !== previous?.color);

  return {
    shape,
    color: random(availableColors),
    outline: distortedFaceShape(shape, random(94, 113), random(94, 112))
  };
}

function paintDistortedShape(points, color, smooth = false) {
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  if (smooth) {
    const last = points[points.length - 1];
    ctx.moveTo((last.x + points[0].x) / 2, (last.y + points[0].y) / 2);
    for (let index = 0; index < points.length; index++) {
      const point = points[index];
      const next = points[(index + 1) % points.length];
      ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
  } else {
    ctx.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawGenerativeHead() {
  if (!headDesign) return;
  const d = headDesign;
  push();
  translate(YELLOW.x, YELLOW.y - 181);
  noStroke();
  fill(d.color);
  rect(-9, 12, 18, 52);
  paintDistortedShape(d.outline, d.color, d.shape === 0);
  pop();
}

// =====================================
// RIGID-BODY PHYSICS
// =====================================

function startEntrance() {
  // Give the falling stacks room to settle around the large fixed circle.
  for (const b of bodies) {
    b.w *= DROP_SCALE;
    b.h *= DROP_SCALE;
    Matter.Body.scale(b.body, DROP_SCALE, DROP_SCALE);
  }

  // Alternate the heavier objects between both sides so the opening shower
  // makes balanced piles around the fixed circle.
  const largestFirst = [...bodies].sort((a, b) => b.body.area - a.body.area);
  const sideArea = [0, 0];
  const laneWidth = (AREA.right - AREA.left - YELLOW.r * 2) / 2;

  largestFirst.forEach((b, index) => {
    const side = sideArea[0] <= sideArea[1] ? 0 : 1;
    sideArea[side] += b.body.area;
    const halfWidth = (b.body.bounds.max.x - b.body.bounds.min.x) / 2;
    const halfHeight = (b.body.bounds.max.y - b.body.bounds.min.y) / 2;
    const centerX = side === 0
      ? AREA.left + laneWidth / 2
      : AREA.right - laneWidth / 2;
    const jitter = Math.max(0, Math.min(14, laneWidth / 2 - halfWidth - 4));

    Matter.Body.setPosition(b.body, {
      x: centerX + random(-jitter, jitter),
      y: AREA.top - halfHeight - 36
    });
    Matter.Body.setAngularVelocity(b.body, random(-0.03, 0.03));
    b.dropVelocity = { x: random(-0.35, 0.35), y: 1.8 };
    b.dropAt = index * DROP_INTERVAL;
    b.pending = true;
    b.entering = true;

    // Each falling object can pass through the ceiling once. It collides with
    // the circle, walls, floor and other objects throughout its descent.
    b.body.collisionFilter.mask &= ~CEILING_CATEGORY;
  });
}

function releaseFallingBodies() {
  for (const b of bodies) {
    if (b.pending && dropClock >= b.dropAt) {
      b.pending = false;
      Matter.Body.setVelocity(b.body, b.dropVelocity);
      Matter.Composite.add(engine.world, b.body);
    }
  }
}

function closeEntranceBehindBodies() {
  for (const b of bodies) {
    if (!b.pending && b.entering && b.body.vertices.every(vertex => vertex.y >= AREA.top - 8)) {
      b.entering = false;
      b.body.collisionFilter.mask |= CEILING_CATEGORY;
    }
  }
}

function freeCaughtEntrants() {
  for (const b of bodies) {
    if (b.pending || !b.entering || dropClock - b.dropAt < 1600) continue;
    // A late arrival can balance on a pile at the opening. A small inward
    // nudge at its upper edge lets it tip naturally into the remaining space.
    const direction = b.body.position.x < YELLOW.x ? 1 : -1;
    Matter.Body.applyForce(b.body, {
      x: b.body.position.x,
      y: b.body.position.y - b.h / 3
    }, {
      x: direction * b.body.mass * 0.0005,
      y: b.body.mass * 0.0001
    });
  }
}

function stepPhysics(elapsed = deltaTime) {
  // A fixed 120 Hz step keeps throws and collisions consistent across displays.
  // Discard long background-tab pauses rather than simulating a huge jump.
  accumulator += Math.min(Math.max(elapsed, 0), 50);
  while (accumulator >= PHYSICS_STEP) {
    dropClock += PHYSICS_STEP;
    releaseFallingBodies();
    freeCaughtEntrants();
    Matter.Engine.update(engine, PHYSICS_STEP);
    closeEntranceBehindBodies();
    keepInsideScenery();
    accumulator -= PHYSICS_STEP;
  }
}

function keepInsideScenery() {
  // Matter solves drag springs again after contacts. Correct any remaining
  // static penetration so a strong drag cannot hide an asset behind the circle
  // or clip it through the rectangle. Dynamic contacts still use Matter.
  for (const b of bodies) {
    if (b.pending) continue;
    const obstacles = b.entering ? scenery.slice(1) : scenery;
    for (let iteration = 0; iteration < 6; iteration++) {
      const collisions = Matter.Query.collides(b.body, obstacles);
      if (!collisions.length) break;
      const collision = collisions.reduce((a, c) => c.depth > a.depth ? c : a);
      const direction = collision.bodyA === b.body ? 1 : -1;
      const normal = {
        x: collision.normal.x * direction,
        y: collision.normal.y * direction
      };
      Matter.Body.translate(b.body, {
        x: normal.x * (collision.depth + 0.01),
        y: normal.y * (collision.depth + 0.01)
      });

      if (b === selected) {
        const speed = b.body.velocity.x * normal.x + b.body.velocity.y * normal.y;
        if (speed < 0) {
          Matter.Body.setVelocity(b.body, {
            x: b.body.velocity.x - speed * normal.x,
            y: b.body.velocity.y - speed * normal.y
          });
        }
      }
    }
  }
}

// =====================================
// MOUSE, PEN AND TOUCH INTERACTION
// =====================================

function scenePoint(event) {
  const rect = canvasElement.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * W / rect.width,
    y: (event.clientY - rect.top) * H / rect.height
  };
}

function bodyAtPoint(point) {
  if (
    point.x < AREA.left || point.x > AREA.right ||
    point.y < AREA.top || point.y > AREA.bottom ||
    Math.hypot(point.x - YELLOW.x, point.y - YELLOW.y) <= YELLOW.r
  ) return null;

  // Query the rotated collision shapes in the same order as they are painted.
  for (let i = bodies.length - 1; i >= 0; i--) {
    if (bodies[i].pending || bodies[i].entering) continue;
    if (Matter.Query.point([bodies[i].body], point).length) return bodies[i];
  }
  return null;
}

function moveDrag(point) {
  if (!dragConstraint) return;

  const body = selected.body;
  const anchor = dragConstraint.pointB;
  // Keep the whole rotated body inside the rectangle even if the pointer exits.
  const minX = AREA.left + body.position.x - body.bounds.min.x;
  const maxX = AREA.right - body.bounds.max.x + body.position.x;
  const minY = AREA.top + body.position.y - body.bounds.min.y;
  const maxY = AREA.bottom - body.bounds.max.y + body.position.y;
  dragConstraint.pointA.x = constrain(point.x, minX + anchor.x, maxX + anchor.x);
  dragConstraint.pointA.y = constrain(point.y, minY + anchor.y, maxY + anchor.y);
}

function beginDrag(point) {
  selected = bodyAtPoint(point);
  if (!selected) return false;

  dragConstraint = Matter.Constraint.create({
    pointA: { x: point.x, y: point.y },
    bodyB: selected.body,
    pointB: {
      x: point.x - selected.body.position.x,
      y: point.y - selected.body.position.y
    },
    length: 0,
    stiffness: 0.2,
    damping: 0.1
  });
  Matter.Composite.add(engine.world, dragConstraint);
  canvasElement.style.cursor = "grabbing";
  return true;
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
  // Leave linear and angular velocity intact: releasing a drag becomes a throw.
}

function bindPointerInteractions() {
  canvasElement.addEventListener("pointerdown", event => {
    if (activePointerId !== null || event.button !== 0) return;
    const point = scenePoint(event);
    if (frameArt.dismissMessageAt(point, millis())) {
      canvasElement.style.cursor = "default";
      event.preventDefault();
      return;
    }
    if (!beginDrag(point)) return;
    activePointerId = event.pointerId;
    canvasElement.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  canvasElement.addEventListener("pointermove", event => {
    const point = scenePoint(event);
    if (activePointerId === event.pointerId) {
      moveDrag(point);
      event.preventDefault();
    } else if (activePointerId === null) {
      canvasElement.style.cursor = frameArt.messageAtPoint(point)
        ? "pointer" : bodyAtPoint(point) ? "grab" : "default";
    }
  });

  const release = event => {
    if (event.pointerId === activePointerId) endDrag();
  };
  canvasElement.addEventListener("pointerup", release);
  canvasElement.addEventListener("pointercancel", release);
  canvasElement.addEventListener("lostpointercapture", release);
  canvasElement.addEventListener("pointerleave", () => {
    if (activePointerId === null) canvasElement.style.cursor = "default";
  });
  window.addEventListener("blur", endDrag);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      endDrag();
      accumulator = 0;
    }
  });
}

// =====================================
// GENERATIVE BARCODES
// =====================================

function makeBarcode(bgColor) {

  const g = createGraphics(260, 95);

  g.pixelDensity(1);
  g.background(bgColor);

  g.noStroke();
  g.fill(0);

  let x = 12;

  while (x < 248) {

    const width = Math.floor(
      random(1, 6)
    );

    const gap = Math.floor(
      random(1, 5)
    );

    g.rect(
      x,
      9,
      Math.min(width, 248 - x),
      62
    );

    x += width + gap;
  }

  // Random barcode number
  let digits = "";

  for (let i = 0; i < 12; i++) {
    digits += Math.floor(random(10));
  }

  g.textFont("monospace");
  g.textSize(13);
  g.textAlign(CENTER, CENTER);

  g.text(
    digits,
    130,
    83
  );

  return g;
}

// =====================================
// ORIGINAL BACKGROUND
// =====================================

function paintBackground(ctx) {

  const L = AREA.left;
  const R = AREA.right;
  const T = AREA.top;
  const B = AREA.bottom;

  // TOP
  gradientSide(
    ctx,
    [[0, 0], [W, 0], [R, T], [L, T]],
    0, 0, 0, T
  );

  // BOTTOM
  gradientSide(
    ctx,
    [[0, H], [W, H], [R, B], [L, B]],
    0, H, 0, B
  );

  // LEFT
  gradientSide(
    ctx,
    [[0, 0], [L, T], [L, B], [0, H]],
    0, 0, L, 0
  );

  // RIGHT
  gradientSide(
    ctx,
    [[W, 0], [W, H], [R, B], [R, T]],
    W, 0, R, 0
  );

  // CENTRE PASTEL
  const g = ctx.createLinearGradient(
    0, T,
    0, B
  );

  g.addColorStop(0, "#FDCFDE");
  g.addColorStop(0.5, "#FFE1E0");
  g.addColorStop(1, "#FFF6DF");

  ctx.fillStyle = g;

  ctx.fillRect(
    L,
    T,
    R - L,
    B - T
  );
}

// =====================================
// NEON GRADIENT FRAME
// =====================================

function gradientSide(
  ctx,
  points,
  x1, y1,
  x2, y2
) {

  const g = ctx.createLinearGradient(
    x1, y1,
    x2, y2
  );

  const stops = [
    [0.00, "#FF2396"],
    [0.15, "#FF4173"],
    [0.30, "#FF6919"],
    [0.48, "#FF9B00"],
    [0.65, "#FFD200"],
    [0.80, "#FFFA00"],
    [0.91, "#FFFF64"],
    [1.00, "#FFFFD7"]
  ];

  for (const [t, color] of stops) {
    g.addColorStop(t, color);
  }

  ctx.beginPath();

  ctx.moveTo(
    points[0][0],
    points[0][1]
  );

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(
      points[i][0],
      points[i][1]
    );
  }

  ctx.closePath();

  ctx.fillStyle = g;
  ctx.fill();
}

// =====================================
// KEYBOARD CONTROLS
// =====================================

function keyPressed() {
  if (document.body.classList.contains("about-open")) return;

  // Reset + generate new barcodes
  if (key === "r" || key === "R") {
    createScene();
  }

  // Save Full HD PNG
  if (key === "s" || key === "S") {
    saveCanvas(
      "ME_MARRT_2D_1920x1080",
      "png"
    );
  }
}
