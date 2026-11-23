# ME-MARRT — Identity Superstore

An interactive artwork about shopping, identity and **SDG 12: Responsible Consumption and Production**. Visitors enter a bright store, spin for a fictional offer, and collect objects that promise a better self. The image then melts and notifications multiply, turning the shopping experience into visual overload.

| Project credit | Details                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Author         | Tran Thanh Tam — s3977954                                                                               |
| Group          | SCP_067                                                                                                 |
| Course         | COMM2754 — Digital Media Specialisation — 26t3                                                          |
| Institution    | RMIT University Vietnam, Saigon South Campus, School of Communication and Design, Digital Media Program |
| Date           | 19 November 2026                                                                                        |

[Live experiment](https://tttam2702-ui.github.io/SPEC1_A1/) · [Source repository](https://github.com/tttam2702-ui/SPEC1_A1)

## Start the experiment

Download or clone the repository. Open a terminal **in this directory**, beside `index.html`, then run:

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000/index.html** in a modern desktop browser. Any ordinary static web server is suitable. No build step, Node.js, account, API key or internet connection is needed to run the downloaded experiment: the images, sounds and runtime libraries are included locally. Use the server instead of opening an HTML file with `file://`, because audio loading uses `fetch()`.

Click **FULL SCREEN** in the yellow navigation bar for browser fullscreen; press **Esc** to leave it. If the embedded browser does not support fullscreen, open the experiment in a normal browser and use its fullscreen command. Audio begins after a click or key press because browsers require interaction before playback.

## Size and controls

All three p5 canvases have an internal resolution of **1920 × 1080 pixels**, with `pixelDensity(1)`. CSS fits the complete 16:9 image into the space below the navigation bar. It uses both the window width and height, preserves proportions, and centres the image without stretching or cropping. Other screen proportions may show dark margins. Interface sizes follow the fitted canvas through container query units.

| Page             | Interaction                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`     | Drag and toss objects inside the pink rectangle. Click the surrounding messages to dismiss them. Press **R** to drop the objects again or **S** to save a 1920 × 1080 PNG. **CLAIM YOUR OFFER** opens the wheel.                                                                                                                                                            |
| `offer.html`     | Click **SPIN**, wait for the offer and prize sound, then click **CLAIM** to enter the challenge.                                                                                                                                                                                                                                                                            |
| `challenge.html` | Read the instructions and click **LET'S GO SHOPPING**. Click falling objects to collect them; **Tab** and **Enter** can also activate the collection buttons. After 5–6 catches, click different areas to spread the melting effect. Click **OK** in the final notifications; the first OK starts a 10–15 second countdown before a glitch transition returns to the store. |
| All pages        | **ABOUT** opens the project statement and group credits; **CLOSE** or **Esc** closes it. The challenge pauses while About is open.                                                                                                                                                                                                                                          |

The offers are fictional and no purchase takes place. The ending uses fast-moving glitch imagery and sound. **PAUSE** and **RESTART** are available during the collection stage.

## How the code works

| File                             | Responsibility                                                                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sketch.js`                      | The landing scene: image loading, fixed-resolution drawing, rotating body, outfit and abstract head generation, Matter.js physics and dragging.                                         |
| `ambient-art.js`, `cart-pass.js` | Surrounding message bubbles, tracking connections, green glitches and the passing cart.                                                                                                 |
| `offer-wheel.js`                 | Wheel drawing, random offers, spin easing, prize sound and the offer dialog.                                                                                                            |
| `challenge-model.js`             | Falling object movement, collection state and the threshold that starts corruption.                                                                                                     |
| `challenge.js`                   | Challenge rendering, vector product shapes, accessible collection buttons and page controls.                                                                                            |
| `challenge-datamosh.js`          | Canvas feedback: copies small image regions, displaces them and stretches strips downward to make the picture melt. The effect simulates datamoshing through real-time canvas feedback. |
| `challenge-notifications.js`     | Notification content, overlapping arrays, scattered windows and OK interactions.                                                                                                        |
| `challenge-audio.js`             | Native Web Audio playback. Measured cue times synchronise melting and notification movement with sound. Page exit stops its active sounds.                                              |
| `challenge-return.js`            | The final timed transition and the entry reveal when returning to the landing page.                                                                                                     |
| `site-shell.js`                  | Shared navigation, fullscreen, About content and keyboard focus management.                                                                                                             |
| `style.css`, page CSS files      | Proportional 16:9 layout and HTML overlays above the canvas.                                                                                                                            |

Constants use uppercase names, functions and variables use camelCase, and classes use PascalCase. Short named helpers separate input, state updates, rendering and audio scheduling. Comments explain layer order, timing, feedback and browser constraints. Third-party library files are preserved separately; their internal function lengths and formatting are not rewritten.

## AI assistance and revision

AI assistance was used to develop and revise application code in this project. See [AI_ASSISTANCE.md](AI_ASSISTANCE.md) for the concrete refactoring and verification performed. Application file headers identify the AI-assisted work. The student/group credits describe the project authorship; library credits appear separately below.

## Optional code maintenance

These tools are only for editing and checking the source; instructors can run the artwork with the static server above.

```sh
npm ci
npm run check
npm run format:check
```

`npm run check` parses application scripts, checks the three 1920 × 1080 constants, checks local HTML resource paths and licence headers, and reports any function with 15 or more physical body lines. `npm run format` applies the shared two-space, 100-column formatting rules. It excludes unchanged third-party libraries, media and licence text.

## Sources and licences

Project application code is released under **GNU GPL version 3 or later**. The complete GPL v3 text is in [LICENSE](LICENSE). Copyright © 2026 Tran Thanh Tam and SCP_067 contributors. This notice covers the project's HTML, CSS, JavaScript and maintenance scripts; third-party code retains its own licence.

- **p5.js 2.3.4**, Processing Foundation and p5.js contributors — [LGPL 2.1](licenses/p5-LGPL-2.1.txt). The local `p5.js` distribution retains its embedded third-party notices.
- **Matter.js 0.19.0**, Liam Brummitt and contributors — [MIT](licenses/matter-MIT.txt). Both the runtime bundle and readable source are in `vendor/`.
- Development tools: **Acorn 8.15.0** and **Prettier 3.6.2**, both MIT licensed; their licence texts are in `licenses/`.

[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) contains source links, versions and attribution. [ASSET_CREDITS.md](ASSET_CREDITS.md) records the separate provenance status of supplied images and audio. The project code licence does not change the rights in those media.

## Deployment

GitHub Pages serves the project root from the `main` branch. Pushing a commit to `main` automatically rebuilds the public website. All navigation and resource URLs are relative, so the same folder works locally and under `/SPEC1_A1/` on GitHub Pages.
