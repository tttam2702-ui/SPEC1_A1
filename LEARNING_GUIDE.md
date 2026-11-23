# Reading ME-MARRT step by step

This guide links the scene interactions to the topics in the supplied class schedule. The schedule gives topic names; it does not show every function taught in class. The detailed tracking and datamosh modules go beyond those topics and are identified separately below.

## Start with the p5 order

1. **`preload()`** loads the images and sounds before the artwork starts.
2. **`setup()`** runs once. It makes the canvas and the first objects.
3. **`draw()`** runs repeatedly. It updates positions, then draws the current picture.
4. Mouse functions change the state when the visitor clicks or drags.

Read the basic flow in `common.js`, `sketch.js` and `challenge.js` first. Read the advanced visual modules, `ambient-art.js` and `challenge-datamosh.js`, after that. `index.html` and `challenge.html` load those scripts; no code compiler is needed.

## Concepts used in the scene interactions

| Class topic                                | What it does here                                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Variables, strings and order               | Numbers store positions and speed; strings store image names and message text. Updating a position before drawing it makes movement visible.                                                           |
| Boolean values, equality and `if`/`else`   | Conditions decide whether an object hit an edge, the mouse is over an item, or the challenge should change stage.                                                                                      |
| Random numbers, rounding and array indices | Random numbers choose clothing variants. A random array selection picks a colour or phrase. p5's `floor()` rounds a number down, like JavaScript's `Math.floor()`, so it can identify one array entry. |
| Incrementing and loops                     | A loop draws every item or several glitch strips. Adding speed to position moves an object a little each frame.                                                                                        |
| Arrays                                     | Lists hold falling products, messages and warning signals. Adding another entry lets the program create more of them.                                                                                  |
| Functions                                  | Named steps such as drawing, moving or playing a sound keep repeated code in one place.                                                                                                                |
| Objects, classes, properties and methods   | One item stores its own position, size and speed. Its methods update or draw that item. A class creates several items with the same structure.                                                         |
| Drawing and colour                         | `rect()`, `ellipse()`, `line()`, shapes and text make the interface. Fill and stroke colours use the project's bright palette.                                                                         |
| Coordinates and transforms                 | Positions use the 1920 × 1080 coordinate space. Translation and rotation place or turn artwork.                                                                                                        |
| Mouse input                                | Mouse coordinates are compared with an item's position and size to decide what was clicked.                                                                                                            |

These are examples of how the schedule's ideas apply. They are not a claim that every possible array method or colour mode is necessary in this project.

## Shared helpers: `common.js`

- **`makeCanvas(label)`** creates the 1920 × 1080 drawing surface. CSS changes its display size, not its internal pixel size.
- **`makeStoreBackground()`** draws the bright store background.
- **`loadProjectSounds(names)`** loads the chosen local recordings.
- **`playEffect(name, volume)`** plays a short sound for an interaction.
- **`loopEffect(name, volume)`** repeats a background sound.
- **`stopSounds()`** stops playback when leaving a page.

The p5.sound addon handles audio playback. `MeltBeatClock` reads its playhead so the restored melting effect follows the recording's cue times; it does not analyse new beats or schedule audio through a custom Web Audio engine.

## How the effects work

**Bouncing products:** each object has position and speed. Gravity adds to its downward speed. Each frame, speed is added to position. At a boundary, reversing the speed makes the object bounce. Dragging follows the mouse. This is a handmade movement rule, not a physics library.

**Changing outfits:** the clothing images stay at fixed positions. At short time intervals, the program chooses numbers from 1 to 3. Joining a string and a number, such as `"top" + topNumber`, identifies the next picture in the image object. The outfit changes without a crossfade.

**Messages and tracking:** `FrameArt` draws message sprites and samples the existing product images for coloured tracking patches. The points jitter and connect with lines. This advanced visual effect is decorative; it does not use a camera or machine-learning tracker.

**Melting:** `ChallengeDatamosh` keeps copies of the picture on hidden canvases. It recolours pixels, moves small fragments and stretches strips downward. The next frame reuses the damaged picture, so the melt keeps building. This advanced image effect simulates datamoshing; it does not corrupt a video file.

