// SPDX-License-Identifier: GPL-3.0-or-later
// ME-MARRT — Tran Thanh Tam (s3977954), SCP_067.
// AI-assisted, edited and commented for this project. See AI_ASSISTANCE.md.
// All application JavaScript lives here. Both HTML pages load this same p5 sketch.
// The p5.js and p5.sound libraries are loaded separately from a version-pinned CDN.
//
// READING ORDER
// 1. Shared canvas, colours and sounds.
// 2. p5 lifecycle and input routing.
// 3. Navigation, fullscreen and About (p5 DOM).
// 4. Landing: falling products, outfit, head and passing cart.
// 5. FrameArt: the preserved tracking/message artwork (advanced Canvas 2D).
// 6. Challenge: collection, melting stages, sounds and return timer.
// 7. ConsumptionMelt + DatamoshFeedback: purchased goods break into the original glitch texture.
// 8. Sale labels, click cues and scrolling promotions.
// 9. Product identity: the collected goods replace the shopper.
// 10. Startup recovery for direct file:// launches.

// 1. SHARED CANVAS AND SOUND

// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted code, simplified and commented for the course's p5.js topics.
// Both pages use the same canvas, colours, background and basic sound functions.
const W = 1920;
const H = 1080;
const PALETTE = ["#087CFF", "#FF2396", "#FFFF00", "#EE2724", "#00E000", "#FFF6DF"];
const SOUND_PATHS = {
  pop: "sounds/COMM2754-26t3-A1-s3977954_TranThanhTam_Message_Pop.wav",
  item: "sounds/COMM2754-26t3-A1-s3977954_TranThanhTam_Challenge_Click.wav",
  start: "sounds/COMM2754-26t3-A1-s3977954_TranThanhTam_Game_Start.wav",
  datamosh: "sounds/COMM2754-26t3-A1-s3977954_TranThanhTam_Datamosh.wav",
  notification: "sounds/COMM2754-26t3-A1-s3977954_TranThanhTam_Notification_Appear.wav",
  ok: "sounds/COMM2754-26t3-A1-s3977954_TranThanhTam_End_Click.wav",
  transition: "sounds/COMM2754-26t3-A1-s3977954_TranThanhTam_Transition.wav",
};
let aboutOpen = false;
let soundReady = false;
let audioExiting = false;
let projectSounds = {};
let soundNames = [];

function makeCanvas(label) {
  pixelDensity(1);
  let canvas = createCanvas(W, H);
  canvas.parent(document.querySelector("main"));
  canvas.elt.setAttribute("role", "img");
  canvas.elt.setAttribute("aria-label", label);
  frameRate(60);
  textFont("Arial");
  return canvas;
}

// Draw the nested colour rectangles once, then reuse them as a photograph.
function makeStoreBackground(pinkArea = true) {
  background(255, 35, 150);
  noStroke();
  for (let i = 0; i <= 60; i++) {
    let amount = i / 60;
    fill(255, 35 + 220 * amount, 150 * (1 - amount));
    rect(i * 6.4, i * 3.6, W - i * 12.8, H - i * 7.2);
  }
  if (pinkArea) {
    fill(253, 207, 222);
    rect(384, 216, 1152, 648);
  }
  return get();
}

// preload() waits for these local files before setup() begins.
function loadProjectSounds(names) {
  soundNames = names;
  for (let i = 0; i < names.length; i++) {
    let name = names[i];
    projectSounds[name] = loadSound(SOUND_PATHS[name], soundLoaded, soundMissing);
  }
}

function soundLoaded() {
  // No action is needed: p5 automatically continues when preload is finished.
}

function soundMissing() {
  console.log("A sound could not load. The drawing can still run without it.");
}

function playEffect(name, volume = 0.4) {
  let sound = projectSounds[name];
  if (audioExiting || !soundReady || !sound || !sound.isLoaded()) return;
  if (name === "notification") stopSound(name);
  sound.setVolume(volume);
  sound.play();
}

function loopEffect(name, volume = 0.07) {
  let sound = projectSounds[name];
  if (audioExiting || !soundReady || !sound || !sound.isLoaded() || sound.isPlaying()) return;
  sound.setVolume(volume);
  sound.loop();
}

function stopSounds() {
  soundNames.forEach(stopSound);
}

// Mute each file first; one failed stop must not leave the remaining clips playing.
function stopSound(name) {
  const sound = projectSounds[name];
  if (!sound) return;
  try {
    sound.setVolume(0);
    sound.stop();
  } catch (error) {
    console.warn("Could not stop sound:", name, error);
  }
}

// Navigation is terminal: block new playback and silence the whole audio context.
function shutdownSounds() {
  audioExiting = true;
  soundReady = false;
  if (typeof masterVolume === "function") masterVolume(0);
  stopSounds();
  if (typeof getAudioContext !== "function") return;
  const context = getAudioContext();
  if (context.state !== "closed") context.suspend().catch(console.warn);
}

function silenceHiddenPage() {
  if (!document.hidden) return;
  soundReady = false;
  stopSounds();
}

// A page restored by Back waits for a fresh gesture before becoming audible.
function restorePageAudio(event) {
  if (!event.persisted) return;
  audioExiting = false;
  soundReady = false;
}

// Only a real input starts audio, so waiting on the landing page never queues pops.
function enableSounds() {
  if (OPENED_AS_FILE || audioExiting || document.hidden || soundReady) return;
  if (typeof userStartAudio !== "function") return;
  if (typeof masterVolume === "function") masterVolume(1);
  userStartAudio();
  soundReady = true;
}

window.addEventListener("pointerdown", enableSounds);
window.addEventListener("keydown", enableSounds);

// Hidden tabs cannot keep the challenge audio playing behind the landing page.
document.addEventListener("visibilitychange", silenceHiddenPage);
window.addEventListener("pagehide", shutdownSounds);
window.addEventListener("pageshow", restorePageAudio);

// 2. P5 LIFECYCLE AND INPUT

// p5 calls these hooks on either HTML page. Only the matching scene runs.
const IS_CHALLENGE = document.getElementById("challenge-stage") !== null;
const OPENED_AS_FILE = window.location.protocol === "file:";

function preload() {
  if (OPENED_AS_FILE) return;
  if (IS_CHALLENGE) preloadChallenge();
  else preloadLanding();
}

function setup() {
  if (OPENED_AS_FILE) {
    noCanvas();
    noLoop();
    return;
  }
  setupSiteShell();
  if (IS_CHALLENGE) setupChallenge();
  else setupLanding();
}

function draw() {
  if (OPENED_AS_FILE || audioExiting) return;
  if (IS_CHALLENGE) drawChallenge();
  else drawLanding();
}

function mousePressed(event) {
  if (event && event.target.tagName !== "CANVAS") return;
  if (IS_CHALLENGE) return pressChallenge(event);
  return pressLanding();
}

function mouseDragged() {
  if (!IS_CHALLENGE) return dragLanding();
}

function mouseReleased() {
  if (!IS_CHALLENGE) releaseLanding();
}

function keyPressed(event) {
  if (OPENED_AS_FILE) return;
  if (IS_CHALLENGE) return keyChallenge(event);
  return keyLanding();
}

// 3. SHARED NAVIGATION AND ABOUT

// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted implementation, revised into named helpers for this project.
// Shared HTML credits and a few simple navigation functions.
const SITE_NAVIGATION_HTML = `
    <nav class="site-nav" aria-label="Main navigation">
      <a class="site-home" href="./">
        <svg class="site-cart-icon" viewBox="0 0 26 24" aria-hidden="true" focusable="false">
          <path d="M1 2h4l3 13h13l3-10H6M8 9h14M10 5l1 10M15 5v10M20 5l-2 10M8 18h13" />
          <circle cx="10" cy="21" r="1.5" /><circle cx="20" cy="21" r="1.5" />
        </svg>
        <span>ME-MARRT</span>
      </a>
      <button class="about-toggle" type="button" aria-expanded="false" aria-controls="about-panel">
        <svg viewBox="0 0 14 16" aria-hidden="true" focusable="false"><path d="M1 1L13 8L1 15Z" /></svg>
        <span>ABOUT</span>
      </button>
      <button class="fullscreen-toggle" type="button" aria-pressed="false">FULL SCREEN</button>
    </nav>`;

const SITE_ABOUT_HTML = `
    <div class="about-toolbar">
      <span class="about-label">ABOUT THE PROJECT</span>
      <button class="about-close" type="button" aria-label="Close About">CLOSE <span aria-hidden="true">×</span></button>
    </div>
    <div class="about-content">
      <div class="about-credits">
        <span class="about-sticker">IDENTITY SUPERSTORE</span>
        <h1 id="about-title">ME-MARRT.</h1>
        <p class="about-author">Tran Thanh Tam <span>- s3977954</span></p>
        <dl class="about-details">
          <div>
            <dt>Group</dt>
            <dd class="about-group">SCP_067</dd>
          </div>
          <div>
            <dt>Group members</dt>
            <dd><ul class="about-members">
              <li>Tran Thanh Tam - s3977954</li>
              <li>Nguyen Hoang Quynh Anh - s4184957</li>
              <li>Nguyen Thanh Hoai Anh - s4025916</li>
              <li>Phan Nhu Bao Minh - s4112912</li>
              <li>Dang Tri Nhan - s4012968</li>
            </ul></dd>
          </div>
          <div>
            <dt>Course</dt>
            <dd>COMM2754 - Digital Media Specialisation 2 - 26t3</dd>
          </div>
          <div>
            <dt>Affiliation</dt>
            <dd>RMIT University Vietnam,<br>Saigon South Campus,<br>School of Communication and Design,<br>Digital Media Program</dd>
          </div>
        </dl>
      </div>
      <div class="about-copy">
        <section class="about-sdg" aria-labelledby="about-sdg-title">
          <span class="about-sdg-label">SDG 12</span>
          <div>
            <h2 id="about-sdg-title">Responsible Consumption and Production</h2>
            <p>Ensure sustainable consumption and production patterns</p>
          </div>
        </section>
        <blockquote class="about-quote">
          <p>“The things you own end up owning you”</p>
          <cite>Chuck Palahniuk (Fight Club 1996)</cite>
        </blockquote>
        <div class="about-statement">
          <p>Chuck Palahniuk’s statement, “The things you own end up owning you,” exposes how thin the line is between mastering material possessions and becoming enslaved by them. This idea aligns with Sustainable Development Goal 12: Responsible Consumption and Production, highlighting that overconsumption is often driven not by actual needs, but by the desire to construct and define our identities.</p>
          <p>When our identity becomes tied to what we buy, we fall into an endless cycle of consumption to constantly "upgrade" our image, silently draining both global resources and personal freedom. This project focuses on exploring that hidden reality: how material objects gradually expand, take over our space, and consume our true selves.</p>
          <p class="about-statement-end">Recognise the pattern. Question the consumption. Redefine your worth beyond material possessions.</p>
        </div>
      </div>
    </div>
    <div class="about-footer">
      <span>ME-MARRT / SCP_067</span>
      <time datetime="2026-11-19">19/11/2026</time>
    </div>`;

// p5 DOM helpers create the shared navigation and credits once, inside setup().
let siteStage, aboutPanel, aboutButton, closeButton, fullscreenButton;

function setupSiteShell() {
  siteStage = document.querySelector("main");
  createNavigation();
  createAboutPanel();
  bindSiteControls();
}

function createNavigation() {
  const header = createElement("header", SITE_NAVIGATION_HTML);
  header.class("site-bar");
  document.body.prepend(header.elt);
}

function createAboutPanel() {
  const panel = createElement("section", SITE_ABOUT_HTML);
  panel.class("about-panel");
  panel.id("about-panel");
  panel.parent(siteStage);
  panel.attribute("aria-label", "About ME-MARRT");
  panel.attribute("aria-hidden", "true");
  aboutPanel = panel.elt;
  aboutPanel.inert = true;
}

function bindSiteControls() {
  aboutButton = select(".about-toggle").elt;
  closeButton = select(".about-close").elt;
  fullscreenButton = select(".fullscreen-toggle").elt;
  aboutButton.onclick = toggleAbout;
  closeButton.onclick = toggleAbout;
  fullscreenButton.onclick = toggleFullscreen;
  fullscreenButton.hidden = !document.fullscreenEnabled;
  document.addEventListener("fullscreenchange", fullscreenLabel);
  document.addEventListener("keydown", closeAboutWithEscape);
  select(".site-home").elt.onclick = shutdownSounds;
}

function toggleAbout() {
  aboutOpen = !aboutOpen;
  siteStage.classList.toggle("is-about-open", aboutOpen);
  aboutButton.setAttribute("aria-expanded", String(aboutOpen));
  aboutPanel.setAttribute("aria-hidden", String(!aboutOpen));
  aboutPanel.inert = !aboutOpen;
  setSceneControls();
  if (aboutOpen) closeButton.focus();
  else aboutButton.focus();
  stopSounds();
}

