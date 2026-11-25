# ME-MARRT — Identity Superstore

An interactive artwork about shopping, identity and **SDG 12: Responsible Consumption and Production**. Objects promise a better version of you. Collecting them eventually turns the store into an overflowing catalogue that turns the shopper into a product.

- **Author:** Tran Thanh Tam — s3977954
- **Group:** SCP_067
- **Course:** COMM2754 — Digital Media Specialisation 2 — 26t3
- **Institution:** RMIT University Vietnam, Saigon South Campus, School of Communication and Design, Digital Media Program
- **Project date:** 19 November 2026

[Website](https://tttam2702-ui.github.io/SPEC1_A1/) · [Repository](https://github.com/tttam2702-ui/SPEC1_A1)

## Run the artwork

Download the complete project. On macOS, double-click **`START_ME_MARRT.command`**, keep the Terminal window open and visit **http://localhost:8000/**. Press Control+C in that window to stop the server.

You can also open a terminal in this directory, beside `index.html`, and run:

```sh
python3 -m http.server 8000
```

Visit **http://localhost:8000/index.html**. Use a modern desktop browser. Any ordinary static web server also works. No build step or Node.js is needed to run the artwork. Images and sounds are included locally. An Internet connection is required for the version-pinned p5.js and p5.sound libraries loaded from jsDelivr; the project folder contains only one JavaScript file, `sketch.js`.

Use the server instead of opening `index.html` or `challenge.html` with `file://`: the browser needs to load images and sounds. Direct file opens now show a help screen with a live-site link and server instructions instead of entering asset preload. Sound begins after a visitor interacts with the page.

Leaving a page mutes the master output, stops every loaded clip and suspends its audio context. The return transition keeps its sound until navigation, then all challenge audio ends. Hidden tabs stop playback and wait for another interaction before sound can resume.

[Sound element concepts](SOUND_ELEMENTS.md) lists the seven current WAV recordings, their full submission filenames, waveform images and intended impact.

## Display and interaction

The p5 drawing surfaces are **1920 × 1080 pixels** with `pixelDensity(1)`. The website scales the complete 16:9 image to fit the window without stretching or cropping it. Other screen proportions can show dark margins. Use **FULL SCREEN** in the navigation bar, or the browser's fullscreen command; press **Esc** to leave fullscreen.

- **Landing — `index.html`:** drag the product cutouts, click message bubbles and watch the changing outfit. Press **R** to drop the products again or **S** to save a PNG. The main button opens the challenge directly.
- **Challenge — `challenge.html`:** read the instructions, then start. Click falling objects to put them in the cart. After six catches, clicks make areas of the picture melt. Keep clicking as the collected objects spread into a melting catalogue. Sale labels appear around a person made from those same goods. Click **CLICK TO UPGRADE** to print more, dissolve the person into barcode strips and eventually change **YOU** to **SOLD**. The first touch starts a 12-second wait before the 1.9-second glitch return. While the canvas is focused, **Enter** catches an item, melts an area or activates the first sale label. **PAUSE** and **RESTART** are available before the product-identity ending.
- **Both pages:** **ABOUT** shows the project statement and credits.

The offers are fictional. No purchase takes place. The ending contains moving glitch imagery and sound.

## Read the code

The product movement, outfit changes, collection and sale labels use p5 drawing, conditions, loops, arrays and classes. `ConsumptionMelt` creates the purchased-product print sheet in p5 graphics. `DatamoshFeedback` restores the original neon channel shifts, small pixel blocks and sheared melting ribbons over that sheet. This feedback class and the landing's `FrameArt` tracking use native Canvas 2D pixel processing beyond the supplied basic class topics, on buffers created through p5. The project has two pages and uses no physics library.

All application code is in **`sketch.js`**. The two HTML pages load the same file. One set of p5 hooks (`preload`, `setup`, `draw` and input callbacks) checks `IS_CHALLENGE` and runs the appropriate scene. Shared navigation and About are created with p5 DOM helpers during `setup()`.

The numbered comments in `sketch.js` mark these sections:

| Section                                 | Purpose                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| 1. Shared canvas and sound              | Screen size, palette, backgrounds and sound functions.                                |
| 2. p5 lifecycle and input               | Routes the p5 callbacks to landing or challenge.                                      |
| 3. Shared navigation and About          | Navigation, fullscreen and project credits.                                           |
| 4. Landing scene                        | Falling images, dragging, outfit, head and passing cart.                              |
| 5. Tracking and message artwork         | `FrameArt`: image tracking, bubbles and connecting lines.                             |
| 6. Challenge scene                      | Catching items, challenge stages and the return timer.                                |
| 7. Consumption melt                     | `ConsumptionMelt` feeds collected goods into the restored `DatamoshFeedback` texture. |
| 8. Sale labels and scrolling promotions | Moving price tags, click cues and retail promotion ribbons.                           |
| 9. Product identity                     | A shopper made from collected goods dissolves into a barcode.                         |
| 10. Startup recovery                    | Direct file opens show instructions before media loading.                             |

`index.html` and `challenge.html` remain the browser entry points. The CSS files control page fitting and the HTML overlays. There are no other local `.js` files or inline JavaScript handlers.
Start with [LEARNING_GUIDE.md](LEARNING_GUIDE.md). It separates the class-level interaction code from the image effects and explains how they connect. [AI_ASSISTANCE.md](AI_ASSISTANCE.md) explains the AI assistance and revisions openly.

## The consumption ending

The distortion uses the objects actually caught during this round. Their drawings become red/blue catalogue prints on pink, cream and yellow stock. Clicking adds local print clusters and downward ink smears; continued buying makes the catalogue spread across the remaining space. The recording's cue times drive the flow. The original datamosh aesthetic is restored: neon colour-channel changes, dense pixel blocks and long diagonal melt trails. Its source is the actual catalogue and shopping scene, while the foreground sale labels and product-person keep the consumption story readable.

The ending echoes the landing's yellow display circle. Inside it, a human silhouette is filled with the collected products. Each **CLICK TO UPGRADE** adds offers and makes the figure slip into barcode strips. After three upgrades, **YOU** becomes **SOLD**. The first upgrade starts the 12-second countdown, followed by a 1.9-second barcode return asking **BACK FOR MORE?** The loop connects the spectacle to the project statement: consumption gradually replaces the person.

There are at most 32 interactive labels, 650 background melt ribbons and 80 loose image fragments. The body uses p5 shapes and a mask; no extra illustration, downloaded visual asset or new runtime library was added.

## Licences and credits

Project application code is **GNU GPL version 3 or later**. The complete licence text is in [LICENSE](LICENSE). Third-party code keeps its original licence; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for versions, sources and local licence copies.

[ASSET_CREDITS.md](ASSET_CREDITS.md) records the supplied images and sounds. Their original sources and media permissions have not been provided, so the code licence does not claim to license those files.

## Deployment

GitHub Pages serves the root of `main`. Relative links let the same folder work on a local server and at `/SPEC1_A1/` on GitHub Pages.
