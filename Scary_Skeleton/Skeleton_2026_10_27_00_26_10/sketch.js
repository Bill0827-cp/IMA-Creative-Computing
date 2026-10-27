const HOLD_TIME = 5000;

let webcamCapture;
let detector;
let detections = [];
let cameraSelect;

let port;
let recording;

let cameraReady = false;
let modelReady = false;
let detectionBusy = false;
let cameraStarting = false;

let personPresent = false;
let personStartTime = 0;
let triggeredForCurrentPresence = false;

let statusMessage = "Starting...";
let cameraError = "";

function preload() {
  recording = loadSound(
    "New Recording 287.m4a",
    () => console.log("Audio loaded"),
    error => console.error("Audio loading failed:", error)
  );
}

function setup() {
  createCanvas(640, 480);
  textFont("Arial");

  port = createSerial();

  const connectButton = createButton("Connect Arduino");
  connectButton.mousePressed(connectArduino);

  const testButton = createButton("Test Servo + Audio");
  testButton.mousePressed(sendWave);

  cameraSelect = createSelect();
  cameraSelect.option("Default camera", "");
  cameraSelect.changed(changeCamera);

  startCamera("");

  if (!window.ml5 || typeof ml5.objectDetector !== "function") {
    statusMessage = "Could not load ml5";
    return;
  }

  detector = ml5.objectDetector("cocossd", () => {
    modelReady = true;
    statusMessage = "Person detector ready";
    startDetection();
  });
}

async function startCamera(deviceId) {
  if (cameraStarting) return;

  cameraStarting = true;
  cameraReady = false;
  cameraError = "";

  if (webcamCapture) {
    webcamCapture.remove();
    webcamCapture = null;
  }

  try {
    const constraints = deviceId
      ? {
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        }
      : {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        };

    const stream =
      await navigator.mediaDevices.getUserMedia(constraints);

    webcamCapture = createCapture(stream, () => {
      webcamCapture.size(640, 480);
      webcamCapture.hide();

      cameraReady = true;
      cameraStarting = false;
      statusMessage = "Camera ready";

      refreshCameraList();
      startDetection();
    });

  } catch (error) {
    cameraStarting = false;
    cameraReady = false;
    cameraError = error.name + ": " + error.message;
    statusMessage = "Camera unavailable";
    console.error("Camera error:", error);
  }
}

async function refreshCameraList() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(
      device => device.kind === "videoinput"
    );

    cameraSelect.elt.innerHTML = "";
    cameraSelect.option("Default camera", "");

    cameras.forEach((camera, index) => {
      cameraSelect.option(
        camera.label || "Camera " + (index + 1),
        camera.deviceId
      );
    });
  } catch (error) {
    console.error("Camera list error:", error);
  }
}

function changeCamera() {
  startCamera(cameraSelect.value());
}

async function connectArduino() {
  try {
    if (!port.opened()) {
      await port.open(9600);
    }

    statusMessage = "Arduino connected; waiting for Nano reset...";

    // Many Nano boards reset when a serial connection opens.
    await new Promise(resolve => setTimeout(resolve, 2000));

    statusMessage = "Arduino ready";
    console.log("Arduino serial connection opened");

  } catch (error) {
    statusMessage = "Arduino connection failed: " + error.message;
    console.error("Arduino connection error:", error);
  }
}

function sendWave() {
  if (!port || !port.opened()) {
    statusMessage = "Arduino not connected. Click Connect Arduino.";
    console.warn("Arduino serial port is not open.");
    return;
  }

  try {
    userStartAudio();

    // The Arduino sketch expects the word WAVE.
    port.println("WAVE");

    if (recording && recording.isLoaded()) {
      recording.stop();
      recording.play();
    } else {
      console.warn("Audio has not loaded.");
    }

    statusMessage = "WAVE sent: servo + audio requested";
    console.log("Sent WAVE to Arduino");

  } catch (error) {
    statusMessage = "Send failed: " + error.message;
    console.error("Serial send error:", error);
  }
}

function startDetection() {
  if (
    !cameraReady ||
    !modelReady ||
    detectionBusy ||
    !webcamCapture ||
    !webcamCapture.elt ||
    webcamCapture.elt.readyState < 2
  ) {
    return;
  }

  detectionBusy = true;
  detector.detect(webcamCapture.elt, gotDetections);
}

function gotDetections(error, results) {
  detectionBusy = false;

  if (error) {
    console.error("Detection error:", error);
    setTimeout(startDetection, 500);
    return;
  }

  detections = results || [];

  const foundPerson = detections.some(
    item => item.label === "person"
  );

  if (foundPerson) {
    if (!personPresent) {
      personPresent = true;
      personStartTime = millis();
      triggeredForCurrentPresence = false;
    }

    if (
      millis() - personStartTime >= HOLD_TIME &&
      !triggeredForCurrentPresence
    ) {
      triggeredForCurrentPresence = true;
      sendWave();
    }
  } else {
    personPresent = false;
    personStartTime = 0;
    triggeredForCurrentPresence = false;
  }

  startDetection();
}

function draw() {
  background(17);

  if (cameraReady && webcamCapture) {
    image(webcamCapture, 0, 0, width, height);

    for (const item of detections) {
      if (item.label !== "person") continue;

      noFill();
      stroke(255, 220, 0);
      strokeWeight(3);
      rect(item.x, item.y, item.width, item.height);
    }
  }

  noStroke();
  fill(0, 200);
  rect(0, 0, width, 125);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(20);
  text("SKELETON VENDING MACHINE", width / 2, 24);

  textSize(14);

  if (!cameraReady) {
    text("Waiting for webcam...", width / 2, 52);
  } else if (!modelReady) {
    text("Loading person detector...", width / 2, 52);
  } else if (!personPresent) {
    text("Stand in front of the camera", width / 2, 52);
  } else {
    const remaining = Math.max(
      0,
      (HOLD_TIME - (millis() - personStartTime)) / 1000
    );

    text(
      remaining > 0
        ? "Stay there: " + remaining.toFixed(1) + " seconds"
        : "Person detected!",
      width / 2,
      52
    );
  }

  fill(255);
  textSize(12);
  text(statusMessage, width / 2, 82);

  if (cameraError) {
    fill(255, 130, 130);
    text(cameraError, width / 2, 105, width - 20, 35);
  }

  fill(255);
  textAlign(LEFT, BOTTOM);
  text(
    port && port.opened()
      ? "Arduino: Connected"
      : "Arduino: Disconnected",
    10,
    height - 10
  );
}