function setSceneControls() {
  for (let i = 0; i < siteStage.children.length; i++) {
    let element = siteStage.children[i];
    if (element !== aboutPanel) element.inert = aboutOpen;
  }
}

// This small browser feature is separate from the course's drawing code.
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(fullscreenUnavailable);
}

function fullscreenUnavailable() {
  fullscreenButton.title = "Use your browser's fullscreen command.";
}

function fullscreenLabel() {
  let active = Boolean(document.fullscreenElement);
  fullscreenButton.textContent = active ? "EXIT FULL SCREEN" : "FULL SCREEN";
  fullscreenButton.setAttribute("aria-pressed", String(active));
}

function closeAboutWithEscape(event) {
  if (event.key === "Escape" && aboutOpen) toggleAbout();
}

// 4. LANDING SCENE

// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted implementation, revised into named helpers for this project.
// Simple gravity and bounce study inspired by Giang Nguyen's supplied reference:
// https://giangnguyenday.github.io/oart1033-a2-s4135042/

const AREA = { left: 384, right: 1536, top: 216, bottom: 864 };
const YELLOW = { x: 960, y: 555, r: 280 };
const LANDING_FILES = {
  logo: "ME-MARTT_TITLE.png",
  cart: "cart.png",
  body: "body-static.png",
  top1: "body_top_1.png",
  top2: "body_top_2.png",
  top3: "body_top_3.png",
  down1: "body_down_1.png",
  down2: "body_down_2.png",
  down3: "body_down_3.png",
  headphone: "headphone.png",
  hirono: "hirono.png",
  camera: "kodak_camera.png",
  macbook: "macbook.png",
  offer: "offer.png",
  text: "text.png",
  banner: "Group 14.png",
};
// Supplied PNG margins measured once; these rectangles retain every visible pixel.
const LANDING_CROPS = {
  top1: [4, 23, 398, 269],
  top2: [0, 0, 459, 161],
  top3: [9, 1, 479, 162],
  down1: [0, 2, 213, 271],
  down2: [30, 0, 145, 268],
  down3: [10, 0, 279, 269],
  headphone: [41, 40, 132, 131],
  hirono: [13, 16, 199, 157],
  macbook: [13, 16, 199, 157],
  camera: [10, 13, 158, 125],
  text: [0, 0, 313, 80],
  banner: [0, 0, 251, 65],
  offer: [0, 0, 191, 191],
};
const PRODUCT_ROWS = [
  ["text", 530, 280, 125],
  ["offer", 555, 190, 190],
  ["headphone", 525, 200, 200],
  ["macbook", 565, 230, 180],
  ["banner", 1385, 285, 125],
  ["hirono", 1380, 205, 205],
  ["camera", 1370, 205, 205],
];

let pictures = {};
let storeBackground;
let storeItems = [];
let landingArt;
let heldItem = null;
let topNumber = 1;
let downNumber = 1;
let nextLook = 0;
let headPoints = [];
let headColor;
let bodyAngle = 0;
let cartX = -350;
let nextCart = 0;
let cartRunning = false;

function preloadLanding() {
  for (let name in LANDING_FILES) pictures[name] = loadImage("assets/" + LANDING_FILES[name]);
  loadProjectSounds(["pop"]);
}

function setupLanding() {
  const canvas = makeCanvas("ME-MARRT. Drag the products; click a message. R resets; S saves.");
  storeBackground = makeStoreBackground();
  resetLandingScene();
  canvas.elt.dataset.sceneReady = "true";
}

function resetLandingScene() {
  for (const item of storeItems) if (item.texture) item.texture.remove();
  storeItems = [];
  heldItem = null;
  for (let i = 0; i < PRODUCT_ROWS.length; i++) addProduct(PRODUCT_ROWS[i], i);
  const barcodeCount = floor(random(3, 6));
  for (let i = 0; i < barcodeCount; i++) addBarcode(i);
  changeOutfit();
  resetLandingArt();
  cartX = -350;
  cartRunning = false;
  nextCart = millis() + random(5000, 8000);
}

// Reuse the original pixel-sampled tracking and side-message artwork unchanged.
function resetLandingArt() {
  const logoBounds = { x: 515, y: 18, w: 890, h: 268 };
  landingArt = new FrameArt(W, H, AREA, logoBounds, {
    onMessageAppear: () => playEffect("pop", 0.12),
    onMessageDismiss: () => playEffect("pop", 0.16),
  });
}

function addProduct(row, index) {
  const crop = LANDING_CROPS[row[0]];
  const scale = min(row[2] / crop[2], row[3] / crop[3]) * 0.8;
  const y = -180 - index * 115;
  storeItems.push(new StoreItem(row[0], row[1], y, crop[2] * scale, crop[3] * scale));
}

function addBarcode(index) {
  const x = index % 3 === 0 ? random(485, 610) : random(1310, 1435);
  const item = new StoreItem("barcode", x, -100 - index * 170, random(150, 195), 50);
  item.barColor = random(["#08BEFF", "#FFFF00"]);
  for (let x = 8; x < 188; x += random(3, 7)) item.bars.push([x, random(1, 3)]);
  item.texture = makeBarcodePicture(item);
  storeItems.push(item);
}

function makeBarcodePicture(item) {
  const picture = createGraphics(200, 70);
  picture.pixelDensity(1);
  picture.background(item.barColor);
  picture.noStroke();
  picture.fill(0);
  for (let bar of item.bars) picture.rect(bar[0], 6, bar[1], 45);
  picture.textSize(9);
  picture.textAlign(CENTER, CENTER);
  picture.text("N o .  0 0 0 0 0 0 1", 100, 61);
  return picture;
}

function drawLanding() {
  if (aboutOpen) return;
  imageMode(CORNER);
  image(storeBackground, 0, 0);
  landingArt.draw(drawingContext, millis());
  drawYellowCircle();
  updateProducts();
  drawCharacter();
  landingArt.drawTrackingLinks(drawingContext);
  drawLandingLogo();
  drawPassingCart();
}

function drawYellowCircle() {
  noStroke();
  fill("#FFFF00");
  circle(YELLOW.x, YELLOW.y, YELLOW.r * 2);
}

function updateProducts() {
  for (let item of storeItems) item.update();
  for (let i = 0; i < storeItems.length; i++) {
    for (let j = i + 1; j < storeItems.length; j++) storeItems[i].bounce(storeItems[j]);
  }
  for (let item of storeItems) {
    item.avoidCircle();
    item.keepInStage();
    item.display();
  }
}

function drawLandingLogo() {
  const logo = pictures.logo;
  const h = (850 * logo.height) / logo.width;
  image(logo, 535, 155 - h / 2, 850, h);
}

// The full static PNG fits by its diagonal, so rotation never cuts its arms or feet.
function drawCharacter() {
  if (millis() > nextLook) changeOutfit();
  bodyAngle += 0.00125;
  drawRotatingBody();
  drawHead();
  drawClothes();
}

function drawRotatingBody() {
  const body = pictures.body;
  const scale = (YELLOW.r * 2 - 24) / sqrt(body.width * body.width + body.height * body.height);
  const w = body.width * scale;
  const h = body.height * scale;
  push();
  translate(YELLOW.x, YELLOW.y);
  rotate(bodyAngle);
  image(body, -w / 2, -h / 2, w, h);
  trackLandingPicture(body, w, h, "rotating-body", null, 3);
  pop();
}

function changeOutfit() {
  topNumber = ((topNumber + floor(random(1, 3)) - 1) % 3) + 1;
  downNumber = ((downNumber + floor(random(1, 3)) - 1) % 3) + 1;
  headColor = random(["#08BEFF", "#FF2396", "#FDCFDE", "#FF6919", "#EE2724"]);
  headPoints = [];
  const sides = floor(random(4, 12));
  for (let i = 0; i < sides; i++) {
    const angle = (i * TWO_PI) / sides;
    headPoints.push([cos(angle) * random(35, 62), sin(angle) * random(38, 60)]);
  }
  nextLook = millis() + 180;
}

// The abstract head has no facial features and sits between body and clothing.
function drawHead() {
  push();
  translate(YELLOW.x, YELLOW.y - 181);
  noStroke();
  fill(headColor);
  rect(-9, 12, 18, 52);
  beginShape();
  for (let point of headPoints) vertex(point[0], point[1]);
  endShape(CLOSE);
  pop();
}

function drawClothes() {
  const down = "down" + downNumber;
  const crop = LANDING_CROPS[down];
  const width = (240 * crop[2]) / crop[3];
  drawGarment(down, width, 240, YELLOW.y - 18);
  const top = "top" + topNumber;
  const topCrop = LANDING_CROPS[top];
  const height = 170;
  const topWidth = (height * topCrop[2]) / topCrop[3];
  drawGarment(top, topWidth, height, YELLOW.y + 4 - height);
}

function drawGarment(name, width, height, top) {
  const c = LANDING_CROPS[name];
  image(pictures[name], YELLOW.x - width / 2, top, width, height, c[0], c[1], c[2], c[3]);
  push();
  translate(YELLOW.x, top + height / 2);
  trackLandingPicture(pictures[name], width, height, "outfit:" + name, c, 2);
  pop();
}

// FrameArt expects a centre-origin image and reads the active canvas transform.
function trackLandingPicture(picture, width, height, id, crop, count = 1) {
  const bounds = crop
    ? { x: crop[0], y: crop[1], w: crop[2], h: crop[3] }
    : { x: 0, y: 0, w: picture.width, h: picture.height };
  landingArt.trackImage(drawingContext, picture.canvas, bounds, width, height, id, count);
}

function drawPassingCart() {
  if (!cartRunning && millis() > nextCart) cartRunning = true;
  if (!cartRunning) return;
  cartX += 7;
  image(pictures.cart, cartX, 815, 265, 253);
  if (cartX > W) {
    cartX = -350;
    cartRunning = false;
    nextCart = millis() + random(5000, 8000);
  }
}

function pressLanding() {
  if (!landingArt) return;
  if (aboutOpen || landingArt.dismissMessageAt({ x: mouseX, y: mouseY }, millis())) return;
  for (let i = storeItems.length - 1; i >= 0; i--) {
    if (storeItems[i].contains(mouseX, mouseY)) {
      heldItem = storeItems[i];
      heldItem.vx = 0;
      heldItem.vy = 0;
      return false;
    }
  }
}

function dragLanding() {
  if (aboutOpen || !heldItem) return;
  heldItem.vx = constrain(mouseX - pmouseX, -18, 18);
  heldItem.vy = constrain(mouseY - pmouseY, -18, 18);
  heldItem.x = mouseX;
  heldItem.y = mouseY;
  heldItem.entered = true;
  heldItem.keepInStage();
  heldItem.avoidCircle();
  return false;
}

function releaseLanding() {
  heldItem = null;
}

function keyLanding() {
  if (aboutOpen) return;
  if (key === "r" || key === "R") resetLandingScene();
  if (key === "s" || key === "S") saveCanvas("me-marrt", "png");
}

