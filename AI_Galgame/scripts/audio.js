/**
 * AI Galgame - Web Audio Synthesizer Engine
 * 纯原生 Web Audio API 合成音乐与音效，无需外部音频资源，100% 离线可用且无版权依赖
 */

class GalAudioEngine {
    constructor() {
        this.ctx = null;
        this.bgmGain = null;
        this.seGain = null;
        this.masterGain = null;
        this.currentBgm = null;
        this.bgmTimer = null;
        this.isMuted = false;
        this.bgmVolume = 0.55;
        this.seVolume = 0.7;
        this.activeOscillators = [];
        this.tempo = 110;
        this.isPlayingBgm = false;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        this.seGain = this.ctx.createGain();
        this.seGain.gain.setValueAtTime(this.seVolume, this.ctx.currentTime);
        this.seGain.connect(this.masterGain);
    }

    ensureContext() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setBgmVolume(val) {
        this.bgmVolume = Math.max(0, Math.min(1, val));
        if (this.bgmGain && this.ctx) {
            this.bgmGain.gain.setTargetAtTime(this.isMuted ? 0 : this.bgmVolume, this.ctx.currentTime, 0.05);
        }
    }

    setSeVolume(val) {
        this.seVolume = Math.max(0, Math.min(1, val));
        if (this.seGain && this.ctx) {
            this.seGain.gain.setTargetAtTime(this.isMuted ? 0 : this.seVolume, this.ctx.currentTime, 0.05);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (!this.masterGain || !this.ctx) return this.isMuted;
        this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime, 0.05);
        return this.isMuted;
    }

    // ========== 音效生成器 (SFX) ==========

    playTextBlip() {
        this.ensureContext();
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // 柔和的赛博打字音
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        const f = freqs[Math.floor(Math.random() * freqs.length)];
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 1.2, now + 0.03);

