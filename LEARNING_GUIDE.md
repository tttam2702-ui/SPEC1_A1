# Reading ME-MARRT step by step

This guide links the project to the topics in the supplied class schedule. The schedule gives topic names; it does not show every function taught in class. Image loading/copying and sound playback are small extensions used for this artwork.

## Start with the p5 order

1. **`preload()`** loads the images and sounds before the artwork starts.
2. **`setup()`** runs once. It makes the canvas and the first objects.
3. **`draw()`** runs repeatedly. It updates positions, then draws the current picture.
4. Mouse functions change the state when the visitor clicks or drags.

Read `common.js`, then `sketch.js` and `ambient-art.js`, then `challenge.js`. `index.html` and `challenge.html` load those scripts; no code compiler is needed.

## Concepts used in the artwork

| Class topic                                | What it does here                                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Variables, strings and order               | Numbers store positions and speed; strings store image names and message text. Updating a position before drawing it makes movement visible.                                                           |
| Boolean values, equality and `if`/`else`   | Conditions decide whether an object hit an edge, the mouse is over an item, or the challenge should change stage.                                                                                      |
| Random numbers, rounding and array indices | Random numbers choose clothing variants. A random array selection picks a colour or phrase. p5's `floor()` rounds a number down, like JavaScript's `Math.floor()`, so it can identify one array entry. |
| Incrementing and loops                     | A loop draws every item or several glitch strips. Adding speed to position moves an object a little each frame.                                                                                        |
| Arrays                                     | Lists hold falling products, messages and notifications. Adding another entry lets the program create more of them.                                                                                    |
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

The p5.sound addon handles audio playback. This version has no custom Web Audio clock or beat-analysis system.

## How the effects work

**Bouncing products:** each object has position and speed. Gravity adds to its downward speed. Each frame, speed is added to position. At a boundary, reversing the speed makes the object bounce. Dragging follows the mouse. This is a handmade movement rule, not a physics library.

**Changing outfits:** the clothing images stay at fixed positions. At short time intervals, the program chooses numbers from 1 to 3. Joining a string and a number, such as `"top" + topNumber`, identifies the next picture in the image object. The outfit changes without a crossfade.

**Messages and tracking:** shapes and lines are drawn around the existing artwork. Their positions and colours can change over time. They are visual decorations, not camera or machine-learning tracking.

**Melting:** `get()` copies part of the p5 canvas. `copy()` can put an image strip in a different place or stretch it. Repeating those operations moves the picture down and makes a digital melt. This is an image effect inspired by datamoshing, not corruption of a video file.

**Notifications:** each window is stored as an object in an array. Drawing all entries creates the overlapping stack. A mouse click inside an **OK** button adds more windows.

**Time:** `millis()` gives the time since the sketch started. Comparing it with a saved start time lets the artwork wait before returning to the store. It uses the same basic idea as comparing two numbers in an `if` statement.

## Find the landing code

| Function or class                                                              | What to look for                                                                         |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `resetLandingScene()` in `sketch.js`                                           | A loop creates products. `floor(random(3, 6))` creates 3, 4 or 5 barcodes.               |
| `StoreItem.update()` and `StoreItem.keepInStage()`                             | Adds gravity and speed, then checks the rectangle's boundaries.                          |
| `StoreItem.bounce()` and `StoreItem.avoidCircle()`                             | Checks overlapping products and keeps them outside the fixed yellow circle.              |
| `mousePressed()`, `mouseDragged()` and `mouseReleased()` in `sketch.js`        | Finds a product, follows mouse movement, then releases it.                               |
| `changeOutfit()` and `drawHead()` in `sketch.js`                               | Chooses image numbers and creates a coloured polygon with a loop.                        |
| `drawPassingCart()` in `sketch.js`                                             | Adds to the cart's horizontal position and uses `millis()` to wait before the next pass. |
| `StoreMessage.update()` and `StoreMessage.display()` in `ambient-art.js`       | Increments a message's age, plays a pop and changes its scale.                           |
| `SceneAmbient.drawTracking()` and `SceneAmbient.drawWeb()` in `ambient-art.js` | Draws tracking boxes and connects stored points with lines.                              |

## Find the challenge code

| Function or class in `challenge.js`                                            | What to look for                                                                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `mousePressed()` → `catchAt()` → `catchProduct()`                              | Tests the mouse position, changes the clicked product, increments `collected` and plays the item sound. |
| `Product.update()` and `Product.show()`                                        | Adds speed to position, or moves a caught item toward the cart; then draws its shape.                   |
| `drawShirt()`, `drawBook()`, `drawBottle()`, `drawHeadphones()`, `drawPlant()` | Builds products from p5 shapes and coordinates.                                                         |
| `drawWords()`                                                                  | Updates a small label's position and upward/downward speed inside a loop.                               |
| `MeltPatch.show()` and `drawMelting()`                                         | Copies strips with `copy()`, then preserves the changed canvas with `get()`.                            |
| `Notice.show()` and `Notice.hit()`                                             | Draws a message window and tests whether its OK button was clicked.                                     |
| `acceptNotice()` and `beginReturn()`                                           | Saves a deadline using `millis()`: 12 seconds after the first OK, then a 1.9-second transition.         |

## Explain one interaction

A useful explanation is: **“The visitor clicks an item. An `if` statement checks the mouse position. The item changes state, a sound plays, and `draw()` shows its new position.”**

Follow the `mousePressed()` → `catchAt()` → `catchProduct()` path before presenting. AI assistance and the revisions are recorded in [AI_ASSISTANCE.md](AI_ASSISTANCE.md); this guide is for understanding the code, not hiding how it was made.