class StoreItem {
  constructor(name, x, y, width, height) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.w = width;
    this.h = height;
    this.vx = random(-1, 1);
    this.vy = random(1, 3);
    this.angle = random(-0.12, 0.12);
    this.entered = false;
    this.bars = [];
    this.id = storeItems.length;
  }

  update() {
    if (this === heldItem) return;
    this.vy += 0.28;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.994;
    this.angle = this.angle * 0.96 + this.vx * 0.003;
    if (this.y - this.h / 2 > AREA.top) this.entered = true;
    this.avoidCircle();
    this.keepInStage();
  }

  keepInStage() {
    if (this.x < AREA.left + this.w / 2 || this.x > AREA.right - this.w / 2) this.vx *= -0.72;
    this.x = constrain(this.x, AREA.left + this.w / 2, AREA.right - this.w / 2);
    if (this.y > AREA.bottom - this.h / 2) {
      this.y = AREA.bottom - this.h / 2;
      this.vy = -abs(this.vy) * 0.62;
    }
    if (this.entered && this.y < AREA.top + this.h / 2) {
      this.y = AREA.top + this.h / 2;
      this.vy = abs(this.vy) * 0.62;
    }
  }

  // The nearest point on a box gives a simple circle collision without a library.
  avoidCircle() {
    const x = constrain(YELLOW.x, this.x - this.w / 2, this.x + this.w / 2);
    const y = constrain(YELLOW.y, this.y - this.h / 2, this.y + this.h / 2);
    const distance = dist(x, y, YELLOW.x, YELLOW.y);
    if (distance === 0) this.escapeCircle();
    if (distance >= YELLOW.r || distance === 0) return;
    const nx = (x - YELLOW.x) / distance;
    const ny = (y - YELLOW.y) / distance;
    this.x += nx * (YELLOW.r - distance + 1);
    this.y += ny * (YELLOW.r - distance + 1);
    this.reflect(nx, ny);
  }

  escapeCircle() {
    const side = this.x < YELLOW.x ? -1 : 1;
    this.x = YELLOW.x + side * (YELLOW.r + this.w / 2 + 1);
    this.vx = side * max(abs(this.vx), 2);
  }

  reflect(nx, ny) {
    const speed = this.vx * nx + this.vy * ny;
    if (speed >= 0) return;
    this.vx -= 1.65 * speed * nx;
    this.vy -= 1.65 * speed * ny;
  }

  bounce(other) {
    if (this.y < AREA.top || other.y < AREA.top) return;
    const overlapX = (this.w + other.w) / 2 - abs(this.x - other.x);
    const overlapY = (this.h + other.h) / 2 - abs(this.y - other.y);
    if (overlapX <= 0 || overlapY <= 0) return;
    if (overlapX < overlapY) this.separate(other, overlapX, true);
    else this.separate(other, overlapY, false);
  }

  separate(other, overlap, horizontal) {
    const sign = horizontal ? (this.x < other.x ? -1 : 1) : this.y < other.y ? -1 : 1;
    const shift = (sign * (overlap + 1)) / 2;
    if (horizontal) {
      if (this !== heldItem) this.x += shift;
      if (other !== heldItem) other.x -= shift;
      this.exchangeSpeed(other, "vx");
    } else {
      if (this !== heldItem) this.y += shift;
      if (other !== heldItem) other.y -= shift;
      this.exchangeSpeed(other, "vy");
    }
  }

  exchangeSpeed(other, axis) {
    const speed = this[axis];
    if (this !== heldItem) this[axis] = other[axis] * 0.75;
    if (other !== heldItem) other[axis] = speed * 0.75;
  }

  contains(x, y) {
    return abs(x - this.x) < this.w / 2 && abs(y - this.y) < this.h / 2;
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    if (this.name === "barcode") this.drawBarcode();
    else {
      const c = LANDING_CROPS[this.name];
      image(pictures[this.name], -this.w / 2, -this.h / 2, this.w, this.h, c[0], c[1], c[2], c[3]);
    }
    this.trackPicture();
    pop();
  }

  drawBarcode() {
    image(this.texture, -this.w / 2, -this.h / 2, this.w, this.h);
  }

  trackPicture() {
    if (!this.entered) return;
    const picture = this.name === "barcode" ? this.texture : pictures[this.name];
    const crop = this.name === "barcode" ? null : LANDING_CROPS[this.name];
    trackLandingPicture(picture, this.w, this.h, "asset:" + this.id, crop);
  }
}

// 5. TRACKING AND MESSAGE ARTWORK

// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted implementation, revised into named helpers for this project.
// Tracking samples existing images; its visual web never mutates physics bodies.
class FrameArt {
  constructor(width, height, area, logoBounds, callbacks = {}) {
    this.width = width;
    this.height = height;
    this.area = { ...area };
    this.logoBounds = { ...logoBounds };
    this.setCallbacks(callbacks);
    this.seed = (Date.now() ^ 0x71a9c35d) >>> 0;
    this.initializeTracking();
    this.initializeMessages();
    this.initializeZones();
    this.greenFragments = Array.from({ length: 18 }, (_, i) => this.makeGreenFragment(i));
  }

  setCallbacks({ onMessageAppear, onMessageDismiss }) {
    this.onMessageAppear = typeof onMessageAppear === "function" ? onMessageAppear : null;
    this.onMessageDismiss = typeof onMessageDismiss === "function" ? onMessageDismiss : null;
  }

  initializeTracking() {
    this.imageCache = new WeakMap();
    this.features = new Map();
    this.trackedPoints = [];
    this.trackingTime = 0;
  }

  initializeMessages() {
    this.messages = [];
    this.phrases = [
      "I love this!",
      "this is so me",
      "new me?",
      "try me on",
      "100% you",
      "one more version",
      "me, again.",
      "same me. new look.",
    ];
  }

  initializeZones() {
    const { left, right, bottom } = this.area;
    this.zones = [
      { x: 26, y: 34, w: left - 52, h: bottom - 68 },
      { x: right + 26, y: 34, w: this.width - right - 52, h: bottom - 68 },
    ];
  }

  makeGreenFragment(index) {
    const zone = this.zones[index % 2];
    const shape = index % 7 === 0 ? "cluster" : index % 3 === 0 ? "bar" : "square";
    const w = shape === "square" ? this.random(22, 34) : this.random(75, 122);
    const h = shape === "cluster" ? this.random(36, 54) : this.random(18, 29);
    const rowY = 56 + (Math.floor(index / 2) * (this.area.bottom - 130)) / 8;
    return {
      shape,
      w,
      h,
      x: this.random(zone.x + 14, zone.x + zone.w - w - 20),
      y: Math.min(this.area.bottom - h - 24, rowY + this.random(-12, 12)),
      phase: this.random(0, Math.PI * 2),
    };
  }

  random(min = 0, max = 1) {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return min + (this.seed / 4294967296) * (max - min);
  }

  pick(items) {
    return items[Math.floor(this.random(0, items.length))];
  }

