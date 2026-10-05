let xPose
let yPose
let xdir = 1
let ydir = 1
let speed
let balls = []
let a = []

function setup() {
  createCanvas(400, 400)
  background(240, 237, 250)
  noStroke()

  xPose = 10
  yPose = 100
  speed = 20

  balls.push({
    xPose, yPose, xdir, ydir, speed,
    color: color(random(155, 195), random(145, 170), random(200, 255))
  })
}

function draw() {
  fill(240, 237, 250, 5)
  rect(0, 0, width, height)

  let count = balls.length

  for (let i = 0; i < count; i++) {
    xPose = balls[i].xPose
    yPose = balls[i].yPose
    xdir = balls[i].xdir
    ydir = balls[i].ydir
    speed = balls[i].speed

    let hitWall = false

    if (xPose > width || xPose < 0) {
      xPose = constrain(xPose, 0, width)
      if (xPose === 0) 
      {
      xdir = random(0, 1)   
      } else 
      {
      xdir = -random(0, 1)  
      }
      ydir = random(-1, 1)
      hitWall = true
    }

    if (yPose > height || yPose < 0) {
      yPose = constrain(yPose, 0, height)
      if (yPose === 0) 
      {
      ydir = random(0, 1)   
      } else 
      {
      ydir = -random(0, 1)  
      }
      xdir = random(-1, 1)
      hitWall = true
    }

    if (hitWall && balls.length < 100) {
      balls.push({
        xPose,
        yPose,
        xdir : xdir * random(0, 1),
        ydir : ydir * random(0, 1),
        speed: random(5,30),
        color: color(random(155, 195), random(145, 170), random(230, 255))
      })
    }

    xPose = xPose + xdir * speed
    yPose = yPose + ydir * speed

    fill(balls[i].color)
    ellipse(xPose, yPose, 40, 40)

    balls[i] = {
      xPose, yPose, xdir, ydir, speed,
      color: balls[i].color
    }
  }

  for (let h = a.length - 1; h >= 0; h--) {
    xPose = a[h].xPose
    yPose = a[h].yPose

    for (let j = 15; j > 0; j--) {
      fill(255, 210, 60, 180 - j * 10)
      ellipse(
        xPose - j * 6,
        yPose - j * 4,
        10 - j * 0.5,
        10 - j * 0.5
      )
    }

    fill(255, 240, 150)
    ellipse(xPose, yPose, 10, 10)

    xPose = xPose + 12
    yPose = yPose + 8

    a[h] = { xPose, yPose }
   }
 }

function mousePressed() {
  a.push({
    xPose: mouseX,
    yPose: mouseY
  })
}