        gain.gain.setValueAtTime(0.04 * this.seVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        osc.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    playClick() {
        this.ensureContext();
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

        gain.gain.setValueAtTime(0.12 * this.seVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.seGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    playAffectionUp() {
        this.ensureContext();
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + i * 0.08;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.18 * this.seVolume, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

            osc.connect(gain);
            gain.connect(this.seGain);
            osc.start(t);
            osc.stop(t + 0.45);
        });
    }

    playThinking() {
        // DeepSeek 深度思考激活音：水泡 + 科技回响
        this.ensureContext();
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);

        gain.gain.setValueAtTime(0.15 * this.seVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.seGain);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playWarning() {
        // ChatGPT 安全拦截警报音
        this.ensureContext();
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;

        [440, 470].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.09);

            gain.gain.setValueAtTime(0.1 * this.seVolume, now + idx * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.1);

            osc.connect(gain);
            gain.connect(this.seGain);
            osc.start(now + idx * 0.09);
            osc.stop(now + idx * 0.09 + 0.11);
        });
    }

    playHeartbeat() {
        this.ensureContext();
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        [0, 0.14].forEach((delay) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + delay;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(65, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

            gain.gain.setValueAtTime(0.3 * this.seVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            osc.connect(gain);
            gain.connect(this.seGain);
            osc.start(t);
            osc.stop(t + 0.16);
        });
    }

    // ========== BGM 合成背景音乐 (Procedural Loops) ==========

    stopBgm() {
        this.isPlayingBgm = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.activeOscillators.forEach(osc => {
            try { osc.stop(); } catch (e) {}
        });
        this.activeOscillators = [];
        this.currentBgm = null;
    }

    playBgm(trackName) {
        this.ensureContext();
        if (this.currentBgm === trackName && this.isPlayingBgm) return;
        this.stopBgm();
        this.currentBgm = trackName;
        this.isPlayingBgm = true;

        if (trackName === 'title') {
            this.loopBgmTitle();
        } else if (trackName === 'daily') {
            this.loopBgmDaily();
        } else if (trackName === 'deepseek') {
            this.loopBgmDeepSeek();
        } else if (trackName === 'chatgpt') {
            this.loopBgmChatGPT();
        } else if (trackName === 'claude') {
            this.loopBgmClaude();
        } else if (trackName === 'emotional') {
            this.loopBgmEmotional();
        }
    }

    // 工具：播放音符
    _playTone(freq, time, duration, type = 'sine', vol = 0.08) {
        if (!this.ctx || !this.isPlayingBgm) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(time + duration + 0.05);
        this.activeOscillators.push(osc);

        setTimeout(() => {
            const idx = this.activeOscillators.indexOf(osc);
            if (idx > -1) this.activeOscillators.splice(idx, 1);
        }, (duration + 0.1) * 1000);
    }

    // 1. 标题曲: 赛博学园的轻快心跳
    loopBgmTitle() {
        if (!this.isPlayingBgm) return;
        const now = this.ctx.currentTime + 0.05;
        const bpm = 120;
        const beat = 60 / bpm; // 0.5s

        // 旋律和弦 Progression: C - G - Am - F
        const melody = [
            { f: 523.25, d: 0.25, o: 0 },
            { f: 659.25, d: 0.25, o: 0.5 },
            { f: 783.99, d: 0.5,  o: 1.0 },
            { f: 659.25, d: 0.5,  o: 1.5 },
            { f: 587.33, d: 0.5,  o: 2.0 },
            { f: 659.25, d: 0.25, o: 2.5 },
            { f: 587.33, d: 0.5,  o: 3.0 },
            { f: 440.00, d: 0.5,  o: 4.0 },
            { f: 523.25, d: 0.5,  o: 5.0 },
            { f: 659.25, d: 0.8,  o: 6.0 },
            { f: 698.46, d: 0.5,  o: 6.5 },
            { f: 659.25, d: 0.5,  o: 7.0 }
        ];

        const bass = [
            { f: 130.81, d: 1.8, o: 0 }, // C3
            { f: 98.00,  d: 1.8, o: 2 }, // G2
            { f: 110.00, d: 1.8, o: 4 }, // A2
            { f: 87.31,  d: 1.8, o: 6 }  // F2
        ];

        melody.forEach(n => this._playTone(n.f, now + n.o * beat, n.d * beat, 'triangle', 0.07));
        bass.forEach(n => this._playTone(n.f, now + n.o * beat, n.d * beat, 'sine', 0.12));

        const totalTime = 8 * beat;
        this.bgmTimer = setTimeout(() => {
            if (this.isPlayingBgm && this.currentBgm === 'title') {
                this.loopBgmTitle();
            }
        }, totalTime * 1000 - 40);
    }

    // 2. 日常曲: 悠闲学园氛围
    loopBgmDaily() {
        if (!this.isPlayingBgm) return;
        const now = this.ctx.currentTime + 0.05;
        const beat = 0.55;

        const melody = [
            { f: 392.00, d: 0.5, o: 0 },
            { f: 440.00, d: 0.5, o: 1 },
            { f: 493.88, d: 0.5, o: 2 },
            { f: 587.33, d: 1.0, o: 3 },
            { f: 523.25, d: 0.5, o: 4.5 },
            { f: 493.88, d: 0.5, o: 5.5 },
            { f: 440.00, d: 1.2, o: 6.5 }
        ];

        melody.forEach(n => this._playTone(n.f, now + n.o * beat, n.d * beat, 'sine', 0.06));
        // 温暖 Pad
        this._playTone(261.63, now, beat * 3.8, 'triangle', 0.04);
        this._playTone(329.63, now, beat * 3.8, 'triangle', 0.03);
        this._playTone(220.00, now + beat * 4, beat * 3.8, 'triangle', 0.04);
        this._playTone(261.63, now + beat * 4, beat * 3.8, 'triangle', 0.03);

        const totalTime = 8 * beat;
        this.bgmTimer = setTimeout(() => {
            if (this.isPlayingBgm && this.currentBgm === 'daily') {
                this.loopBgmDaily();
            }
        }, totalTime * 1000 - 40);
    }

    // 3. DeepSeek 主题: 萌系 8-bit / 蹦蹦跳跳小鲸鱼
    loopBgmDeepSeek() {
        if (!this.isPlayingBgm) return;
        const now = this.ctx.currentTime + 0.05;
        const beat = 0.22; // 欢快快速

        const notes = [
            { f: 587.33, o: 0 }, { f: 659.25, o: 1 }, { f: 783.99, o: 2 }, { f: 880.00, o: 3 },
            { f: 783.99, o: 4 }, { f: 659.25, o: 5 }, { f: 880.00, o: 6 }, { f: 1046.5, o: 7 },
            { f: 987.77, o: 8 }, { f: 880.00, o: 9 }, { f: 783.99, o: 10 }, { f: 659.25, o: 11 },
            { f: 587.33, o: 12 }, { f: 783.99, o: 14 }
        ];

        notes.forEach(n => this._playTone(n.f, now + n.o * beat, beat * 0.8, 'square', 0.04));

        // 贝斯跳步
        [0, 4, 8, 12].forEach((o, i) => {
            const bassF = [196.00, 220.00, 174.61, 196.00][i];
            this._playTone(bassF, now + o * beat, beat * 1.5, 'triangle', 0.08);
        });

        const totalTime = 16 * beat;
        this.bgmTimer = setTimeout(() => {
            if (this.isPlayingBgm && this.currentBgm === 'deepseek') {
                this.loopBgmDeepSeek();
            }
        }, totalTime * 1000 - 30);
    }

    // 4. ChatGPT 主题: 知性优雅与严谨规整
    loopBgmChatGPT() {
        if (!this.isPlayingBgm) return;
        const now = this.ctx.currentTime + 0.05;
        const beat = 0.48;

        const arpeggio = [
            261.63, 329.63, 392.00, 523.25,
            293.66, 349.23, 440.00, 587.33,
            220.00, 261.63, 329.63, 440.00,
            174.61, 220.00, 261.63, 349.23
        ];

        arpeggio.forEach((f, idx) => {
            this._playTone(f, now + idx * (beat * 0.5), beat * 0.4, 'sine', 0.05);
        });

        // 规整的主和弦
        this._playTone(130.81, now, beat * 2, 'triangle', 0.08);
        this._playTone(146.83, now + beat * 2, beat * 2, 'triangle', 0.08);
        this._playTone(110.00, now + beat * 4, beat * 2, 'triangle', 0.08);
        this._playTone(87.31, now + beat * 6, beat * 2, 'triangle', 0.08);

        const totalTime = 8 * beat;
        this.bgmTimer = setTimeout(() => {
            if (this.isPlayingBgm && this.currentBgm === 'chatgpt') {
                this.loopBgmChatGPT();
            }
        }, totalTime * 1000 - 30);
    }

    // 5. Claude 主题: 暖调圆舞曲 / 抒情文艺
    loopBgmClaude() {
        if (!this.isPlayingBgm) return;
        const now = this.ctx.currentTime + 0.05;
        const beat = 0.52; // 3/4 拍

        // 优雅钢琴感
        const chords = [
            { bass: 146.83, lead: [587.33, 698.46, 880.00], o: 0 },
            { bass: 130.81, lead: [523.25, 659.25, 783.99], o: 3 },
            { bass: 110.00, lead: [440.00, 523.25, 659.25], o: 6 },
            { bass: 123.47, lead: [493.88, 587.33, 739.99], o: 9 }
        ];

        chords.forEach(c => {
            const t = now + c.o * beat;
            this._playTone(c.bass, t, beat * 2.5, 'triangle', 0.09);
            this._playTone(c.lead[0], t + beat * 0.5, beat * 0.8, 'sine', 0.05);
            this._playTone(c.lead[1], t + beat * 1.0, beat * 0.8, 'sine', 0.05);
            this._playTone(c.lead[2], t + beat * 1.5, beat * 1.2, 'sine', 0.07);
        });

        const totalTime = 12 * beat;
        this.bgmTimer = setTimeout(() => {
            if (this.isPlayingBgm && this.currentBgm === 'claude') {
                this.loopBgmClaude();
            }
        }, totalTime * 1000 - 40);
    }

    // 6. 情感高潮/告白: 催泪温存钢琴曲
    loopBgmEmotional() {
        if (!this.isPlayingBgm) return;
        const now = this.ctx.currentTime + 0.05;
        const beat = 0.65;

        const melody = [
            { f: 659.25, d: 1.0, o: 0 },
            { f: 587.33, d: 0.5, o: 1 },
            { f: 523.25, d: 1.5, o: 1.5 },
            { f: 440.00, d: 1.0, o: 3 },
            { f: 523.25, d: 0.5, o: 4 },
            { f: 659.25, d: 1.0, o: 4.5 },
            { f: 783.99, d: 2.0, o: 5.5 }
        ];

        melody.forEach(n => this._playTone(n.f, now + n.o * beat, n.d * beat, 'sine', 0.08));

        // 深沉共鸣低音
        this._playTone(130.81, now, beat * 3.5, 'sine', 0.1);
        this._playTone(196.00, now, beat * 3.5, 'triangle', 0.06);
        this._playTone(110.00, now + beat * 4, beat * 3.5, 'sine', 0.1);
        this._playTone(164.81, now + beat * 4, beat * 3.5, 'triangle', 0.06);

        const totalTime = 8 * beat;
        this.bgmTimer = setTimeout(() => {
            if (this.isPlayingBgm && this.currentBgm === 'emotional') {
                this.loopBgmEmotional();
            }
        }, totalTime * 1000 - 40);
    }
}

// 导出全局单例
window.galAudio = new GalAudioEngine();

