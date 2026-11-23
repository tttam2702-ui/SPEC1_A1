# AI assistance and revision

Codex assisted with generating, editing, simplifying, commenting and checking the application code. The student supplied the concept, visual references, media and directions for the interactions. This is AI-assisted work; it should not be described as code written entirely without assistance.

## Revision and scope

- Reduced the experience to a landing page and a challenge page.
- Replaced the physics library with position, speed, gravity, boundary checks and mouse dragging.
- Used basic p5 drawing functions for product shapes, clothing, warning signals and page interactions.
- Used arrays and simple classes to store moving objects and warning signals.
- Retained the detailed `FrameArt` tracking class and `ChallengeDatamosh` melting class in sections 5 and 7 of `sketch.js`. These sections use native Canvas 2D and pixel processing beyond the supplied class schedule.
- Used the p5.sound addon for local sound playback.
- Removed the wheel and the custom Web Audio/beat-scheduling system.
- Kept the 1920 × 1080 drawing size, window fitting, comments and separate library credits.

The project is not presented as entirely class-level code. The comments and [LEARNING_GUIDE.md](LEARNING_GUIDE.md) explain the basic scene logic and identify the two advanced visual sections. They do not replace the student's review: before submission, the student should read the code, test it and be able to explain how its variables, conditions, loops and functions produce the artwork.

The single `sketch.js` carries AI-assistance and GPL headers. Unmodified library code is credited separately in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The final error windows and receipt experiment were replaced with a generative warning field. The supplied reference informed the red hexagonal geometry and yellow hazard stripes. The project-specific text and interactive composition were coded with p5 shapes and randomized positions, sizes, angles and movement targets. The original full-colour melt remains visible behind them; touched screen fragments feed into the unchanged datamosh engine.

The warning controls were revised with visible click labels, a pulsing outline and a hover pause. Repeating alert ribbons use text width, elapsed time, loops and remainder for continuous scrolling.

All application JavaScript was consolidated into `sketch.js`. The p5 lifecycle and input callbacks route to the appropriate HTML page. Shared navigation and About use p5 DOM helpers in `setup()`. The existing tracking, datamosh and warning code was moved into numbered sections; the external p5 libraries are loaded from a pinned CDN, with local licence texts retained.

The ending was extended with a human-shaped void drawn using p5 primitives, then broken into falling strips. A small `IdentityShard` class reuses captured pieces of the current canvas. This is an AI-assisted revision with project-specific comments and bounded fragment counts, not a claim of unaided authorship.