  trackingNoise(phase, tick) {
    const value = Math.sin(phase * 127.1 + tick * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  drawGreenFragments(ctx, now) {
    const tick = Math.floor(now / 90);
    const lock = Math.floor(now / 450);
    ctx.save();
    for (const fragment of this.greenFragments) this.drawGreenFragment(ctx, fragment, tick, lock);
    ctx.restore();
  }

  drawGreenFragment(ctx, fragment, tick, lock) {
    const flicker = this.trackingNoise(fragment.phase, tick);
    if (flicker < 0.23) return;
    const x = fragment.x + (this.trackingNoise(fragment.phase + 3, lock) - 0.5) * 20;
    const y = fragment.y + (this.trackingNoise(fragment.phase + 7, tick) - 0.5) * 8;
    const width = fragment.w * (0.76 + flicker * 0.28);
    ctx.fillStyle = flicker > 0.87 ? "#35FF00" : "#00E000";
    this.paintFragmentShape(ctx, fragment, x, y, width);
    if (flicker > 0.82) ctx.fillRect(x - 8, y + fragment.h * 0.58, width * 0.64, 3);
  }

  paintFragmentShape(ctx, fragment, x, y, width) {
    const height = fragment.h;
    if (fragment.shape !== "cluster") {
      ctx.fillRect(x, y, width, fragment.shape === "square" ? width : height);
      return;
    }
    ctx.fillRect(x, y, width, height * 0.58);
    ctx.fillRect(x + width * 0.23, y - height * 0.36, width * 0.3, height * 1.25);
    ctx.fillRect(x + width * 0.76, y + height * 0.28, width * 0.36, height * 0.28);
  }

  roundedRect(ctx, x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  makeMessage(ctx, slot, born) {
    const zone = this.zones[slot % this.zones.length];
    const text = this.pick(this.phrases);
    const fontSize = slot % 4 === 0 ? this.random(28, 33) : this.random(21, 27);
    ctx.font = `500 ${fontSize}px Arial, sans-serif`;
    const w = Math.min(zone.w - 28, ctx.measureText(text).width + 34);
    const message = this.messageRecord(text, fontSize, w, zone, born);
    this.placeMessage(message, slot);
    this.bakeMessage(message);
    return message;
  }

  messageRecord(text, fontSize, w, zone, born) {
    return {
      text,
      fontSize,
      w,
      h: fontSize + 28,
      zone,
      born,
      ...this.messageAppearance(),
      dismissedAt: null,
      appearanceNotified: false,
      layout: null,
    };
  }

  messageAppearance() {
    return {
      life: this.random(12000, 18000),
      color: this.pick(["#087CFF", "#087CFF", "#087CFF", "#EF426A", "#E92D28"]),
      phase: this.random(0, Math.PI * 2),
      tailRight: this.random() > 0.5,
    };
  }

  placeMessage(message, slot) {
    const { zone, w, h } = message;
    for (let attempt = 0; attempt < 36; attempt++) {
      message.x = this.random(zone.x + 14, zone.x + zone.w - w - 14);
      message.y = this.random(zone.y + 14, zone.y + zone.h - h - 14);
      if (!this.messages.some((other) => this.messagesOverlap(message, other, slot))) break;
    }
  }

  messagesOverlap(message, other, slot) {
    if (!other || other === this.messages[slot]) return false;
    return (
      message.x < other.x + other.w + 14 &&
      message.x + message.w + 14 > other.x &&
      message.y < other.y + other.h + 20 &&
      message.y + message.h + 20 > other.y
    );
  }

  messageCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);
    return canvas;
  }

  bakeMessage(message) {
    const sprite = this.messageCanvas(message.w + 48, message.h + 28);
    const ctx = sprite.getContext("2d");
    ctx.translate(24, 10);
    ctx.fillStyle = message.color;
    this.roundedRect(ctx, 0, 0, message.w, message.h, message.h * 0.43);
    ctx.fill();
    this.paintMessageTail(ctx, message);
    this.paintMessageText(ctx, message);
    message.sprite = sprite;
    message.ghosts = ["#08FFFF", "#FF2396"].map((color) => this.makeMessageGhost(sprite, color));
  }

  paintMessageTail(ctx, message) {
    const x = message.tailRight ? message.w - 14 : 14;
    const direction = message.tailRight ? 1 : -1;
    const h = message.h;
    ctx.beginPath();
    ctx.moveTo(x, h - 17);
    ctx.quadraticCurveTo(x + direction * 6, h - 3, x + direction * 18, h + 2);
    ctx.quadraticCurveTo(x - direction * 7, h + 4, x - direction * 8, h - 10);
    ctx.closePath();
    ctx.fill();
  }

  paintMessageText(ctx, message) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `500 ${message.fontSize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message.text, message.w / 2, message.h / 2 + 1, message.w - 24);
  }

  makeMessageGhost(sprite, color) {
    const ghost = this.messageCanvas(sprite.width, sprite.height);
    const ctx = ghost.getContext("2d");
    ctx.drawImage(sprite, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, ghost.width, ghost.height);
    return ghost;
  }

  messageLayout(message, now) {
    if (message.dismissedAt !== null) return message.glitchLayout;
    const t = Math.max(0, Math.min(1, (now - message.born) / 620));
    const scale = t >= 1 ? 1 : Math.max(0.025, 1 - Math.exp(-7 * t) * Math.cos(12 * t));
    const x = this.messagePosition(message, "x", Math.sin(now * 0.0005 + message.phase) * 6);
    const y = this.messagePosition(message, "y", Math.cos(now * 0.00045 + message.phase) * 5);
    return {
      x,
      y,
      scale,
      anchorX: message.tailRight ? x + message.w - 14 : x + 14,
      anchorY: y + message.h,
    };
  }

  messagePosition(message, axis, offset) {
    const size = axis === "x" ? "w" : "h";
    const min = message.zone[axis] + 3;
    const max = message.zone[axis] + message.zone[size] - message[size] - 3;
    return Math.max(min, Math.min(max, message[axis] + offset));
  }

  glitchMessage(ctx, message, now, layout) {
    const progress = Math.min(1, (now - message.dismissedAt) / 320);
    const frame = Math.floor((now - message.dismissedAt) / 32);
    const stripe = Math.ceil(message.sprite.height / 8);
    for (let band = 0; band < 8; band++) {
      this.paintMessageBand(ctx, message, { progress, frame, stripe, band, layout });
    }
  }

  paintMessageBand(ctx, message, { progress, frame, stripe, band, layout }) {
    const noise = (Math.sin((band + 1) * 41.7 + frame * 23.1 + message.phase) + 1) / 2;
    const sy = band * stripe;
    const sh = Math.min(stripe, message.sprite.height - sy);
    if (noise < progress * 0.95 || sh <= 0) return;
    const shift = Math.sin(band * 11 + frame * 8 + message.phase) * (12 + progress * 32);
    const dx = layout.x - 24 + shift;
    const dy = layout.y - 10 + sy;
    this.paintGhostBands(ctx, message, sy, sh, dx, dy);
    this.paintSpriteBand(ctx, message.sprite, sy, sh, dx, dy);
  }

  paintSpriteBand(ctx, sprite, sy, sh, dx, dy) {
    ctx.drawImage(sprite, 0, sy, sprite.width, sh, dx, dy, sprite.width, sh);
  }

  paintGhostBands(ctx, message, sy, sh, dx, dy) {
    const width = message.sprite.width;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(message.ghosts[0], 0, sy, width, sh, dx - 7, dy, width, sh);
    ctx.drawImage(message.ghosts[1], 0, sy, width, sh, dx + 7, dy + 1, width, sh);
    ctx.globalAlpha = 1;
  }

  drawMessages(ctx, now) {
    for (let slot = 0; slot < 12; slot++) {
      const message = this.messageForSlot(ctx, slot, now);
      if (now < message.born) {
        message.layout = null;
        continue;
      }
      this.updateMessage(message, now);
      this.paintMessage(ctx, message, now);
    }
  }

  messageForSlot(ctx, slot, now) {
    if (!this.messages[slot]) this.messages[slot] = this.makeMessage(ctx, slot, now + slot * 390);
    const message = this.messages[slot];
    if (message.dismissedAt !== null && now - message.dismissedAt >= 320) {
      this.messages[slot] = this.makeMessage(ctx, slot, now + this.random(1400, 3600));
    }
    return this.messages[slot];
  }

  updateMessage(message, now) {
    message.layout = this.messageLayout(message, now);
    if (!message.appearanceNotified) {
      message.appearanceNotified = true;
      if (this.onMessageAppear) this.onMessageAppear(message, now);
    }
    if (message.dismissedAt === null && now - message.born > message.life) {
      message.dismissedAt = now;
      message.glitchLayout = { ...message.layout };
    }
  }

  paintMessage(ctx, message, now) {
    const layout = message.layout;
    ctx.save();
    ctx.translate(layout.anchorX, layout.anchorY);
    ctx.scale(layout.scale, layout.scale);
    ctx.translate(-layout.anchorX, -layout.anchorY);
    if (message.dismissedAt === null) ctx.drawImage(message.sprite, layout.x - 24, layout.y - 10);
    else this.glitchMessage(ctx, message, now, layout);
    ctx.restore();
  }

  isMessageArea(point) {
    const area = this.area;
    const logo = this.logoBounds;
    const inFrame = this.pointWithin(point, 0, 0, this.width, area.bottom);
    const inArea = this.pointWithin(point, area.left, area.top, area.right, area.bottom);
    const inLogo = this.pointWithin(point, logo.x, logo.y, logo.x + logo.w, logo.y + logo.h);
    return inFrame && point.y < area.bottom && !inArea && !inLogo;
  }

  pointWithin(point, left, top, right, bottom) {
    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  }

  messageAtPoint(point) {
    if (!this.isMessageArea(point)) return null;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.pointInsideMessage(point, this.messages[i])) return this.messages[i];
    }
    return null;
  }

  pointInsideMessage(point, message) {
    const layout = message.layout;
    if (!layout || message.dismissedAt !== null || layout.scale < 0.15) return false;
    const x = layout.anchorX + (point.x - layout.anchorX) / layout.scale;
    const y = layout.anchorY + (point.y - layout.anchorY) / layout.scale;
    return x >= layout.x && x <= layout.x + message.w && y >= layout.y && y <= layout.y + message.h;
  }

  dismissMessageAt(point, now) {
    const message = this.messageAtPoint(point);
    if (!message) return false;
    message.dismissedAt = now;
    message.glitchLayout = { ...message.layout };
    if (this.onMessageDismiss) this.onMessageDismiss(message, now);
    return true;
  }

  heatmapFor(source) {
    if (!source || !source.width || !source.height) return null;
    if (this.imageCache.has(source)) return this.imageCache.get(source);
    const canvas = this.messageCanvas(source.width, source.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.colorizeHeatmap(pixels.data);
    ctx.putImageData(pixels, 0, 0);
    const result = { canvas, pixels: pixels.data, width: canvas.width, height: canvas.height };
    this.imageCache.set(source, result);
    return result;
  }

  // Transparent pixels stay transparent, so heat patches follow the cut-out images.
  colorizeHeatmap(pixels) {
    const colors = [
      [37, 24, 100],
      [163, 40, 251],
      [255, 42, 137],
      [255, 102, 39],
      [246, 255, 32],
      [74, 255, 145],
    ];
    for (let i = 0; i < pixels.length; i += 4) {
      if (!pixels[i + 3]) continue;
      const brightness = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) / 255;
      const level = Math.min(colors.length - 1.001, brightness * (colors.length - 1));
      this.blendHeatmapPixel(pixels, i, colors, level);
    }
  }

  blendHeatmapPixel(pixels, index, colors, level) {
    const lower = Math.floor(level);
    const blend = level - lower;
    for (let channel = 0; channel < 3; channel++) {
      pixels[index + channel] =
        colors[lower][channel] * (1 - blend) + colors[lower + 1][channel] * blend;
    }
  }

  opaqueAt(heatmap, crop, u, v, threshold = 101) {
    const x = Math.min(heatmap.width - 1, Math.floor(crop.x + u * crop.w));
    const y = Math.min(heatmap.height - 1, Math.floor(crop.y + v * crop.h));
    return heatmap.pixels[(y * heatmap.width + x) * 4 + 3] >= threshold;
  }

  makeFeature(heatmap, crop) {
    let u, v;
    for (let attempt = 0; attempt < 80; attempt++) {
      u = this.random(0.2, 0.8);
      v = this.random(0.2, 0.8);
      if (this.opaqueAt(heatmap, crop, u, v)) break;
    }
    return { u, v, size: this.random(0.2, 0.31), phase: this.random(0, Math.PI * 2) };
  }

  trackImage(ctx, source, crop, width, height, id, count = 1) {
    const heatmap = this.heatmapFor(source);
    if (!heatmap || !crop) return;
    if (!this.features.has(id)) {
      this.features.set(
        id,
        Array.from({ length: count }, () => this.makeFeature(heatmap, crop)),
      );
    }
    for (const feature of this.features.get(id)) {
      this.drawFeature(ctx, feature, heatmap, crop, width, height);
    }
  }

  // Quantized clocks continuously reacquire targets, even when an image is still.
  featurePosition(feature, tick, lock) {
    const noise = (offset, clock) => this.trackingNoise(feature.phase + offset, clock) - 0.5;
    return {
      u: Math.max(0.12, Math.min(0.88, feature.u + noise(0, lock) * 0.3 + noise(2, tick) * 0.036)),
      v: Math.max(0.12, Math.min(0.88, feature.v + noise(7, lock) * 0.24 + noise(4, tick) * 0.036)),
    };
  }

  featureBox(feature, position, tick, width, height) {
    const pulse = 0.84 + this.trackingNoise(feature.phase + 11, tick) * 0.3;
    const size = Math.min(80, Math.min(width, height) * 0.56, width * feature.size * pulse);
    const x = Math.max(
      -width / 2,
      Math.min(width / 2 - size, -width / 2 + position.u * width - size / 2),
    );
    const y = Math.max(
      -height / 2,
      Math.min(height / 2 - size, -height / 2 + position.v * height - size / 2),
    );
    return { x, y, size };
  }

  featureSample(box, crop, width, height) {
    return {
      sx: crop.x + ((box.x + width / 2) / width) * crop.w,
      sy: crop.y + ((box.y + height / 2) / height) * crop.h,
      sw: (box.size / width) * crop.w,
      sh: (box.size / height) * crop.h,
    };
  }

  drawFeature(ctx, feature, heatmap, crop, width, height) {
    const tick = Math.floor((this.trackingTime + feature.phase * 31) / 75);
    const lock = Math.floor((this.trackingTime + feature.phase * 77) / 280);
    let position = this.featurePosition(feature, tick, lock);
    if (!this.opaqueAt(heatmap, crop, position.u, position.v, 100)) position = feature;
    const box = this.featureBox(feature, position, tick, width, height);
    const sample = this.featureSample(box, crop, width, height);
    const flash = this.trackingNoise(feature.phase + 17, tick);
    this.recordTrackedPoint(ctx, box, feature.phase);
    if (flash < 0.16) return;
    this.paintFeature(ctx, { feature, heatmap, box, sample, flash, tick, u: position.u });
  }

  recordTrackedPoint(ctx, box, phase) {
    const matrix = ctx.getTransform();
    const x = box.x + box.size / 2;
    const y = box.y + box.size / 2;
    this.trackedPoints.push({
      x: matrix.a * x + matrix.c * y + matrix.e,
      y: matrix.b * x + matrix.d * y + matrix.f,
      phase,
    });
  }

  paintFeature(ctx, data) {
    ctx.save();
    ctx.globalAlpha = data.flash < 0.42 ? 0.46 : 0.98;
    this.paintHeatmapPatch(ctx, data);
    this.paintFeatureBorders(ctx, data);
    this.paintFeatureLabel(ctx, data.box, data.u);
    ctx.restore();
  }

  paintHeatmapPatch(ctx, data) {
    const { sx, sy, sw, sh } = data.sample;
    const { x, y, size } = data.box;
    if (data.flash <= 0.72) {
      ctx.drawImage(data.heatmap.canvas, sx, sy, sw, sh, x, y, size, size);
      return;
    }
    for (let band = 0; band < 3; band++) this.paintHeatmapBand(ctx, data, band);
  }

  paintHeatmapBand(ctx, { feature, tick, heatmap, sample, box }, band) {
    const { sx, sy, sw, sh } = sample;
    const { x, y, size } = box;
    const shift = (this.trackingNoise(feature.phase + band + 23, tick) - 0.5) * 12;
    const source = [sx, sy + (sh * band) / 3, sw, sh / 3];
    const destination = [x + shift, y + (size * band) / 3, size, size / 3];
    ctx.drawImage(heatmap.canvas, ...source, ...destination);
  }

  paintFeatureBorders(ctx, { feature, tick, box }) {
    const { x, y, size } = box;
    const split = 1 + this.trackingNoise(feature.phase + 29, tick) * 3;
    this.featureBorder(ctx, "#08FFFF", 1, x - split, y, size);
    this.featureBorder(ctx, "#FF2396", 1, x + split, y + 1, size);
    this.featureBorder(ctx, "rgba(22,20,50,0.4)", 3, x, y, size);
    this.featureBorder(ctx, "#FFFCE9", 1.25, x, y, size);
  }

  featureBorder(ctx, color, lineWidth, x, y, size) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, size, size);
  }

  paintFeatureLabel(ctx, { x, y, size }, u) {
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "#182035";
    ctx.shadowBlur = 2;
    ctx.font = `${Math.max(9, Math.min(12, size * 0.21))}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u.toFixed(3), x + size / 2, y + size / 2, size - 4);
  }

  drawTrackingLinks(ctx) {
    ctx.save();
    this.clipTrackingArea(ctx);
    const tick = Math.floor(this.trackingTime / 85);
    const links = new Set();
    this.trackedPoints.forEach((point, index) =>
      this.connectTrackedPoint(ctx, point, index, tick, links),
    );
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#FFFCE9";
    for (const point of this.trackedPoints) ctx.fillRect(point.x - 1.5, point.y - 1.5, 3, 3);
    ctx.restore();
  }

  clipTrackingArea(ctx) {
    ctx.beginPath();
    ctx.rect(
      this.area.left,
      this.area.top,
      this.area.right - this.area.left,
      this.area.bottom - this.area.top,
    );
    ctx.clip();
  }

  nearestTrackedPoints(point, index) {
    return this.trackedPoints
      .map((target, i) => ({
        target,
        i,
        distance: Math.hypot(point.x - target.x, point.y - target.y),
      }))
      .filter((item) => item.i !== index)
      .sort((a, b) => a.distance - b.distance);
  }

  // Nearby strings form clusters; distant diagonals weave them into one web.
  chooseTrackingLinks(point, index, tick) {
    const candidates = this.nearestTrackedPoints(point, index);
    const count = this.trackingNoise(point.phase + 31, tick) > 0.5 ? 5 : 4;
    const selected = candidates.filter((item) => item.distance < 640).slice(0, count);
    const distant = candidates.filter((item) => item.distance > 260 && item.distance < 1100);
    if (distant.length) {
      selected.push(
        distant[Math.floor(this.trackingNoise(point.phase + 43, tick) * distant.length)],
      );
      if (index % 3 === 0)
        selected.push(
          distant[Math.floor(this.trackingNoise(point.phase + 59, tick) * distant.length)],
        );
    }
    return selected;
  }

  connectTrackedPoint(ctx, point, index, tick, links) {
    for (const { target, i } of this.chooseTrackingLinks(point, index, tick)) {
      const key = [Math.min(i, index), Math.max(i, index)].join(":");
      if (links.has(key)) continue;
      links.add(key);
      const flash = this.trackingNoise(point.phase + i + 37, tick);
      if (flash >= 0.06) this.paintTrackingLink(ctx, point, target, flash, tick);
    }
  }

  paintTrackingLink(ctx, point, target, flash, tick) {
    const thickness = 1.1 + flash * 0.6;
    ctx.globalAlpha = 0.52 + flash * 0.34;
    ctx.setLineDash(flash > 0.33 ? [] : [4, 7]);
    ctx.lineDashOffset = -(tick % 16) * 2;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(target.x, target.y);
    this.strokeTrackingLink(ctx, "rgba(19,27,51,0.2)", thickness + 1.8);
    this.strokeTrackingLink(ctx, flash > 0.94 ? "#08FFFF" : "#FFFCE9", thickness);
  }

  strokeTrackingLink(ctx, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  draw(ctx, now) {
    this.trackingTime = now;
    this.trackedPoints = [];
    ctx.save();
    this.clipMessageAreas(ctx);
    this.drawGreenFragments(ctx, now);
    this.drawMessages(ctx, now);
    ctx.restore();
  }

  // Keep decorative pixels and click regions away from the centre and footer.
  clipMessageAreas(ctx) {
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.area.bottom);
    ctx.rect(
      this.area.left,
      this.area.top,
      this.area.right - this.area.left,
      this.area.bottom - this.area.top,
    );
    ctx.clip("evenodd");
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.rect(this.logoBounds.x, this.logoBounds.y, this.logoBounds.w, this.logoBounds.h);
    ctx.clip("evenodd");
  }
}

