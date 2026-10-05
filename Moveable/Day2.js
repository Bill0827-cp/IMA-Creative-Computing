let xPose
let yPose
let xdir = 1
let ydir = 1
let speed
let balls = []

function setup() {
  createCanvas(400, 400);
  xPose = 10
  yPose = 100
  speed = 30

  balls.push({
    xPose, yPose, xdir, ydir, speed,
    color: color(random(255), random(255), random(255))
  })
}

function draw() {
  background(225)

  let count = balls.length

  for (let i = 0; i < count; i++) {
    xPose = balls[i].xPose
    yPose = balls[i].yPose
    xdir = balls[i].xdir
    ydir = balls[i].ydir
    speed = balls[i].speed

    let hitWall = false

    if(xPose > width || xPose < 0){
      xPose = constrain(xPose, 0, width)
      xdir = - xdir
      hitWall = true
    }

    if(yPose > height || yPose < 0){
      yPose = constrain(yPose, 0, height)
      ydir = - ydir
      hitWall = true
    }

    if(hitWall && balls.length < 100){
      balls.push({
        xPose,
        yPose,
        xdir,
        ydir,
        speed: random(10, 30),
        color: color(random(255), random(255), random(255))
      })
    }

    xPose = xPose + xdir*speed
    yPose = yPose + ydir*speed

    fill(balls[i].color)
    ellipse(xPose,yPose,40,40)

    balls[i] = {
      xPose, yPose, xdir, ydir, speed,
      color: balls[i].color
    }
  }
}