**Warning field:** `WarningSignal` stores each red hexagon's position, size, angle and word. A loop draws the signals in an array. `scatter()` chooses a random target; `update()` moves the position and angle a little toward it each frame. `hit()` checks the mouse against the hexagon. A click adds more signals, tears a few image strips and sends the touched area into the existing melting effect. Yellow stripes use rectangles and a loop. Hovering pauses a sign; its yellow label and pulsing outline make the interaction visible. `drawAlertTicker()` repeats a text string in a loop, using remainder (`%`) to wrap the scrolling position.

**Time:** `millis()` gives the time since the sketch started. Comparing it with a saved start time lets the artwork wait before returning to the store. It uses the same basic idea as comparing two numbers in an `if` statement.

## Find the landing code

| Function or class                                                       | What to look for                                                                         |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `resetLandingScene()` in `sketch.js`                                    | A loop creates products. `floor(random(3, 6))` creates 3, 4 or 5 barcodes.               |
| `StoreItem.update()` and `StoreItem.keepInStage()`                      | Adds gravity and speed, then checks the rectangle's boundaries.                          |
| `StoreItem.bounce()` and `StoreItem.avoidCircle()`                      | Checks overlapping products and keeps them outside the fixed yellow circle.              |
| `mousePressed()`, `mouseDragged()` and `mouseReleased()` in `sketch.js` | Finds a product, follows mouse movement, then releases it.                               |
| `changeOutfit()` and `drawHead()` in `sketch.js`                        | Chooses image numbers and creates a coloured polygon with a loop.                        |
| `drawPassingCart()` in `sketch.js`                                      | Adds to the cart's horizontal position and uses `millis()` to wait before the next pass. |

## Find the challenge code

| Function or class in `challenge.js`                                            | What to look for                                                                                               |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `mousePressed()` → `catchAt()` → `catchProduct()`                              | Tests the mouse position, changes the clicked product, increments `collected` and plays the item sound.        |
| `Product.update()` and `Product.show()`                                        | Adds speed to position, or moves a caught item toward the cart; then draws its shape.                          |
| `drawShirt()`, `drawBook()`, `drawBottle()`, `drawHeadphones()`, `drawPlant()` | Builds products from p5 shapes and coordinates.                                                                |
| `drawWords()`                                                                  | Updates a small label's position and upward/downward speed inside a loop.                                      |
| `WarningSignal.show()` and `WarningSignal.hit()` in `challenge-signals.js`     | Draws a hexagon and checks whether the mouse touches its shape.                                                |
| `activateSignal()` and `beginReturn()`                                         | Saves a deadline using `millis()`: 12 seconds after the first signal is touched, then a 1.9-second transition. |

## Advanced visual modules

These are additional techniques used to keep the detailed visual effects. They should be described as extensions, rather than claiming every line comes from the class topics.

| Module and method                                                            | What it adds                                                                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `FrameArt.heatmapFor()` and `FrameArt.colorizeHeatmap()` in `ambient-art.js` | Reads image pixels and maps brightness to bright colours. A cache avoids repeating that pixel work every frame. |
| `FrameArt.trackImage()` and `FrameArt.drawTrackingLinks()`                   | Samples patches from the products, draws jittering tracking boxes and joins points into a web.                  |
| `FrameArt.drawMessages()` and `FrameArt.glitchMessage()`                     | Draws cached bubble images and splits them into offset strips when dismissed.                                   |
| `ChallengeDatamosh.prepareTexture()` in `challenge-datamosh.js`              | Builds the colourful source texture by changing pixel channels.                                                 |
| `ChallengeDatamosh.addDamage()` and `ChallengeDatamosh.draw()`               | Adds damage at a clicked position, then keeps transporting fragments and stretching melting ribbons.            |

The advanced code uses the browser's Canvas 2D API, including `drawImage()`, pixel data, hidden canvases and clipping. It also uses image caches and extra data structures. These are browser capabilities, so they add no separate runtime library.

## Explain one interaction

A useful explanation is: **“The visitor clicks an item. An `if` statement checks the mouse position. The item changes state, a sound plays, and `draw()` shows its new position.”**

Follow the `mousePressed()` → `catchAt()` → `catchProduct()` path before presenting. AI assistance and the revisions are recorded in [AI_ASSISTANCE.md](AI_ASSISTANCE.md); this guide is for understanding the code, not hiding how it was made.
