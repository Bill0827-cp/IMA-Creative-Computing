# PlayAPI - Replicate Image Generation via Proxy

This project implements text-to-image generation in p5.js using Replicate via Dan O'Sullivan's proxy (`https://itp-ima-replicate-proxy.web.app/api/create_n_get`), inspired by the p5.js sketch [`tearUK5WJ`](https://editor.p5js.org/dano/sketches/tearUK5WJ).

## How It Works

1. The client sends a `POST` request to the proxy:
   - **Proxy URL**: `https://itp-ima-replicate-proxy.web.app/api/create_n_get`
   - **Headers**: `{ "Content-Type": "application/json" }`
   - **Body**:
     ```json
     {
       "model": "google/nano-banana-2",
       "input": {
         "prompt": "Your text prompt here"
       }
     }
     ```
2. The proxy executes the prediction on Replicate and returns the JSON result containing `output` (the direct URL of the generated image).
3. p5.js loads the image with `loadImage()` and renders it to the canvas.

## Running Locally

Run the zero-dependency local static server:

```bash
node serve.cjs
```

Then open `http://127.0.0.1:3000` in your web browser.
