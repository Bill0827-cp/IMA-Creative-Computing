/**
 * app.js
 * Main controller for the gesture-driven particle symphony.
 */

document.addEventListener('DOMContentLoaded', () => {
  const startOverlay = document.getElementById('start-overlay');
  const startBtn = document.getElementById('start-btn');
  const webcamVideo = document.getElementById('webcam-video');
  const particleCanvas = document.getElementById('particle-canvas');
  const skeletonCanvas = document.getElementById('skeleton-canvas');
  const notificationToast = document.getElementById('notification-toast');

  // HUD status elements
  const bpmValEl = document.getElementById('bpm-val');
  const noteValEl = document.getElementById('note-val');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  let particleSystem = null;
  let gestureTracker = null;

  function showToast(msg) {
    notificationToast.textContent = msg;
    notificationToast.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
      notificationToast.classList.remove('show');
    }, 2500);
  }

  // Start
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';

    try {
      await window.audioEngine.init();
      particleSystem = new window.ParticleSystem(particleCanvas);

      gestureTracker = new window.GestureTracker(
        webcamVideo,
        skeletonCanvas,
        (gestureData) => handleGestureTick(gestureData)
      );

      startOverlay.classList.add('hidden');
      showToast('Twist to transpose · Stretch for octave · Height for voicing · Spin for tempo');
    } catch (err) {
      console.error('Startup failed:', err);
      alert('Startup failed. Please allow camera access.\n' + err.message);
      startBtn.disabled = false;
      startBtn.textContent = 'Start';
    }
  });

  function handleGestureTick(gestureData) {
    if (!particleSystem) return;
    const shape = particleSystem.shapeState;
    window.audioEngine.updateFromParticleShape(shape);
    bpmValEl.textContent = window.audioEngine.bpm;
    noteValEl.textContent = window.audioEngine.lastNote || '--';
  }

  // Fullscreen toggle
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      fullscreenBtn.classList.add('active');
    } else {
      document.exitFullscreen().catch(() => {});
      fullscreenBtn.classList.remove('active');
    }
  });
});
