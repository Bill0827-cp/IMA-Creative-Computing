# Lip Lab

Capture silent lip movements, train a word classifier, and use the exported model in p5.js.

## Run locally

Run `node serve.cjs` from this folder and open http://127.0.0.1:8000. You can also use your editor's Live Server. Do not open the HTML directly from the filesystem.

1. Click **Start camera** and allow video access. The first download of ml5 1.2.1 and FaceMesh may take a minute.
2. Wait for green dots on your lips, then choose a word. Click **Record sample**, wait for the three-second countdown, and say the word silently once within two seconds.
3. For **No speech**, stay naturally relaxed. Collect at least five samples per class to start.
4. Click **Export sample JSON** and confirm the download. Reloading or closing the page loses unexported samples. Use **Import previously exported samples (JSON)** to restore saved data.

Each sample contains its word, capture session, video dimensions, frame timestamps, and all face landmarks as x/y/z coordinates. The preview is mirrored, but stored coordinates are not mirrored, normalized, or resampled. The z coordinate is model-relative depth, not physical distance. Samples contain no audio or video, and this application does not upload them.

A recording needs at least 12 valid frames, at least 80% valid detection attempts, and no gap longer than 450 ms, including both endpoints. Otherwise it is not saved. Record again if detection is too slow, tracking is lost, or the page moves to the background.

Spatial normalization, time resampling, classifier training, and prediction are implemented. Speech synthesis is not included.

## Files

- `index.html`: training page structure.
- `style.css`: page styling.
- `get_data.js`: camera, FaceMesh, recording, preprocessing, training, prediction, and export.
- `serve.cjs`: static server bound to localhost, with no third-party dependencies.
- `p5-example/`: model loading and recognition example for the p5.js Web Editor.
- `style.js` and `backup-20261106-125120/`: earlier capture-only code and backup files.

## Manual checks

- Denied camera access shows a clear message and allows retrying.
- Green points align with lips in the mirrored preview and follow small head movements.
- Recording cannot start without a face; extended tracking loss prevents saving.
- Completed recordings increase sample counts; JSON timestamps increase and coordinates are finite.
- Stopping or canceling does not save a partial sample; stopping the camera turns off its device indicator.

Tracking API reference: https://github.com/ml5js/ml5-next-gen/blob/v1.2.1/src/FaceMesh/index.js

## Training and prediction

Each of the four classes needs at least five samples. You can import raw sample JSON with the current English labels. Import validates data and deduplicates sample IDs.

**Prepare data and train** stops the camera and converts each action to 800 features. It prefers holding out a full capture session for testing; otherwise it deterministically holds out about 20% of complete samples per class. Only training samples determine normalization statistics and update weights during 50 epochs. Test scores do not select training parameters. Same-session scores can be optimistic; after repeated tuning, record new independent test data.

After training, restart the camera and click **Record and predict**. This recording has no supplied target label and is not added to the dataset. Results are scores for four classes, not measured probabilities of correctness. Adding, removing, or importing new samples invalidates the trained model and requires retraining.

Click **Export model for p5** after training. Allow multiple downloads and confirm all three files were saved: `model.json`, `model_meta.json`, and `model.weights.bin`. Upload them alongside `sketch.js` in the p5 example. Model export does not replace backing up raw sample JSON. This training page still requires importing samples and retraining after a reload.

Code reading order: `prepareSample` -> `prepareDataset` -> `splitWordData` -> `trainWords` -> `classifyFeatures` -> `predictRecording`.
