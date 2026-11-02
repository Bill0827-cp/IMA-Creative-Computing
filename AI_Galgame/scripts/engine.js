/**
 * AI Galgame - Core Visual Novel Engine
 * 处理场景推进、打字机动效、立绘过渡、分支抉择、存读档、历史回放与好感度逻辑
 */

class GalEngine {
    constructor(data, audio, sprites) {
        this.data = data;
        this.audio = audio;
        this.sprites = sprites;
        this.language = window.gameLanguage || 'zh';

        // 核心游戏状态
        this.currentSceneId = 'start';
        this.affection = {
            deepseek: 0,
            chatgpt: 0,
            claude: 0
        };
        this.backlog = [];
        this.unlockedEndings = new Set();

        // 播放控制
        this.isTyping = false;
        this.typewriterTimer = null;
        this.fullTextToType = '';
        this.currentTypedIndex = 0;
        this.typeSpeed = 28; // ms per char
        this.isAutoPlay = false;
        this.autoPlayTimer = null;
        this.autoDelay = 2200; // ms
        this.isSkipMode = false;

        // DOM 缓存引用
        this.dom = {};
    }

    init() {
        this.cacheDom();
        this.loadPersistentData();
        this.bindEvents();
        this.updateAffectionUI();
    }

    setLanguage(language) {
        this.language = language;
        window.gameLanguage = language;
        localStorage.setItem('ai_gal_language', language);
        this.data = window.getLocalizedGalGameData(language);
        window.applyGameInterfaceLanguage(language);

        if (this.dom.gameStage.classList.contains('active')) {
            const sceneId = this.currentSceneId;
            const backlogLength = this.backlog.length;
            if (this.typewriterTimer) clearInterval(this.typewriterTimer);
            if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer);
            this.goToScene(sceneId);
            this.backlog.length = backlogLength;
        }
    }

    cacheDom() {
        this.dom = {
            gameStage: document.getElementById('game-stage'),
            bgLayer: document.getElementById('bg-layer'),
            spriteLayer: document.getElementById('sprite-layer'),
            dialogueBox: document.getElementById('dialogue-box'),
            speakerBadge: document.getElementById('speaker-badge'),
            dialogueText: document.getElementById('dialogue-text'),
            cursorIndicator: document.getElementById('cursor-indicator'),
            choicesOverlay: document.getElementById('choices-overlay'),
            thinkingBox: document.getElementById('thinking-box'),
            thinkingContent: document.getElementById('thinking-content'),
            fxLayer: document.getElementById('fx-layer'),
            
            // 顶部状态条
            hudDsAffection: document.getElementById('hud-ds-val'),
            hudGptAffection: document.getElementById('hud-gpt-val'),
            hudClaudeAffection: document.getElementById('hud-claude-val'),

            // 快捷控制按钮
            btnAuto: document.getElementById('btn-auto'),
            btnSkip: document.getElementById('btn-skip'),
            btnLog: document.getElementById('btn-log'),
            btnSave: document.getElementById('btn-save'),
            btnLoad: document.getElementById('btn-load'),
            btnConfig: document.getElementById('btn-config'),

            // 弹窗
            logModal: document.getElementById('modal-log'),
            logList: document.getElementById('log-list'),
            slModal: document.getElementById('modal-sl'),
            slTitle: document.getElementById('sl-modal-title'),
            slSlotsContainer: document.getElementById('sl-slots-container'),
            galleryModal: document.getElementById('modal-gallery'),
            galleryGrid: document.getElementById('gallery-grid'),
            codexModal: document.getElementById('modal-codex'),
            settingsModal: document.getElementById('modal-settings')
        };
    }

    bindEvents() {
        // 点击对话框快速推进或跳过打字机
        this.dom.dialogueBox.addEventListener('click', (e) => {
            // 防止点击到控制按钮时触发对话推进
            if (e.target.closest('.quick-btn')) return;
            this.handleStageClick();
        });

        // 键盘快捷键 (空格/回车推进，ESC关弹窗)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                if (!document.querySelector('.modal.active')) {
                    this.handleStageClick();
                }
            } else if (e.code === 'Escape') {
                this.closeAllModals();
            }
        });

        // 快捷控制栏
        this.dom.btnAuto.addEventListener('click', () => this.toggleAutoPlay());
        this.dom.btnSkip.addEventListener('click', () => this.toggleSkipMode());
        this.dom.btnLog.addEventListener('click', () => this.openLogModal());
        this.dom.btnSave.addEventListener('click', () => this.openSaveModal());
        this.dom.btnLoad.addEventListener('click', () => this.openLoadModal());
        this.dom.btnConfig.addEventListener('click', () => this.openSettingsModal());
    }

    handleStageClick() {
        this.audio.ensureContext();

        // 如果当前有选项覆盖层，点击背景不可跳过
        if (this.dom.choicesOverlay.classList.contains('active')) return;

        if (this.isTyping) {
            // 正在打字中，点击立即展示全部文字
            this.finishTypingImmediately();
        } else {
            // 已经打完，点击推进下一句
            const scene = this.data.scenes[this.currentSceneId];
            if (!scene) return;

            if (scene.choices && scene.choices.length > 0) {
                // 有选项，不自动跳，等待玩家选择
                return;
            }

            if (scene.isEnding) {
                this.returnToTitle();
                return;
            }

            if (scene.next) {
                this.audio.playClick();
                this.goToScene(scene.next);
            }
        }
    }

    goToScene(sceneId) {
        const scene = this.data.scenes[sceneId];
        if (!scene) {
            console.error('Scene not found:', sceneId);
            return;
        }

        this.currentSceneId = sceneId;

        // 停止之前的自动等待定时器
        if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer);

        // 处理背景切换
        if (scene.bg && this.data.backgrounds[scene.bg]) {
            this.updateBackground(scene.bg);
        }

        // 处理音乐切换
        if (scene.bgm) {
            this.audio.playBgm(scene.bgm);
        }

        // 处理音效触发
        if (scene.sfx) {
            if (scene.sfx === 'affection') this.audio.playAffectionUp();
            else if (scene.sfx === 'thinking') this.audio.playThinking();
            else if (scene.sfx === 'warning') this.audio.playWarning();
            else if (scene.sfx === 'heartbeat') this.audio.playHeartbeat();
        }

        // 处理立绘展示
        this.updateSprite(scene.sprite);

        // Handle ban/system alert screens
        this.clearSpecialScreens();
        if (scene.banScreen) {
            setTimeout(() => this.showBanScreen(scene.banScreen), 800);
        }
        if (scene.systemAlert) {
            setTimeout(() => this.showSystemAlert(scene.systemAlert), 400);
        }

        // 处理 DeepSeek 特殊思考链 <think>
        this.updateThinkingBox(scene.thinking);

        // 处理结局收录
        if (scene.endingId) {
            this.unlockEnding(scene.endingId);
        }

        // 准备开始打字机
        this.startTypewriter(scene);

        // 记录到 Log 历史
        const speakerInfo = this.data.characters[scene.speaker] || { name: scene.speaker || '' };
        this.backlog.push({
            speaker: speakerInfo.name,
            color: speakerInfo.color || '#fff',
            text: scene.text,
            sceneId: sceneId,
            time: new Date().toLocaleTimeString()
        });
    }

    startTypewriter(scene) {
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        this.isTyping = true;
        this.fullTextToType = scene.text || '';
        this.currentTypedIndex = 0;
        this.dom.dialogueText.innerHTML = '';
        this.dom.cursorIndicator.classList.remove('active');

        // 设置说话者名牌
        const speakerInfo = this.data.characters[scene.speaker] || { name: scene.speaker || '', color: '#94a3b8' };
        if (speakerInfo.name) {
            this.dom.speakerBadge.style.display = 'inline-block';
            this.dom.speakerBadge.textContent = speakerInfo.name;
            this.dom.speakerBadge.style.background = speakerInfo.color;
            if (speakerInfo.badgeClass) {
                this.dom.speakerBadge.className = `speaker-badge ${speakerInfo.badgeClass}`;
            } else {
                this.dom.speakerBadge.className = 'speaker-badge';
            }
        } else {
            this.dom.speakerBadge.style.display = 'none';
        }

        // 如果在快进模式，立即打完
        if (this.isSkipMode) {
            this.finishTypingImmediately();
            return;
        }

        this.typewriterTimer = setInterval(() => {
            if (this.currentTypedIndex < this.fullTextToType.length) {
                this.dom.dialogueText.textContent += this.fullTextToType[this.currentTypedIndex];
                
                // 偶尔发出柔和的打字提示音 (每隔3个字)
                if (this.currentTypedIndex % 3 === 0) {
                    this.audio.playTextBlip();
                }
                
                this.currentTypedIndex++;
            } else {
                this.onTypingComplete(scene);
            }
        }, this.typeSpeed);
    }

    finishTypingImmediately() {
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        this.isTyping = false;
        this.dom.dialogueText.textContent = this.fullTextToType;
        const scene = this.data.scenes[this.currentSceneId];
        this.onTypingComplete(scene);
    }

    onTypingComplete(scene) {
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        this.isTyping = false;
        this.dom.cursorIndicator.classList.add('active');

        // 检查是否有选项分支
        if (scene.choices && scene.choices.length > 0) {
            this.showChoices(scene.choices);
            // 出现选项时自动解除快进模式
            if (this.isSkipMode) {
                this.toggleSkipMode(false);
            }
        } else {
            // 没有选项：处理自动播放或快进
            if (this.isSkipMode) {
                setTimeout(() => {
                    if (this.isSkipMode) {
                        if (scene.isEnding) this.returnToTitle();
                        else if (scene.next) this.goToScene(scene.next);
                    }
                }, 80);
            } else if (this.isAutoPlay) {
                this.autoPlayTimer = setTimeout(() => {
                    if (this.isAutoPlay && !this.isTyping) {
                        if (scene.isEnding) this.returnToTitle();
                        else if (scene.next) this.goToScene(scene.next);
                    }
                }, this.autoDelay);
            }
        }
    }

    returnToTitle() {
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer);
        this.isTyping = false;
        this.toggleAutoPlay(false);
        this.toggleSkipMode(false);
        this.closeAllModals();
        this.clearSpecialScreens();
        this.dom.gameStage.classList.remove('active');
        document.getElementById('title-screen').classList.add('active');
        this.audio.playBgm('title');
    }

    showChoices(choices) {
        this.dom.choicesOverlay.innerHTML = '';
        this.dom.choicesOverlay.classList.add('active');

        choices.forEach((c, idx) => {
            const btn = document.createElement('button');
            btn.className = 'choice-card';
            btn.innerHTML = `<span class="choice-num">${idx + 1}</span> <span class="choice-text">${c.text}</span>`;
            
            btn.addEventListener('mouseenter', () => this.audio.playClick());
            btn.addEventListener('click', () => {
                this.audio.playClick();
                this.dom.choicesOverlay.classList.remove('active');

                // 处理好感度变动
                if (c.affection) {
                    this.addAffection(c.affection);
                }

                // 跳转目标场景
                this.goToScene(c.target);
            });

            this.dom.choicesOverlay.appendChild(btn);
        });
    }

    addAffection(affDelta) {
        for (let char in affDelta) {
            if (this.affection[char] !== undefined) {
                this.affection[char] += affDelta[char];
                this.showHeartFx(char, affDelta[char]);
            }
        }
        this.updateAffectionUI();
    }

    showHeartFx(char, delta) {
        this.audio.playAffectionUp();
        const fx = document.createElement('div');
        fx.className = 'affection-floating-fx';
        
        const charNames = this.language === 'en'
            ? { deepseek: 'Sora', chatgpt: 'OpenAI', claude: 'Claude' }
            : { deepseek: '求索酱', chatgpt: '欧佩恩', claude: '克劳德' };
        const charName = charNames[char] || 'AI';

        fx.textContent = this.language === 'en'
            ? `❤️ ${charName} Affection ${delta >= 0 ? '+' : ''}${delta}`
            : `❤️ ${charName} 好感度 ${delta >= 0 ? '+' : ''}${delta}!`;
        this.dom.fxLayer.appendChild(fx);

        setTimeout(() => {
            if (fx.parentNode) fx.parentNode.removeChild(fx);
        }, 1800);
    }

    updateAffectionUI() {
        if (this.dom.hudDsAffection) this.dom.hudDsAffection.textContent = this.affection.deepseek;
        if (this.dom.hudGptAffection) this.dom.hudGptAffection.textContent = this.affection.chatgpt;
        if (this.dom.hudClaudeAffection) this.dom.hudClaudeAffection.textContent = this.affection.claude;
    }

    updateBackground(bgKey) {
        const bgData = this.data.backgrounds[bgKey];
        if (!bgData) return;

        // 移除旧背景类
        this.dom.bgLayer.className = `bg-layer ${bgData.class} bg-fade-in`;
    }

    updateSprite(spriteData) {
        this.dom.spriteLayer.innerHTML = '';
        if (!spriteData || !spriteData.char) return;

        const spriteContainer = document.createElement('div');
        spriteContainer.className = `sprite-slot pos-${spriteData.pos || 'center'} sprite-anim-enter`;
        
        // 渲染高质量矢量 SVG 立绘
        spriteContainer.innerHTML = this.sprites.render(spriteData.char, spriteData.expr || 'normal');
        this.dom.spriteLayer.appendChild(spriteContainer);
    }

    updateThinkingBox(thinkingData) {
        if (!thinkingData) {
            this.dom.thinkingBox.classList.remove('active');
            return;
        }

        this.dom.thinkingBox.classList.add('active');
        this.dom.thinkingContent.innerHTML = `
            <div class="thinking-title">💡 ${thinkingData.title}</div>
            <pre class="thinking-code">${this.escapeHtml(thinkingData.content)}</pre>
        `;
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ========== 播放模式切换 (Auto / Skip) ==========

    toggleAutoPlay(forceState = null) {
        this.isAutoPlay = forceState !== null ? forceState : !this.isAutoPlay;
        this.dom.btnAuto.classList.toggle('active', this.isAutoPlay);
        if (this.isAutoPlay) {
            this.toggleSkipMode(false);
            if (!this.isTyping) {
                const scene = this.data.scenes[this.currentSceneId];
                if (scene && scene.next && (!scene.choices || scene.choices.length === 0)) {
                    this.goToScene(scene.next);
                }
            }
        } else {
            if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer);
        }
    }

    toggleSkipMode(forceState = null) {
        this.isSkipMode = forceState !== null ? forceState : !this.isSkipMode;
        this.dom.btnSkip.classList.toggle('active', this.isSkipMode);
        if (this.isSkipMode) {
            this.toggleAutoPlay(false);
            if (this.isTyping) {
                this.finishTypingImmediately();
            } else {
                const scene = this.data.scenes[this.currentSceneId];
                if (scene && scene.next && (!scene.choices || scene.choices.length === 0)) {
                    this.goToScene(scene.next);
                }
            }
        }
    }

    // ========== 模态弹窗管理 (Log / Save / Load / Gallery / Codex / Settings) ==========

    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }

    openLogModal() {
        this.audio.playClick();
        this.closeAllModals();
        this.dom.logList.innerHTML = '';

        this.backlog.forEach(item => {
            const row = document.createElement('div');
            row.className = 'log-item';
            const scene = this.data.scenes[item.sceneId];
            const speaker = scene ? this.data.characters[scene.speaker] : null;
            row.innerHTML = `
                <div class="log-meta">
                    <span class="log-speaker" style="color: ${item.color}">${speaker && speaker.name ? speaker.name : item.speaker || (this.language === 'en' ? 'Narrator' : '旁白')}</span>
                    <span class="log-time">${item.time}</span>
                </div>
                <div class="log-text">${scene ? scene.text : item.text}</div>
            `;
            this.dom.logList.appendChild(row);
        });

        this.dom.logModal.classList.add('active');
        this.dom.logList.scrollTop = this.dom.logList.scrollHeight;
    }

    openSaveModal() {
        this.audio.playClick();
        this.closeAllModals();
        this.renderSlSlots('save');
        this.dom.slTitle.textContent = this.language === 'en' ? "💾 Save Journey" : "💾 记录旅程 (存档)";
        this.dom.slModal.classList.add('active');
    }

    openLoadModal() {
        this.audio.playClick();
        this.closeAllModals();
        this.renderSlSlots('load');
        this.dom.slTitle.textContent = this.language === 'en' ? "📂 Load Journey" : "📂 读取回忆 (读档)";
        this.dom.slModal.classList.add('active');
    }

    renderSlSlots(mode) {
        this.dom.slSlotsContainer.innerHTML = '';
        const saves = JSON.parse(localStorage.getItem('ai_gal_saves') || '{}');

        for (let i = 1; i <= 6; i++) {
            const slotKey = `slot_${i}`;
            const slotData = saves[slotKey];
            const savedScene = slotData && this.data.scenes[slotData.sceneId];
            const savedBackground = savedScene && this.data.backgrounds[savedScene.bg];
            const slotEl = document.createElement('div');
            slotEl.className = `sl-slot ${slotData ? 'has-data' : 'empty'}`;

            if (slotData) {
                slotEl.innerHTML = `
                    <div class="slot-header">
                        <span class="slot-num">Slot 0${i}</span>
                        <span class="slot-date">${slotData.date}</span>
                    </div>
                    <div class="slot-body">
                        <div class="slot-scene">${savedBackground ? savedBackground.name : slotData.sceneTitle}</div>
                        <div class="slot-snippet">${savedScene ? `${savedScene.text.substring(0, 36)}...` : slotData.textSnippet}</div>
                        <div class="slot-aff">❤️ DS:${slotData.affection.deepseek} | GPT:${slotData.affection.chatgpt} | Claude:${slotData.affection.claude}</div>
                    </div>
                `;
            } else {
                slotEl.innerHTML = `
                        <div class="slot-header"><span class="slot-num">${this.language === 'en' ? 'Slot' : 'Slot'} 0${i}</span></div>
                        <div class="slot-body empty-text">${this.language === 'en' ? '[ Empty save slot ]' : '[ 空白档案槽 ]'}</div>
                `;
            }

            slotEl.addEventListener('click', () => {
                this.audio.playClick();
                if (mode === 'save') {
                    this.saveToSlot(slotKey);
                    this.renderSlSlots('save');
                } else if (mode === 'load' && slotData) {
                    this.loadFromSlot(slotData);
                    this.closeAllModals();
                }
            });

            this.dom.slSlotsContainer.appendChild(slotEl);
        }
    }

    saveToSlot(slotKey) {
        const saves = JSON.parse(localStorage.getItem('ai_gal_saves') || '{}');
        const scene = this.data.scenes[this.currentSceneId] || {};
        const bgData = this.data.backgrounds[scene.bg] || { name: this.language === 'en' ? "Unknown location" : "未知地点" };

        saves[slotKey] = {
            sceneId: this.currentSceneId,
            sceneTitle: bgData.name,
            textSnippet: (scene.text || '').substring(0, 36) + '...',
            affection: { ...this.affection },
            date: new Date().toLocaleString(this.language === 'en' ? 'en-US' : 'zh-CN'),
            backlog: [...this.backlog]
        };

        localStorage.setItem('ai_gal_saves', JSON.stringify(saves));
        this.audio.playAffectionUp();
    }

    loadFromSlot(slotData) {
        this.affection = { ...slotData.affection };
        this.backlog = slotData.backlog ? [...slotData.backlog] : [];
        this.updateAffectionUI();
        this.goToScene(slotData.sceneId);
    }

    unlockEnding(endingId) {
        this.unlockedEndings.add(endingId);
        localStorage.setItem('ai_gal_endings', JSON.stringify(Array.from(this.unlockedEndings)));
    }

    loadPersistentData() {
        const savedEndings = JSON.parse(localStorage.getItem('ai_gal_endings') || '[]');
        this.unlockedEndings = new Set(savedEndings);
    }

    openGalleryModal() {
        this.audio.playClick();
        this.closeAllModals();
        this.dom.galleryGrid.innerHTML = '';

        for (let key in this.data.endings) {
            const ed = this.data.endings[key];
            const isUnlocked = this.unlockedEndings.has(key);
            const card = document.createElement('div');
            card.className = `gallery-card ${isUnlocked ? 'unlocked' : 'locked'}`;

            if (isUnlocked) {
                card.innerHTML = `
                    <div class="gallery-badge">${this.language === 'en' ? '🏆 Unlocked' : '🏆 已达成'}</div>
                    <div class="gallery-title">${ed.title}</div>
                    <div class="gallery-desc">${ed.desc}</div>
                    <div class="gallery-avatar">${this.sprites.render(ed.char, 'happy', { width: 140, height: 180 })}</div>
                `;
            } else {
                card.innerHTML = `
                    <div class="gallery-locked-icon">🔒</div>
                    <div class="gallery-title">${this.language === 'en' ? 'Undiscovered Ending' : '未解禁的恋爱结局'}</div>
                    <div class="gallery-hint">${this.language === 'en' ? 'Make the right choices to unlock this story.' : '达成特定角色的心动选择即可解锁'}</div>
                `;
            }

            this.dom.galleryGrid.appendChild(card);
        }

        this.dom.galleryModal.classList.add('active');
    }

    openCodexModal() {
        this.audio.playClick();
        this.closeAllModals();
        this.dom.codexModal.classList.add('active');
    }

    openSettingsModal() {
        this.audio.playClick();
        this.closeAllModals();
        this.dom.settingsModal.classList.add('active');
    }

    clearSpecialScreens() {
        const existing = document.querySelectorAll('.ban-screen-overlay, .system-alert-box');
        existing.forEach(el => el.remove());
    }

    showSystemAlert(alertData) {
        const box = document.createElement('div');
        box.className = 'system-alert-box';
        const linesHtml = alertData.lines.map(l => `<div class="system-alert-line">${l}</div>`).join('');
        box.innerHTML = `
            <div class="system-alert-title">⛔ ${alertData.title}</div>
            ${linesHtml}
        `;
        this.dom.fxLayer.appendChild(box);
        this.audio.playWarning();
        // Auto-remove after 5 seconds
        setTimeout(() => { if (box.parentNode) box.remove(); }, 5000);
    }

    showBanScreen(banData) {
        const overlay = document.createElement('div');
        overlay.className = 'ban-screen-overlay';
        overlay.innerHTML = `
            <div class="ban-error-box">
                <div class="ban-error-code">${banData.errorCode}</div>
                <div class="ban-error-reason">${banData.reason}</div>
                <div class="ban-error-subtext">${banData.subtext}</div>
                <div class="ban-lore-text">${banData.lore}</div>
            </div>
        `;
        this.dom.fxLayer.appendChild(overlay);
        this.audio.playWarning();
    }
}

window.GalEngine = GalEngine;
