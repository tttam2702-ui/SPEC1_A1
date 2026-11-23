// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted implementation, revised into named helpers for this project.
// The shared shell keeps navigation, focus and fullscreen behaviour consistent.
const SITE_NAVIGATION_HTML = `
    <nav class="site-nav" aria-label="Main navigation">
      <a class="site-home" href="index.html">
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
              <li>Tran Thanh Tam</li>
              <li>Phan Bao Nhu Minh</li>
              <li>Nguyen Thanh Hoai Anh</li>
              <li>Nguyen Hoang Quynh Anh</li>
            </ul></dd>
          </div>
          <div>
            <dt>Course</dt>
            <dd>COMM2754 - Digital Media Specialisation - 26t3</dd>
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

function createShellElement(tag, className, html) {
  const element = document.createElement(tag);
  element.className = className;
  element.innerHTML = html;
  return element;
}

class SiteShell {
  constructor(stage) {
    this.stage = stage;
    this.open = false;
    this.previousInert = new Map();
    this.header = createShellElement("header", "site-bar", SITE_NAVIGATION_HTML);
    this.panel = createShellElement("section", "about-panel", SITE_ABOUT_HTML);
    this.mount();
    this.bindAbout();
    this.bindFullscreen();
  }

  mount() {
    document.body.prepend(this.header);
    this.stage.append(this.panel);
    this.panel.id = "about-panel";
    this.panel.setAttribute("role", "region");
    this.panel.setAttribute("aria-labelledby", "about-title");
    this.panel.setAttribute("aria-hidden", "true");
    this.panel.inert = true;
    this.toggle = this.header.querySelector(".about-toggle");
    this.close = this.panel.querySelector(".about-close");
  }

  bindAbout() {
    this.toggle.addEventListener("click", () => this.setOpen(!this.open));
    this.close.addEventListener("click", () => this.setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !this.open) return;
      event.preventDefault();
      this.setOpen(false);
    });
  }

  setOpen(next) {
    if (next === this.open) return;
    this.open = next;
    this.toggle.setAttribute("aria-expanded", String(next));
    this.panel.setAttribute("aria-hidden", String(!next));
    this.panel.inert = !next;
    this.stage.classList.toggle("is-about-open", next);
    document.body.classList.toggle("about-open", next);
    if (next) this.focusAbout();
    else this.restoreScene();
    document.dispatchEvent(new CustomEvent("site:aboutchange", { detail: { open: next } }));
  }

  // Inert prevents hidden moving buttons from stealing keyboard focus.
  focusAbout() {
    this.panel.scrollTop = 0;
    for (const element of this.stage.children) {
      if (element === this.panel) continue;
      this.previousInert.set(element, element.inert);
      element.inert = true;
    }
    this.close.focus({ preventScroll: true });
  }

  restoreScene() {
    for (const [element, inert] of this.previousInert) element.inert = inert;
    this.previousInert.clear();
    this.toggle.focus({ preventScroll: true });
  }

  bindFullscreen() {
    this.fullscreen = this.header.querySelector(".fullscreen-toggle");
    this.fullscreen.hidden = !document.fullscreenEnabled;
    this.fullscreen.addEventListener("click", () => this.toggleFullscreen());
    document.addEventListener("fullscreenchange", () => this.updateFullscreenLabel());
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) {
      this.fullscreen.title = "Use your browser's fullscreen command if unavailable here.";
    }
    this.updateFullscreenLabel();
  }

  updateFullscreenLabel() {
    const active = Boolean(document.fullscreenElement);
    this.fullscreen.textContent = active ? "EXIT FULL SCREEN" : "FULL SCREEN";
    this.fullscreen.setAttribute("aria-pressed", String(active));
  }
}

function mountSiteShell() {
  const stage = document.querySelector("[data-site-stage]");
  if (stage && !document.querySelector(".site-bar")) new SiteShell(stage);
}

mountSiteShell();
