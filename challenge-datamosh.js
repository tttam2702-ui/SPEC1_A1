// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted project implementation, revised into named pixel, beat and melt helpers.
// Local feedback preserves each clicked patch while gravity stretches its pixels.
const DATAMOSH_CHANNEL_ORDERS = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
  [1, 0, 2],
  [0, 2, 1],
  [2, 1, 0],
];
const DATAMOSH_INVERTED_CHANNELS = [-1, -1, -1, 0, 1, 2];

class ChallengeDatamosh {
  constructor(source, { track = null } = {}) {
    this.initializeDimensions(source);
    this.initializeMeltState();
    this.initializeBeatState(track);
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

  surface() {
    const canvas = document.createElement("canvas");
    canvas.width = this.w;
    canvas.height = this.h;
    return canvas;
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

  meltNotification(packet) {
    const rect = this.notificationRect(packet);
    const ctx = this.fieldCtx;
    ctx.save();
    ctx.translate(rect.x, rect.y);
    this.paintNotification(ctx, rect, packet);
    ctx.restore();
    this.textureCtx.drawImage(this.field, 0, 0);
    const region = {
      x: rect.x + rect.w / 2,
      y: rect.y + rect.h / 2,
      radius: rect.w * 0.55,
      born: this.time,
    };
    this.addRegion(region, 70);
  }

  notificationRect(packet) {
    return {
      x: packet.x * this.w,
      y: packet.y * this.h,
      w: Math.max(110, packet.width * this.w),
      h: Math.max(75, packet.height * this.h),
    };
  }

  paintNotification(ctx, { w, h }, packet) {
    this.paintWindowFrame(ctx, w, h);
    this.paintWindowTitle(ctx, packet.title);
    this.paintWindowWarning(ctx);
    this.paintWindowMessage(ctx, w, packet.message);
    this.paintWindowButton(ctx, w, h);
  }

  paintWindowFrame(ctx, w, h) {
    ctx.fillStyle = "#C9C9C9";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.fillStyle = "#0610AC";
    ctx.fillRect(4, 4, w - 8, 16);
  }

  paintWindowTitle(ctx, title) {
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(title.slice(0, 32), 9, 15);
  }

  paintWindowWarning(ctx) {
    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    ctx.moveTo(16, 31);
    ctx.lineTo(6, 50);
    ctx.lineTo(26, 50);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.font = "bold 12px monospace";
    ctx.fillText("!", 13, 47);
  }

  paintWindowMessage(ctx, width, message) {
    ctx.font = "10px Arial";
    const state = { line: "", row: 0 };
    for (const word of message.split(" ")) {
      if (!this.appendMessageWord(ctx, word, width, state)) break;
    }
    ctx.fillText(state.line, 35, 35 + state.row * 12);
  }

  appendMessageWord(ctx, word, width, state) {
    if (ctx.measureText(state.line + word).width > width - 45 && state.line) {
      ctx.fillText(state.line, 35, 35 + state.row * 12);
      state.row++;
      state.line = "";
      if (state.row > 3) return false;
    }
    state.line += word + " ";
    return true;
  }

  paintWindowButton(ctx, width, height) {
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 1;
    ctx.strokeRect(width / 2 - 23, height - 25, 46, 17);
    ctx.font = "10px Arial";
    ctx.fillText("OK", width / 2 - 8, height - 13);
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
}