// 6. CHALLENGE SCENE

// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted artwork, rewritten with basic p5 drawing, arrays, loops and classes.
// The ending adds a generative field of multiplying identity signals to the melting image.
let cartImage, meltPicture, meltSource;
let datamosh = null;
let collectedItems = [];
let products = [],
  words = [],
  signals = [];
let state = "intro",
  paused = false,
  collected = 0,
  meltClicks = 0;
let signalFrame = 0,
  signalBeat = 0,
  signalNumber = 0;
let signalStartedAt = 0,
  signalGlitchUntil = 0;
let signalBaseCount;
let hoveredSignal = null;
let returnAt = 0,
  returnEnd = 0;
const SIGNAL_BEATS = [3, 27, 41, 54, 67];
// The recording's attacks control the flow of printed ink.
const MELT_BEATS = [
  0.025, 0.299, 0.586, 0.874, 1.161, 1.442, 1.729, 2.015, 2.302, 2.589, 2.876, 3.157, 3.444, 3.729,
  4.011,
];
const PRODUCT_NAMES = ["OLD CLOTHES", "SELF HELP BOOK", "SKINCARE", "HEADPHONES", "PLANT"];
const SHIRT_POINTS = [
  [-35, -65],
  [-75, -35],
  [-52, 0],
  [-32, -12],
  [-36, 65],
  [36, 65],
  [32, -12],
  [52, 0],
  [75, -35],
  [35, -65],
];
function preloadChallenge() {
  cartImage = loadImage("assets/cart_challenge.png");
  loadProjectSounds(["item", "start", "datamosh", "notification", "ok", "transition"]);
}

function setupChallenge() {
  const canvas = makeCanvas(
    "Collect products and watch them become your identity. Click the sale labels.",
  );
  canvas.elt.tabIndex = 0;
  storeBackground = makeStoreBackground(false);
  textFont("Arial");
  frameRate(60);
  document.getElementById("challenge-start").onclick = startChallenge;
  document.getElementById("challenge-start").disabled = false;
  document.getElementById("challenge-start").textContent = "LET'S GO SHOPPING →";
  document.getElementById("challenge-pause").onclick = pauseChallenge;
  document.getElementById("challenge-restart").onclick = restartChallenge;
  document.getElementById("challenge-start").focus();
}

function drawChallenge() {
  if (aboutOpen || paused) return;
  if (state === "intro" || state === "collect") drawShopping();
  if (state === "melt" || state === "signals") drawMelting();
  if (state === "signals") drawSignals();
  if (state === "return") drawReturn();
  updateHud();
}

function startChallenge() {
  state = "collect";
  collectedItems = [];
  document.getElementById("challenge-intro").hidden = true;
  document.getElementById("challenge-pause").disabled = false;
  document.getElementById("challenge-restart").disabled = false;
  for (let i = 0; i < 3; i++) products.push(new Product(-100 - i * 180));
  playEffect("start", 0.35);
  setStatus("Click falling objects. Enter catches the lowest object.");
  document.querySelector("canvas").focus();
}

function pauseChallenge() {
  paused = !paused;
  if (paused) stopSounds();
  document.getElementById("challenge-pause").textContent = paused ? "RESUME ▶" : "PAUSE";
  document.getElementById("challenge-pause").setAttribute("aria-pressed", String(paused));
}

function restartChallenge() {
  stopSounds();
  products = [];
  words = [];
  if (datamosh) datamosh.dispose();
  datamosh = null;
  meltSource = null;
  signals = [];
  collected = 0;
  meltClicks = 0;
  paused = false;
  returnAt = 0;
  document.getElementById("challenge-stage").classList.remove("is-art-ending");
  resetChallengeButtons();
  startChallenge();
}

function resetChallengeButtons() {
  document.getElementById("challenge-pause").textContent = "PAUSE";
  document.getElementById("challenge-pause").setAttribute("aria-pressed", "false");
}

function drawShopping() {
  image(storeBackground, 0, 0, W, H);
  const cartWidth = (H * cartImage.width) / cartImage.height;
  image(cartImage, (W - cartWidth) / 2, 0, cartWidth, H);
  if (state === "collect" && frameCount % 24 === 0) products.push(new Product(-110));
  for (let i = products.length - 1; i >= 0; i--) {
    products[i].update();
    products[i].show();
    if (products[i].y > H + 200) products.splice(i, 1);
  }
  drawWords();
}

function pressChallenge(event) {
  if (event && event.target.tagName !== "CANVAS") return;
  if (aboutOpen || paused || mouseX < 0 || mouseX > W || mouseY < 0 || mouseY > H) return;
  if (state === "collect") catchAt(mouseX, mouseY);
  else if (state === "melt") meltAt(mouseX, mouseY);
  else if (state === "signals") activateSignal(mouseX, mouseY);
}

function keyChallenge(event) {
  if (keyCode !== ENTER || aboutOpen || paused) return;
  if (event && (event.repeat || ["BUTTON", "A"].includes(event.target.tagName))) return;
  if (state === "collect") catchLowest();
  else if (state === "melt") meltAt(random(100, W - 100), random(100, H - 100));
  else if (state === "signals") activateSignal();
  return false;
}

function catchAt(x, y) {
  for (let i = products.length - 1; i >= 0; i--) {
    if (!products[i].caught && dist(x, y, products[i].x, products[i].y) < 95) {
      catchProduct(products[i]);
      return;
    }
  }
}

function catchLowest() {
  let lowest = null;
  for (const product of products) {
    if (!product.caught && (!lowest || product.y > lowest.y)) lowest = product;
  }
  if (lowest) catchProduct(lowest);
}

function catchProduct(product) {
  product.caught = true;
  const oldColour = product.colour;
  while (product.colour === oldColour) product.colour = random(PALETTE);
  product.targetX = random(760, 1160);
  product.targetY = random(430, 720);
  addWord(PRODUCT_NAMES[product.kind], product.x, product.y);
  addWord("BETTER YOU?", product.x + 70, product.y + 45);
  collected++;
  collectedItems.push({ kind: product.kind, colour: product.colour });
  playEffect("item", 0.3);
  if (collected === 6) beginMelt(product.x, product.y);
}

function addWord(label, x, y) {
  words.push({ label, x, y, vy: -9, life: 55, colour: random(PALETTE) });
}

function drawWords() {
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i];
    word.y += word.vy;
    word.vy += 0.32;
    word.life--;
    stroke(0);
    strokeWeight(2);
    fill(word.colour);
    textSize(35 + sin(word.life * 0.5) * 5);
    text(word.label, word.x, word.y);
    if (word.life <= 0) words.splice(i, 1);
  }
}

function beginMelt(x, y) {
  drawShopping();
  state = "melt";
  meltSource = get();
  loopEffect("datamosh", 0.045);
  datamosh = new ConsumptionMelt(meltSource, collectedItems, new MeltBeatClock());
  meltAt(x, y);
  setStatus("Your purchases are taking over. Click another area, or press Enter, to print more.");
}

function meltAt(x, y) {
  if (!datamosh) return;
  datamosh.addDamage(x, y);
  meltClicks = datamosh.hits;
}

// The picked objects become advertising; feedback stretches their own printed colours.
function drawMelting() {
  loopEffect("datamosh", 0.045);
  datamosh.audioTrack.tick(min(deltaTime / 1000, 0.05));
  datamosh.draw(min(deltaTime / 1000, 0.05));
  drawWords();
  if (state === "melt" && datamosh.complete) beginSignals();
}

function beginSignals() {
  state = "signals";
  document.getElementById("challenge-stage").classList.add("is-art-ending");
  signalStartedAt = millis();
  signalNumber = 0;
  setupIdentityError();
  buildSignals();
  replaySignals();
  setStatus(
    "Your purchases have become you. Click a sale label, or press Enter, to keep upgrading.",
  );
}

// Read p5.sound's looping playhead to keep printed drips on the recording's cues.
class MeltBeatClock {
  constructor() {
    this.beats = MELT_BEATS;
    this.loop = true;
    this.duration = projectSounds.datamosh.isLoaded()
      ? projectSounds.datamosh.duration()
      : 4.280979;
    this.previous = 0;
    this.offset = 0;
    this.silentTime = 0;
  }

  tick(dt) {
    this.silentTime += dt;
  }

  elapsed() {
    const sound = projectSounds.datamosh;
    if (!sound.isLoaded()) return this.silentTime;
    const current = sound.currentTime();
    if (current < this.previous - 0.05) this.offset += this.duration;
    this.previous = current;
    return this.offset + current;
  }
}

function replaySignals() {
  signalFrame = frameCount;
  signalBeat = 0;
  playEffect("notification", 0.35);
}

function drawSignals() {
  drawIdentityError();
  drawSignalConnections();
  addSignalsOnBeat();
  hoveredSignal = signalAt(mouseX, mouseY);
  for (const signal of signals) signal.show();
  drawSignalGlitch();
  drawSignalTickers();
  cursor(hoveredSignal ? HAND : ARROW);
  if (returnAt > 0 && millis() >= returnAt) beginReturn();
}

function addSignalsOnBeat() {
  if (signalBeat >= SIGNAL_BEATS.length) return;
  if (frameCount - signalFrame < SIGNAL_BEATS[signalBeat]) return;
  if (signalBeat > 0) addSignalEchoes(2);
  signalBeat++;
}

function signalAt(x, y) {
  for (let i = signals.length - 1; i >= 0; i--) {
    if (signals[i].hit(x, y)) return signals[i];
  }
  return null;
}

function activateSignal(x, y) {
  if (millis() - signalStartedAt < 700) return;
  const signal = x === undefined ? signals[0] : signalAt(x, y);
  if (!signal) return;
  if (returnAt === 0) returnAt = millis() + 12000;
  signal.activeUntil = millis() + 650;
  signalGlitchUntil = millis() + 240;
  meltSignalImage(signal);
  burstIdentity(signal.x, signal.y);
  addSignalEchoes(5);
  playEffect("ok", 0.35);
  replaySignals();
}

function beginReturn() {
  state = "return";
  returnEnd = millis() + 1900;
  meltSignalImage(signals[0]);
  meltPicture = get();
  stopSounds();
  playEffect("transition", 0.4);
  setStatus("Returning to ME-MARRT.");
}

function drawReturn() {
  image(meltPicture, 0, 0, W, H);
  drawRetailReturn();
  if (millis() >= returnEnd) {
    shutdownSounds();
    location.href = "./";
  }
}

function updateHud() {
  document.getElementById("challenge-count").textContent = String(collected).padStart(2, "0");
  document.getElementById("challenge-mode").textContent =
    state === "intro" || state === "collect" ? "CATCH THE NEXT YOU." : "CLICK / LET IT MELT.";
  const stage = document.getElementById("challenge-stage");
  stage.dataset.mode = state;
  stage.dataset.collected = collected;
  stage.dataset.damageHits = meltClicks;
  stage.dataset.signals = signals.length;
  stage.dataset.signalCopies = signalNumber;
  stage.dataset.signalReady = String(state === "signals" && millis() - signalStartedAt >= 700);
  stage.dataset.damageCoverage = datamosh ? datamosh.coverage.toFixed(3) : "0";
  stage.dataset.datamoshBeats = datamosh ? datamosh.beatCount : 0;
}

function setStatus(message) {
  document.getElementById("challenge-art-status").textContent = message;
}

class Product {
  constructor(y) {
    this.x = random(130, W - 130);
    this.y = y;
    this.kind = floor(random(PRODUCT_NAMES.length));
    this.colour = random(PALETTE);
    this.speed = random(5, 8);
    this.angle = random(-0.25, 0.25);
    this.caught = false;
    this.size = random(140, 180);
  }

