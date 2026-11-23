# Third-party code and references

ME-MARRT application code is GPL-3.0-or-later. The libraries below keep their original copyright notices and licences. Their source is separate from the project's own scripts.

## Runtime libraries

- **p5.js 1.11.11**, Processing Foundation and p5.js contributors. Local file: `p5.js`. Used for drawing, images and input. [Version source](https://github.com/processing/p5.js/tree/v1.11.11), [upstream licence](https://github.com/processing/p5.js/blob/v1.11.11/license.txt), [local LGPL 2.1 text](licenses/p5-LGPL-2.1.txt).
- **p5.sound 1.0.1** (header dated 2021-05-25), the addon included with the p5.js 1.11.11 distribution. Local file: `p5.sound.js`. Used for loading, playing and stopping the supplied recordings. [Matching distribution](https://www.npmjs.com/package/p5/v/1.11.11), [upstream MIT licence](https://github.com/processing/p5.js-sound/blob/v1.0.1/LICENSE), [local MIT text](licenses/p5.sound-MIT.txt). Copyright © 2014–2015 The Processing Foundation. Its embedded version, copyright and dependency notices are retained.

The local libraries are included so the artwork does not need a CDN. Embedded notices for dependencies bundled inside those libraries remain in their files. Matter.js and the old custom Web Audio scheduler are not used in this version.

## Interaction and visual references

The student supplied [Giang Nguyen's gravity-fall experiment](https://giangnguyenday.github.io/oart1033-a2-s4135042/) as inspiration for bouncing and dragging objects. The current project implements movement with its own position, speed and boundary checks. The reference is not bundled as a library.

The student also supplied visual references for the outfit collage, message bubbles, tracking boxes and melting/glitch imagery. Those reference screenshots are not included as assets in this repository.

See [ASSET_CREDITS.md](ASSET_CREDITS.md) for the separate status of the supplied images and recordings. No unknown media licence is presented as verified.
