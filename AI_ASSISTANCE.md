# AI assistance and revision

Codex assisted with generating, editing, simplifying, commenting and checking the application code. The student supplied the concept, media, visual references and interaction directions. The result is AI-assisted work, revised for ME-MARRT.

All application JavaScript is in `sketch.js`, split into numbered reading sections. Its p5 callbacks route between the landing and challenge pages. Shared navigation and About use p5 DOM helpers. The code retains the 1920 × 1080 canvas, fullscreen fitting, short functions, GPL headers and separate library credits.

The landing uses handmade gravity/boundary rules, the changing outfit and the retained `FrameArt` image tracking. That tracking class includes native Canvas 2D pixel sampling beyond the supplied basic class topics.

The challenge's generic RGB corruption was replaced with `ConsumptionMelt`. It makes catalogue prints from the actual collected products and stretches their existing colours with p5 graphics buffers. The retail palette, sale tags, display circle, barcode and **YOU → SOLD** ending tie the distortion to the project's consumption/identity statement. The product drawings are shared between the game and catalogue; no new visual asset was generated or downloaded.

The product-person uses a p5 image mask and sliced image drawing. Repeated upgrades increase the distortion while label, ribbon and fragment counts remain bounded. The audio cue clock follows the supplied sound recording; no new audio engine was added.

The student should review and test the code and be able to explain its variables, conditions, loops, functions and image operations. [LEARNING_GUIDE.md](LEARNING_GUIDE.md) explains the implementation, and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) records the external libraries and licences.
