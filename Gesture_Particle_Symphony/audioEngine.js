/**
 * audioEngine.js
 * Gesture-driven song engine with key modulation
 */

class AudioEngine {
  constructor() {
    this.isStarted = false;
    this.bpm = 90;

    // Chord intervals (semitones from root)
    this.CHORD_INTERVALS = {
      maj:   [0, 4, 7],
      maj7:  [0, 4, 7, 11],
      min:   [0, 3, 7],
      min7:  [0, 3, 7, 10],
      sus:   [0, 5, 7],
      dom7:  [0, 4, 7, 10],
      dim:   [0, 3, 6]
    };

    // Original chord progression (root = MIDI pitch, beats = duration per chord)
    this.progression = [
      { root: 48, quality: 'maj7', beats: 2 },  // Cmaj7
      { root: 45, quality: 'min7', beats: 2 },  // Am7
      { root: 41, quality: 'maj7', beats: 2 },  // Fmaj7
      { root: 43, quality: 'dom7', beats: 2 },  // G7
      { root: 40, quality: 'min7', beats: 2 },  // Em7
      { root: 38, quality: 'min7', beats: 2 },  // Dm7
      { root: 43, quality: 'dom7', beats: 2 },  // G7
      { root: 48, quality: 'maj',  beats: 2 }   // C
    ];

    // 16-step melody rhythm mask (1 = hit, 0 = rest)
    this.rhythm = [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0];

    this.lastNote = null;
    this.lastTriggerTime = 0;
    this.wasPinched = false;
    this.lastBassTime = -Infinity;

    // Song state
    this.step = 0;
    this.chordStep = 0;
    this.chordIndex = 0;
    this.transpose = 0;    // transposition in semitones
    this.octaveShift = 0;  // octave shift
    this.lastMidi = null;     // last melody note (for stepwise, jump-free motion)
    this.lastBassMidi = null; // last bass note

    // C major scale — every chord tone in this progression lives inside it
    this.MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

    // Live spectrum + beat-pulse state for the particle wave visualisation
    this.visual = {
      energy: 0, bass: 0, mid: 0, high: 0, beatPulse: 0, lastFrame: 0
    };

    // Crescendo envelope: spikes when the cloud is thrown open quickly,
    // then decays — drives a broad swell in loudness/brightness/space.
    this.crescendo = 0;
    this.lastShapeTime = null;
  }