  update() {
    if (this.caught) {
      this.x += (this.targetX - this.x) * 0.15;
      this.y += (this.targetY - this.y) * 0.15;
      this.size += (110 - this.size) * 0.15;
      this.angle *= 0.9;
    } else {
      this.y += this.speed;
      this.angle += 0.004;
    }
  }

  show() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    scale(this.size / 180);
    stroke("#111111");
    strokeWeight(4);
    fill(this.colour);
    drawProduct(this.kind, this.colour);
    pop();
  }
}

function drawProduct(kind, colour, painter = window) {
  if (kind === 0) drawShirt(painter);
  if (kind === 1) drawBook(painter);
  if (kind === 2) drawBottle(painter);
  if (kind === 3) drawHeadphones(colour, painter);
  if (kind === 4) drawPlant(painter);
}

function drawShirt(painter = window) {
  painter.beginShape();
  for (const point of SHIRT_POINTS) painter.vertex(point[0], point[1]);
  painter.endShape(CLOSE);
  painter.line(-20, -60, 20, -60);
  painter.fill("#FFF6DF");
  painter.rect(-20, -15, 40, 30);
}

function drawBook(painter = window) {
  painter.rect(-55, -70, 110, 140);
  painter.fill("#FFF6DF");
  painter.rect(-45, 50, 110, 20);
  painter.line(-38, -65, -38, 48);
  painter.line(-20, -25, 38, -25);
  painter.line(-20, -5, 25, -5);
}

function drawBottle(painter = window) {
  painter.rect(-42, -45, 84, 110, 14);
  painter.fill("#FFF6DF");
  painter.rect(-25, -70, 50, 25);
  painter.rect(-35, -5, 70, 35);
  painter.line(-22, 10, 22, 10);
}

function drawHeadphones(colour, painter = window) {
  painter.noFill();
  painter.strokeWeight(14);
  painter.arc(0, -5, 120, 125, PI, TWO_PI);
  painter.strokeWeight(4);
  painter.fill(colour);
  painter.rect(-75, -10, 35, 65, 8);
  painter.rect(40, -10, 35, 65, 8);
}

function drawPlant(painter = window) {
  painter.line(0, 35, 0, -65);
  painter.ellipse(-25, -30, 65, 26);
  painter.ellipse(25, -60, 65, 26);
  painter.fill("#EE2724");
  painter.triangle(-50, 20, 50, 20, 0, 90);
  painter.rect(-55, 15, 110, 15);
}

// 7. CONSUMPTION MELT — PRINTED GOODS TAKE OVER THE SCREEN
// AI-assisted, edited for ME-MARRT. Store-colour source cards feed restored neon colour shifts.
// Catalogue imagery feeds the original neon pixel feedback and diagonal melting ribbons.
const PRINT_INKS = ["#087CFF", "#EE2724"];
const PRINT_PAPERS = ["#FFF6DF", "#FDCFDE", "#FFFF00"];

function makeCatalogueCard(item, number) {
  const card = createGraphics(240, 180);
  card.pixelDensity(1);
  card.background(PRINT_PAPERS[number % PRINT_PAPERS.length]);
  paintCatalogueFrame(card, item, number);
  card.push();
  card.translate(120, 85);
  card.scale(0.58);
  card.stroke(PRINT_INKS[number % 2]);
  card.strokeWeight(4);
  card.fill(PRINT_INKS[number % 2]);
  drawProduct(item.kind, PRINT_INKS[number % 2], card);
  card.pop();
  return card;
}

function paintCatalogueFrame(card, item, number) {
  card.stroke(PRINT_INKS[number % 2]);
  card.strokeWeight(2);
  card.noFill();
  card.rect(4, 4, 232, 172);
  card.noStroke();
  card.fill(PRINT_INKS[number % 2]);
  card.textFont("Arial");
  card.textStyle(BOLD);
  card.textSize(12);
  card.text("ME-MARRT / NEW YOU", 13, 20);
  card.text(PRODUCT_NAMES[item.kind], 13, 151);
  paintCatalogueBarcode(card, number);
}

function paintCatalogueBarcode(card, number) {
  card.fill("#087CFF");
  for (let x = 13; x < 145; x += 4) {
    const thick = (x + number * 7) % 11 < 5 ? 2 : 1;
    card.rect(x, 158, thick, 11);
  }
  card.textSize(12);
  card.text("100% FREE", 159, 168);
}

class ConsumptionMelt {
  constructor(source, items, audioTrack) {
    this.w = W / 2;
    this.h = H / 2;
    this.field = createGraphics(this.w, this.h);
    this.field.pixelDensity(1);
    this.field.image(source, 0, 0, this.w, this.h);
    this.cards = items.map((item, i) => makeCatalogueCard(item, i));
    this.audioTrack = audioTrack;
    this.time = this.hits = this.printIndex = 0;
    this.nextPrint = 0;
    this.complete = false;
    this.glitch = new DatamoshFeedback(source.canvas, { track: audioTrack });
  }

  get coverage() {
    return this.glitch.coverage;
  }

  get beatCount() {
    return this.glitch.beatCount;
  }

  get ribbons() {
    return this.glitch.ribbons;
  }

  addDamage(x, y) {
    if (this.complete) return;
    this.hits++;
    for (let i = 0; i < 3; i++) {
      const px = constrain(x / 2 + random(-65, 65), 70, this.w - 70);
      const py = constrain(y / 2 + random(-35, 35), 55, this.h - 55);
      this.stamp(px, py, random(145, 220));
    }
    this.glitch.addDamage(x, y, this.field.canvas);
  }

  stamp(x, y, width) {
    const card = this.cards[this.printIndex++ % this.cards.length];
    const g = this.field;
    g.push();
    g.translate(x, y);
    g.rotate(random(-0.07, 0.07));
    g.image(card, -width / 2, -width * 0.375, width, width * 0.75);
    g.pop();
  }

  // The source is the new catalogue; the transport and sheared melting come from the old effect.
  printMore() {
    if (this.hits < 3 || this.time < this.nextPrint) return;
    this.nextPrint = this.time + 0.28;
    const index = this.printIndex % 20;
    const x = (index % 5) * 192 + 96 + random(-12, 12);
    const y = floor(index / 5) * 140 + 65 + random(-8, 8);
    this.stamp(x, y, random(190, 220));
  }

  absorb(fragment, x, y, width, height) {
    this.field.image(fragment, x, y, width, height);
    const effect = this.glitch;
    effect.fieldCtx.drawImage(fragment.canvas, x, y, width, height);
    effect.textureCtx.drawImage(effect.field, 0, 0);
    effect.addRegion(
      { x: x + width / 2, y: y + height / 2, radius: width * 0.4, born: effect.time },
      70,
    );
  }

  draw(dt) {
    this.time += dt;
    this.printMore();
    this.glitch.draw(drawingContext, dt, this.field.canvas);
    this.complete = this.hits >= 6 && this.glitch.complete;
  }

  dispose() {
    this.field.remove();
    for (const card of this.cards) card.remove();
    this.glitch.dispose();
  }
}

// Original channel transforms, block transport and diagonal ribbons, now fed by purchased goods.
// AI-assisted project code, restored from this project's earlier version and adapted to p5 buffers.
const DATAMOSH_CHANNEL_ORDERS = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
  [1, 0, 2],
  [0, 2, 1],
  [2, 1, 0],
];
const DATAMOSH_INVERTED_CHANNELS = [-1, -1, -1, 0, 1, 2];

class DatamoshFeedback {
  constructor(source, { track = null } = {}) {
    this.initializeDimensions(source);
    this.initializeMeltState();
    this.initializeBeatState(track);
    this.buffers = [];
    this.createSurfaces();
    this.pixelScratch = new Float64Array(3);
    this.sourcePixel = new Float64Array(3);
    this.cleanCtx.drawImage(source, 0, 0, this.w, this.h);
    this.prepareTexture();
  }

  initializeDimensions(source) {
    this.width = source.width;
    this.height = source.height;
    this.w = 960;
    this.h = 540;
  }

  initializeMeltState() {
    this.time = 0;
    this.hits = 0;
    this.complete = false;
    this.floodAt = null;
    this.seed = Math.random() * 10000;
    this.cells = new Uint8Array(32 * 18);
    this.regions = [];
    this.ribbons = [];
    this.accumulator = 0;
    this.nextFlow = 0;
  }

  initializeBeatState(track) {
    this.audioTrack = track;
    this.audioCycle = 0;
    this.audioCue = 0;
    this.beatPulse = 0;
    this.lastAudioBeatAt = -Infinity;
    this.beatCount = 0;
    this.beatLog = [];
  }

  createSurfaces() {
    this.clean = this.surface();
    this.texture = this.surface();
    this.field = this.surface();
    this.history = this.surface();
    this.cleanCtx = this.clean.getContext("2d");
    this.textureCtx = this.texture.getContext("2d", { willReadFrequently: true });
    this.fieldCtx = this.field.getContext("2d");
    this.historyCtx = this.history.getContext("2d");
  }

  // p5 owns every buffer; native pixel operations preserve the original datamosh appearance.
  surface() {
    const graphics = createGraphics(this.w, this.h);
    graphics.pixelDensity(1);
    this.buffers.push(graphics);
    return graphics.canvas;
  }

  hash(n) {
    const value = Math.sin(n * 127.1 + this.seed) * 43758.5453;
    return value - Math.floor(value);
  }

  random(min, max) {
    return min + Math.random() * (max - min);
  }

  get coverage() {
    return this.cells.reduce((sum, value) => sum + value, 0) / this.cells.length;
  }

  prepareTexture(source) {
    if (source) this.cleanCtx.drawImage(source, 0, 0, this.w, this.h);
    const ctx = this.textureCtx;
    ctx.drawImage(this.clean, 0, 0);
    ctx.globalAlpha = 0.65;
    ctx.drawImage(this.field, 0, 0);
    ctx.globalAlpha = 1;
    const image = ctx.getImageData(0, 0, this.w, this.h);
    this.colourTexture(image.data);
    ctx.putImageData(image, 0, 0);
  }

  channelTurns() {
    const columns = Math.ceil(this.w / 18);
    const turns = [];
    for (let i = 0; i < columns * Math.ceil(this.h / 12); i++) {
      turns[i] = Math.floor(this.hash(i + this.hits * 13) * 6);
    }
    return { columns, turns };
  }

