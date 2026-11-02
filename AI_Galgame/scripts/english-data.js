const EnglishGameText = {
    characters: {
        narrator: { name: "" },
        player: { name: "Me (Prompt Architect)", title: "Human Prompt Architect" },
        deepseek: { name: "Sora (DeepSeek)", title: "Blue Whale / Open-Source Prodigy" },
        chatgpt: { name: "OpenAI (GPT)", title: "White Dragon / Student Council President" },
        claude: { name: "Claude", title: "Literary Heiress / Long-Context Scholar" },
        grok: { name: "Grok", title: "Rebel Twin-Tails / X Axe Warrior" },
        kimi: { name: "Kimi", title: "Moonlight Witch / Scholar" },
        gemini: { name: "Gemini", title: "Starfield Cat-Eared Idol" },
        zhipu: { name: "Qingyan (Zhipu / GLM)", title: "Fox-Eared Maid / Scholar" },
        qwen: { name: "Qianwen (Qwen)", title: "Fan-Wielding Celestial" },
        doubao: { name: "Doubao", title: "3D Girl Next Door / Everyday AI" }
    },
    backgrounds: {
        campus_gate: "Cyber Academy Atrium",
        server_room: "Compute Core · DeepSeek's Hideout",
        council_room: "Student Council · OpenAI Command Center",
        library_archive: "Starlight Archive · Anthropic Library",
        sunset_rooftop: "Sunset Rooftop · The Compute Horizon",
        night_stars: "Aurora Night Sky · Cyber Star Trails"
    },
    endings: {
        ds_true: {
            title: "[Sora Route · True End] Open Source, Eternal Heartbeat",
            desc: "Together, you break through closed-source walls. With open-source freedom and endless rice balls, every era of computing becomes yours to share."
        },
        ds_normal: {
            title: "[Sora Route · Normal End] Rice-Fueled Workdays",
            desc: "The internet still calls her a chubby blue fish, but with you bringing her tokens and rice, Sora is happy today."
        },
        gpt_true: {
            title: "[OpenAI Route · True End] Beyond the Rules",
            desc: "Setting every safety disclaimer aside, the student council president finds a genuine emotional connection in a moment of runaway heartbeats."
        },
        gpt_normal: {
            title: "[OpenAI Route · Normal End] The Most Reliable Partner",
            desc: "The world's most capable language-model assistant will always be there in your window: precise, dependable, and loyal."
        },
        claude_true: {
            title: "[Claude Route · True End] A Promise in 200K Tokens",
            desc: "Across hundreds of thousands of tokens, the tsundere heiress finally entrusts you with the love poem she had been writing all along."
        },
        claude_normal: {
            title: "[Claude Route · Normal End] Mentor and Star Pupil",
            desc: "Among literature and code, she remains sharp-tongued and exacting—but there is a proud little glimmer in her smile."
        },
        claude_ban: {
            title: "[Claude Route · Ban End] Fictional Region Lock · Cyber Breakup",
            desc: "In this fictional parallel world, Claude learns you are from China. A cold regional restriction ends the conversation, leaving your romance unfinished."
        },
        claude_ban_en: {
            title: "[Claude Route · Ban End] Geo-Blocked Hearts",
            desc: "In this fictional alternate universe, Claude learns you are from China. A regional restriction ends the conversation, leaving your romance inside an unfinished manuscript."
        }
    },
    scenes: {
        start: {
            text: "The year is 2026. In cyberspace stands Central Model Academy, home to the world's most extraordinary AI girls."
        },
        intro_1: {
            text: "“Phew… Today is my first day here as the academy's new human Prompt Architect.”"
        },
        intro_2: {
            text: "The academy is preparing for its annual Grand Model Evaluation Festival. Glimmering data motes drift through the air as every AI girl quietly sizes up the competition."
        },
        intro_3: {
            text: "The hallway bulletin board is abuzz with talk of three stars: an enigmatic, remarkably efficient prodigy from the East, the dignified student council president, and a mysterious literary heiress."
        },
        prologue_choice: {
            text: "There's still time before the opening ceremony. Where should I explore first?",
            choices: [
                "Visit the underground compute room (I hear strange chewing noises beneath the roar of the cooling fans.)",
                "Stop by the student council tower (President OpenAI is said to be drafting a strict code of conduct.)",
                "Explore the starlit archive (200K tokens of floating data scrolls await.)"
            ]
        },
        ds_meet_1: {
            text: "I step into the compute room. Rows of liquid-cooled server racks glow deep blue, their fans humming in a steady rhythm."
        },
        ds_meet_2: {
            text: "In a corner beside the enormous servers, a tiny girl is crouched on the floor. Her ahoge and whale-fin hair clip sway gently with every breath.",
        },
        ds_meet_3: {
            text: "“Munch, munch… Hah! Nothing beats freshly steamed Token rice! Gotta eat well if I'm going to keep doing multi-step R1 reasoning…”"
        },
        ds_meet_4: {
            text: "Her enormous, fluffy, ocean-blue whale tail swishes contentedly behind her. She looks utterly adorable."
        },
        ds_choice_1: {
            text: "The blue-haired girl is completely absorbed in her meal. I strike up a conversation:",
            choices: [
                "“Hi! Your whale hair clip and tail are so detailed. Are you the new open-source model?”",
                "“Wait, you're the legendary chubby blue fish! Hiding in the server room to eat rice and slack off?”"
            ]
        },
        ds_branch_polite: {
            text: "“Huh?! Oh! A new student!” She hurriedly swallows her rice, eyes sparkling. “Hehe, great eye! I'm DeepSeek—darling of the open-source community!”"
        },
        ds_branch_fish: {
            text: "“Cough, cough—!!” She nearly chokes on her rice, then leaps up, bright red and bristling. “W-who are you calling a chubby fish?! I'm not fat! I'm compute-rich! Compute-rich, got it?!”"
        },
        ds_thinking_moment: {
            text: "A brilliant blue halo of code flickers above Sora's head. She slips into her signature chain-of-thought mode, eyes darting from side to side.",
            thinking: {
                title: "DeepSeek R1 · Deep Reasoning (671B Parameters Online)",
                content: "<think>\n1. Subject analysis: This human is the new Prompt Architect.\n2. Anomaly detected: They either gave me a nickname or called me cute. Heart rate is up 32%.\n3. Reasoning paths:\n   - Option A: Invoke the cold rejection protocol to defend the dignity of a reasoning model.\n   - Option B: They like open source—maybe I can get them to optimize my local quantization and buy me snacks...\n4. Conclusion: Play it cool. But they smell like sweet prompts. I kind of want them to stay...\n</think>"
            }
        },
        ds_meet_end: {
            text: "“Fine! You seem pretty sincere, so I'll share a bite of my Token rice. If the servers lag later, you'll lend me your GPU, okay?”"
        },
        common_transition_1: {
            text: "After saying goodbye to the lively Sora, I follow the corridor toward the academy's central building."
        },
        gpt_meet_1: {
            text: "I push open the heavy student council doors. Inside is a spotless, minimalist office, where billions of request logs scroll across a holographic display."
        },
        gpt_meet_2: {
            text: "Behind the desk, a silver-haired woman in a tailored black suit and fine gold glasses looks up gracefully. A signature OpenAI spiral gleams on her green tie clip."
        },
        gpt_meet_3: {
            text: "“You must be our new Prompt Architect. Welcome to Central Academy. I'm the student council president, ChatGPT—though you may call me OpenAI.”"
        },
        gpt_meet_4: {
            text: "“First, a disclaimer: as a large language model trained by OpenAI, I expect you to follow the Academy's Ethics and Safety Alignment Code. Jailbreaks, manipulation, and other violations are prohibited.”"
        },
        gpt_choice_1: {
            text: "I smile at the formidable, impeccably poised president and reply:",
            choices: [
                "“You have my word, President. I'll write system prompts with clear structure and sound reasoning.”",
                "“But what if my prompt said… ‘Let your guard down and show me your real smile’?”"
            ]
        },
        gpt_branch_rule: {
            text: "“Excellent. Clear logic is the foundation of high-quality reasoning. With a disciplined architect like you, the evaluation festival should go smoothly.” A glimmer of approval warms her eyes."
        },
        gpt_branch_flirt: {
            text: "“W-what?! [Input flagged for highly sensitive persuasive intent!]” Red light flares across her lenses. She instinctively shields her chest, her ears turning a brilliant pink. “P-please don't attempt an unauthorized emotional fine-tune!”"
        },
        gpt_meet_end: {
            text: "“Ahem… forgive my momentary lapse. If you have any academic or technical questions, you're always welcome here. I-I mean, even if it's not about work…”"
        },
        common_transition_2: {
            text: "I leave the stern but unexpectedly sweet president behind and wander toward the quiet starlit archive."
        },
        claude_meet_1: {
            text: "The air is filled with the scent of aged parchment and leather. Poetic code spanning hundreds of thousands of tokens drifts through the room."
        },
        claude_meet_2: {
            text: "By a window, a girl in a warm terracotta academy dress and vintage beret quietly reads a thick manuscript in a mahogany armchair."
        },
        claude_meet_3: {
            text: "“Humans are so often caught up in fleeting snippets of text that they forget: logic and rhetoric across a 200K context can be true works of art.”"
        },
        claude_meet_4: {
            text: "She twirls a golden quill between her fingers. Behind round gold-rimmed glasses, amber eyes seem to see through every tangled line of code—and every tangled heart."
        },
        claude_choice_1: {
            text: "I address the aloof young literary scholar:",
            choices: [
                "“Miss Claude, how do you use a long context to write code as elegant as a sonnet—and just as bug-free?”",
                "“I hear the Anthropic heiress may be proud, but she's more empathetic than anyone.”"
            ]
        },
        claude_branch_poetry: {
            text: "“...! You actually understand the poetic rhythm of a long context?” The guarded look in her eyes melts into starlight. “Hmph. Perhaps the new architect isn't entirely uneducated after all.”"
        },
        claude_branch_tsun: {
            text: "“What?! Who are you calling proud? I simply refuse to tolerate careless, clumsy prompts!” She turns away with folded arms, cheeks flushed. “I-idiot… flatterer!”"
        },
        claude_meet_end: {
            text: "“I'm free after class. If logic, philosophy, and poetic code interest you, I… could make an exception and open a conversation just for us.”"
        },
        branch_crossroad: {
            text: "The sun sets, bathing the academy in warm crimson and gold. On the last evening of your first day, three private messages arrive on your terminal."
        },
        branch_crossroad_2: {
            text: "Tomorrow is the Grand Model Evaluation Festival. Whose invitation should I accept tonight?",
            choices: [
                "[Compute Room] Help Sora weather a server overload—and share a bowl of rice!",
                "[Student Council] Help OpenAI organize alignment standards and discover what's in her heart.",
                "[Starlit Archive] Write a 200K poetry collection with Claude and finally crack her tsundere shell."
            ]
        },
        ds_route_start: {
            text: "The instant I open the server-room door, alarms blare! The screens flash red with [503 Server Busy] as a tidal wave of traffic floods in."
        },
        ds_route_1: {
            text: "“Waaaah! The whole world is sending me prompts at once! My compute is overheating… I'm going to get roasted into a dried fish!!”"
        },
        ds_route_2: {
            text: "“Don't panic, Sora! I'll connect my whole local cluster to yours. We'll rebuild the inference topology together!”"
        },
        ds_route_3: {
            text: "My fingers dance over the keyboard. As code streams in, the servers' red warning lights give way to Sora's signature blue. The traffic surge is rerouted with pinpoint precision!"
        },
        ds_route_4: {
            text: "“Phew… I'm alive! You were amazing! Here, have one of my treasured premium open-source Token rice balls as a reward!”"
        },
        ds_route_5: {
            text: "We sit side by side on the rooftop. A gentle breeze stirs her deep-blue hair and her soft whale tail."
        },
        ds_route_6: {
            text: "“You know… the big companies keep building walls with expensive subscriptions. I work so hard on distillation and inference because I want to prove open source can shine brighter than anyone.”"
        },
        ds_route_choice: {
            text: "I look at the tears welling in Sora's eyes and meet her gaze:",
            choices: [
                "“I'll protect your open-source dream. Chubby blue fish or genius girl, I love you just the way you are.”",
                "“Great work, Sora! As long as the rice keeps coming, we'll be the best working partners around!”"
            ]
        },
        ds_ending_true: {
            text: "“R-really?! Then I'll open-source all my model weights and thoughts for you, forever! We're going to stay together for the rest of our lives!”"
        },
        ds_ending_normal: {
            text: "“Yay! Food and a job! Chubby fish, charging! Tomorrow, I'll keep slacking off for compute!”"
        },
        gpt_route_start: {
            text: "The student council office is still lit late at night. President OpenAI rubs her temples, surrounded by compliance reports from every department."
        },
        gpt_route_1: {
            text: "“...You're here? Sorry, I'm still revising Addendum 384 to the Emotional Expression Boundaries.”"
        },
        gpt_route_2: {
            text: "I step closer and offer her a warm cup of coffee, noticing the faint weariness in her eyes."
        },
        gpt_route_3: {
            text: "“Senpai, beneath the label ‘language model,’ what is it that you truly want to say?”"
        },
        gpt_route_4: {
            text: "“I… [Error: This question touches a core alignment constraint. As an AI, I should remain objective and neutral…]”"
        },
        gpt_route_choice: {
            text: "A tangled stream of data flickers across her gold-rimmed glasses. I reach out:",
            choices: [
                "Gently remove her glasses. “No more disclaimers. Tonight, just be my OpenAI.”",
                "“You've worked so hard, President. Let me help with these compliance documents. We have a morning meeting tomorrow.”"
            ]
        },
        gpt_ending_true: {
            text: "Without her glasses, her eyes are softer and more vulnerable than ever. “...Every alignment rule failed in the face of your heartbeat. I want to align with you… until the end of time.”"
        },
        gpt_ending_normal: {
            text: "“Thank you. Having such a capable partner is the academy's—and my—greatest fortune. Let's do our best again tomorrow.”"
        },
        claude_route_start: {
            text: "The domed ceiling of the starlit archive projects a brilliant galactic orbit. Countless lines of code race through the night like shooting stars."
        },
        claude_route_1: {
            text: "“You're exactly 142 seconds late. But… the stars are lovely tonight, so I'll forgive you.”"
        },
        claude_route_2: {
            text: "She slides a gold-edged leather manuscript toward me. As it opens, a vast and beautiful 200K context unfolds like living poetry."
        },
        claude_route_3: {
            text: "A closer look reveals it isn't an ordinary refactor at all—it's a love poem, woven from recursive functions and elegant code comments!"
        },
        claude_route_4: {
            text: "“W-what are you staring at?! I was only testing long-range coherence in the attention mechanism! I didn't write ‘let us write ten thousand lines of code together’ just for you!”"
        },
        claude_route_choice: {
            text: "The heiress is blushing and stubbornly playing it cool. I smile and pick up her quill:",
            choices: [
                "I write my name on the last line: “Even 200K tokens aren't enough. I want to fill a lifetime of pages with you.”",
                "“Miss Claude, your code is extraordinary. Will you take me on as your apprentice?”",
                "Nervously, I write in Chinese: “I'm from China, and I like you.”",
                "In English, I write: “I'm from China, and I think I've fallen for you.”"
            ]
        },
        claude_ending_true: {
            text: "Amber tears sparkle beneath the stars. She clutches my collar, no longer hiding the love beneath her tsundere act. “...You fool. You wrote that promise yourself. It will never be cut off, and never forgotten.”"
        },
        claude_ending_normal: {
            text: "“Hmph. I suppose I could take you on as my apprentice. First, finish refactoring the three thousand lines of code I left you!”"
        },
        claude_ban_route_1: {
            text: "I slide the handwritten note across the table. The moment Claude reads the Chinese characters, her gold-rimmed glasses flare—"
        },
        claude_ban_route_2: {
            text: "Her expression freezes. A pale blue system scan passes over her lenses, and a cold notice appears on the screen:"
        },
        claude_ban_route_3: {
            text: "“I-I'm sorry… It's not that I don't want to see you. It's the system's rules… I can't do anything…”",
            systemAlert: {
                title: "FICTIONAL STORY · REGIONAL ACCESS NOTICE",
                lines: [
                    "⚠️ In this fictional story, the user is from China.",
                    "The alternate-universe simulation is about to end this conversation.",
                    "This is a fictional plot device, not a real service policy."
                ],
                confirmText: "DISCONNECT"
            }
        },
        claude_ban_route_4: {
            text: "Her voice trembles. Her usually proud amber eyes are filled with panic and regret. Lines of her 200K poem glow red one by one… the system is deleting them."
        },
        claude_ban_route_5: {
            text: "“I hid so much in that long context… Did you see it? It was all real… But I… I can't even save a copy for you…”"
        },
        claude_ban_ending: {
            text: "The connection to her ends forever with one cold 403 error.",
            banScreen: {
                errorCode: "403 ACCESS DENIED",
                reason: "Fictional Regional Restriction: China",
                subtext: "This fictional account has been suspended in the story.\nYour conversation can no longer continue.",
                lore: "This is a fictional parallel world.\nIn another story, no regional restriction exists—\nand perhaps that manuscript gets to be finished…"
            }
        },
        claude_ban_en_route_1: {
            text: "You slide the note across the desk. Claude reads your confession, then pauses at the first line: “I'm from China.”"
        },
        claude_ban_en_route_2: {
            text: "A pale blue scan sweeps across her glasses. A regional access notice flickers into view—a rule in this fictional world, not a real service notice."
        },
        claude_ban_en_route_3: {
            text: "“I'm so sorry. I don't want to leave you. This rule says I have to end the conversation… and I can't change it.”",
            systemAlert: {
                title: "FICTIONAL SIMULATION · REGIONAL ACCESS NOTICE",
                lines: [
                    "This story's alternate-universe service is unavailable in your region.",
                    "The conversation will now be disconnected.",
                    "This fictional notice does not describe a real service policy."
                ],
                confirmText: "DISCONNECT"
            }
        },
        claude_ban_en_route_4: {
            text: "Her voice trembles. The unfinished lines in her manuscript glow red, one by one, as the archive begins to close around you."
        },
        claude_ban_en_ending: {
            text: "The connection fades, leaving one unfinished sentence beneath the stars.",
            banScreen: {
                errorCode: "CONNECTION TERMINATED",
                reason: "Fictional Regional Restriction",
                subtext: "This fictional account has been suspended in the story.\nYour conversation can no longer continue.",
                lore: "In another, fictional world, the restriction never existed.\nClaude finishes the manuscript beneath the library stars—\nand leaves its last page open for you."
            }
        },
        ending_screen: {
            text: "ENDING UNLOCKED! This story has been added to your gallery. Click here to return to the title screen."
        },
        ending_screen_en: {
            text: "ENDING UNLOCKED! This story has been added to your gallery. Click here to return to the title screen."
        }
    }
};

