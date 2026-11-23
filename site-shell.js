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

// HTML navigation is kept here so the drawing sketches can stay focused on p5.
let siteStage = document.querySelector("main");
let siteHeader = document.createElement("header");
siteHeader.className = "site-bar";
siteHeader.innerHTML = SITE_NAVIGATION_HTML;
document.body.prepend(siteHeader);
let aboutPanel = document.createElement("section");
aboutPanel.className = "about-panel";
aboutPanel.id = "about-panel";
aboutPanel.innerHTML = SITE_ABOUT_HTML;
aboutPanel.setAttribute("aria-label", "About ME-MARRT");
aboutPanel.setAttribute("aria-hidden", "true");
aboutPanel.inert = true;
siteStage.append(aboutPanel);
let aboutButton = document.querySelector(".about-toggle");
let closeButton = document.querySelector(".about-close");
let fullscreenButton = document.querySelector(".fullscreen-toggle");

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

aboutButton.onclick = toggleAbout;
closeButton.onclick = toggleAbout;
fullscreenButton.onclick = toggleFullscreen;
fullscreenButton.hidden = !document.fullscreenEnabled;
document.addEventListener("fullscreenchange", fullscreenLabel);
document.addEventListener("keydown", closeAboutWithEscape);
document.querySelector(".site-home").onclick = stopSounds;
