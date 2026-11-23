# ME-MARRT — Identity Superstore

An interactive artwork about shopping, identity and **SDG 12: Responsible Consumption and Production**. Objects promise a better version of you. Collecting them eventually turns the store into a melting image full of notifications.

- **Author:** Tran Thanh Tam — s3977954
- **Group:** SCP_067
- **Course:** COMM2754 — Digital Media Specialisation — 26t3
- **Institution:** RMIT University Vietnam, Saigon South Campus, School of Communication and Design, Digital Media Program
- **Project date:** 19 November 2026

[Website](https://tttam2702-ui.github.io/SPEC1_A1/) · [Repository](https://github.com/tttam2702-ui/SPEC1_A1)

## Run the artwork

Download the complete project. In a terminal, open this directory, beside `index.html`, and run:

```sh
python3 -m http.server 8000
```

Visit **http://localhost:8000/index.html**. Use a modern desktop browser. Any ordinary static web server also works. No build step or Node.js is needed to run the artwork. Images, sounds and runtime libraries are included locally.

Use the server instead of opening `index.html` with `file://`: the browser needs to load images and sounds. Sound begins after a visitor interacts with the page.

## Display and interaction

The p5 drawing surfaces are **1920 × 1080 pixels** with `pixelDensity(1)`. The website scales the complete 16:9 image to fit the window without stretching or cropping it. Other screen proportions can show dark margins. Use **FULL SCREEN** in the navigation bar, or the browser's fullscreen command; press **Esc** to leave fullscreen.

- **Landing — `index.html`:** drag the product cutouts, click message bubbles and watch the changing outfit. Press **R** to drop the products again or **S** to save a PNG. The main button opens the challenge directly.
- **Challenge — `challenge.html`:** read the instructions, then start. Click falling objects to put them in the cart. After six catches, clicks make areas of the picture melt. Keep clicking different areas until notification windows appear; they multiply when you click **OK**. The first OK starts a 12-second wait, then a short glitch returns to the landing page. While the canvas is focused, **Enter** catches an item, melts another area or accepts a notification. **PAUSE** and **RESTART** are available before the notification ending.
- **Both pages:** **ABOUT** shows the project statement and credits.

The offers are fictional. No purchase takes place. The ending contains moving glitch imagery and sound.

## Read the code

The product movement, outfit changes, collection and notifications use basic p5 drawing, conditions, loops, arrays and classes. Two dedicated modules retain the detailed tracking and datamosh effects. They use native Canvas 2D image processing beyond the topics shown in the class schedule. The project has two pages and uses no physics library.

| File                           | Purpose                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `common.js`                    | Shared screen size, sound and navigation helpers.                              |
| `sketch.js`                    | Landing images, handmade movement, mouse dragging and the changing outfit.     |
| `ambient-art.js`               | Detailed message sprites, image heatmaps, tracking boxes and connecting lines. |
| `challenge.js`                 | Falling items, the shopping cart, challenge stages and notification windows.   |
| `challenge-datamosh.js`        | Advanced pixel recolouring, image feedback and continuously melting regions.   |
| `site-shell.js`                | Shared navigation, fullscreen and project credits.                             |
| `style.css`                    | Fits the artwork into the browser window.                                      |
| `index.html`, `challenge.html` | Load the local libraries and the correct page script.                          |

Start with [LEARNING_GUIDE.md](LEARNING_GUIDE.md). It separates the class-level interaction code from the two advanced visual modules and explains how they connect. [AI_ASSISTANCE.md](AI_ASSISTANCE.md) explains the AI assistance and revisions openly.

## Licences and credits

Project application code is **GNU GPL version 3 or later**. The complete licence text is in [LICENSE](LICENSE). Third-party code keeps its original licence; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for versions, sources and local licence copies.

[ASSET_CREDITS.md](ASSET_CREDITS.md) records the supplied images and sounds. Their original sources and media permissions have not been provided, so the code licence does not claim to license those files.

## Deployment

GitHub Pages serves the root of `main`. Relative links let the same folder work on a local server and at `/SPEC1_A1/` on GitHub Pages.
