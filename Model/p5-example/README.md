# Use the lip movement model in p5.js

1. Finish training on the original Model page, then click **Export model for p5**. Allow multiple downloads and confirm that all three files were saved.
2. Create a project in the p5.js Web Editor. Replace its `index.html` and `sketch.js` with the files in this folder, then add `lip-features.js`.
3. Upload `model.json`, `model_meta.json`, and `model.weights.bin` to the project root alongside `sketch.js`. If filenames differ, update all three paths in `sketch.js`.
4. Run the sketch, click **Load model and start camera**, and allow camera access. Wait for green dots on your lips.
5. Click **Record and predict**, wait for the three-second countdown, then say a word silently once within two seconds. Keep the page in the foreground.

The `label` and `confidence` variables in `sketch.js` hold the latest result. Use `label` in `draw()` to control colors, animations, or other interactions. `No speech` is one of the trained classes.

`lip-features.js` uses the same spatial normalization and time resampling as the training page. Do not copy the original `get_data.js` into p5; it depends on the training page's buttons and DOM. If training preprocessing changes, update `lip-features.js`, retrain, and export the model again.

The example uses p5 1.11.10, ml5 1.2.1, and the same MediaPipe FaceMesh configuration as the training page. Internet access is required to load libraries and FaceMesh resources. For local use, serve this folder over localhost HTTP instead of opening the HTML directly.

## Troubleshooting

- **404 for model.json:** upload all three model files and check their exact names and paths. Raw `lip-samples-*.json` files are training data, not exported models.
- **Only one download appears:** check Downloads and allow multiple downloads in your browser before retrying. Keep files from the same trained model together.
- **Infinite loop detected:** replace the editor's `sketch.js` with this version. It schedules one detection at a time instead of using a long-running `while` loop.
- **Invalid or insufficient frames:** improve front lighting, keep your whole face visible, and record again without switching tabs.

Trained weights are not included in this folder; export your own model. JavaScript syntax and preprocessing consistency have been checked. Real-camera recognition still needs testing with your model.
