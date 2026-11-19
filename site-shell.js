// Include this file on every HTML page to share the navigation and About panel.
(() => {
  const stage = document.querySelector("[data-site-stage]");
  if (!stage || document.querySelector(".site-bar")) return;

  const header = document.createElement("header");
  header.className = "site-bar";
  header.innerHTML = `
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
    </nav>`;
  document.body.prepend(header);

  const panel = document.createElement("section");
  panel.className = "about-panel";
  panel.id = "about-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", "about-title");
  panel.setAttribute("aria-hidden", "true");
  panel.inert = true;
  panel.innerHTML = `
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
  stage.append(panel);

  const toggle = header.querySelector(".about-toggle");
  const close = panel.querySelector(".about-close");
  const previousInert = new Map();
  let open = false;

  function setOpen(next) {
    if (next === open) return;
    open = next;
    toggle.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    panel.inert = !open;
    stage.classList.toggle("is-about-open", open);
    document.body.classList.toggle("about-open", open);
    if (open) {
      panel.scrollTop = 0;
      for (const element of stage.children) {
        if (element === panel) continue;
        previousInert.set(element, element.inert);
        element.inert = true;
      }
      close.focus({ preventScroll: true });
    } else {
      for (const [element, inert] of previousInert) element.inert = inert;
      previousInert.clear();
      toggle.focus({ preventScroll: true });
    }
    document.dispatchEvent(new CustomEvent("site:aboutchange", { detail: { open } }));
  }

  toggle.addEventListener("click", () => setOpen(!open));
  close.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  });
})();
