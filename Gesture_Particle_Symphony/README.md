# Particle Symphony

An immersive hand-gesture visual + music installation built with **MediaPipe Hands**, **Three.js**, and **Tone.js**. Your hands shape a glowing particle cloud in real time, and an original song follows the cloud's shape and motion.

## How it works

- **Twist** — transposes the song (± a fifth)
- **Stretch** — shifts the octave
- **Height** — picks the melody voicing within the chord
- **Spin** — tempo + stereo pan
- **Pinch** — note duration + pluck ornaments
- **Motion** — rhythmic density and dynamics

## Run locally

Camera access requires `http://localhost` or `https://`.

```bash
cd Gesture_Particle_Symphony
python -m http.server 8000
```

Then open http://localhost:8000.

## Stack

- [Three.js](https://threejs.org/) — WebGL particle rendering
- [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) — hand tracking
- [Tone.js](https://tonejs.github.io/) — Web Audio synthesis
