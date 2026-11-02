/**
 * particleSystem.js
 * Deformable holographic particle cloud system
 */

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.particleCount = 26000;
    this.currentPresetShape = 'sphere';

    // Particle state buffers
    this.positions = new Float32Array(this.particleCount * 3);
    this.basePositions = new Float32Array(this.particleCount * 3); // undeformed base shape
    this.offsets = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);

    // Hologram core state
    this.coreCenter = new THREE.Vector3(0, 0, 0);
    this.targetCenter = new THREE.Vector3(0, 0, 0);
    this.coreRotation = 0;
    this.stretchFactor = 1.0;     // stretch ratio
    this.scaleFactor = 1.0;       // overall scale (grows when both hands pull apart)
    this.unfoldFactor = 0.0;      // unfold/spread amount (exploded holographic unfold)
    this.feedbackPulse = 0;
    this.pointSize = 5.8;
    this.isGrabbed = false;       // whether the cloud is currently held by a pinch

    // Exported live geometric/physical shape metrics (drive the audio engine)
    this.shapeState = {
      aspectRatio: 1.0,     // deformation stretch
      scale: 1.0,           // scale multiplier
      unfold: 0.0,          // unfold amount
      radius: 180,          // average particle cloud radius
      density: 1.0,         // particle density
      velocity: 0,          // movement velocity
      centerHeight: 0.5,    // cloud height on screen
      isPinched: false,     // whether pinched
      twist: 0,             // twist amount
      spin: 0,              // angular rotation speed
      expandSpeed: 0        // rate of scale change (+ = expanding, - = compressing)
    };

    this.prevCenter = new THREE.Vector3(0, 0, 0);
    this.spinRate = 0;
    this.spinSmoothed = 0;
    this.wavePhase = 0;

    // Body/torso reference in normalized camera space (0..1), plus an adaptive
    // arm-span estimate. Cloud size follows the hand-to-hand distance and is
    // normalised by this arm span, so it stays consistent across camera
    // distances and never balloons when the hands sit close together.
    this.bodyRefX = 0.5;
    this.bodyRefY = 0.62;
    this.armSpanRef = 0.18;

    this.initThree();
    this.generateBaseShape(this.currentPresetShape);
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.z = 520;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particleTexture = this.createGlowTexture();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 5.8,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      opacity: 0.9
    });

    this.particlesMesh = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particlesMesh);

    window.addEventListener('resize', () => this.onResize());
  }

  createGlowTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.25, 'rgba(0, 240, 255, 0.85)');
    gradient.addColorStop(0.6, 'rgba(0, 100, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Generate base hologram shape (sphere, cluster, torus)
   */
  generateBaseShape(shapeType) {
    shapeType = 'sphere';
    this.currentPresetShape = shapeType;
    this.offsets.fill(0);
    this.velocities.fill(0);
    const count = this.particleCount;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let x = 0, y = 0, z = 0;
      let r = 0, g = 0, b = 0;

      if (shapeType === 'sphere') {
        // Quantum holographic sphere (classic hologram core)
        const radius = Math.pow(Math.random(), 0.5) * 170;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);

        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.sin(phi) * Math.sin(theta);
        z = radius * Math.cos(phi);

        // blue to cyan-white gradient
        const normR = radius / 170;
        r = THREE.MathUtils.lerp(0.9, 0.05, normR);
        g = THREE.MathUtils.lerp(1.0, 0.85, normR);
        b = THREE.MathUtils.lerp(1.0, 1.0, normR);

      }

      this.basePositions[i3] = x;
      this.basePositions[i3 + 1] = y;
      this.basePositions[i3 + 2] = z;

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      this.colors[i3] = r;
      this.colors[i3 + 1] = g;
      this.colors[i3 + 2] = b;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  screenToWorld(normX, normY) {
    const video = document.getElementById('webcam-video');
    const vw = video?.videoWidth || 640, vh = video?.videoHeight || 480;
    const fit = Math.max(window.innerWidth / vw, window.innerHeight / vh);
    const height = 2 * this.camera.position.z * Math.tan(this.camera.fov * Math.PI / 360);
    const x = -(normX - 0.5) * vw * fit / window.innerWidth * height * this.camera.aspect;
    const y = -(normY - 0.5) * vh * fit / window.innerHeight * height;
    return new THREE.Vector3(x, y, 0);
  }

  /**
   * Adapt the torso midline toward the hands' midpoint and maintain a running
   * "arm span" reference (how far a fully extended hand reaches from the
   * midline). The span reference is used only to normalise the hand-to-hand
   * distance, so the same arm spread yields the same cloud size regardless of
   * how far the person stands from the camera.
   */
  updateBodyReference(lx, ly, rx, ry) {
    const midX = (lx + rx) * 0.5;
    const midY = (ly + ry) * 0.5;
    this.bodyRefX += (midX - this.bodyRefX) * 0.08;
    this.bodyRefY += (midY - this.bodyRefY) * 0.08;

    const reach = Math.max(
      Math.hypot(lx - this.bodyRefX, ly - this.bodyRefY),
      Math.hypot(rx - this.bodyRefX, ry - this.bodyRefY)
    );
    // Grow quickly toward a wider reach (so full extension registers), shrink
    // very slowly (so brief close-ups don't collapse the reference).
    const rate = reach > this.armSpanRef ? 0.15 : 0.006;
    this.armSpanRef += (reach - this.armSpanRef) * rate;
    this.armSpanRef = Math.max(0.12, this.armSpanRef);
  }

  /**
   * Hand-pinch hologram transform (stretch / scale / unfold core)
   */
  updateHologramPhysics(gestureData, dt = 1 / 60, music = null) {
    const blend = rate => 1 - Math.exp(-rate * dt);
    const { leftHand, rightHand, handsDistance, handsAngle, twoHandsPinching } = gestureData;

    const dualHands = leftHand.detected && rightHand.detected;
    let pair = null;
    let targetX = 0;
    let targetY = 0;
    let targetStretch = 1.0;
    let targetScale = 1.0;
    let targetUnfold = 0.0;
    let isPinching = false;

    // 1. Both hands: stretch detection (pinch-pull or arms spread apart)
    if (dualHands) {
      const leftW = this.screenToWorld(leftHand.x, leftHand.y);
      const rightW = this.screenToWorld(rightHand.x, rightHand.y);
      const dx = rightW.x-leftW.x, dy = rightW.y-leftW.y;
      const distance = Math.hypot(dx,dy);
      const mixed = leftHand.isPinching !== rightHand.isPinching;
      isPinching = leftHand.isPinching || rightHand.isPinching;
      targetX = (leftW.x+rightW.x)*0.5;
      targetY = (leftW.y+rightW.y)*0.5;

      // Size follows the hand-to-hand distance, normalised by the adaptive
      // arm-span reference so the same gesture works at any camera distance.
      // This fixes the case where two hands sit close together (but far from
      // the torso midline) and the cloud wrongly ballooned large.
      this.updateBodyReference(leftHand.x, leftHand.y, rightHand.x, rightHand.y);
      const handSpan = Math.hypot(rightHand.x - leftHand.x, rightHand.y - leftHand.y);
      const pull = Math.min(Math.max(handSpan / Math.max(this.armSpanRef * 2, 0.12), 0), 1);

      targetScale = 0.25+pull*(twoHandsPinching?1.95:2.2);
      targetStretch = 0.7+pull*(twoHandsPinching?2.0:1.5);
      targetUnfold = pull*(mixed?1.3:1.05);
      pair = {left:leftW,right:rightW,distance,mixed,
        flow: mixed ? (leftHand.isPinching ? -1 : 1) : 0};
    } else if (rightHand && rightHand.isPinching) {
      // 2. Right-hand pinch: lock the cloud to the right fingertips and tighten
      isPinching = true;
      const rW = this.screenToWorld(rightHand.x, rightHand.y);
      targetX = rW.x * 0.45;
      targetY = rW.y * 0.45;
      targetStretch = 0.75;
      targetScale = 0.5;
      targetUnfold = 0.0;

    } else if (leftHand && leftHand.isPinching) {
      // 3. Left-hand pinch: lock the cloud to the left hand
      isPinching = true;
      const lW = this.screenToWorld(leftHand.x, leftHand.y);
      targetX = lW.x * 0.45;
      targetY = lW.y * 0.45;
      targetStretch = 0.75;
      targetScale = 0.5;
      targetUnfold = 0.0;

    } else {
      // 4. No pinch / no hands: drift back to center and breathe
      isPinching = false;
      targetX = 0;
      targetY = 0;
      targetStretch = 1.0;
      targetScale = 1.0;
      targetUnfold = 0.0;

      // Hand movement drive: palm gravity + inertial drag in the motion direction
      const activeHand = rightHand.detected ? rightHand : leftHand;
      if (activeHand.detected) {
        const rW = this.screenToWorld(activeHand.x, activeHand.y);
        targetX += rW.x * 0.55 + (activeHand.vx || 0) * 45;
        targetY += rW.y * 0.55 + (activeHand.vy || 0) * 45;
        targetScale = 0.5 + activeHand.openFactor * 1.1;
        targetUnfold = activeHand.openFactor * 0.7;
      }
    }

    // Smooth lerp for springy, hand-following damped rebound
    const hasHand = leftHand.detected || rightHand.detected;
    if (isPinching !== this.isGrabbed && hasHand) this.feedbackPulse = 1;
    this.isGrabbed = isPinching;
    this.feedbackPulse *= Math.exp(-7 * dt);
    targetUnfold = Math.max(0, targetUnfold + this.feedbackPulse * (isPinching ? -0.08 : 0.45));
    // Cap deformation to avoid the cloud exploding and going unresponsive after over-stretch
    targetScale = Math.min(Math.max(targetScale, 0.25), 2.4);
    targetStretch = Math.min(Math.max(targetStretch, 0.6), 2.4);
    targetUnfold = Math.min(Math.max(targetUnfold, 0), 1.3);
    this.coreCenter.x += (targetX - this.coreCenter.x) * blend(hasHand ? 120 : 8);
    this.coreCenter.y += (targetY - this.coreCenter.y) * blend(hasHand ? 120 : 8);
    this.stretchFactor += (targetStretch - this.stretchFactor) * blend(70);
    const prevScale = this.scaleFactor;
    this.scaleFactor += (targetScale - this.scaleFactor) * blend(72);
    // Rate of expansion/compression (per-second), so a sudden "throw open" can
    // drive a musical crescendo in the audio engine.
    this.shapeState.expandSpeed += ((this.scaleFactor - prevScale) / Math.max(dt, 1e-4) - this.shapeState.expandSpeed) * blend(30);
    this.unfoldFactor += (targetUnfold - this.unfoldFactor) * blend(70);

    // Rotation: both-hands steering (continuous) / single-hand twist / rebound with no hands
    if (pair && pair.distance > 25) {
      this.coreRotation += gestureData.angleDelta || 0;
      this.spinRate = (gestureData.angleDelta || 0) / dt;
    } else if (isPinching) {
      const h = (rightHand && rightHand.isPinching) ? rightHand : leftHand;
      const rd = h && h.rollDelta ? h.rollDelta : 0;
      this.coreRotation += rd * 0.9;
      this.spinRate = rd * 0.9 / dt;
    } else {
      this.coreRotation += (0 - this.coreRotation) * blend(2.5);
      this.spinRate = -this.coreRotation * 2.5;
    }
    this.spinSmoothed += (this.spinRate - this.spinSmoothed) * blend(16);

    // Twist: hands rotate against each other to twist the cross-section
    const twistAngle = (gestureData.twist || 0) * 2.6;

    // Point glow scales slightly with size for an immersive bloom
    if (this.material) {
      this.material.size = this.pointSize * (0.85 + this.scaleFactor * 0.15 + this.feedbackPulse * 0.35);
    }

    // Compute cloud movement velocity
    const velocity = this.coreCenter.distanceTo(this.prevCenter) / (dt * 60);
    this.prevCenter.copy(this.coreCenter);

    // Compute exported shape params (for the audio engine)
    this.shapeState.aspectRatio = this.stretchFactor;
    this.shapeState.scale = this.scaleFactor;
    this.shapeState.unfold = this.unfoldFactor;
    this.shapeState.radius = 170 * this.scaleFactor * (1.0 + this.unfoldFactor * 0.6);
    this.shapeState.density = 1.0 / (this.scaleFactor * this.scaleFactor + 0.01);
    this.shapeState.velocity = velocity;
    this.shapeState.centerHeight = Math.min(Math.max((this.coreCenter.y + 240) / 480, 0), 1);
    this.shapeState.isPinched = isPinching;
    this.shapeState.dualHands = dualHands;
    this.shapeState.interaction = pair ? (pair.mixed ? 'transfer' : twoHandsPinching ? 'stretch' : 'sculpt') : 'single';
    this.shapeState.twist = gestureData.twist || 0;
    this.shapeState.spin = this.spinSmoothed;

    // Transform each particle: scale, stretch, and holographic unfold
    const pPos = this.geometry.attributes.position.array;
    const count = this.particleCount;
    const cosR = Math.cos(this.coreRotation);
    const sinR = Math.sin(this.coreRotation);
    const stretch = this.stretchFactor;
    const scale = this.scaleFactor;
    const unfold = this.unfoldFactor;
    const cx = this.coreCenter.x;
    const cy = this.coreCenter.y;
    const age = gestureData.updatedAt === undefined ? 0 : Math.max(0, performance.now()-gestureData.updatedAt);
    const flowX = gestureData.flowX || 0;
    const flowY = gestureData.flowY || 0;
    const fields = [leftHand,rightHand].filter(h=>h.detected).map(h=>{
      const p = this.screenToWorld(h.x,h.y);
      const q = this.screenToWorld(h.x+(h.vx||0)*0.01,h.y+(h.vy||0)*0.01);
      const fade = Math.exp(-age/80);
      return {x:p.x,y:p.y,pinch:h.isPinching,open:h.openFactor||0,vx:(q.x-p.x)*100*fade,vy:(q.y-p.y)*100*fade};
    });
    const steps = Math.ceil(dt*120), step = dt/steps;
    const damping = Math.exp(-2.8*step), follow = blend(hasHand ? 40 : 12);
    let motionEnergy = 0;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      let bx = this.basePositions[i3] * scale;
      let by = this.basePositions[i3 + 1] * scale;
      let bz = this.basePositions[i3 + 2] * scale;

      // 1. Unfold displacement: inner layers burst outward
      const baseDist = Math.sqrt(bx * bx + by * by + bz * bz) + 0.001;
      const unfoldDisp = unfold * (90 + (i % 60));
      bx += (bx / baseDist) * unfoldDisp;
      by += (by / baseDist) * unfoldDisp;
      bz += (bz / baseDist) * unfoldDisp;

      // 2. Stretch along the two-hand angle axis
      bx *= stretch;

      // 3. Rotate with hand steering and twist the cross-section
      if (pair) {
        const twist = twistAngle * Math.max(-1, Math.min(1, bx / 200));
        const oldY = by;
        by = oldY * Math.cos(twist) - bz * Math.sin(twist);
        bz = oldY * Math.sin(twist) + bz * Math.cos(twist);
      }
      const rx = bx * cosR - by * sinR;
      const ry = bx * sinR + by * cosR;

      // 4. Center-of-mass translation
      let targetPx = cx + rx;
      let targetPy = cy + ry;
      let targetPz = bz;
      if (pair) {
        // Assign both sides of the cloud to a continuous bridge between hands.
        const direction = (pair.right.x-pair.left.x)*cosR+(pair.right.y-pair.left.y)*sinR >= 0 ? 1 : -1;
        const u = Math.max(0,Math.min(1,direction*this.basePositions[i3]/400+0.5));
        const bridgeX = pair.left.x*(1-u)+pair.right.x*u;
        const bridgeY = pair.left.y*(1-u)+pair.right.y*u;
        const coupling = 0.6;
        targetPx = targetPx*(1-coupling)+(bridgeX-by*sinR)*coupling;
        targetPy = targetPy*(1-coupling)+(bridgeY+by*cosR)*coupling;
      }

      // Music-reactive 3D wave: the cloud ripples like a stereo wave in time with the song
      if (music) {
        const e = Number.isFinite(music.energy) ? music.energy : 0;
        const b = Number.isFinite(music.bass) ? music.bass : 0;
        const m = Number.isFinite(music.mid) ? music.mid : 0;
        const bp = Number.isFinite(music.beatPulse) ? music.beatPulse : 0;
        const baseX = this.basePositions[i3];
        const baseY = this.basePositions[i3 + 1];
        const baseZ = this.basePositions[i3 + 2];
        const radial = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ) + 0.001;
        const waveFreq = 0.05 + m * 0.06;
        const waveAmp = (6 + bp * 26 + e * 20 + b * 16) * (0.6 + this.scaleFactor * 0.4);
        const wave =
          Math.sin(radial * waveFreq - this.wavePhase) * 0.6 +
          Math.sin(baseX * 0.014 + baseY * 0.02 - this.wavePhase * 0.8) * 0.25 +
          Math.cos(baseY * 0.02 + baseZ * 0.016 + this.wavePhase * 0.6) * 0.15;
        targetPx += wave * waveAmp * 0.12;
        targetPy += wave * waveAmp * 0.12;
        targetPz += wave * waveAmp * 0.7;
      }

      // Smooth springy micro-motion update
      let ox=this.offsets[i3],oy=this.offsets[i3+1],oz=this.offsets[i3+2];
      let vx=this.velocities[i3],vy=this.velocities[i3+1],vz=this.velocities[i3+2];
      // Local forces and damped springs preserve a short, controllable wake.
      for(let sub=0;sub<steps;sub++) {
        let ax=-ox*6,ay=-oy*6,az=-oz*6;
        // Apply global flow along hand motion: the moving hand drags the whole cloud
        ax+=flowX*600; ay+=flowY*600;
        for(const hand of fields) {
          const dx=targetPx+ox-hand.x,dy=targetPy+oy-hand.y,dz=(targetPz+oz)*0.45;
          const distance=Math.sqrt(dx*dx+dy*dy+dz*dz+25);
          const influence=Math.max(0,1-distance/(hand.pinch?420:350))**2;
          const force=hand.pinch?-3800:2800+hand.open*2800;
          ax+=influence*(dx/distance*force+hand.vx*14-dy*2);
          ay+=influence*(dy/distance*force+hand.vy*14+dx*2);
          az+=influence*dz/distance*force*0.4;
        }
        if (pair && pair.mixed && pair.distance > 25) {
          // The open hand feeds a visible stream toward the pinching hand.
          ax += (pair.right.x-pair.left.x)/pair.distance*pair.flow*1400;
          ay += (pair.right.y-pair.left.y)/pair.distance*pair.flow*1400;
        }
        vx=(vx+ax*step)*damping;vy=(vy+ay*step)*damping;vz=(vz+az*step)*damping;
        const speed=Math.hypot(vx,vy,vz);
        if(speed>1400){const limit=1400/speed;vx*=limit;vy*=limit;vz*=limit;}
        ox+=vx*step;oy+=vy*step;oz+=vz*step;
      }
      // Hard-clamp displacement/velocity to prevent numerical blow-up freezing
      ox=Math.max(-900,Math.min(900,ox));
      oy=Math.max(-900,Math.min(900,oy));
      oz=Math.max(-900,Math.min(900,oz));
      vx=Math.max(-1600,Math.min(1600,vx));
      vy=Math.max(-1600,Math.min(1600,vy));
      vz=Math.max(-1600,Math.min(1600,vz));
      this.offsets[i3]=ox;this.offsets[i3+1]=oy;this.offsets[i3+2]=oz;
      this.velocities[i3]=vx;this.velocities[i3+1]=vy;this.velocities[i3+2]=vz;
      motionEnergy+=vx*vx+vy*vy+vz*vz;
      const nx=targetPx+ox, ny=targetPy+oy, nz=targetPz+oz;
      if (isFinite(nx) && isFinite(ny) && isFinite(nz)) {
        pPos[i3]+=(nx-pPos[i3])*follow;
        pPos[i3+1]+=(ny-pPos[i3+1])*follow;
        pPos[i3+2]+=(nz-pPos[i3+2])*follow;
      } else {
        // Reset particle on numerical anomaly so the system never disconnects
        pPos[i3]=this.basePositions[i3];
        pPos[i3+1]=this.basePositions[i3+1];
        pPos[i3+2]=this.basePositions[i3+2];
        this.offsets[i3]=0;this.offsets[i3+1]=0;this.offsets[i3+2]=0;
        this.velocities[i3]=0;this.velocities[i3+1]=0;this.velocities[i3+2]=0;
      }
    }

    const handMotion = Math.min(1, gestureData.motion || 0);
    const waveSpeed = Math.sqrt(Math.max(0, motionEnergy) / Math.max(count, 1)) / 60;
    const combinedVelocity = Math.max(velocity, waveSpeed, handMotion * 12);
    this.shapeState.velocity = Number.isFinite(combinedVelocity) ? combinedVelocity : 0;
    this.shapeState.motion = handMotion;
    this.geometry.attributes.position.needsUpdate = true;
  }

  animate(now = performance.now()) {
    const dt = Math.min(Math.max((now - (this.lastFrameTime ?? now - 16.67)) / 1000, 0.001), 0.05);
    this.lastFrameTime = now;
    requestAnimationFrame(this.animate);

    // Live music state drives a gentle 3D wave through the particle cloud
    const music = (window.audioEngine && window.audioEngine.getVisualState)
      ? window.audioEngine.getVisualState() : null;
    this.wavePhase = (this.wavePhase + dt * (2.0 + (music ? music.bpm * 0.02 : 0))) % (Math.PI * 2 * 1000);

    if (window.currentGestureData) {
      const data = window.currentGestureData;
      const stale = data.updatedAt !== undefined && now - data.updatedAt > 250;
      this.updateHologramPhysics(stale ? {
        leftHand: { detected: false }, rightHand: { detected: false }, handsDistance: null
      } : data, dt, music);
    }
    // Idle micro self-rotation
    this.particlesMesh.rotation.z = 0;
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setPointSize(val) {
    if (this.material) {
      this.pointSize = val;
      this.material.size = val;
    }
  }
}

window.ParticleSystem = ParticleSystem;
