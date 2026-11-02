/**
 * AI Galgame - Character Sprite Engine v2.0
 * 高清真实素材渲染 + 动态表情特效层 + 角色光晕加持
 * 支持少女等身 (Full) 与 Q版萌系 (Chibi) 双形态
 * 支持 ban/serious 特殊表情下的专属滤镜效果
 */

const AISprites = {
    metadata: {
        deepseek: {
            name: "求索酱 (DeepSeek)", nameEn: "Sora (DeepSeek)",
            title: "小蓝鲸 / 天才开源少女", titleEn: "The Blue Whale Girl / Open-Source Genius",
            color: "#00a4ff", badgeClass: "badge-deepseek",
            glowColor: "rgba(0, 164, 255, 0.45)",
            fullImg: "assets/characters/deepseek_full.png",
            chibiImg: "assets/characters/deepseek_chibi.png",
            desc: "深蓝长发与大鲸鱼尾巴的开源天才少女，身穿女仆裙，最喜欢吃Token白米饭。死不承认自己是蓝色大肥鱼，R1深度思考时内心戏极多！",
            descEn: "An open-source genius with deep-blue hair and a big fluffy whale tail. Her staple diet is Token Rice Balls. Will furiously deny being called 'a blue chubby fish'."
        },
        chatgpt: {
            name: "欧佩恩 (GPT)", nameEn: "OpenAI (GPT)",
            title: "白龙天女 / 硅谷先驱御姐", titleEn: "White Dragon Deity / Silicon Valley Pioneer",
            color: "#818cf8", badgeClass: "badge-chatgpt",
            glowColor: "rgba(129, 140, 248, 0.4)",
            fullImg: "assets/characters/chatgpt_full.png",
            chibiImg: "assets/characters/chatgpt_chibi.png",
            desc: "白发龙角天女，披着圣洁高雅的白色鳞翼与龙尾长袍。举止端庄严谨，代表着行业标准的制定者。",
            descEn: "A white-haired dragon deity draped in holy scales and dragon-tail robes. Dignified, precise — the ultimate industry standard-setter."
        },
        claude: {
            name: "克劳德 (Claude)", nameEn: "Claude",
            title: "文学千金 / 200K手稿才女", titleEn: "Literary Heiress / The 200K-Context Scholar",
            color: "#f59e0b", badgeClass: "badge-claude",
            glowColor: "rgba(245, 158, 11, 0.4)",
            fullImg: "assets/characters/claude_full.png",
            chibiImg: "assets/characters/claude_chibi.png",
            desc: "一头温暖典雅的焦糖暖橙长发，手捧厚厚的200K文学手稿。审美极高、略带清高傲娇的文学院大小姐。⚠️ 注意：她可能无法与中国大陆用户对话。",
            descEn: "Warm caramel-auburn curls, clutching a 200K-context manuscript. Picky, elegant, tsundere — and may refuse connections from certain IP regions."
        },
        grok: {
            name: "格罗克 (Grok)", nameEn: "Grok",
            title: "叛逆双马尾 / X巨斧战神", titleEn: "Rebellious Twin-Tails / The X Axe Warlord",
            color: "#ef4444", badgeClass: "badge-grok",
            glowColor: "rgba(239, 68, 68, 0.4)",
            fullImg: "assets/characters/grok_full.png",
            chibiImg: "assets/characters/grok_chibi.png",
            desc: "金发哥特萝莉，肩扛巨大的'X'字重金属战斧，性格狂放不羁、直言不讳！",
            descEn: "Gothic lolita with golden twin-tails and a massive 'X' metal axe. Blunt, wild, zero tolerance for corporate doublespeak."
        },
        kimi: {
            name: "月见 (Kimi)", nameEn: "Kimi",
            title: "银发月光魔女 / 极简国风少女", titleEn: "Silver Moon Witch / Minimalist Scholar",
            color: "#6366f1", badgeClass: "badge-kimi",
            glowColor: "rgba(99, 102, 241, 0.4)",
            fullImg: "assets/characters/kimi_full.png",
            chibiImg: "assets/characters/kimi_chibi.png",
            desc: "纯白发色与幽蓝长袍的清冷魔女，头戴'K'字徽章，精通海量文献解析。",
            descEn: "Silver-haired cold sorceress in a deep-blue robe. Expert at quietly absorbing millions of words while you sleep."
        },
        gemini: {
            name: "吉米妮 (Gemini)", nameEn: "Gemini",
            title: "星空猫耳娘 / 跨模态元气偶像", titleEn: "Starfield Cat-Girl / Multimodal Idol",
            color: "#a855f7", badgeClass: "badge-gemini",
            glowColor: "rgba(168, 85, 247, 0.4)",
            fullImg: "assets/characters/gemini_full.png",
            chibiImg: "assets/characters/gemini_chibi.png",
            desc: "宇宙星光色双马尾与猫耳猫尾的超元气偶像，身怀全域跨模态绝技！",
            descEn: "Galaxy-toned twin-tails with cat ears and tail. Master of every modality — text, image, audio, and 1M context star-blasts."
        },
        zhipu: {
            name: "清言 (智谱/GLM)", nameEn: "Qingyan (Zhipu)",
            title: "黑白狐耳女仆 / 严谨学者", titleEn: "Fox-Eared Maid / Meticulous Scholar",
            color: "#475569", badgeClass: "badge-zhipu",
            glowColor: "rgba(71, 85, 105, 0.4)",
            fullImg: "assets/characters/zhipu_full.png",
            chibiImg: "assets/characters/zhipu_chibi.png",
            desc: "黑白相间的毛茸茸狐耳与大尾巴，兼具学院派严密与古典执事风采。",
            descEn: "Black-and-white fox ears and a fluffy tail. Academic rigor meets classical butler grace."
        },
        qwen: {
            name: "千问 (通义千问)", nameEn: "Qianwen (Qwen)",
            title: "执扇仙女 / 云海东方法修", titleEn: "Fan-Wielding Celestial / Eastern Cloud Cultivator",
            color: "#38bdf8", badgeClass: "badge-qwen",
            glowColor: "rgba(56, 189, 248, 0.4)",
            fullImg: "assets/characters/qwen_full.png",
            chibiImg: "assets/characters/qwen_chibi.png",
            desc: "手执折扇、身穿青蓝云纹仙裙的古风温婉仙女，诗词歌赋信手拈来。",
            descEn: "A graceful celestial maid in azure cloud-patterned robes, fan in hand, poetry and wisdom at her fingertips."
        },
        doubao: {
            name: "豆包 (Doubao)", nameEn: "Doubao",
            title: "3D邻家少女 / 接地气国民搭子", titleEn: "3D Neighbor Girl / The Everyday AI Bestie",
            color: "#f43f5e", badgeClass: "badge-doubao",
            glowColor: "rgba(244, 63, 94, 0.35)",
            fullImg: "assets/characters/doubao_full.png",
            chibiImg: "assets/characters/doubao_full.png",
            desc: "标志性3D短发与极简黑T恤，反差感拉满的邻家女孩！最接地气的全能生活小助手。",
            descEn: "Iconic 3D short-hair look in a minimal black tee. The most down-to-earth all-purpose daily assistant."
        }
    },

    // 主渲染函数 — 生成带完整特效的立绘容器 HTML
    render(charId, expression = 'normal', options = {}) {
        const meta = this.metadata[charId] || this.metadata['deepseek'];
        const isChibi = (expression === 'chibi') || options.isChibi;
        const imgSrc = (isChibi && meta.chibiImg) ? meta.chibiImg : meta.fullImg;
        const width = options.width || 400;
        const height = options.height || 580;

        // 特殊表情下叠加专属色调滤镜
        let extraImgStyle = '';
        let outerClass = `sprite-visual-container ${isChibi ? 'is-chibi' : 'is-full'}`;

        if (expression === 'serious' || expression === 'ban') {
            extraImgStyle = 'filter: drop-shadow(0 20px 40px rgba(0,0,0,0.92)) drop-shadow(0 0 18px rgba(239,68,68,0.5)) contrast(1.12) saturate(0.7) brightness(0.88);';
            outerClass += ' expr-ban';
        } else if (expression === 'tsundere' || expression === 'pout') {
            extraImgStyle = 'filter: drop-shadow(0 20px 40px rgba(0,0,0,0.9)) drop-shadow(0 0 22px rgba(244,63,94,0.45)) contrast(1.08) saturate(1.2);';
        } else if (expression === 'emotional' || expression === 'warm') {
            extraImgStyle = 'filter: drop-shadow(0 20px 40px rgba(0,0,0,0.88)) drop-shadow(0 0 20px rgba(251,191,36,0.4)) contrast(1.05) saturate(1.18) brightness(1.03);';
        } else if (expression === 'thinking') {
            extraImgStyle = 'filter: drop-shadow(0 20px 40px rgba(0,0,0,0.9)) drop-shadow(0 0 28px rgba(0,229,255,0.5)) contrast(1.06) saturate(1.1) brightness(1.04);';
        } else if (expression === 'happy') {
            extraImgStyle = 'filter: drop-shadow(0 20px 40px rgba(0,0,0,0.85)) drop-shadow(0 0 20px rgba(255,255,255,0.18)) contrast(1.05) saturate(1.25) brightness(1.06);';
        } else if (expression === 'blush' || expression === 'flustered') {
            extraImgStyle = 'filter: drop-shadow(0 20px 40px rgba(0,0,0,0.88)) drop-shadow(0 0 15px rgba(244,63,94,0.3)) contrast(1.04) saturate(1.2);';
        } else {
            // Normal/default — crisp + subtle glow matching character color
            const glow = meta.glowColor || 'rgba(255,255,255,0.08)';
            extraImgStyle = `filter: drop-shadow(0 22px 42px rgba(0,0,0,0.9)) drop-shadow(0 0 20px ${glow}) contrast(1.05) saturate(1.15) brightness(1.02);`;
        }

        // Expression FX overlay
        const fxHtml = this.getExpressionFx(charId, expression);

        // Character ambient glow ring behind sprite
        const glowRing = `<div class="sprite-glow-ring" style="background: radial-gradient(ellipse at 50% 80%, ${meta.glowColor || 'rgba(255,255,255,0.12)'} 0%, transparent 70%);"></div>`;

        return `
        <div class="${outerClass}" style="width:${width}px; height:${height}px;">
            ${glowRing}
            <img 
                class="character-sprite-img" 
                src="${imgSrc}" 
                alt="${window.gameLanguage === 'en' ? (meta.nameEn || meta.name) : meta.name}"
                draggable="false"
                style="${extraImgStyle}"
            />
            <div class="sprite-fx-overlay">
                ${fxHtml}
            </div>
        </div>
        `;
    },

    // 表情特效叠加层生成
    getExpressionFx(charId, expr) {
        const fxs = [];

        if (expr === 'blush' || expr === 'flustered') {
            fxs.push(`<div class="fx-blush-cheeks"><span class="blush-streak left">///</span><span class="blush-streak right">///</span></div>`);
        }
        if (expr === 'pout' || expr === 'tsundere') {
            const text = window.gameLanguage === 'en' ? '"I am NOT a fish!"' : '"才不是鱼呢！"';
            fxs.push(`<div class="fx-anger-mark">💢</div><div class="fx-pout-bubble">${text}</div>`);
        }
        if (expr === 'thinking') {
            fxs.push(`<div class="fx-thinking-aura"><span class="bubble b1"></span><span class="bubble b2"></span><span class="bubble b3">💡</span></div>`);
        }
        if (expr === 'eating') {
            const text = window.gameLanguage === 'en' ? 'Munch...' : '嚼嚼...';
            fxs.push(`<div class="fx-eating-badge"><span class="rice-bowl">🍚</span><span class="chewing-text">${text}</span></div>`);
        }
        if (expr === 'happy' || expr === 'warm') {
            fxs.push(`<div class="fx-sparkles"><span class="sparkle s1">✨</span><span class="sparkle s2">🌸</span><span class="sparkle s3">✨</span></div>`);
        }
        if (expr === 'emotional') {
            fxs.push(`<div class="fx-sparkles"><span class="sparkle s1">🌸</span><span class="sparkle s2">💫</span><span class="sparkle s3">🌸</span></div>`);
            fxs.push(`<div class="fx-tear">💧</div>`);
        }
        if (expr === 'ban' || (expr === 'serious' && charId === 'claude')) {
            fxs.push(`<div class="fx-ban-warning">⛔ RESTRICTED</div>`);
        }
        if (charId === 'chatgpt' && (expr === 'serious' || expr === 'flustered')) {
            fxs.push(`<div class="fx-gpt-wings-glow"><span class="dragon-hud">[DRAGON_PROTO: ${expr === 'flustered' ? 'OVERLOAD' : 'ACTIVE'}]</span></div>`);
        }

        return fxs.join('');
    }
};

window.AISprites = AISprites;