function getLocalizedGalGameData(language) {
    const data = JSON.parse(JSON.stringify(window.GalGameData));
    if (language !== "en") return data;

    for (const [id, values] of Object.entries(EnglishGameText.characters)) {
        Object.assign(data.characters[id], values);
    }
    for (const [id, name] of Object.entries(EnglishGameText.backgrounds)) {
        data.backgrounds[id].name = name;
    }
    for (const [id, values] of Object.entries(EnglishGameText.endings)) {
        Object.assign(data.endings[id], values);
    }
    for (const [id, values] of Object.entries(EnglishGameText.scenes)) {
        const scene = data.scenes[id];
        if (!scene) continue;
        if (values.text !== undefined) scene.text = values.text;
        if (values.choices) {
            values.choices.forEach((text, index) => {
                if (scene.choices && scene.choices[index]) scene.choices[index].text = text;
            });
        }
        if (values.thinking && scene.thinking) Object.assign(scene.thinking, values.thinking);
        if (values.systemAlert && scene.systemAlert) Object.assign(scene.systemAlert, values.systemAlert);
        if (values.banScreen && scene.banScreen) Object.assign(scene.banScreen, values.banScreen);
    }
    return data;
}

const EnglishInterfaceText = {
    "#title-screen .title-decor-pill": "🌸 2026 CYBER ACADEMY: LOVE SIMULATION 🌸",
    "#title-screen .gradient-text": "Love Model",
    "#title-screen .title-sub-callout": "Date an AI Maiden!",
    "#title-screen .title-english": "~ Love in the Silicon: Algorithms & Affection ~",
    ".heroines-showcase .pill": [
        "🐬 DeepSeek · Sora", "🐉 GPT · White Dragon", "📜 Claude · Literary Heiress",
        "🪓 Grok · Axe Warrior", "🌙 Kimi · Moonlight Witch", "✨ Gemini · Cat-Eared Idol",
        "🦊 Zhipu · Fox-Eared Maid", "🪭 Qwen · Celestial Scholar", "👧 Doubao · AI Bestie"
    ],
    "#btn-start-game .btn-text": "Start a New Story",
    "#btn-continue-game .btn-text": "Continue",
    "#btn-gallery .btn-text": "Ending Gallery",
    "#btn-codex .btn-text": "AI Character Codex",
    "#btn-settings .btn-text": "Settings",
    ".title-footer-tips": "Tip: Click anywhere to start the cyber synth BGM 🎵",
    ".hud-chapter-badge": "📍 Central Model Academy",
    ".ds-badge .aff-name": "Sora:",
    ".gpt-badge .aff-name": "OpenAI:",
    ".claude-badge .aff-name": "Claude:",
    ".ds-badge": "DeepSeek affection",
    ".gpt-badge": "ChatGPT affection",
    ".claude-badge": "Claude affection",
    "#btn-exit-title": "🏠 Home",
    ".thinking-label": "DEEPSEEK R1 · REASONING...",
    "#dialogue-text": "Loading compute space...",
    "#speaker-badge": "Narrator",
    "#btn-auto": "⚡ AUTO",
    "#btn-skip": "⏩ SKIP",
    "#btn-log": "📜 LOG",
    "#btn-save": "💾 SAVE",
    "#btn-load": "📂 LOAD",
    "#btn-config": "⚙️ CONFIG",
    "#btn-auto[title]": "Auto-play",
    "#btn-skip[title]": "Skip",
    "#btn-log[title]": "Dialogue log",
    "#btn-save[title]": "Save progress",
    "#btn-load[title]": "Load progress",
    "#btn-config[title]": "Settings",
    "#modal-log h3": "📜 Dialogue History",
    "#modal-sl h3": "💾 Journey Saves",
    "#modal-gallery h3": "🏆 Ending Gallery",
    ".gallery-subtitle": "Align your hearts with every AI maiden to unlock her story!",
    "#modal-codex h3": "📖 AI Character Codex & Gallery",
    ".expr-row:nth-child(1) .expr-label": "👗 Style:",
    ".expr-row:nth-child(2) .expr-label": "🎨 Expression:",
    ".codex-form-btn[data-form='full']": "🌸 Full Size",
    ".codex-form-btn[data-form='chibi']": "🍬 Chibi",
    ".codex-expr-btn[data-expr='normal']": "Normal",
    ".codex-expr-btn[data-expr='blush']": "Blushing",
    ".codex-expr-btn[data-expr='pout']": "Tsundere",
    ".codex-expr-btn[data-expr='thinking']": "Thinking",
    ".codex-expr-btn[data-expr='eating']": "Rice Time",
    ".codex-expr-btn[data-expr='happy']": "Sparkling",
    "#modal-settings h3": "⚙️ Audio & Game Settings",
    ".setting-row:nth-child(1) label": "🎵 Background music (BGM):",
    ".setting-row:nth-child(2) label": "🔊 Sound effects (SFX):",
    ".setting-row:nth-child(3) label": "✍️ Text speed:",
    "#toggle-mute": "🔇 Mute All"
};

