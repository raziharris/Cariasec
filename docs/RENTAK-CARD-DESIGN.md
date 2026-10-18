# CARIASEC card artwork

The Rentak deck references the user's `KAD CARIASEC LATEST.1pdf.pdf`: original career portraits, a dark teal frame, ochre/green/orange/purple/blue/grey personality colours, and the curved multicolour corner motif. The PDF itself stays outside Git.

Number cards 1–6 map to the six existing career illustrations within each RIASEC family. The cream index tab keeps the gameplay number and suit readable in a small hand. Action cards use vector symbols and short effect labels; the back carries the original CARIASEC identity and exploration tagline. Gameplay rules and deck counts are unchanged.

`npm.cmd run generate:cards` regenerates the 62 unique faces in `public/rentak-cards` using the existing PDF-derived WebP illustrations. The generated SVGs embed their images so Phaser canvas and React image elements render the same artwork without external-image dependencies. `shared/card-artwork.ts` maps duplicate deck instances to those shared faces. URLs honour Vite's base path, including `/Cariasec/`.

Verification covers decoding every face in the browser, responsive screenshots at 320/375/390/430px, accessibility, and full two-browser Normal and Beginner matches. Screenshots are local artifacts under `docs/screenshots/`; the latest live run is recorded in `docs/rentak-live-smoke.json`.