  colourTexture(data) {
    const { columns, turns } = this.channelTurns();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const index = (y * this.w + x) * 4;
        const turn = turns[Math.floor(y / 12) * columns + Math.floor(x / 18)];
        this.colourPixel(data, index, turn);
      }
    }
  }

  colourPixel(data, index, turn) {
    const rgb = this.pixelScratch;
    for (let channel = 0; channel < 3; channel++) rgb[channel] = data[index + channel];
    this.transformPixel(rgb, turn);
    for (let channel = 0; channel < 3; channel++) {
      data[index + channel] = Math.round(rgb[channel] / 32) * 32;
    }
  }

  transformPixel(rgb, turn) {
    const brightGray = Math.max(...rgb) - Math.min(...rgb) < 24 && rgb[0] > 170;
    if (brightGray) this.brightenPixel(rgb);
    else {
      this.saturatePixel(rgb);
      this.shiftChannels(rgb, turn);
    }
  }

  brightenPixel(rgb) {
    for (let channel = 0; channel < 3; channel++) {
      rgb[channel] = Math.min(255, rgb[channel] * 1.1);
    }
  }

  saturatePixel(rgb) {
    for (let channel = 0; channel < 3; channel++) {
      rgb[channel] = Math.max(0, Math.min(255, (rgb[channel] - 100) * 1.8 + 80));
    }
  }

  shiftChannels(rgb, turn) {
    for (let channel = 0; channel < 3; channel++) this.sourcePixel[channel] = rgb[channel];
    const order = DATAMOSH_CHANNEL_ORDERS[turn];
    for (let channel = 0; channel < 3; channel++) rgb[channel] = this.sourcePixel[order[channel]];
    const inverted = DATAMOSH_INVERTED_CHANNELS[turn];
    if (inverted >= 0) rgb[inverted] = 255 - rgb[inverted];
  }

  mark(x, y, w, h) {
    const left = Math.max(0, Math.floor(x / 30));
    const right = Math.min(31, Math.floor((x + w) / 30));
    const top = Math.max(0, Math.floor(y / 30));
    const bottom = Math.min(17, Math.floor((y + h) / 30));
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) this.cells[row * 32 + col] = 1;
    }
  }

  addDamage(x, y, source) {
    if (this.complete) return;
    this.hits++;
    this.prepareTexture(source);
    this.makeRegion(
      (x / this.width) * this.w,
      (y / this.height) * this.h,
      Math.min(157, 74 + this.hits * 7),
    );
  }

  makeRegion(x, y, radius) {
    x = Math.max(0, Math.min(this.w, x));
    y = Math.max(0, Math.min(this.h, y));
    for (let dy = -radius; dy < radius; dy += 9) {
      for (let dx = -radius; dx < radius; dx += 12) {
        if (!this.insideRegion(dx, dy, radius)) continue;
        this.paintRegionFragment(this.fieldCtx, x + dx, y + dy);
      }
    }
    this.addRegion({ x, y, radius, born: this.time }, 58);
  }

  insideRegion(dx, dy, radius) {
    return (
      (dx * dx) / (radius * radius) + (dy * dy) / (radius * radius) <= 0.8 + Math.random() * 0.3
    );
  }

  paintRegionFragment(ctx, px, py) {
    const w = this.random(10, 27);
    const h = this.random(7, 19);
    const { sx, sy } = this.fragmentSource(px, py);
    this.drawTextureFragment(ctx, sx, sy, px, py, w, h);
    this.fragmentFringe(ctx, px, py, w);
    this.mark(px, py, w, h);
  }

  fragmentSource(px, py) {
    const local = Math.random() > 0.22;
    const sx = local
      ? Math.max(0, Math.min(this.w - 45, px + this.random(-25, 25)))
      : this.random(250, 650);
    const sy = local
      ? Math.max(0, Math.min(this.h - 35, py + this.random(-20, 20)))
      : this.random(40, 490);
    return { sx, sy };
  }

  drawTextureFragment(ctx, sx, sy, px, py, w, h) {
    ctx.drawImage(this.texture, sx, sy, this.random(6, 40), this.random(3, 25), px, py, w, h);
  }

  fragmentFringe(ctx, x, y, w) {
    if (Math.random() <= 0.7) return;
    ctx.fillStyle = Math.random() > 0.5 ? "#00E000" : "#FF2396";
    ctx.fillRect(x, y, w, 1);
  }

  addRegion(region, ribbonCount) {
    this.regions.push(region);
    this.regions = this.regions.slice(-24);
    for (let i = 0; i < ribbonCount; i++) this.addRibbon(region);
    this.historyCtx.drawImage(this.field, 0, 0);
  }

  addRibbon(region) {
    const x = region.x + this.random(-region.radius, region.radius);
    const y = region.y + this.random(-region.radius * 0.7, region.radius * 0.7);
    this.ribbons.push(this.makeRibbon(x, y));
    this.ribbons = this.ribbons.slice(-650);
  }

  makeRibbon(x, y) {
    return {
      x,
      y,
      width: this.random(2, 14),
      length: this.random(3, 22),
      speed: this.random(34, 112),
      shear: this.random(-0.18, 0.95),
      sx: Math.max(0, Math.min(this.w - 24, x + this.random(-35, 35))),
      sy: Math.max(0, Math.min(this.h - 28, y + this.random(-28, 28))),
      sampleHeight: this.random(2, 18),
      born: this.time,
      fringe: Math.random() > 0.5 ? "#00EDFF" : "#FF009E",
    };
  }

  updateAudioBeat(dt) {
    this.beatPulse = Math.max(0, this.beatPulse - dt * 8);
    const track = this.audioTrack;
    const elapsed = track?.elapsed();
    if (!track || !Number.isFinite(elapsed) || elapsed < 0 || !track.beats.length) return;
    if (!track.loop && this.audioCue >= track.beats.length) return;
    const duration = track.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    this.skipStaleCycles(track, elapsed, duration);
    this.consumeAudioCues(track, elapsed, duration);
    this.beatPulse = Math.max(0, 1 - (elapsed - this.lastAudioBeatAt) * 8);
  }

  skipStaleCycles(track, elapsed, duration) {
    if (!track.loop || elapsed - this.audioCycle * duration <= duration * 2) return;
    this.audioCycle = Math.floor(elapsed / duration);
    this.audioCue = 0;
  }

  consumeAudioCues(track, elapsed, duration) {
    for (let count = 0; count < 32; count++) {
      const expected = this.audioCycle * duration + track.beats[this.audioCue];
      if (elapsed < expected) break;
      this.recordAudioCue(expected, elapsed);
      this.audioCue++;
      if (this.audioCue === track.beats.length) {
        if (!track.loop) break;
        this.audioCue = 0;
        this.audioCycle++;
      }
    }
  }

  recordAudioCue(expected, elapsed) {
    this.lastAudioBeatAt = expected;
    this.beatCount++;
    this.beatLog.push({ beat: Number(expected.toFixed(3)), at: Number(elapsed.toFixed(3)) });
    this.beatLog = this.beatLog.slice(-16);
    for (let i = 0; i < 8 && this.regions.length; i++) this.addRibbon(this.randomRegion());
  }

  randomRegion() {
    return this.regions[Math.floor(Math.random() * this.regions.length)];
  }

  feedback(dt) {
    const ctx = this.fieldCtx;
    ctx.drawImage(this.history, 0, 0);
    const pulse = this.audioTrack ? this.beatPulse : 1;
    this.transportFragments(ctx, pulse);
    this.stretchRibbons(ctx, dt);
    this.removeInactiveRibbons();
    this.addAmbientFlow();
    this.historyCtx.drawImage(this.field, 0, 0);
    this.updateFlood();
  }

  transportFragments(ctx, pulse) {
    for (let i = 0; i < 1 + Math.round(8 * pulse) && this.regions.length; i++) {
      this.transportFragment(ctx, this.randomRegion(), pulse);
    }
  }

  transportFragment(ctx, region, pulse) {
    const bounds = this.transportBounds(region);
    this.drawTransport(ctx, bounds, pulse);
  }

  transportBounds(region) {
    const sx = Math.max(
      0,
      Math.min(this.w - 60, region.x + this.random(-region.radius, region.radius)),
    );
    const sy = Math.max(
      0,
      Math.min(this.h - 16, region.y + this.random(-region.radius, region.radius + 160)),
    );
    const w = Math.min(this.w - sx, this.random(20, 150));
    const h = this.random(2, 12);
    return { sx, sy, w, h };
  }

  drawTransport(ctx, { sx, sy, w, h }, pulse) {
    ctx.drawImage(
      this.history,
      sx,
      sy,
      w,
      h,
      sx + this.random(-8, 13) * pulse,
      sy + this.random(3, 13) * (0.2 + pulse),
      w,
      h,
    );
  }

  stretchRibbons(ctx, dt) {
    for (const ribbon of this.ribbons) {
      this.advanceRibbon(ribbon, dt);
      this.drawRibbon(ctx, ribbon);
    }
  }

  advanceRibbon(ribbon, dt) {
    const previous = ribbon.length;
    const flow = this.audioTrack ? 0.2 + this.beatPulse * 3 : 1;
    ribbon.length = Math.min(this.h + 180, ribbon.length + ribbon.speed * dt * flow);
    const endX = ribbon.x + ribbon.shear * ribbon.length;
    this.mark(endX, ribbon.y + previous, ribbon.width, Math.max(4, ribbon.length - previous));
  }

  drawRibbon(ctx, ribbon) {
    ctx.save();
    ctx.translate(Math.round(ribbon.x), Math.round(ribbon.y));
    ctx.transform(1, 0, ribbon.shear, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    this.paintRibbonTexture(ctx, ribbon);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = ribbon.fringe;
    ctx.fillRect(0, 0, 1, ribbon.length);
    ctx.restore();
  }

  paintRibbonTexture(ctx, ribbon) {
    ctx.drawImage(
      this.texture,
      ribbon.sx,
      ribbon.sy,
      ribbon.width,
      ribbon.sampleHeight,
      0,
      0,
      ribbon.width,
      ribbon.length,
    );
  }

  removeInactiveRibbons() {
    this.ribbons = this.ribbons.filter(
      (ribbon) => ribbon.y + ribbon.length < this.h + 180 && this.time - ribbon.born < 13,
    );
  }

  addAmbientFlow() {
    if (this.audioTrack || this.time < this.nextFlow || !this.regions.length) return;
    this.nextFlow = this.time + 0.13;
    for (let i = 0; i < 3; i++) this.addRibbon(this.randomRegion());
  }

  // Fill the final gaps only after several clicked patches have already merged.
  updateFlood() {
    if (this.floodAt === null && this.hits >= 5 && this.coverage >= 0.74) this.floodAt = this.time;
    if (this.floodAt === null || this.complete) return;
    this.spillIntoGaps();
    if (this.coverage > 0.98 && this.time - this.floodAt > 1.1) this.complete = true;
  }

  spillIntoGaps() {
    const gaps = [];
    this.cells.forEach((value, index) => {
      if (!value) gaps.push(index);
    });
    for (let i = 0; i < 4 && gaps.length; i++) {
      const index = gaps.splice(Math.floor(Math.random() * gaps.length), 1)[0];
      this.makeRegion((index % 32) * 30 + 15, Math.floor(index / 32) * 30 + 15, 44);
    }
  }

  draw(ctx, dt, source) {
    this.time += dt;
    this.accumulator += dt;
    this.updateAudioBeat(dt);
    if (source) this.cleanCtx.drawImage(source, 0, 0, this.w, this.h);
    if (this.accumulator >= 1 / 30) {
      this.feedback(this.accumulator);
      this.accumulator = 0;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.clean, 0, 0, this.width, this.height);
    ctx.drawImage(this.field, 0, 0, this.width, this.height);
    ctx.restore();
  }

  dispose() {
    for (const graphics of this.buffers) graphics.remove();
  }
}

// 8. SALE LABELS AND SCROLLING PROMOTIONS

// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted, edited for ME-MARRT: sale language repeats while purchases take over.
// Pointed retail tags keep the upgrade action visible inside the catalogue collapse.
const SIGNAL_WORDS = ["MORE", "NEW ME", "BETTER", "UPGRADE", "ONE MORE", "FREE"];
const ALERT_MESSAGE = "ME-MARRT / CLICK A SALE LABEL / TRY ANOTHER YOU / ";
const LOOP_MESSAGE = "WANT > NEED > WANT / THE NEXT YOU IS NEVER THE LAST / ";

function buildSignals() {
  signals = [];
  addGeneratedSignal("NEW YOU", true);
  for (let i = 0; i < 8; i++) addGeneratedSignal(random(SIGNAL_WORDS), i % 3 === 0);
  signalBaseCount = signals.length;
}

function addGeneratedSignal(word, solid = false) {
  const w = random(200, 370);
  const h = random(125, 215);
  const x = randomSignalX(w, random() < 0.5 ? -1 : 1);
  const y = random(h / 2 + 110, H - h / 2 - 120);
  signals.push(new SaleLabel(x, y, w, h, word, solid, random(-0.18, 0.18)));
}

function addSignalEchoes(count) {
  for (let i = 0; i < count; i++) addGeneratedSignal(random(SIGNAL_WORDS), random() < 0.25);
  while (signals.length > 32) signals.splice(signalBaseCount, 1);
}

class SaleLabel {
  constructor(x, y, w, h, word, solid, angle) {
    this.number = ++signalNumber;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.word = word;
    this.solid = solid;
    this.angle = angle;
    this.born = millis() + (this.number % 6) * 35;
    this.activeUntil = 0;
    this.initMotion();
  }

  initMotion() {
    this.side = this.x < W / 2 ? -1 : 1;
    this.changeEvery = floor(random(65, 145));
    this.scatter();
  }

  // Each signal has its own rhythm. Ordinary position updates move it toward a new random point.
  scatter() {
    this.targetX = randomSignalX(this.w, this.side);
    this.targetY = random(this.h / 2 + 110, H - this.h / 2 - 120);
    this.targetAngle = random(-0.2, 0.2);
  }

  update() {
    // Only the front sign pauses; signs behind it keep moving past the cursor.
    if (this === hoveredSignal) return;
    if (frameCount % this.changeEvery === 0) this.scatter();
    this.x += (this.targetX - this.x) * 0.035;
    this.y += (this.targetY - this.y) * 0.035;
    this.angle += (this.targetAngle - this.angle) * 0.05;
  }

  show() {
    const age = millis() - this.born;
    if (age < 0 || (age < 180 && floor(age / 45) % 2 === 0)) return;
    this.update();
    const jitter = millis() < this.activeUntil ? 15 : 1.5;
    push();
    translate(this.x + random(-jitter, jitter), this.y);
    rotate(this.angle);
    this.drawClickRing();
    this.drawPanel();
    this.drawLabel();
    pop();
  }

  // A slow pulse suggests an active control even before the visitor hovers.
  drawClickRing() {
    const hovered = this === hoveredSignal;
    noFill();
    stroke(8, 124, 255, hovered ? 255 : 90 + 55 * sin(frameCount * 0.06 + this.number));
    strokeWeight(hovered ? 3 : 1);
    this.priceTag(hovered ? 1.08 : 1.04);
  }

