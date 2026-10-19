const askForPort = true;
const serial = new p5.WebSerial();

let portButton;
let inString;
let sound;
let player;
let pitch = 0;
let speed = 1;

const soundTouchModule = import(
  "https://cdn.jsdelivr.net/npm/soundtouchjs@0.1.30/dist/soundtouch.js"
);

function preload() {
  sound = loadSound("sound.m4a");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textSize(32);

  serial.on("portavailable", openPort);
  serial.on("data", serialEvent);

  if (askForPort) {
    makePortButton();
  } else {
    serial.getPorts();
    let playButton = createButton("play");
    playButton.position(10, 10);
    playButton.mousePressed(async () => {
      await startSound();
      playButton.hide();
    });
  }
}

function draw() {
  background(255);

  if (inString) {
    let inData = split(inString.trim(), ",");
    let pot1 = Number(inData[0]);
    let pot2 = Number(inData[1]);

    pitch = map(pot1, 0, 1023, -12, 12);
    speed = pow(2, map(pot2, 0, 1023, -1, 1));
  }

  if (player) {
    player.pitchSemitones = pitch;
    player.tempo = speed;
  }

  text("Pitch: " + pitch.toFixed(1) + " semitones", 50, 100);
  text("Speed: " + speed.toFixed(2) + "x", 50, 150);
}

async function startSound() {
  await userStartAudio();
  const { PitchShifter } = await soundTouchModule;
  const context = getAudioContext();

  function playLoop() {
    player = new PitchShifter(context, sound.buffer, 4096, () => {
      setTimeout(() => {
        player.disconnect();
        playLoop();
      }, 0);
    });

    player.pitchSemitones = pitch;
    player.tempo = speed;
    player.connect(context.destination);
  }

  playLoop();
}

function serialEvent() {
  let incoming = serial.readStringUntil("\r\n");
  if (incoming.trim()) inString = incoming;
}

function openPort() {
  serial.open();
}

function makePortButton() {
  portButton = createButton("choose port");
  portButton.position(10, 10);

  portButton.mousePressed(() => {
    serial.requestPort();
    startSound();
    portButton.hide();
  });
}