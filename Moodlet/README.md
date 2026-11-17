# Moodlet

English diary-to-emoji website. Serve `dist/` with any static HTTP server (for example, `python -m http.server 8080 --directory dist`). No build or dependencies needed. Run `npm test` for the mood and output parsing checks.

Mood suggestions use a small English keyword heuristic in the browser, not a semantic AI analysis. The user can choose a different mood and edit the visual idea. Only that idea is sent to ITP/IMA's Replicate proxy when Generate is clicked; diary entries and tokens are never persisted. The generated image uses `fofr/sdxl-emoji`, version `dee76b5afde21b0f01ed7925f0665b7e879c50ee718c5f78a9d38e04d523cc5e`.

Anonymous usage depends on proxy policy and quota. Connection accepts an optional short-lived NYU token, held only in the current tab. Network, quota, authentication, invalid output, image load, and download failures are shown in the interface. No mock output is substituted for failed AI generation. The initial face is a CSS illustration, explicitly labeled preview.