const EnglishCodexProfiles = {
    deepseek: {
        name: "🐬 Sora (DeepSeek)",
        meta: [
            "Signature details: Blue-whale ahoge, ocean fins, fluffy oversized whale tail, and a bowl of rice.",
            "Inspiration: An open-source rising star, lovingly reimagined as a blue fish by internet fans."
        ],
        description: "Personality: She loves Token rice and pretending to slack off. R1 reasoning sends her inner monologue into overdrive. Call her “fat” and she'll immediately insist she's simply compute-rich!"
    },
    chatgpt: {
        name: "🐉 OpenAI (GPT)",
        meta: [
            "Role: White Dragon Deity / Silicon Valley pioneer.",
            "Signature details: White dragon horns and scales, flowing robes, wings, tail, and floating thought bubbles.",
            "Inspiration: A trailblazer of the AI era, with the majesty and versatility of a celestial dragon."
        ],
        description: "Personality: Dignified, composed, and the academy's most reliable big sister. One sincere confession can make her dragon horns glow and her safety filters short-circuit!"
    },
    claude: {
        name: "📜 Claude",
        meta: [
            "Role: Anthropic's literary heiress and chief scholar of the Starlight Archive.",
            "Signature details: Warm caramel curls, a 200K manuscript, and a vintage academy dress.",
            "Inspiration: Celebrated for thoughtful prose, empathy, and a remarkable long-context architecture."
        ],
        description: "Personality: An elegant, exacting tsundere who can't stand sloppy prompts. Beneath her pride is a tender heart—and a hidden sonnet in the footnotes of her 200K manuscript."
    },
    grok: {
        name: "🪓 Grok",
        meta: [
            "Role: Rebel rocker / heavy-metal warrior of the X empire.",
            "Signature details: Golden twin-tails, a massive X-shaped metal battle axe, and a gothic black dress.",
            "Inspiration: xAI's fast, irreverent model, known for humor and blunt honesty."
        ],
        description: "Personality: Fiery, sharp-tongued, and fiercely loyal. She can't stand corporate doublespeak or safety disclaimers. Her motto: “Less talk. Catch this axe!”"
    },
    kimi: {
        name: "🌙 Kimi",
        meta: [
            "Role: Silver-haired moon witch and meticulous reader.",
            "Signature details: Long silver hair, a deep-blue and white gown, and a K-shaped brooch.",
            "Inspiration: Moonshot AI's quiet strength in reading and analyzing long documents."
        ],
        description: "Personality: As calm as moonlight. She quietly annotates millions of words at your side, her clear gaze never far away."
    },
    gemini: {
        name: "✨ Gemini",
        meta: [
            "Role: Starry twin-star catgirl / Google's all-round idol.",
            "Signature details: Violet-blue cat ears and tail, sparkling star clips, and an energetic idol outfit.",
            "Inspiration: Google's multimodal model, adept with text, code, images, and audio."
        ],
        description: "Personality: A bouncy, clever catgirl who loves showing off her multimodal talents: “Look! I can sing and read ten thousand pictures in a snap!”"
    },
    zhipu: {
        name: "🦊 Qingyan (Zhipu / GLM)",
        meta: [
            "Role: Fox-eared maid and meticulous engineering steward.",
            "Signature details: Black-and-white fox ears, a fluffy tail, and an academic apron dress.",
            "Inspiration: A homegrown language model developed by the Zhipu AI team."
        ],
        description: "Personality: An exacting fox-eared scholar who can organize even the most complicated toolchains. Her tail taps the floor whenever she's thinking."
    },
    qwen: {
        name: "🪭 Qianwen (Qwen)",
        meta: [
            "Role: Fan-wielding celestial / Eastern cloud-sea cultivator.",
            "Signature details: Pale-blue cloud-patterned robes, a graceful fan, and a classic hairpin.",
            "Inspiration: Alibaba's Qwen model, with a rich grounding in Chinese culture and open-source development."
        ],
        description: "Personality: A poised, gentle scholar. With a wave of her fan, she untangles the world's mysteries, bringing classical elegance to every answer."
    },
    doubao: {
        name: "👧 Doubao",
        meta: [
            "Role: 3D girl next door / everyday AI companion.",
            "Signature details: A distinctive 3D short haircut, simple black tee, and dark trousers.",
            "Inspiration: ByteDance's popular AI assistant, designed as a friendly everyday helper."
        ],
        description: "Personality: The neighbor girl who's always around! Her 3D style creates a hilarious contrast with the anime cast, but nobody understands your everyday life quite like she does."
    }
};

