# AI assistance and code revision

The project uses AI-assisted application code. Codex assisted with implementation, editing, refactoring, comments and verification. This record makes that assistance visible for assessment.

## Revision for the submission requirements

- Kept each p5 drawing surface at 1920 × 1080 and one pixel per canvas pixel.
- Reworked the shared CSS to fit both screen dimensions while keeping the whole composition visible.
- Added a user-activated fullscreen control on every page.
- Extracted long setup, audio, physics, image-processing, drawing and notification routines into named helpers.
- Replaced large anonymous entry functions with named initialisation/controller routines.
- Applied consistent indentation and naming, and added comments that explain state changes, rendering layers, audio clocks and canvas feedback.
- Kept application code separate from unchanged third-party p5.js and Matter.js code.
- Added GPL v3, library attribution/licence texts, source links, a detailed README and repeatable static checks.
- Removed the unused p5.sound addon; the artwork's audio uses the browser's Web Audio API.

## Verification approach

The maintenance checker parses all application JavaScript and measures function bodies after formatting. Browser checks cover the canvas dimensions and fitted layout, About panel, object interaction, wheel/prize dialog, challenge collection and the melting/notification return sequence. These checks support code review; the final submitted project should be understood and explained by its student authors.
