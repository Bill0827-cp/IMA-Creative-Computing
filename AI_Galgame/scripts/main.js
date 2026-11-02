/**
 * AI Galgame - Main Entrypoint & UI Bindings
 * 管理主菜单切换、角色图鉴交互、设置面板与全局初始化
 */

document.addEventListener('DOMContentLoaded', () => {
    window.gameLanguage = localStorage.getItem('ai_gal_language') === 'en' ? 'en' : 'zh';
    window.applyGameInterfaceLanguage(window.gameLanguage);

    // 实例化引擎
    const engine = new GalEngine(
        window.getLocalizedGalGameData(window.gameLanguage),
        window.galAudio,
        window.AISprites
    );
    engine.init();

    // DOM 元素引用
    const screenTitle = document.getElementById('title-screen');
    const screenStage = document.getElementById('game-stage');
    
    // 主菜单按钮
    const btnStartGame = document.getElementById('btn-start-game');
    const btnContinueGame = document.getElementById('btn-continue-game');
    const btnGallery = document.getElementById('btn-gallery');
    const btnCodex = document.getElementById('btn-codex');
    const btnSettings = document.getElementById('btn-settings');
    const btnExitToTitle = document.getElementById('btn-exit-title');
    const languageButtons = document.querySelectorAll('.language-toggle');

    languageButtons.forEach(button => {
        button.addEventListener('click', () => {
            window.galAudio.playClick();
            engine.setLanguage(engine.language === 'en' ? 'zh' : 'en');
        });
    });

    // 弹窗通用关闭按钮
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.galAudio.playClick();
            engine.closeAllModals();
        });
    });

    // 模态背景点击关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                engine.closeAllModals();
            }
        });
    });

    // ==========================================
    // 主菜单操作
    // ==========================================

    // 首次交互播放标题音乐 (适配浏览器音频自动播放策略)
    document.body.addEventListener('click', () => {
        window.galAudio.ensureContext();
        if (!window.galAudio.isPlayingBgm && screenTitle.classList.contains('active')) {
            window.galAudio.playBgm('title');
        }
    }, { once: true });

    // 开始新游戏
    btnStartGame.addEventListener('click', () => {
        window.galAudio.playClick();
        screenTitle.classList.remove('active');
        screenStage.classList.add('active');

        // 重置好感度与状态
        engine.affection = { deepseek: 0, chatgpt: 0, claude: 0 };
        engine.backlog = [];
        engine.updateAffectionUI();

        // 启动序章
        engine.goToScene('start');
    });

    // 继续游戏 (打开读档)
    btnContinueGame.addEventListener('click', () => {
        engine.openLoadModal();
    });

    // 打开图鉴与画廊
    btnGallery.addEventListener('click', () => {
        engine.openGalleryModal();
    });

    // 角色图鉴档案
    btnCodex.addEventListener('click', () => {
        engine.openCodexModal();
        initCodexViewer();
    });

    // 打开设置
    btnSettings.addEventListener('click', () => {
        engine.openSettingsModal();
    });

    // 返回标题画面
    btnExitToTitle.addEventListener('click', () => {
        window.galAudio.playClick();
        const confirmMessage = engine.language === 'en'
            ? 'Return to the title screen? Unsaved progress will be lost.'
            : '确认返回主菜单吗？未保存的进度将会丢失。';
        if (confirm(confirmMessage)) {
            screenStage.classList.remove('active');
            screenTitle.classList.add('active');
            window.galAudio.playBgm('title');
            engine.toggleAutoPlay(false);
            engine.toggleSkipMode(false);
        }
    });

    // ==========================================
    // 设置面板交互
    // ==========================================
    const sliderBgm = document.getElementById('slider-bgm');
    const sliderSe = document.getElementById('slider-se');
    const sliderSpeed = document.getElementById('slider-speed');
    const toggleMuteBtn = document.getElementById('toggle-mute');

    if (sliderBgm) {
        sliderBgm.addEventListener('input', (e) => {
            window.galAudio.setBgmVolume(parseFloat(e.target.value));
        });
    }

    if (sliderSe) {
        sliderSe.addEventListener('input', (e) => {
            window.galAudio.setSeVolume(parseFloat(e.target.value));
        });
    }

    if (sliderSpeed) {
        sliderSpeed.addEventListener('input', (e) => {
            // 滑块值越大打字越快：倒数计算
            const val = parseInt(e.target.value);
            engine.typeSpeed = Math.max(10, 60 - val);
        });
    }

    if (toggleMuteBtn) {
        toggleMuteBtn.addEventListener('click', () => {
            const isMuted = window.galAudio.toggleMute();
            if (engine.language === 'en') {
                toggleMuteBtn.textContent = isMuted ? "🔇 Unmute All" : "🔊 Mute All";
            } else {
                toggleMuteBtn.textContent = isMuted ? "🔇 取消静音" : "🔊 静音全开";
            }
            toggleMuteBtn.classList.toggle('muted', isMuted);
        });
    }

    // ==========================================
    // 角色档案室 (Codex) 交互与表情试衣间
    // ==========================================
    let currentCodexChar = 'deepseek';
    let currentCodexExpr = 'normal';
    let currentCodexForm = 'full'; // 'full' 或 'chibi'

    function initCodexViewer() {
        const previewContainer = document.getElementById('codex-sprite-preview');
        const charTabs = document.querySelectorAll('.codex-char-tab');
        const exprButtons = document.querySelectorAll('.codex-expr-btn');
        const formButtons = document.querySelectorAll('.codex-form-btn');

        function updateCodexDisplay() {
            if (!previewContainer) return;
            const isChibi = currentCodexForm === 'chibi';
            previewContainer.innerHTML = window.AISprites.render(currentCodexChar, currentCodexExpr, { 
                width: 320, 
                height: 480,
                isChibi: isChibi 
            });

            // 更新文本描述
            document.querySelectorAll('.codex-profile-card').forEach(card => {
                card.classList.toggle('active', card.dataset.char === currentCodexChar);
            });
        }

        charTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                window.galAudio.playClick();
                charTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentCodexChar = tab.dataset.char;
                updateCodexDisplay();
            });
        });

        formButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                window.galAudio.playClick();
                formButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCodexForm = btn.dataset.form;
                updateCodexDisplay();
            });
        });

        exprButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                window.galAudio.playClick();
                exprButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCodexExpr = btn.dataset.expr;
                updateCodexDisplay();
            });
        });

        updateCodexDisplay();
    }
});