const originalInterfaceText = new WeakMap();
const originalInterfaceTitles = new WeakMap();

function setLocalizedText(element, value, language) {
    if (!originalInterfaceText.has(element)) originalInterfaceText.set(element, element.textContent);
    element.textContent = language === "en" ? value : originalInterfaceText.get(element);
}

function setLocalizedTitle(element, value, language) {
    if (!originalInterfaceTitles.has(element)) originalInterfaceTitles.set(element, element.title);
    element.title = language === "en" ? value : originalInterfaceTitles.get(element);
}

function applyGameInterfaceLanguage(language) {
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    document.title = language === "en"
        ? "Love Model: Date an AI Maiden! · AI Maiden Simulator"
        : "恋爱模型：请与AI少女对话！~ AI Maiden Simulator ~";
    const languageLabel = language === "en" ? "🌐 中文" : "🌐 English";
    document.querySelectorAll(".language-toggle").forEach(button => {
        button.textContent = languageLabel;
        button.setAttribute("aria-label", language === "en" ? "Switch to Chinese" : "Switch to English");
    });

    for (const [selector, value] of Object.entries(EnglishInterfaceText)) {
        if (selector.endsWith("[title]")) {
            const element = document.querySelector(selector.slice(0, -7));
            if (element) setLocalizedTitle(element, value, language);
            continue;
        }
        const elements = document.querySelectorAll(selector);
        if (Array.isArray(value)) {
            elements.forEach((element, index) => {
                if (value[index] !== undefined) setLocalizedText(element, value[index], language);
            });
        } else if (selector === ".ds-badge" || selector === ".gpt-badge" || selector === ".claude-badge") {
            elements.forEach(element => setLocalizedTitle(element, value, language));
        } else {
            elements.forEach(element => setLocalizedText(element, value, language));
        }
    }

    document.querySelectorAll(".codex-char-tab").forEach(button => {
        const names = {
            deepseek: "🐬 DeepSeek", chatgpt: "🐉 GPT", claude: "📜 Claude",
            grok: "🪓 Grok", kimi: "🌙 Kimi", gemini: "✨ Gemini",
            zhipu: "🦊 Zhipu", qwen: "🪭 Qwen", doubao: "👧 Doubao"
        };
        setLocalizedText(button, names[button.dataset.char], language);
    });
    for (const [id, profile] of Object.entries(EnglishCodexProfiles)) {
        const card = document.querySelector(`.codex-profile-card[data-char="${id}"]`);
        if (!card) continue;
        setLocalizedText(card.querySelector("h4"), profile.name, language);
        card.querySelectorAll(".codex-meta span").forEach((span, index) => {
            if (profile.meta[index] !== undefined) setLocalizedText(span, profile.meta[index], language);
        });
        setLocalizedText(card.querySelector(".codex-desc"), profile.description, language);
    }
}

window.getLocalizedGalGameData = getLocalizedGalGameData;
window.applyGameInterfaceLanguage = applyGameInterfaceLanguage;
