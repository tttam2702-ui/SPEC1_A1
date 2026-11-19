// A decorative pass on the canvas: no pointer handling or physics bodies.
class CartPass {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.seed = (Date.now() ^ 0x9d1732af) >>> 0;
    this.nextPassAt = null;
    this.startedAt = null;
    this.duration = 0;
  }

  random(min, max) {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return min + this.seed / 4294967296 * (max - min);
  }

  draw(ctx, image, now) {
    if (!image || !image.width || !image.height) return;
    if (this.nextPassAt === null) this.nextPassAt = now + this.random(5000, 8000);
    if (now >= this.nextPassAt) {
      this.startedAt = now;
      this.duration = this.random(3600, 4300);
      this.nextPassAt = now + this.random(5000, 8000);
    }
    if (this.startedAt === null) return;
    const progress = (now - this.startedAt) / this.duration;
    if (progress < 0 || progress > 1) return;

    const width = 280;
    const height = width * image.height / image.width;
    const x = -width - 12 + progress * (this.width + width + 24);
    const y = this.height - height - 4;
    ctx.save();
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
  }
}