  async init() {
    if (this.isStarted) return;
    await Tone.start();
    Tone.Transport.bpm.value = this.bpm;

    // 1. Reverb and spatial delay chain (soft, spacious piano room)
    this.reverb = new Tone.Reverb({
      decay: 5.0,
      preDelay: 0.03,
      wet: 0.45
    }).toDestination();
    await this.reverb.generate();

    this.delay = new Tone.PingPongDelay({
      delayTime: "8n",
      feedback: 0.3,
      wet: 0.25
    }).connect(this.reverb);

    // 2. Gentle low-pass filter to soften transients and mellow the tone
    this.filter = new Tone.Filter({
      frequency: 5000,
      type: "lowpass",
      rolloff: -12,
      Q: 0.7
    }).connect(this.delay);

    this.masterGain = new Tone.Gain(0.7).connect(this.filter);

    // Analyser to feed the music-reactive particle wave
    this.analyser = new Tone.Analyser('fft', 64);
    this.filter.connect(this.analyser);

    // Spatial panning (rotation speed drives left/right swing)
    this.panner = new Tone.Panner(0).connect(this.masterGain);

    // 3. Soft piano voice — Salamander Grand Piano samples.
    // A single piano plays melody, bass, and arpeggios at different velocities,
    // like one pianist, for a warm, gentle, non-electronic texture.
    this.piano = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",   C1: "C1.mp3",   "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
        A1: "A1.mp3",   C2: "C2.mp3",   "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
        A2: "A2.mp3",   C3: "C3.mp3",   "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
        A3: "A3.mp3",   C4: "C4.mp3",   "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
        A4: "A4.mp3",   C5: "C5.mp3",   "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
        A5: "A5.mp3",   C6: "C6.mp3",   "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
        A6: "A6.mp3",   C7: "C7.mp3",   "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
        A7: "A7.mp3",   C8: "C8.mp3"
      },
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      release: 1.2,
      curve: "exponential",
      volume: -6
    }).connect(this.panner);

    await Tone.loaded();

    this.setupSongLoop();
    this.isStarted = true;
  }

  /**
   * Gesture-driven song loop: melody / bass / pluck driven live by particle shape
   */
  setupSongLoop() {
    this.loop = new Tone.Loop((time) => {
      const shape = this.lastShapeState;
      if (!shape) return;

      // Sanitise shape inputs inside the loop too: a single non-finite value
      // would otherwise flow into triggerAttackRelease and throw
      // "No available buffers for note: NaN", killing the transport.
      const fin = (v, d) => (Number.isFinite(v) ? v : d);
      const twist = fin(shape.twist, 0);
      const aspectRatio = fin(shape.aspectRatio, 1);
      const centerHeight = fin(shape.centerHeight, 0.5);
      const scale = fin(shape.scale, 1);
      const motion = fin(shape.motion, 0);
      const unfold = fin(shape.unfold, 0);
      const isPinched = !!shape.isPinched;

      this.step = (this.step + 1) % 16;

      // Advance chord (one per chord.beats beats; 8n = half beat -> beats*2 steps)
      this.chordStep++;
      if (this.chordStep >= this.progression[this.chordIndex].beats * 2) {
        this.chordStep = 0;
        this.chordIndex = (this.chordIndex + 1) % this.progression.length;
      }
      const chord = this.progression[this.chordIndex];
      const intervals = this.CHORD_INTERVALS[chord.quality];

      // 1) Transpose: twist (-1..1) -> smooth semitone glide (up to an octave)
      this.transpose += (twist * 12 - this.transpose) * 0.22;
      const root = chord.root + Math.round(this.transpose);

      // 2) Octave: aspectRatio -> smooth octave glide
      this.octaveShift += ((aspectRatio - 1) * 2.5 - this.octaveShift) * 0.22;

      // 3) Voicing: centerHeight -> pitch within the chord
      const voicing = Math.min(1, Math.max(0, (centerHeight - 0.5) * 1.6 + 0.5));
      const chordTone = intervals[Math.round(voicing * (intervals.length - 1))];

      const rootNote = Tone.Frequency(root, 'midi').toNote();

      // Melody: a jump-free line that wanders through C major.
      // The gesture sets a target pitch, but each note moves at most 2 semitones,
      // so the melody flows like a wave instead of leaping between chord tones.
      if (this.rhythm[this.step]) {
        const targetMidi = chord.root + chordTone + 12 + this.transpose + this.octaveShift * 12;
        const midi = this.nextMelodyNote(targetMidi);
        const note = Tone.Frequency(midi, 'midi').toNote();

        // Wider dynamics: velocity breathes with scale/motion/unfold (soft when
        // compressed, firmer when expanded)
        const vel = Math.min(0.95, 0.12 + (scale - 0.25) * 0.36 + motion * 0.26 + unfold * 0.2);
        const dur = isPinched ? '8n' : '4n';
        this.piano.triggerAttackRelease(note, dur, time, vel);
        this.lastNote = note;
        this.visual.beatPulse = 1;
      }

      // Bass root (strong beats) with a smooth, jump-free glide
      if (this.step % 4 === 0) {
        const bassMidi = this.nextBassNote(root - 12);
        const bassVel = Math.min(0.5, 0.22 + (scale - 0.25) * 0.14);
        this.piano.triggerAttackRelease(Tone.Frequency(bassMidi, 'midi').toNote(), '2n', time, bassVel);
        this.visual.beatPulse = Math.max(this.visual.beatPulse, 0.7);
      }

      // Airy arpeggio: chord sparkle that adds motion without jarring jumps
      if (this.step % 2 === 0) {
        const arpMidi = this.nextArpNote(root, intervals);
        this.piano.triggerAttackRelease(
          Tone.Frequency(arpMidi, 'midi').toNote(), '8n', time,
          0.06 + unfold * 0.12 + motion * 0.08
        );
      }

      // Soft upper-register accent while pinched or moving hard
      if ((isPinched || motion > 0.5) && this.step % 2 === 0) {
        this.piano.triggerAttackRelease(
          Tone.Frequency(root + 12, 'midi').toNote(), '8n', time, 0.18
        );
      }
    }, '8n');

    this.loop.start(0);
    Tone.Transport.start();
  }

  /**
   * Snap a MIDI pitch to the nearest note of the C major scale.
   */
  snapToScale(midi) {
    const base = Math.round(midi / 12) * 12;
    let best = midi, bestDist = Infinity;
    for (let o = -1; o <= 2; o++) {
      for (const deg of this.MAJOR_SCALE) {
        const candidate = base + o * 12 + deg;
        const d = Math.abs(candidate - midi);
        if (d < bestDist) { bestDist = d; best = candidate; }
      }
    }
    return best;
  }

  /**
   * Next melody note: track the gesture target, but stay within a 2-semitone step
   * so the line glides smoothly (wide range, no sudden leaps).
   */
  nextMelodyNote(targetMidi) {
    if (this.lastMidi == null) {
      this.lastMidi = this.snapToScale(targetMidi);
      return this.lastMidi;
    }
    const lo = Math.floor((this.lastMidi - 3) / 12) * 12;
    const hi = Math.ceil((this.lastMidi + 3) / 12) * 12;
    let best = this.lastMidi, bestDist = Infinity;
    for (let m = lo; m <= hi; m++) {
      if (this.MAJOR_SCALE.includes(((m % 12) + 12) % 12) && Math.abs(m - this.lastMidi) <= 2) {
        const d = Math.abs(m - targetMidi);
        if (d < bestDist) { bestDist = d; best = m; }
      }
    }
    this.lastMidi = best;
    return best;
  }

  /**
   * Next arpeggio note: rises and falls through the chord tones an octave up.
   */
  nextArpNote(root, intervals) {
    const pattern = [0, 1, 2, 3, 3, 2, 1, 0];
    const idx = pattern[this.step % pattern.length] % intervals.length;
    return root + intervals[idx] + 24;
  }

  /**
   * Next bass note: glide smoothly toward the target root (max 2 semitones per hit).
   */
  nextBassNote(target) {
    if (this.lastBassMidi == null) this.lastBassMidi = target;
    const step = Math.max(-2, Math.min(2, target - this.lastBassMidi));
    this.lastBassMidi += step;
    return this.lastBassMidi;
  }

  /**
   * Live spectrum + beat-pulse state for the particle wave visualisation.
   */
  getVisualState() {
    if (!this.isStarted) return null;
    const now = Tone.now();
    const dt = Math.min(0.5, Math.max(0.001, now - this.visual.lastFrame));
    this.visual.lastFrame = now;

    if (this.analyser) {
      const spec = this.analyser.getValue();
      if (spec && spec.length) {
        const n = spec.length;
        const third = Math.max(1, Math.floor(n / 3));
        let bass = 0, mid = 0, high = 0, sum = 0;
        for (let i = 0; i < n; i++) {
          // Analyser fft returns dB values (negative, -Infinity when silent).
          // Map them to a positive 0..1 energy so the particle wave stays finite.
          const raw = spec[i];
          const v = Number.isFinite(raw) ? Math.max(0, (raw + 100) / 100) : 0;
          sum += v;
          if (i < third) bass += v;
          else if (i < third * 2) mid += v;
          else high += v;
        }
        const highCount = Math.max(1, n - third * 2);
        const energy = sum / n;
        bass /= third; mid /= third; high /= highCount;
        this.visual.energy += (energy - this.visual.energy) * 0.35;
        this.visual.bass += (bass - this.visual.bass) * 0.35;
        this.visual.mid += (mid - this.visual.mid) * 0.35;
        this.visual.high += (high - this.visual.high) * 0.35;
      }
    }

    this.visual.beatPulse *= Math.exp(-5 * dt);

    return {
      energy: this.visual.energy,
      bass: this.visual.bass,
      mid: this.visual.mid,
      high: this.visual.high,
      beatPulse: this.visual.beatPulse,
      bpm: this.bpm
    };
  }

  /**
   * Continuous timbre/dynamics modulation: filter, reverb, pan, BPM follow particle shape
   * (melody / bass / rhythm generated by setupSongLoop)
   * @param {Object} shapeState Particle cloud geometry state
   */
  updateFromParticleShape(shapeState) {
    if (!this.isStarted) return;
    this.lastShapeState = shapeState;

    // Sanitise inputs: a NaN/Infinity in the particle sim must never reach
    // a Tone.js rampTo (exponential ramps reject non-finite values).
    const fin = (v, d) => (Number.isFinite(v) ? v : d);
    const aspectRatio = fin(shapeState.aspectRatio, 1);
    const shapeScale = fin(shapeState.scale, 1);
    const unfold = fin(shapeState.unfold, 0);
    const velocity = fin(shapeState.velocity, 0);
    const isPinched = !!shapeState.isPinched;
    const twist = fin(shapeState.twist, 0);
    const spin = fin(shapeState.spin, 0);
    const motion = fin(shapeState.motion, 0);
    const expandSpeed = fin(shapeState.expandSpeed, 0);

    const spread = Math.min(1, Math.max(0, (shapeScale - 0.25) / 2.15));
    const motionNorm = Math.min(1, velocity / 18);
    const twistMag = Math.abs(twist);

    // Crescendo envelope: a fast expansion ("throw open") charges a swell that
    // decays over ~1.2s, so the music blooms into the open cloud.
    const now = Tone.now();
    const dt = this.lastShapeTime != null
      ? Math.min(0.1, Math.max(0.001, now - this.lastShapeTime))
      : 0.016;
    this.lastShapeTime = now;
    const expandNorm = Math.min(1, Math.max(0, expandSpeed / 6));
    if (expandSpeed > 0 && expandNorm > 0.4) {
      this.crescendo = Math.min(1, this.crescendo + (expandNorm - 0.4) * 1.1);
    }
    this.crescendo = Math.max(0, this.crescendo - dt * 0.85);

    // Filter brightness: compressed cloud -> soft and muffled; expanded -> airy and bright
    const targetCutoff = THREE.MathUtils.clamp(
      380 + spread * spread * 8200 + unfold * 2200 + motionNorm * 2200 + this.crescendo * 2800,
      260, 13000
    );
    this.filter.frequency.rampTo(targetCutoff, 0.12);
    this.filter.Q.rampTo(THREE.MathUtils.clamp(0.7 + twistMag * 1.8, 0.5, 2.8), 0.1);

    // Spatial field: compression stays intimate/dry, expansion opens into a grand hall
    this.reverb.wet.rampTo(THREE.MathUtils.clamp(0.1 + spread * 0.62 + unfold * 0.18 + this.crescendo * 0.22, 0.08, 0.95), 0.18);
    this.delay.wet.rampTo(0.08 + motionNorm * 0.42 + spread * 0.22, 0.15);
    this.delay.feedback.rampTo(0.12 + spread * 0.5, 0.2);

    // Loudness: compressed -> restrained/quiet, expanded -> fuller and grand,
    // plus the crescendo swell on a sudden open.
    this.masterGain.gain.rampTo(THREE.MathUtils.clamp(0.38 + spread * 0.62 + this.crescendo * 0.5, 0.32, 1.0), 0.18);

    // Pan: spin drives left/right swing
    if (this.panner) {
      this.panner.pan.rampTo(THREE.MathUtils.clamp(spin * 0.35, -0.9, 0.9), 0.1);
    }

    // BPM: rotation + motion + stretch drive song tempo
    const targetBPM = Math.round(
      THREE.MathUtils.clamp(70 + Math.abs(spin) * 8 + motion * 36 + (aspectRatio - 1) * 18, 55, 170)
    );
    if (Math.abs(this.bpm - targetBPM) > 3) {
      this.bpm = targetBPM;
      Tone.Transport.bpm.rampTo(this.bpm, 0.3);
    }

    // Pinch state (used by setupSongLoop for note duration and pluck fills)
    this.wasPinched = isPinched;
  }

  setMasterVolume(val) {
    if (this.masterGain) {
      this.masterGain.gain.rampTo(val, 0.1);
    }
  }
}

window.audioEngine = new AudioEngine();
