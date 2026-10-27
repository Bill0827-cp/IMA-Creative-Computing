let x;
let y;
let vx;
let vy;
let radius = 24;
let ballColor;

function setup() { 
  const canvas = createCanvas(600, 400);
  canvas.parent('canvas-container');

  // Initial position in center
  x = width / 2;
  y = height / 2;

  // Initial random velocity
  vx = random(3, 5) * (random() > 0.5 ? 1 : -1);
  vy = random(3, 5) * (random() > 0.5 ? 1 : -1);

  ballColor = color(255, 75, 100);
}

function draw() {
  // Pure white canvas background
  background(255);

  // Update position
  x += vx;
  y += vy;

  // Bounce off horizontal borders (left and right walls)
  if (x + radius >= width) {
    x = width - radius;
    vx *= -1;
    onBounce();
  } else if (x - radius <= 0) {
    x = radius;
    vx *= -1;
    onBounce();
  }

  // Bounce off vertical borders (top and bottom walls)
  if (y + radius >= height) {
    y = height - radius;
    vy *= -1;
    onBounce();
  } else if (y - radius <= 0) {
    y = radius;
    vy *= -1;
    onBounce();
  }

  // Draw subtle shadow for depth on white background
  noStroke();
  fill(0, 0, 0, 18);
  circle(x, y + 4, (radius + 2) * 2);

  // Draw main ball
  fill(ballColor);
  circle(x, y, radius * 2);
}

// Slightly change color on bounce (vibrant tones that pop on white)
function onBounce() {
  ballColor = color(random(20, 220), random(20, 220), random(20, 220));
}

// Click canvas to push the ball toward the mouse
function mousePressed() {
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    let angle = atan2(mouseY - y, mouseX - x);
    let speed = 6;
    vx = cos(angle) * speed;
    vy = sin(angle) * speed;
    onBounce();
  }
}

