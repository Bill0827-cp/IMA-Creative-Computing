let feedback = "Enter a prompt and click Ask";
let img;
let isGenerating = false;

function setup() {
  createCanvas(512, 512);

  let input_image_field = createInput(
    "A student trying to learn how use a machine learning API"
  );
  input_image_field.size(420);
  input_image_field.id("input_image_prompt");
  input_image_field.position(10, 10);

  // Add a button to ask for picture
  let button = createButton("Ask");
  button.position(440, 10);
  button.mousePressed(() => {
    if (!isGenerating) {
      askForPicture(input_image_field.value());
    }
  });
}

function draw() {
  background(230);

  if (img) {
    image(img, 0, 0, width, height);
  }

  // Feedback banner at the bottom
  fill(0, 180);
  noStroke();
  rect(0, height - 36, width, 36);
  fill(255);
  textSize(14);
  textAlign(LEFT, CENTER);
  text(feedback, 12, height - 18);
}

async function askForPicture(p_prompt) {
  let authToken = ""; // leave blank for now
  const replicateProxy =
    "https://itp-ima-replicate-proxy.web.app/api/create_n_get";

  let data = {
    model: "google/nano-banana-2",
    input: {
      prompt: p_prompt,
    },
  };

  let fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  };

  console.log("data", fetchOptions, "url", replicateProxy);
  console.log("Generating image...");
  feedback = "Generating image via Replicate proxy... (~8s)";
  isGenerating = true;

  try {
    const response = await fetch(replicateProxy, fetchOptions);

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const prediction = await response.json();
    console.log("prediction", prediction);

    if (prediction.error) {
      feedback = "Error: " + prediction.error;
      isGenerating = false;
      return;
    }

    // Output can be a URL string or an array of URLs
    const outputUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (outputUrl) {
      feedback = "Loading generated image...";
      loadImage(
        outputUrl,
        (incomingImage) => {
          img = incomingImage;
          feedback = "Image generated successfully!";
          isGenerating = false;
          console.log("Image generated!");
        },
        (err) => {
          feedback = "Failed to load generated image from URL.";
          isGenerating = false;
          console.error(err);
        }
      );
    } else {
      feedback = "No image output received.";
      isGenerating = false;
    }
  } catch (err) {
    console.error("Error asking for picture:", err);
    feedback = "Request failed: " + err.message;
    isGenerating = false;
  }
}