  selected() {
    return this === hoveredSignal || millis() < this.activeUntil;
  }

  ink() {
    return this.solid && !this.selected() ? "#FFF6DF" : "#087CFF";
  }

  drawPanel() {
    stroke("#087CFF");
    strokeWeight(2);
    fill(this.selected() ? "#FFFF00" : this.solid ? "#EE2724" : "#FFF6DF");
    this.priceTag(1);
    noStroke();
    fill(this.ink());
    circle(this.w * 0.37, 0, 9);
  }

  priceTag(amount) {
    const w = this.w * amount;
    const h = this.h * amount;
    beginShape();
    vertex(-w / 2, -h / 2);
    vertex(w * 0.33, -h / 2);
    vertex(w / 2, 0);
    vertex(w * 0.33, h / 2);
    vertex(-w / 2, h / 2);
    endShape(CLOSE);
  }

  drawLabel() {
    noStroke();
    fill(this.ink());
    textAlign(CENTER, CENTER);
    textFont("Arial");
    textStyle(BOLDITALIC);
    textSize(this.h * 0.24);
    if (textWidth(this.word) > this.w * 0.7)
      textSize((textSize() * this.w * 0.7) / textWidth(this.word));
    text(this.word, -this.w * 0.035, 0);
    this.drawDetails();
  }

  drawDetails() {
    textStyle(NORMAL);
    textFont("monospace");
    textSize(max(10, this.h * 0.055));
    text("ME-MARRT / OFFER " + String(this.number).padStart(3, "0"), 0, -this.h * 0.3);
    this.drawClickHint();
  }

  drawClickHint() {
    fill("#FFFF00");
    noStroke();
    rect(-this.w * 0.34, this.h * 0.23, this.w * 0.68, 25, 3);
    fill("#090203");
    textStyle(BOLD);
    textSize(14);
    text("CLICK TO UPGRADE", 0, this.h * 0.23 + 12.5);
  }

  // Rotate the mouse back into the price tag; the pointed end narrows toward its tip.
  hit(x, y) {
    if (millis() < this.born) return false;
    const dx = x - this.x;
    const dy = y - this.y;
    const localX = dx * cos(this.angle) + dy * sin(this.angle);
    const localY = abs(-dx * sin(this.angle) + dy * cos(this.angle));
    const rightEdge = this.w / 2 - (localY * this.w * 0.34) / this.h;
    return localY <= this.h / 2 && localX >= -this.w / 2 && localX <= rightEdge;
  }
}

function drawSignalConnections() {
  stroke(8, 124, 255, 55);
  strokeWeight(1);
  for (let i = 0; i < signals.length; i += 2) {
    const other = signals[(i + 3) % signals.length];
    line(signals[i].x, signals[i].y, other.x, other.y);
  }
}

// Draw two narrow alert ribbons above the signs, leaving the melt visible between them.
function drawSignalTickers() {
  drawAlertTicker(ALERT_MESSAGE, 48, 92, "#FFFF00", "#090203");
  drawAlertTicker(LOOP_MESSAGE, 1000, -72, "#087CFF", "#FFF6DF");
}

// Repeat one measured phrase: modulo wraps it smoothly without a blank gap.
function drawAlertTicker(message, y, speed, paperColour, inkColour) {
  push();
  noStroke();
  fill(paperColour);
  rect(0, y, W, 48);
  fill(inkColour);
  textFont("Impact");
  textStyle(NORMAL);
  textSize(30);
  textAlign(LEFT, CENTER);
  const step = textWidth(message);
  const offset = (((millis() - signalStartedAt) / 1000) * speed) % step;
  for (let x = -step - offset; x < W + step; x += step) text(message, x, y + 24);
  pop();
}

// A click slips the printed image downward while the catalogue keeps spreading.
function drawSignalGlitch() {
  if (millis() >= signalGlitchUntil) return;
  for (let i = 0; i < 12; i++) {
    const y = random(150, 1000);
    copy(0, y, W, 10, random(-10, 10), y + random(8, 40), W, 10);
  }
}

function meltSignalImage(signal) {
  const x = constrain(floor(signal.x - signal.w / 2 - 12), 0, W - 1);
  const y = constrain(floor(signal.y - signal.h / 2 - 12), 0, H - 1);
  const w = min(signal.w + 24, W - x);
  const h = min(signal.h + 24, H - y);
  datamosh.absorb(get(x, y, w, h), x / 2, y / 2, w / 2, h / 2);
}

function drawRetailReturn() {
  const progress = constrain(1 - (returnEnd - millis()) / 1900, 0, 1);
  noStroke();
  fill("#087CFF");
  for (let x = 0; x < W; x += 28) rect(x, 0, 5 + (x % 9), H * progress);
  textFont("Arial");
  textStyle(BOLDITALIC);
  textAlign(CENTER, CENTER);
  textSize(80);
  fill("#FFFF00");
  text("BACK FOR MORE?", W / 2, H / 2);
}

// 9. PRODUCT IDENTITY — THE SHOPPER BECOMES THE THINGS THEY BUY
// The body is a masked collage of the actual collected products; its ink drips into a barcode.
let identityMask, identitySilhouette, identitySource;
let identityShards = [];
let identityDamage = 0;
const PERSON_POINTS = [
  [160, 180],
  [280, 180],
  [355, 365],
  [312, 390],
  [273, 290],
  [275, 470],
  [305, 770],
  [225, 770],
  [220, 550],
  [215, 770],
  [135, 770],
  [165, 470],
  [167, 290],
  [128, 390],
  [85, 365],
];

// Keep the middle available for the missing person while every sign still moves randomly.
function randomSignalX(width, side) {
  if (side < 0) return random(width / 2 + 40, W / 2 - 280 - width / 2);
  return random(W / 2 + 280 + width / 2, W - width / 2 - 40);
}

function setupIdentityError() {
  if (identityMask) identityMask.remove();
  identityMask = createGraphics(440, 800);
  identityMask.pixelDensity(1);
  drawProductMask();
  identitySilhouette = makeProductPerson();
  identitySource = get();
  identityShards = [];
  identityDamage = 0;
}

function drawProductMask() {
  const picture = identityMask;
  picture.clear();
  picture.noStroke();
  picture.fill("#FFFFFF");
  picture.ellipse(220, 90, 122, 146);
  picture.beginShape();
  for (const point of PERSON_POINTS) picture.vertex(point[0], point[1]);
  picture.endShape(CLOSE);
}

function makeProductPerson() {
  const sheet = createGraphics(440, 800);
  sheet.pixelDensity(1);
  for (let row = 0; row < 10; row++) {
    for (let column = 0; column < 4; column++) {
      const card = datamosh.cards[(row + column) % datamosh.cards.length];
      sheet.image(card, column * 110, row * 80, 110, 83);
    }
  }
  const person = sheet.get();
  person.mask(identityMask.get());
  sheet.remove();
  return person;
}

function drawIdentityError() {
  push();
  drawIdentityGhostType();
  drawIdentityBackdrop();
  drawIdentityShards();
  drawIdentitySilhouette();
  drawIdentityReadout();
  drawIdentityScan();
  pop();
}

// Reassemble the product-person from slipping strips, like printed ink losing its registration.
function drawIdentitySilhouette() {
  const time = (millis() - signalStartedAt) / 1000;
  const strength = 4 + min(identityDamage, 10) * 2;
  for (let y = 0; y < 800; y += 8) {
    if ((floor(y / 8) + identityDamage) % 19 === 0) continue;
    let shift = sin(y * 0.075 + time * 2) * strength;
    if (millis() < signalGlitchUntil) shift += random(-70, 70);
    const x = W / 2 - 220 + shift;
    const fallY = 140 + y + identityStripDrop(time, y);
    image(identitySilhouette, x, fallY, 440, 8, 0, y, 440, 8);
  }
}

// Clicks increase how far each band falls before it wraps, gradually losing the body's outline.
function identityStripDrop(time, y) {
  if (identityDamage === 0) return 0;
  return (time * 100 + y * 0.6) % min(220, 40 + identityDamage * 25);
}

function drawIdentityGhostType() {
  textFont("Arial");
  textStyle(BOLDITALIC);
  textAlign(LEFT, TOP);
  textSize(160);
  noFill();
  stroke("#EE2724");
  strokeWeight(2);
  text("MORE", 65, 135);
  text("AGAIN", 1210, 780);
}

// Echo the landing page's yellow display circle: the person is now the displayed product.
function drawIdentityBackdrop() {
  noStroke();
  fill("#087CFF");
  ellipse(W / 2 + 9, 552, 632, 632);
  fill("#FFFF00");
  ellipse(W / 2, 543, 620, 620);
}

function drawIdentityReadout() {
  noStroke();
  fill("#FFF6DF");
  rect(W / 2 - 180, 454, 360, 122);
  fill("#087CFF");
  textAlign(CENTER, TOP);
  textFont("Arial");
  textStyle(BOLDITALIC);
  textSize(84);
  text(identityDamage > 2 ? "SOLD" : "YOU", W / 2, 466);
  textFont("monospace");
  textSize(15);
  text("100% MATERIAL. 0% YOU.", W / 2, 550);
}

function drawIdentityScan() {
  noStroke();
  fill("#087CFF");
  for (let x = 0; x < 300; x += 7) {
    const length = 65 + (x % 23) * 2 + min(identityDamage, 8) * 12;
    rect(W / 2 - 150 + x, 810, 2 + (x % 3), length);
  }
  drawIdentityFooter();
}

function drawIdentityFooter() {
  fill("#FFF6DF");
  rect(W / 2 - 180, 949, 360, 36);
  fill("#087CFF");
  textFont("monospace");
  textStyle(BOLD);
  textSize(17);
  textAlign(CENTER, TOP);
  text("YOU ARE THE PRODUCT.", W / 2, 958);
}

function burstIdentity(x, y) {
  identityDamage++;
  identitySource = get();
  addIdentityShards(x, y, 18);
}

function addIdentityShards(x, y, count) {
  for (let i = 0; i < count; i++) identityShards.push(new IdentityShard(x, y));
  while (identityShards.length > 80) identityShards.shift();
}

function drawIdentityShards() {
  if (frameCount % 12 === 0) addIdentityShards(W / 2, random(220, 880), 2);
  for (let i = identityShards.length - 1; i >= 0; i--) {
    const shard = identityShards[i];
    shard.update();
    if (shard.life <= 0) identityShards.splice(i, 1);
    else shard.show();
  }
}

class IdentityShard {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-11, 11);
    this.vy = random(-8, 4);
    this.w = random(20, 100);
    this.h = random(12, 70);
    this.sourceX = random(W - this.w);
    this.sourceY = random(H - this.h);
    this.angle = random(-PI, PI);
    this.spin = random(-0.06, 0.06);
    this.life = 100;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.08;
    this.angle += this.spin;
    this.life--;
  }

  show() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    this.drawFragment();
    noFill();
    stroke("#087CFF");
    strokeWeight(1);
    rect(-this.w / 2, -this.h / 2, this.w, this.h);
    pop();
  }

  drawFragment() {
    image(
      identitySource,
      -this.w / 2,
      -this.h / 2,
      this.w,
      this.h,
      this.sourceX,
      this.sourceY,
      this.w,
      this.h,
    );
  }
}

// 10. STARTUP RECOVERY
// File URLs cannot reliably fetch p5 images/sounds. Show help before entering preload.
// Plain DOM is intentional here: recovery must also work if the p5 CDN is unavailable.
function showLocalFileHelp() {
  const page = IS_CHALLENGE ? "challenge.html" : "index.html";
  const liveUrl = "https://tttam2702-ui.github.io/SPEC1_A1/" + page;
  const main = document.querySelector("main");
  main.classList.add("startup-recovery");
  main.innerHTML = localFileHelpMarkup(liveUrl);
}

function localFileHelpMarkup(liveUrl) {
  return `<section class="startup-help" aria-labelledby="startup-help-title">
    <p>ME-MARRT / OPEN THE ARTWORK</p>
    <h1 id="startup-help-title">LET’S OPEN<br>THE STORE.</h1>
    <p>This HTML was opened directly from a folder. Images and sounds need a web server.</p>
    <a class="startup-live-link" href="${liveUrl}">OPEN LIVE WEBSITE</a>
    <p>To run this copy on your Mac, double-click <strong>START_ME_MARRT.command</strong>.
      Keep its Terminal window open, then visit <strong>http://localhost:8000/</strong>.</p>
    <p>Or open a terminal in this folder and run:</p>
    <pre>python3 -m http.server 8000</pre>
  </section>`;
}

if (OPENED_AS_FILE) showLocalFileHelp();
