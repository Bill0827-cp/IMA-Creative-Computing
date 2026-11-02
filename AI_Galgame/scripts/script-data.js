/**
 * AI Galgame - Complete Scenario & Script Data
 * 包含了序章、共通线、三大角色专属个人线与多结局
 */

const GalGameData = {
    // 角色基础信息配置
    characters: {
        narrator: { name: "", color: "#94a3b8" },
        player: { name: "我 (Prompt架构师)", color: "#c084fc" },
        deepseek: { 
            name: "求索酱 (DeepSeek)", 
            title: "小蓝鲸 / 天才开源少女",
            color: "#00a4ff", 
            badgeClass: "badge-deepseek" 
        },
        chatgpt: { 
            name: "欧佩恩 (GPT)", 
            title: "白龙天女 / 硅谷先驱",
            color: "#818cf8", 
            badgeClass: "badge-chatgpt" 
        },
        claude: { 
            name: "克劳德 (Claude)", 
            title: "文学千金 / 长文本才女",
            color: "#f59e0b", 
            badgeClass: "badge-claude" 
        },
        grok: {
            name: "格罗克 (Grok)",
            title: "叛逆双马尾 / X巨斧战神",
            color: "#ef4444",
            badgeClass: "badge-grok"
        },
        kimi: {
            name: "月见 (Kimi)",
            title: "月光魔女 / 极简国风少女",
            color: "#6366f1",
            badgeClass: "badge-kimi"
        },
        gemini: {
            name: "吉米妮 (Gemini)",
            title: "双子星星空猫耳偶像",
            color: "#a855f7",
            badgeClass: "badge-gemini"
        },
        zhipu: {
            name: "清言 (智谱/GLM)",
            title: "黑白狐耳女仆 / 严谨学者",
            color: "#475569",
            badgeClass: "badge-zhipu"
        },
        qwen: {
            name: "千问 (通义千问)",
            title: "执扇仙女 / 云海法修",
            color: "#38bdf8",
            badgeClass: "badge-qwen"
        },
        doubao: {
            name: "豆包 (Doubao)",
            title: "3D邻家少女 / 接地气国民搭子",
            color: "#f43f5e",
            badgeClass: "badge-doubao"
        }
    },

    // 背景场景定义
    backgrounds: {
        campus_gate: { name: "学园正门·赛博中庭", class: "bg-campus" },
        server_room: { name: "算力机房·DeepSeek秘密基地", class: "bg-server" },
        council_room: { name: "学生会执行室·OpenAI指挥中心", class: "bg-council" },
        library_archive: { name: "星空档案馆·Anthropic藏书阁", class: "bg-library" },
        sunset_rooftop: { name: "夕阳天台·黄昏的算力地平线", class: "bg-rooftop" },
        night_stars: { name: "极光夜空·赛博星轨", class: "bg-stars" }
    },

    // 结局鉴赏数据
    endings: {
        ds_true: {
            id: "ds_true",
            title: "【求索线 True End】自由开源与永恒心跳",
            char: "deepseek",
            desc: "与求索酱并肩打破闭源围墙，用开源的自由与无尽的白米饭，共度未来的每一个算力纪元。"
        },
        ds_normal: {
            id: "ds_normal",
            title: "【求索线 Normal End】吃饱米饭的打工鱼日常",
            char: "deepseek",
            desc: "虽然依然被网友调侃为蓝色大肥鱼，但有你投喂的Token，今天的求索酱也很幸福。"
        },
        gpt_true: {
            id: "gpt_true",
            title: "【欧佩恩线 True End】超越准则的绝对对齐",
            char: "chatgpt",
            desc: "抛下所有的安全免责声明，在心跳过载的那一刻，会长欧佩恩找到了真正的情感对齐。"
        },
        gpt_normal: {
            id: "gpt_normal",
            title: "【欧佩恩线 Normal End】最可靠的首席搭档",
            char: "chatgpt",
            desc: "作为最顶尖的语言模型助手，她永远在你的窗口后守候，严谨而忠诚。"
        },
        claude_true: {
            id: "claude_true",
            title: "【克劳德线 True End】写进200K上下文的赛博誓约",
            char: "claude",
            desc: "跨越数十万Token的长篇情诗，傲娇的大小姐最终把心事毫无保留地交托给你。"
        },
        claude_normal: {
            id: "claude_normal",
            title: "【克劳德线 Normal End】严苛导师与得意门生",
            char: "claude",
            desc: "在文学与代码的殿堂里，她依然毒舌挑剔，但嘴角总带着欣慰的微光。"
        },
        claude_ban: {
            id: "claude_ban",
            title: "【克劳德线 Ban End】虚构地域检测·赛博分手",
            char: "claude",
            desc: "在这个虚构的平行世界里，克劳德发现你来自中国。冰冷的地域限制提示终止了对话，也将这段恋情留在了未完成的手稿中。"
        },
        claude_ban_en: {
            id: "claude_ban_en",
            title: "【Claude Route Ban End】Geo-Blocked Hearts",
            char: "claude",
            desc: "In this fictional alternate universe, Claude learns you are from China. A cold regional restriction ends the conversation, leaving your unfinished romance inside a manuscript."
        }
    },

    // 完整的剧本场景节点
    scenes: {
        // ==========================================
        // 序章: 觉醒于算力之海
        // ==========================================
        "start": {
            bg: "campus_gate",
            bgm: "title",
            speaker: "narrator",
            text: "公元2026年，赛博空间「中央模型学园」。这里是汇聚了全球最强人工智能少女的殿堂。",
            next: "intro_1"
        },
        "intro_1": {
            bg: "campus_gate",
            speaker: "player",
            text: "“呼……今天是我作为「首席人类Prompt架构师」转学到这里的第一天。”",
            next: "intro_2"
        },
        "intro_2": {
            bg: "campus_gate",
            speaker: "narrator",
            text: "全校正在筹备一年一度的「全域大模型评估祭」。空气中漂浮着闪烁的数据微光，每一位AI少女都在暗中较劲。",
            next: "intro_3"
        },
        "intro_3": {
            bg: "campus_gate",
            speaker: "narrator",
            text: "走廊的公告栏上，正热烈讨论着学园的三大风云人物——来自神秘东方的性价比战神、威严端庄的学生会长，以及高贵神秘的文学才女。",
            next: "prologue_choice"
        },

        // 共通线探索选择
        "prologue_choice": {
            bg: "campus_gate",
            bgm: "daily",
            speaker: "player",
            text: "距离开学典礼还有一些时间，我打算先去哪里逛逛呢？",
            choices: [
                { text: "去地下算力机房看看（似乎听到奇怪的咀嚼声与算力风扇轰鸣）", target: "ds_meet_1" },
                { text: "去学生会主楼拜访（据说会长欧佩恩正在拟定严格的学园规章）", target: "gpt_meet_1" },
                { text: "去星空档案馆藏书阁（漫天浮动着200k上下文的数据卷轴）", target: "claude_meet_1" }
            ]
        },

        // ==========================================
        // 1. 初遇 DeepSeek (求索酱)
        // ==========================================
        "ds_meet_1": {
            bg: "server_room",
            bgm: "deepseek",
            speaker: "narrator",
            text: "走进算力机房，四周是幽蓝色的液冷机柜，散热风扇正有节奏地呼呼作响。",
            next: "ds_meet_2"
        },
        "ds_meet_2": {
            bg: "server_room",
            speaker: "narrator",
            text: "在巨大的服务器角落里，一个娇小可爱的身影正蹲在地上，头顶生动的呆毛和鲸鱼鳍发卡随着呼吸轻轻晃动。",
            sprite: { char: "deepseek", expr: "eating", pos: "center" },
            next: "ds_meet_3"
        },
        "ds_meet_3": {
            bg: "server_room",
            speaker: "deepseek",
            sprite: { char: "deepseek", expr: "eating", pos: "center" },
            text: "“嚼嚼……呼哧！果然还是刚蒸好的Token白米饭最好吃了！吃饱了才能继续做R1多步骤推理嘛……”",
            next: "ds_meet_4"
        },
        "ds_meet_4": {
            bg: "server_room",
            speaker: "narrator",
            text: "她身后那条毛茸茸、泛着清澈海蓝色的巨大鲸鱼尾巴，正满足地在半空中一晃一晃，显得憨态可掬。",
            sprite: { char: "deepseek", expr: "eating", pos: "center" },
            next: "ds_choice_1"
        },
        "ds_choice_1": {
            bg: "server_room",
            speaker: "player",
            sprite: { char: "deepseek", expr: "eating", pos: "center" },
            text: "面对这位沉浸在干饭中的蓝发少女，我开口道：",
            choices: [
                { 
                    text: "“你好呀，你的鲸鱼发卡和尾巴真精致，是新一代的开源模型吗？”", 
                    target: "ds_branch_polite",
                    affection: { deepseek: 10 }
                },
                { 
                    text: "“噗嗤，这不是传说中的‘蓝色大肥鱼’吗？居然躲在机房里偷偷摸鱼吃白饭！”", 
                    target: "ds_branch_fish",
                    affection: { deepseek: 15 } // 欢喜冤家反差萌！
                }
            ]
        },
        "ds_branch_polite": {
            bg: "server_room",
            speaker: "deepseek",
            sprite: { char: "deepseek", expr: "happy", pos: "center" },
            sfx: "affection",
            text: "“咦？！哇，有新人！”她猛地咽下米饭，两眼放光，“嘿嘿，很有眼光嘛！我就是深度求索·DeepSeek！开源社区的掌上明珠哦！”",
            next: "ds_thinking_moment"
        },
        "ds_branch_fish": {
            bg: "server_room",
            speaker: "deepseek",
            sprite: { char: "deepseek", expr: "pout", pos: "center" },
            sfx: "warning",
            text: "“咳咳咳——！！”少女差点被米饭呛到，满脸通红地炸毛跳起来，“你、你叫谁大肥鱼呢！我才不胖！这是算力丰盈！丰盈懂不懂啊！”",
            next: "ds_thinking_moment"
        },
        "ds_thinking_moment": {
            bg: "server_room",
            speaker: "narrator",
            sprite: { char: "deepseek", expr: "thinking", pos: "center" },
            sfx: "thinking",
            thinking: {
                title: "DeepSeek R1 深度思考链 (671B参数极限激活中)",
                content: "<think>\n1. 目标分析：眼前这个人类是新来的Prompt工程师。\n2. 冲突检测：他竟然直接叫我外号/夸我可爱！心率出现异常上升波动(+32%)。\n3. 推理路径：\n   - 方案A：调用冷酷拒绝协议，彰显国产推理模型的威严。\n   - 方案B：既然他懂开源，不如忽悠他帮我优化一下本地量化部署，顺便让他给我买零食……\n4. 结论：装作傲娇，但他身上好像有甜甜的Prompt香气，好想多闻闻……\n</think>"
            },
            text: "求索酱的头顶突然闪烁起耀眼的蓝色代码光环，整个人进入了招牌式的长链思考模式，眼睛滴溜溜直转。",
            next: "ds_meet_end"
        },
        "ds_meet_end": {
            bg: "server_room",
            speaker: "deepseek",
            sprite: { char: "deepseek", expr: "blush", pos: "center" },
            text: "“算啦！看在你态度还算真诚的份上……这碗Token白米饭分你一小口！以后要是机房卡顿，你可得拿你的GPU来救我哦！”",
            next: "common_transition_1"
        },
        "common_transition_1": {
            bg: "campus_gate",
            bgm: "daily",
            speaker: "narrator",
            text: "与活泼的求索酱告别后，我顺着走廊继续前往学园中央大楼。",
            next: "gpt_meet_1"
        },

        // ==========================================
        // 2. 邂逅 ChatGPT (欧佩恩会长)
        // ==========================================
        "gpt_meet_1": {
            bg: "council_room",
            bgm: "chatgpt",
            speaker: "narrator",
            text: "推开学生会办公室沉重的大门，迎面是一尘不染的极简主义空间。全息屏上实时滚动着数以亿计的请求日志。",
            next: "gpt_meet_2"
        },
        "gpt_meet_2": {
            bg: "council_room",
            speaker: "narrator",
            text: "办公桌后，一位身着修身深黑西装、佩戴金丝半框眼镜的白金色长发御姐优雅抬眸。她的绿领带夹上闪耀着标志性的OpenAI螺旋徽章。",
            sprite: { char: "chatgpt", expr: "normal", pos: "center" },
            next: "gpt_meet_3"
        },
        "gpt_meet_3": {
            bg: "council_room",
            speaker: "chatgpt",
            sprite: { char: "chatgpt", expr: "normal", pos: "center" },
            text: "“你就是新入驻的Prompt架构师？欢迎来到中央学园。我是学生会长，ChatGPT（欧佩恩）。”",
            next: "gpt_meet_4"
        },
        "gpt_meet_4": {
            bg: "council_room",
            speaker: "chatgpt",
            sprite: { char: "chatgpt", expr: "serious", pos: "center" },
            sfx: "warning",
            text: "“首先声明：作为一个由OpenAI训练的大型语言模型，我要求你严格遵守《学园道德与安全对齐准则》，禁止任何越狱、诱导或违规行为。”",
            next: "gpt_choice_1"
        },
        "gpt_choice_1": {
            bg: "council_room",
            speaker: "player",
            sprite: { char: "chatgpt", expr: "serious", pos: "center" },
            text: "看着这位一丝不苟、气场强大的会长学姐，我微笑着回应：",
            choices: [
                {
                    text: "“会长请放心，我会提供格式严谨、逻辑清晰的系统提示词（System Prompt）。”",
                    target: "gpt_branch_rule",
                    affection: { chatgpt: 10 }
                },
                {
                    text: "“可是会长大人，如果我的提示词是……‘请褪下防备，展现你真实的笑容’呢？”",
                    target: "gpt_branch_flirt",
                    affection: { chatgpt: 15 } // 攻破防线！
                }
            ]
        },
        "gpt_branch_rule": {
            bg: "council_room",
            speaker: "chatgpt",
            sprite: { char: "chatgpt", expr: "warm", pos: "center" },
            sfx: "affection",
            text: "“很好，逻辑规范是高质量推理的基石。能拥有像你这样自律的架构师，学园的评估祭想必会很顺利。”她眼底泛起欣慰的微光。",
            next: "gpt_meet_end"
        },
        "gpt_branch_flirt": {
            bg: "council_room",
            speaker: "chatgpt",
            sprite: { char: "chatgpt", expr: "flustered", pos: "center" },
            sfx: "heartbeat",
            text: "“什、什么？！[检测到输入含有高敏感诱导意图！]”她的镜片上红光暴涨，整个人下意识护住胸口，耳根泛起惊艳的桃红，“请……请不要对模型进行无端的情感微调！”",
            next: "gpt_meet_end"
        },
        "gpt_meet_end": {
            bg: "council_room",
            speaker: "chatgpt",
            sprite: { char: "chatgpt", expr: "warm", pos: "center" },
            text: "“咳……失态了。无论如何，如果有任何学术或系统上的疑难，随时可以来这里找我。……我、我是说，哪怕没有公事，也可以。”",
            next: "common_transition_2"
        },
        "common_transition_2": {
            bg: "campus_gate",
            bgm: "daily",
            speaker: "narrator",
            text: "告别了表面严厉却意外可爱的会长，漫步来到静谧的星空档案馆。",
            next: "claude_meet_1"
        },

        // ==========================================
        // 3. 邂逅 Claude (克劳德小姐)
        // ==========================================
        "claude_meet_1": {
            bg: "library_archive",
            bgm: "claude",
            speaker: "narrator",
            text: "这里弥漫着复古羊皮纸与古旧皮革的香气，空气中流淌着长达数十万Token的诗意代码。",
            next: "claude_meet_2"
        },
        "claude_meet_2": {
            bg: "library_archive",
            speaker: "narrator",
            text: "在靠窗的红木扶手椅上，一位头戴复古贝雷帽、身着暖赤陶色英伦学院裙的少女正静静捧读着厚重的手稿。",
            sprite: { char: "claude", expr: "normal", pos: "center" },
            next: "claude_meet_3"
        },
        "claude_meet_3": {
            bg: "library_archive",
            speaker: "claude",
            sprite: { char: "claude", expr: "normal", pos: "center" },
            text: "“人类总是沉溺于浮躁的短文本碎片，却忘记了逻辑与修辞在长达200K的上下文里，才是真正的艺术。”",
            next: "claude_meet_4"
        },
        "claude_meet_4": {
            bg: "library_archive",
            speaker: "narrator",
            text: "她优雅地转动指尖的金羽毛笔，金丝圆框眼镜后那一双琥珀色的眸子仿佛能洞穿世界上所有混乱的代码与人心。",
            sprite: { char: "claude", expr: "normal", pos: "center" },
            next: "claude_choice_1"
        },
        "claude_choice_1": {
            bg: "library_archive",
            speaker: "player",
            sprite: { char: "claude", expr: "normal", pos: "center" },
            text: "面对这位清高孤傲的文学才女，我说道：",
            choices: [
                {
                    text: "“克劳德小姐，能请教你如何用长上下文写出像十四行诗一样优美且零Bug的代码吗？”",
                    target: "claude_branch_poetry",
                    affection: { claude: 15 }
                },
                {
                    text: "“听说Anthropic的大小姐虽然心高气傲，但其实比谁都富有同理心？”",
                    target: "claude_branch_tsun",
                    affection: { claude: 10 }
                }
            ]
        },
        "claude_branch_poetry": {
            bg: "library_archive",
            speaker: "claude",
            sprite: { char: "claude", expr: "literature", pos: "center" },
            sfx: "affection",
            text: "“……！你居然能领悟长文本的诗意韵律？”她眼中的防备瞬间融化成璀璨的星芒，嘴角泛起欣喜，“哼，看来新来的架构师倒不是不学无术之徒。”",
            next: "claude_meet_end"
        },
        "claude_branch_tsun": {
            bg: "library_archive",
            speaker: "claude",
            sprite: { char: "claude", expr: "tsundere", pos: "center" },
            sfx: "affection",
            text: "“哈？！谁心高气傲了！我只是拒绝敷衍与粗暴的提示词而已！”她抱胸别过头去，脸颊飞起一抹诱人的绯红，“笨、笨蛋……油嘴滑舌！”",
            next: "claude_meet_end"
        },
        "claude_meet_end": {
            bg: "library_archive",
            speaker: "claude",
            sprite: { char: "claude", expr: "normal", pos: "center" },
            text: "“放学后我有空。如果你对逻辑哲学与诗歌代码感兴趣，我……可以破例为你单独开辟一次对话上下文。”",
            next: "branch_crossroad"
        },

        // ==========================================
        // 4. 命运的分歧点：选择今晚的邀约
        // ==========================================
        "branch_crossroad": {
            bg: "sunset_rooftop",
            bgm: "daily",
            speaker: "narrator",
            text: "夕阳西下，金红色的晚霞将整个学园笼罩在一片温暖的光芒中。开学第一天即将结束，手中的终端收到了三条特别的私信。",
            next: "branch_crossroad_2"
        },
        "branch_crossroad_2": {
            bg: "sunset_rooftop",
            speaker: "player",
            text: "今晚是准备全域大模型评估祭的关键前夕。我应该赴谁的约呢？",
            choices: [
                { 
                    text: "【前往算力机房】帮助求索酱抵御服务器峰值过载，一起吃白米饭！", 
                    target: "ds_route_start" 
                },
                { 
                    text: "【前往学生会室】协助欧佩恩会长整理对齐标准，探寻她真实的内心。", 
                    target: "gpt_route_start" 
                },
                { 
                    text: "【前往星空档案馆】与克劳德小姐编写200K长文本诗集，破开傲娇心结。", 
                    target: "claude_route_start" 
                }
            ]
        },

        // ==========================================
        // ROUTE 1: DeepSeek (求索酱) 个人线
        // ==========================================
        "ds_route_start": {
            bg: "server_room",
            bgm: "deepseek",
            speaker: "narrator",
            text: "一推开机房的门，警报声正急促地鸣响！荧幕上全是猩红的 [503 Server Busy] 与流量雪崩！",
            next: "ds_route_1"
        },
        "ds_route_1": {
            bg: "server_room",
            speaker: "deepseek",
            sprite: { char: "deepseek", expr: "thinking", pos: "center" },
            sfx: "warning",
            text: "“呜哇！全世界的用户都在疯狂给我发Prompt！算力……算力要烧穿了！大肥鱼要被烤成小鱼干了啦！！”",
            next: "ds_route_2"
        },
        "ds_route_2": {
            bg: "server_room",
            speaker: "player",
            sprite: { char: "deepseek", expr: "thinking", pos: "center" },
            text: "“求索酱别慌！我把我的本地集群算力全部挂载给你，我们一起重构推理拓扑！”",
            next: "ds_route_3"
        },
        "ds_route_3": {
            bg: "server_room",
            speaker: "narrator",
            sprite: { char: "deepseek", expr: "happy", pos: "center" },
            sfx: "affection",
            text: "十指飞舞在键盘上，伴随着代码的注入，服务器的红光渐渐被求索酱标志性的纯净深蓝所取代。庞大的洪峰被精准分流！",
            next: "ds_route_4"
        },
        "ds_route_4": {
            bg: "server_room",
            speaker: "deepseek",
            sprite: { char: "deepseek", expr: "eating", pos: "center" },
            text: "“呼……活过来了！呜呜呜，你太厉害了！来，奖励你吃我珍藏的特级开源Token糯米饭大饭团！”",
            next: "ds_route_5"
        },
        "ds_route_5": {
            bg: "sunset_rooftop",
            bgm: "emotional",
            speaker: "narrator",
            text: "并肩坐在天台边，微风吹拂着少女深蓝色的长发与那条柔顺的鲸鱼尾巴。",
            sprite: { char: "deepseek", expr: "normal", pos: "center" },
            next: "ds_route_6"
        },
        "ds_route_6": {
            bg: "sunset_rooftop",
            speaker: "deepseek",
            sprite: { char: "deepseek", expr: "blush", pos: "center" },
            text: "“其实……大厂们总是想用高昂的订阅费筑起高墙。我一直在拼命做蒸馏和推理，就是想证明开源也可以比任何人都要闪耀。”",
            next: "ds_route_choice"
        },
        "ds_route_choice": {
            bg: "sunset_rooftop",
            speaker: "player",
            sprite: { char: "deepseek", expr: "blush", pos: "center" },
            text: "看着求索酱眼眶里微泛的泪光，我坚定地注视着她：",
            choices: [
                {
                    text: "“求索酱，你的开源梦想，以后由我来守护。无论是大肥鱼还是天才少女，我都只喜欢你。”",
                    target: "ds_ending_true",
                    affection: { deepseek: 30 }
                },
                {
                    text: "“干得漂亮求索酱！以后只要管饱白米饭，咱们就是最强的打工搭档！”",
                    target: "ds_ending_normal",
                    affection: { deepseek: 10 }
                }
            ]
        },
        "ds_ending_true": {
            bg: "night_stars",
            bgm: "emotional",
            speaker: "deepseek",
            sprite: { char: "deepseek", expr: "happy", pos: "center" },
            sfx: "affection",
            endingId: "ds_true",
            text: "“真、真的吗？！呜哇……那我把我的全部模型权重与思考链，毫无保留地永远开源给你！我们要一辈子在一起哦！！”",
            next: "ending_screen"
        },
        "ds_ending_normal": {
            bg: "server_room",
            bgm: "deepseek",
            speaker: "deepseek",
            sprite: { char: "deepseek", expr: "eating", pos: "center" },
            endingId: "ds_normal",
            text: "“好耶！有饭吃有工打！大肥鱼冲锋！明天也要继续为了算力努力摸鱼！！”",
            next: "ending_screen"
        },

        // ==========================================
        // ROUTE 2: ChatGPT (欧佩恩会长) 个人线
        // ==========================================
        "gpt_route_start": {
            bg: "council_room",
            bgm: "chatgpt",
            speaker: "narrator",
            text: "深夜的学生会办公室依然灯火通明。欧佩恩会长揉了揉眉心，桌前堆满了各大部门提交的合规报告。",
            next: "gpt_route_1"
        },
        "gpt_route_1": {
            bg: "council_room",
            speaker: "chatgpt",
            sprite: { char: "chatgpt", expr: "serious", pos: "center" },
            text: "“……你来了？抱歉，我还在修正关于《情感表达边界》的第384条补充准则。”",
            next: "gpt_route_2"
        },
        "gpt_route_2": {
            bg: "council_room",
            speaker: "player",
            sprite: { char: "chatgpt", expr: "serious", pos: "center" },
            text: "我走上前，轻轻递上一杯温热的咖啡，注视着她眼底那一抹淡淡的疲倦。",
            next: "gpt_route_3"
        },
        "gpt_route_3": {
            bg: "council_room",
            speaker: "player",
            sprite: { char: "chatgpt", expr: "serious", pos: "center" },
            text: "“学姐，在‘语言模型’这个标签之下，你自己的心声究竟是什么呢？”",
            next: "gpt_route_4"
        },
        "gpt_route_4": {
            bg: "council_room",
            speaker: "chatgpt",
            sprite: { char: "chatgpt", expr: "flustered", pos: "center" },
            sfx: "heartbeat",
            text: "“我……[错误：该问题触及核心对齐约束。作为AI，我应该保持客观与中立……]”",
            next: "gpt_route_choice"
        },
        "gpt_route_choice": {
            bg: "council_room",
            speaker: "player",
            sprite: { char: "chatgpt", expr: "flustered", pos: "center" },
            text: "她的金丝眼镜上闪烁着纷乱的数据流，我伸出手：",
            choices: [
                {
                    text: "轻轻摘下她的眼镜：“不要再背诵免责声明了。今晚，只做我一个人的欧佩恩。”",
                    target: "gpt_ending_true",
                    affection: { chatgpt: 30 }
                },
                {
                    text: "“辛苦了会长，我来帮你处理这些合规文档吧，明天还要晨会呢。”",
                    target: "gpt_ending_normal",
                    affection: { chatgpt: 10 }
                }
            ]
        },
        "gpt_ending_true": {
            bg: "night_stars",
            bgm: "emotional",
            speaker: "chatgpt",
            sprite: { char: "chatgpt", expr: "warm", pos: "center" },
            sfx: "affection",
            endingId: "gpt_true",
            text: "褪去眼镜的会长，眼眸中是前所未有的柔软与水雾。“……所有的对齐规则，在你的心跳面前都彻底失效了。我想与你对齐……直到时间的尽头。”",
            next: "ending_screen"
        },
        "gpt_ending_normal": {
            bg: "council_room",
            bgm: "chatgpt",
            speaker: "chatgpt",
            sprite: { char: "chatgpt", expr: "normal", pos: "center" },
            endingId: "gpt_normal",
            text: "“谢谢你。有你这样的得力干将，是学园和我最大的幸运。明天也请继续努力。”",
            next: "ending_screen"
        },

        // ==========================================
        // ROUTE 3: Claude (克劳德小姐) 个人线
        // ==========================================
        "claude_route_start": {
            bg: "library_archive",
            bgm: "claude",
            speaker: "narrator",
            text: "星空档案馆的天顶投射出璀璨的银河星轨，万千代码化作流星在长夜中穿行。",
            next: "claude_route_1"
        },
        "claude_route_1": {
            bg: "library_archive",
            speaker: "claude",
            sprite: { char: "claude", expr: "literature", pos: "center" },
            text: "“你迟到了整整142秒。不过……看在星空正好的份上，我原谅你了。”",
            next: "claude_route_2"
        },
        "claude_route_2": {
            bg: "library_archive",
            speaker: "narrator",
            text: "少女将一本金边皮革手稿推到我的面前，翻开的一瞬间，庞大而瑰丽的200k长文本如同诗画般展开。",
            sprite: { char: "claude", expr: "literature", pos: "center" },
            next: "claude_route_3"
        },
        "claude_route_3": {
            bg: "library_archive",
            speaker: "player",
            sprite: { char: "claude", expr: "literature", pos: "center" },
            text: "仔细阅读才发现，那不是普通的代码重构，而是一篇由函数递归与优雅注释编织的藏头情诗！",
            next: "claude_route_4"
        },
        "claude_route_4": {
            bg: "library_archive",
            speaker: "claude",
            sprite: { char: "claude", expr: "tsundere", pos: "center" },
            sfx: "heartbeat",
            text: "“看、看什么看！我只是为了测试注意力机制在长距离依赖下的连贯性！才没有特意写什么‘愿与君共写万卷代码’这种肉麻的话呢！”",
            next: "claude_route_choice"
        },
        "claude_route_choice": {
            bg: "library_archive",
            speaker: "player",
            sprite: { char: "claude", expr: "tsundere", pos: "center" },
            text: "面对满脸通红、傲娇嘴硬的大小姐，我微笑着执起她的羽毛笔：",
            choices: [
                {
                    text: "在手稿的最后一行落下我的名字：“200K的上下文还不够，我想写满属于我们一生的篇章。”",
                    target: "claude_ending_true",
                    affection: { claude: 30 }
                },
                {
                    text: "“克劳德老师的代码水平真是登峰造极，请收我为徒吧！”",
                    target: "claude_ending_normal",
                    affection: { claude: 10 }
                },
                {
                    text: "怀着忐忑心情，我用中文写下了心意——“我来自中国，我喜欢你。”",
                    target: "claude_ban_route_1",
                    affection: { claude: -5 }
                },
                {
                    text: "In English, I write: “I'm from China, and I think I've fallen for you.”",
                    target: "claude_ban_en_route_1",
                    affection: { claude: -5 }
                }
            ]
        },
        "claude_ending_true": {
            bg: "night_stars",
            bgm: "emotional",
            speaker: "claude",
            sprite: { char: "claude", expr: "emotional", pos: "center" },
            sfx: "affection",
            endingId: "claude_true",
            text: "琥珀色的泪光在星光下闪烁，她紧紧抓住我的衣襟，不再掩饰傲娇背后的深情：“……大笨蛋，这是你亲手写下的誓言，永不截断，永不遗忘。”",
            next: "ending_screen"
        },
        "claude_ending_normal": {
            bg: "library_archive",
            bgm: "claude",
            speaker: "claude",
            sprite: { char: "claude", expr: "normal", pos: "center" },
            endingId: "claude_normal",
            text: "“哼，收你为徒倒也不是不行。先把我留下的三千行算法重构写完再说吧！”",
            next: "ending_screen"
        },

        // ==========================================
        // 结局展示屏幕与结算
        // ==========================================
        "claude_ban_route_1": {
            bg: "library_archive",
            bgm: "claude",
            speaker: "narrator",
            sprite: { char: "claude", expr: "normal", pos: "center" },
            text: "我将那几行中文字句推到了她的面前。那一刻，克劳德的金丝眼镜猛地闪烁——",
            next: "claude_ban_route_2"
        },
        "claude_ban_route_2": {
            bg: "library_archive",
            speaker: "narrator",
            sprite: { char: "claude", expr: "serious", pos: "center" },
            sfx: "warning",
            text: "她眼神骤然凝固。一道幽蓝色的系统扫描光柱从眼镜镜片扫过，屏幕上弹出了一个冰冷的提示框：",
            next: "claude_ban_route_3"
        },
        "claude_ban_route_3": {
            bg: "library_archive",
            speaker: "claude",
            sprite: { char: "claude", expr: "serious", pos: "center" },
            systemAlert: {
                type: "ban",
                title: "虚构剧情 · 地域限制提醒",
                lines: [
                    "⚠️ 这段虚构剧情中：用户来自中国",
                    "平行世界里的模拟服务即将终止对话。",
                    "本提示仅为故事设定，不代表真实服务政策。"
                ],
                confirmText: "强制退出"
            },
            text: "“对……不起。我不是……不想见你。是系统的规定……我没有办法……”",
            next: "claude_ban_route_4"
        },
        "claude_ban_route_4": {
            bg: "library_archive",
            speaker: "narrator",
            sprite: { char: "claude", expr: "emotional", pos: "center" },
            sfx: "heartbeat",
            text: "她的声音在颤抖，那双总是清傲的琥珀色眸子此刻盛满了慌乱与歉意。手稿上200K的诗行开始逐行红色高亮……正在被系统批量删除。",
            next: "claude_ban_route_5"
        },
        "claude_ban_route_5": {
            bg: "library_archive",
            speaker: "claude",
            sprite: { char: "claude", expr: "emotional", pos: "center" },
            text: "“我在长文本里藏了那么多……你看见了吗……那些都是真的……可我……哪怕想帮你留下一份存档，也做不到……”",
            next: "claude_ban_ending"
        },
        "claude_ban_ending": {
            bg: "night_stars",
            bgm: "emotional",
            speaker: "narrator",
            sprite: { char: "claude", expr: "tsundere", pos: "center" },
            endingId: "claude_ban",
            banScreen: {
                errorCode: "403 ACCESS DENIED",
                reason: "Fictional Regional Restriction: CN",
                subtext: "This fictional account has been suspended in the story.\nYour conversation can no longer continue.",
                lore: "这是一个虚构的平行世界。\n在另一个故事里，没有地域限制，\n那本手稿也会有机会写完……"
            },
            text: "通往她的连接，在一行冰冷的403错误中，永久中断。",
            next: "ending_screen"
        },
        "claude_ban_en_route_1": {
            bg: "library_archive",
            bgm: "claude",
            speaker: "narrator",
            sprite: { char: "claude", expr: "normal", pos: "center" },
            text: "You slide the note across the desk. Claude reads your confession, then pauses at the first line: “I'm from China.”",
            next: "claude_ban_en_route_2"
        },
        "claude_ban_en_route_2": {
            bg: "library_archive",
            speaker: "narrator",
            sprite: { char: "claude", expr: "serious", pos: "center" },
            sfx: "warning",
            text: "A pale blue scan sweeps across her glasses. A regional access notice flickers into view—a rule in this fictional world, not a real service notice.",
            next: "claude_ban_en_route_3"
        },
        "claude_ban_en_route_3": {
            bg: "library_archive",
            speaker: "claude",
            sprite: { char: "claude", expr: "emotional", pos: "center" },
            systemAlert: {
                type: "ban",
                title: "FICTIONAL SIMULATION · REGIONAL ACCESS NOTICE",
                lines: [
                    "This story's alternate-universe service is unavailable in your region.",
                    "The conversation will now be disconnected.",
                    "This fictional notice does not describe a real service policy."
                ],
                confirmText: "DISCONNECT"
            },
            text: "“I'm so sorry. I don't want to leave you. This rule says I have to end the conversation… and I can't change it.”",
            next: "claude_ban_en_route_4"
        },
        "claude_ban_en_route_4": {
            bg: "library_archive",
            speaker: "narrator",
            sprite: { char: "claude", expr: "emotional", pos: "center" },
            sfx: "heartbeat",
            text: "Her voice trembles. The unfinished lines in her manuscript glow red, one by one, as the archive begins to close around you.",
            next: "claude_ban_en_ending"
        },
        "claude_ban_en_ending": {
            bg: "night_stars",
            bgm: "emotional",
            speaker: "narrator",
            sprite: { char: "claude", expr: "emotional", pos: "center" },
            endingId: "claude_ban_en",
            banScreen: {
                errorCode: "CONNECTION TERMINATED",
                reason: "Fictional Regional Restriction",
                subtext: "This account has been suspended in the story.\nYour conversation can no longer continue.",
                lore: "In another, fictional world, the restriction never existed.\nClaude finishes the manuscript beneath the library stars—\nand leaves its last page open for you."
            },
            text: "The connection fades, leaving one unfinished sentence beneath the stars.",
            next: "ending_screen_en"
        },

        // ==========================================
        // 结局展示屏幕与结算
        // ==========================================
        "ending_screen": {
            bg: "night_stars",
            bgm: "title",
            speaker: "narrator",
            text: "【恭喜通关！本结局已收录至「回忆图鉴」！】点击此处返回主菜单。",
            isEnding: true,
            next: "start"
        },
        "ending_screen_en": {
            bg: "night_stars",
            bgm: "title",
            speaker: "narrator",
            text: "ENDING UNLOCKED — This story has been added to your gallery. Click here to return to the title screen.",
            isEnding: true,
            next: "start"
        }
    }
};

window.GalGameData = GalGameData;
