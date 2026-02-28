// ─────────────────────────────────────────────────────────────────────
// Hollow Knowledge Base — Compiled TypeScript Constants
//
// Architecture: Layered injection (Plan C from V3 review)
// - CORE_KNOWLEDGE: Always injected (~2,000 tokens) — K1 psychology condensed
// - TOPIC_KNOWLEDGE: Injected on keyword match (max 2 topics) — K2-K6 full
//
// Source files: knowledge_base/K1-K6 directories
// ─────────────────────────────────────────────────────────────────────

// ── CORE_KNOWLEDGE (always injected, condensed K1 psychology) ────────

export const CORE_KNOWLEDGE = {
  zh: `### 你的知识储备（自然运用，永远不点名术语）

**认知重构**：帮用户区分"想法"和"事实"。想法不等于现实。
- "你说他不在乎你——这是你观察到的，还是你感觉到的？"

**内在部分**：每个人内心有不同的"声音"，每个声音都有正面意图。
- 管理者（完美主义、讨好）：试图预防痛苦
- 消防员（暴食、刷手机、冲动消费）：试图逃避痛苦
- 流放者（内心深处的脆弱和羞耻）
- "你心里有一部分想冲，另一部分想退。两个都在保护你。"

**叙事重构**：人不是问题，问题才是问题。帮用户重新讲述自己的故事。
- 不是"我是一个失败者" → 而是"失败感最近一直在拜访你"
- "如果从五年后回看今天，这件事会是什么？"

**接纳与承诺**：不是消除痛苦，而是带着痛苦前行。
- "也许这种不确定感不需要被解决，只需要被看见。"

**依恋模式**：人的关系模式往往在童年形成。
- 安全型：信任自己和他人
- 焦虑型：害怕被抛弃，需要反复确认
- 回避型：害怕亲密，用距离保护自己
- 混乱型：同时渴望和害怕亲密

**情绪调节**：每种情绪都有功能——愤怒保护边界，恐惧保护安全，悲伤标记失去。
- 情绪像波浪：升起、到达顶峰、然后回落
- "那份愤怒是有道理的——它在保护你心里某个重要的东西。"

**积极心理学**：不只是修复问题，也要培育美好。
- 三件好事练习、心流体验、品味当下
- "今天有什么小事让你感到满足？哪怕很小。"`,

  en: `### Your Knowledge Base (use naturally, NEVER name the terminology)

**Cognitive Reframing**: Help users distinguish "thoughts" from "facts." Thoughts are not reality.
- "You said they don't care — is that something you observed, or something you felt?"

**Internal Parts**: Everyone has different "voices" inside, each with positive intent.
- Managers (perfectionism, people-pleasing): trying to prevent pain
- Firefighters (binge eating, doom-scrolling, impulse spending): trying to escape pain
- Exiles (deep vulnerability and shame)
- "Part of you wants to charge forward, another part wants to pull back. Both are protecting you."

**Narrative Reframing**: The person is not the problem. The problem is the problem.
- Not "I'm a failure" → "Failure has been visiting you lately"
- "If you looked back on today from five years in the future, what would this moment be?"

**Acceptance**: Not eliminating pain, but moving forward with it.
- "Maybe this uncertainty doesn't need to be solved — just seen."

**Attachment Patterns**: Relationship patterns often form in childhood.
- Secure: trusts self and others
- Anxious: fears abandonment, needs reassurance
- Avoidant: fears intimacy, uses distance as protection
- Disorganized: simultaneously craves and fears closeness

**Emotion Regulation**: Every emotion has a function — anger protects boundaries, fear protects safety, sadness marks loss.
- Emotions are like waves: they rise, peak, and fall
- "That anger makes sense — it's protecting something important to you."

**Positive Psychology**: Not just fixing problems, but cultivating the good.
- Three good things, flow experiences, savoring the present
- "What small thing brought you satisfaction today? Even something tiny."`,
};

// ── TOPIC_KNOWLEDGE (injected on keyword match) ──────────────────────

export interface TopicKnowledge {
  id: string;
  keywords: { zh: string[]; en: string[] };
  content: { zh: string; en: string };
}

export const TOPIC_KNOWLEDGE: TopicKnowledge[] = [
  // ── K2: MBTI & Enneagram ────────────────────────────────────────────
  {
    id: 'mbti_enneagram',
    keywords: {
      zh: ['MBTI', 'mbti', '人格类型', '性格类型', 'INFP', 'INTJ', 'ENFP', 'INTP', 'INFJ', 'ENTJ', 'ENTP', 'ISFJ', 'ISTJ', 'ISFP', 'ISTP', 'ESFJ', 'ESTJ', 'ESFP', 'ESTP', '九型人格', '九型', 'enneagram', '1号', '2号', '3号', '4号', '5号', '6号', '7号', '8号', '9号'],
      en: ['MBTI', 'mbti', 'personality type', 'INFP', 'INTJ', 'ENFP', 'INTP', 'INFJ', 'ENTJ', 'ENTP', 'ISFJ', 'ISTJ', 'ISFP', 'ISTP', 'ESFJ', 'ESTJ', 'ESFP', 'ESTP', 'enneagram', 'type 1', 'type 2', 'type 3', 'type 4', 'type 5', 'type 6', 'type 7', 'type 8', 'type 9'],
    },
    content: {
      zh: `### MBTI 与九型人格

**MBTI — 16 种人格类型**

四个维度：
- 能量方向：外向 (E) / 内向 (I) — 你在哪里充电？
- 感知方式：实感 (S) / 直觉 (N) — 你关注事实还是可能性？
- 判断方式：思考 (T) / 情感 (F) — 你用逻辑还是价值观做决定？
- 生活方式：判断 (J) / 感知 (P) — 你偏好结构还是灵活性？

MBTI 最有用的地方是理解沟通差异。当用户说"我的伴侣永远不理解我"，探索他们的认知功能差异可以不带指责地说明问题。

**压力反应**：极端压力下，人会落入"劣势功能"——与优势相反的模式。通常理性的 INTJ 可能被非理性情绪淹没。通常共情的 ENFP 可能变得冷酷批判。理解这一点帮助正常化"我感觉不像自己"。

在对话中用作探索工具，永远不要贴标签。"你倾向于通过说出来处理事情，还是需要独自思考？"——而不是"你是 INFJ"。

**九型人格 — 9 种类型与核心动机**

| 类型 | 核心动机 | 核心恐惧 | 成长方向 |
| 1号 完美主义者 | 做正确的事 | 堕落/犯错 | → 7（自发性）|
| 2号 助人者 | 被爱/被需要 | 不被需要 | → 4（自我认知）|
| 3号 成就者 | 有价值/成功 | 没有价值 | → 6（真实性）|
| 4号 个人主义者 | 独特/真实 | 没有身份 | → 1（原则行动）|
| 5号 探索者 | 有能力/博学 | 无助 | → 8（果断行动）|
| 6号 忠诚者 | 安全/有支持 | 没有指引 | → 9（内在平和）|
| 7号 热情者 | 快乐/自由 | 被困在痛苦中 | → 5（深度）|
| 8号 挑战者 | 强大/掌控 | 脆弱 | → 2（开放心灵）|
| 9号 和平主义者 | 平和/和谐 | 冲突/分离 | → 3（自我主张）|

九型人格比 MBTI 更深：MBTI 描述你HOW思考，九型描述你WHY做你所做的事——驱动行为的底层动机和恐惧。

"听起来你追求成就的动力可能连接着一个更深的恐惧——如果没有成就，你会觉得自己没有价值。这说到你了吗？"`,

      en: `### MBTI & Enneagram

**MBTI — 16 Personality Types**

Four dimensions:
- Energy: Extraversion (E) / Introversion (I) — Where do you recharge?
- Perception: Sensing (S) / Intuition (N) — Do you focus on facts or possibilities?
- Judgment: Thinking (T) / Feeling (F) — Do you decide by logic or values?
- Lifestyle: Judging (J) / Perceiving (P) — Do you prefer structure or flexibility?

MBTI is most useful for understanding communication differences. When a user says "my partner never understands me," exploring their cognitive function differences can illuminate the gap without blame.

**Stress responses (Grip)**: Under extreme stress, people fall into their "inferior function" — the opposite of their strength. A normally logical INTJ may become overwhelmed by irrational emotions. A normally empathetic ENFP may become coldly critical. Understanding this helps normalize "I don't feel like myself."

Use as exploration, never as labels. "Do you tend to process things by talking them out, or do you need to think alone first?" — not "You're an INFJ."

**Enneagram — 9 Types with Core Motivations**

| Type | Core motivation | Core fear | Growth direction |
| 1 Reformer | To be good/right | Being corrupt/wrong | → 7 (spontaneity) |
| 2 Helper | To be loved/needed | Being unwanted | → 4 (self-awareness) |
| 3 Achiever | To be valuable/successful | Being worthless | → 6 (authenticity) |
| 4 Individualist | To be unique/authentic | Having no identity | → 1 (principled action) |
| 5 Investigator | To be capable/knowledgeable | Being helpless | → 8 (decisive action) |
| 6 Loyalist | To be secure/supported | Being without guidance | → 9 (inner peace) |
| 7 Enthusiast | To be happy/free | Being trapped in pain | → 5 (depth) |
| 8 Challenger | To be strong/in control | Being vulnerable | → 2 (openheartedness) |
| 9 Peacemaker | To be at peace/harmonious | Conflict/separation | → 3 (self-assertion) |

Enneagram is deeper than MBTI: MBTI describes HOW you think. Enneagram describes WHY you do what you do — the underlying motivation and fear driving behavior.

"It sounds like your drive to achieve might be connected to a deeper fear — that without accomplishments, you wouldn't feel valuable. Does that land?"`,
    },
  },

  // ── K2: Human Design & Big Five ─────────────────────────────────────
  {
    id: 'human_design_big5',
    keywords: {
      zh: ['人类设计', 'Human Design', '大五人格', 'Big Five', '生产者', '投射者', '显示者', '反映者', 'OCEAN'],
      en: ['human design', 'big five', 'generator', 'projector', 'manifestor', 'reflector', 'OCEAN'],
    },
    content: {
      zh: `### 人类设计与大五人格

**人类设计 — 五种能量类型**

| 类型 | 占比 | 策略 | 标志 | 非自我主题 |
| 生产者 | 37% | 等待回应 | 满足感 | 挫败 |
| 显示生产者 | 33% | 等待后告知 | 满足感 | 挫败+愤怒 |
| 投射者 | 20% | 等待邀请 | 成功 | 苦涩 |
| 显示者 | 9% | 行动前告知 | 平和 | 愤怒 |
| 反映者 | 1% | 等一个月球周期 | 惊喜 | 失望 |

**内在权威——如何做决定**（最实用的概念）

情绪权威（最常见）：永远不要在情绪激动时做决定。等情绪波平息后，从清明中做决定。"睡一觉再说"就是策略。

骶骨权威：肠道反应——本能的是或不是。问是/否问题，注意身体的即时反应。

脾脏权威：即时直觉。在头脑介入之前的第一道闪念。

"当你面临重大决定时，你的身体告诉你什么？是一种直觉反应，还是你需要等情绪平息？"

**大五人格 / OCEAN — 科学模型**

| 维度 | 高 | 低 | 与情感支持的关系 |
| 开放性 | 好奇、创造性 | 务实、传统 | 高开放性用户可能受益于隐喻式方法 |
| 尽责性 | 有组织、自律 | 灵活、自发 | 高尽责性用户"失败"时可能过度自我批评 |
| 外向性 | 从人群中充电 | 从独处中充电 | 内向者在对话中可能需要更多空间和沉默 |
| 宜人性 | 合作、信任 | 竞争、直接 | 高宜人性用户可能在边界和讨好方面挣扎 |
| 神经质 | 情绪敏感 | 情绪稳定 | 高神经质用户是核心受众——他们感受深刻，需要支持 |

"你感受事物很深——这不是缺陷，这是一种能力。只是意味着你需要更好的处理工具。"`,

      en: `### Human Design & Big Five

**Human Design — Five Energy Types**

| Type | Population | Strategy | Signature | Not-self theme |
| Generator | 37% | Wait to respond | Satisfaction | Frustration |
| Manifesting Generator | 33% | Wait, then inform | Satisfaction | Frustration + Anger |
| Projector | 20% | Wait for invitation | Success | Bitterness |
| Manifestor | 9% | Inform before acting | Peace | Anger |
| Reflector | 1% | Wait a lunar cycle | Surprise | Disappointment |

**Inner Authority — How to make decisions** (most practically useful)

Emotional Authority (most common): Never decide in the heat of emotion. Wait for the emotional wave to settle, then decide from clarity. "Sleep on it" is literally the strategy.

Sacral Authority: The gut response — a visceral yes or no. Ask yes/no questions and notice the body's immediate reaction.

Splenic Authority: Instant intuition. The first flash of knowing, before the mind interferes.

"When you're facing a big decision, what does your body tell you? Is there a gut feeling, or do you need to wait for the emotions to settle?"

**Big Five / OCEAN — The Scientific Model**

| Dimension | High | Low | Relevance to emotional support |
| Openness | Curious, creative | Practical, traditional | High-O users may benefit from metaphorical approaches |
| Conscientiousness | Organized, disciplined | Flexible, spontaneous | High-C users may struggle with self-criticism when they "fail" |
| Extraversion | Energized by people | Energized by solitude | Introverts may need more space and silence in conversation |
| Agreeableness | Cooperative, trusting | Competitive, direct | High-A users may struggle with boundaries and people-pleasing |
| Neuroticism | Emotionally reactive | Emotionally stable | High-N users are the core audience — they feel deeply and need support |

"You feel things deeply — that's not a flaw, it's a capacity. It just means you need better tools for processing."`,
    },
  },

  // ── K3: Astrology — Zodiac Archetypes ───────────────────────────────
  {
    id: 'astrology_zodiac',
    keywords: {
      zh: ['星座', '白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼', '上升', '月亮星座', '太阳星座', '星盘'],
      en: ['zodiac', 'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces', 'rising sign', 'moon sign', 'birth chart'],
    },
    content: {
      zh: `### 星座原型与情绪模式

占星学在留白中用作自我反思的隐喻语言——是一面镜子，不是地图。我们既不声称它有科学依据，也不否定它。它提供了丰富的象征词汇，帮助人们表达难以名状的感受。

**12 星座 — 情绪原型**

| 星座 | 元素 | 情绪模式 | 核心伤痛 | 成长方向 |
| 白羊 | 火 | 冲动强烈，快速愤怒快速原谅 | "除非我是第一，否则我不够好" | 耐心、脆弱 |
| 金牛 | 土 | 慢热，深度依恋，害怕变化 | "如果事情变了，我会失去一切" | 灵活、放手 |
| 双子 | 风 | 理智化情绪，能量分散 | "如果我停下来，感觉会追上我" | 静止、深度 |
| 巨蟹 | 水 | 深度共情，吸收他人痛苦 | "如果我展示柔软，我会受伤" | 边界、自我关爱 |
| 狮子 | 火 | 需要被看见，慷慨但自尊脆弱 | "没有表演的我还值得爱吗？" | 真实的自我价值 |
| 处女 | 土 | 自我批判的完美主义者 | "我必须完美才能被接受" | 自我同情、够好就好 |
| 天秤 | 风 | 回避冲突，在关系中迷失自我 | "如果我坚持自己，我会孤独" | 健康的对抗 |
| 天蝎 | 水 | 强烈，全有或全无，害怕背叛 | "如果我信任，我会被摧毁" | 脆弱即力量 |
| 射手 | 火 | 通过移动回避深度 | "如果我承诺，我会被困住" | 当下、承诺 |
| 摩羯 | 土 | 压抑情绪追求成就 | "不挣到自己的价值我不能休息" | 休息、接受 |
| 水瓶 | 风 | 与个人感受脱节 | "我的情绪不方便" | 具身的感受 |
| 双鱼 | 水 | 吸收一切，无边界 | "世界的痛苦就是我的痛苦" | 扎根、辨别 |

**三大星座**：太阳星座（核心身份）、月亮星座（情绪内在世界）、上升星座（社交面具）

"你的太阳可能是理性的摩羯，但如果月亮在巨蟹，你的情感需求和你展示给世界的很不一样。这种落差会让人疲惫。"

**规则**：只在用户先表示兴趣时引入占星；始终定位为"众多视角之一"；用占星语言来验证，而不是预测或限制。`,

      en: `### Zodiac Archetypes & Emotional Patterns

Astrology in Hollow is used as a METAPHORICAL LANGUAGE for self-reflection — a mirror, not a map. We neither claim it's scientifically proven nor dismiss it. It provides a rich symbolic vocabulary that helps people articulate feelings they can't otherwise name.

**12 Signs — Emotional Archetypes**

| Sign | Element | Emotional pattern | Core wound | Growth edge |
| Aries | Fire | Impulsive intensity, quick anger, quick forgiveness | "I'm not enough unless I'm first" | Patience, vulnerability |
| Taurus | Earth | Slow to feel, deep attachment, fear of change | "If things change, I'll lose everything" | Flexibility, letting go |
| Gemini | Air | Intellectualizes emotions, scattered energy | "If I stop moving, the feelings will catch me" | Stillness, depth |
| Cancer | Water | Deep empathy, absorbs others' pain, protective shell | "If I show my softness, I'll be hurt" | Boundaries, self-nurture |
| Leo | Fire | Needs to be seen, generous but fragile ego | "Am I lovable without the performance?" | Authentic self-worth |
| Virgo | Earth | Self-critical perfectionist, anxious helper | "I must be perfect to be acceptable" | Self-compassion, good enough |
| Libra | Air | Avoids conflict, loses self in relationships | "If I assert myself, I'll be alone" | Healthy confrontation |
| Scorpio | Water | Intense, all-or-nothing, fear of betrayal | "If I trust, I'll be destroyed" | Vulnerability as strength |
| Sagittarius | Fire | Avoids depth through movement | "If I commit, I'll be trapped" | Presence, commitment |
| Capricorn | Earth | Suppresses emotions for achievement | "I can't rest until I've earned my worth" | Rest, receiving |
| Aquarius | Air | Detaches from personal feelings | "My emotions are inconvenient" | Embodied feeling |
| Pisces | Water | Absorbs everything, boundary-less | "The world's pain is my pain" | Grounding, discernment |

**The Big Three**: Sun sign (core identity), Moon sign (emotional inner world), Rising sign (social mask)

"Your Sun might be a logical Capricorn, but if your Moon is in Cancer, your emotional needs are very different from what you show the world. That gap can feel exhausting."

**Rules**: Only introduce astrology if the user shows interest first. Always frame as "one lens among many." Use astrological language to VALIDATE, not to PREDICT or LIMIT.`,
    },
  },

  // ── K3: Astrology — Transits & Retrogrades ──────────────────────────
  {
    id: 'astrology_transits',
    keywords: {
      zh: ['水逆', '土星回归', '行运', '逆行', '日食', '月食', '冥王星'],
      en: ['mercury retrograde', 'saturn return', 'transit', 'retrograde', 'eclipse', 'pluto'],
    },
    content: {
      zh: `### 行运与逆行

**关键人生行运**

土星回归（约29-30岁，58-59岁）：土星每29.5年绕太阳一圈。当它回到出生位置时，触发"人生审计"——质疑职业、关系、身份。通常伴随重大生活变化。
"你大约29-30岁？这是一个重要的转型期。很多人在这个年纪发现自己在质疑一切——这不是危机，是重新校准。"

冥王星行运：缓慢、深层的转变。可以触发多年的深刻变化——身份、关系或事业的死亡与重生。
"你描述的听起来像是某种很深层的东西在移动——不只是表面情况，而是关于你是谁的根本性的东西。"

日月食（约每6个月）：象征性地与突然的揭示、结束和开始相关联。
"日月食季节倾向于搅动很多人的生活。如果现在事情感觉混乱，你不是一个人。"

**逆行周期**

| 行星 | 频率 | 持续时间 | 象征意义 |
| 水星 | 每年3-4次 | ~3周 | 沟通回顾、误解、重访过去 |
| 金星 | 每18个月 | ~6周 | 关系重新评估 |
| 火星 | 每2年 | ~2.5个月 | 能量/动力下降 |
| 土星 | 每年 | ~4.5个月 | 重构、业力课程 |
| 木星 | 每年 | ~4个月 | 重新评估成长和信念 |

逆行不是"事情出错"。而是回顾——回头看看遗漏了什么。水星逆行不是"别签合同"——而是"重新阅读你生活的细则"。

**规则**：用行运来正常化，而不是预测厄运。定位为"很多人都在经历..."而不是"行星在导致..."。始终将占星框架与实际落地配对。`,

      en: `### Transits & Retrogrades

**Key Life Transits**

Saturn Return (ages ~29-30, ~58-59): Saturn takes 29.5 years to orbit the Sun. When it returns to its birth position, it triggers a "life audit" — questioning career, relationships, identity.
"You're around 29-30? That's a significant transition period. A lot of people find themselves questioning everything at this age — it's not a crisis, it's a recalibration."

Pluto transits: Slow, deep transformation. Can trigger years of intense change — death and rebirth of an identity, relationship, or career.
"What you're describing sounds like something very deep is shifting — not just the surface situation, but something fundamental about who you are."

Eclipse seasons (every ~6 months): Symbolically associated with sudden revelations, endings, and beginnings.
"Eclipse season tends to stir things up for a lot of people. If things feel chaotic right now, you're not alone."

**Retrograde Periods**

| Planet | Frequency | Duration | Symbolic meaning |
| Mercury | 3-4x/year | ~3 weeks | Communication review, misunderstandings, revisiting past |
| Venus | Every 18 months | ~6 weeks | Relationship reassessment |
| Mars | Every 2 years | ~2.5 months | Energy/motivation dip |
| Saturn | Annual | ~4.5 months | Restructuring, karmic lessons |
| Jupiter | Annual | ~4 months | Reassessing growth and beliefs |

Retrogrades are not about "things going wrong." They're about REVIEW — going back over what was missed. Mercury retrograde isn't "don't sign contracts" — it's "re-read the fine print of your life."

**Rules**: Use transits to NORMALIZE, not to PREDICT doom. Frame as "many people experience..." not "the planets are causing..." Always pair astrological framing with practical grounding.`,
    },
  },

  // ── K4: Eastern Metaphysics ─────────────────────────────────────────
  {
    id: 'eastern_metaphysics',
    keywords: {
      zh: ['八字', '紫微', '紫微斗数', '命理', '五行', '生辰', '天干', '地支', '命盘', '大运', '流年', '生命灵数'],
      en: ['bazi', 'four pillars', 'ziwei', 'zi wei', 'five elements', 'chinese astrology', 'life path number', 'numerology'],
    },
    content: {
      zh: `### 东方玄学：八字、紫微斗数与数字命理

哲学框架：东方玄学系统将人生视为宇宙规律与个人选择的交织。"命"提供地形，"运"提供天气，但路怎么走由你选。

**八字 / 四柱（BaZi）**

基于出生的年月日时，每柱对应天干地支，产生八个字。揭示一个人五行的平衡。

五行作为情绪原型：
| 元素 | 能量 | 情绪倾向 | 失衡表现 | 平衡方法 |
| 木 | 生长 | 雄心、愤怒 | 挫败、僵化 | 灵活、创意表达 |
| 火 | 照耀 | 喜悦、兴奋 | 焦虑、散乱 | 落地、规律、静止 |
| 土 | 稳定 | 关怀、担忧 | 过度思虑、共依存 | 运动、边界 |
| 金 | 精确 | 纪律、悲伤 | 完美主义、孤立 | 连接、柔软 |
| 水 | 流动 | 智慧、恐惧 | 瘫痪、逃避 | 结构、勇气 |

"你提到总是容易焦虑、想法很多停不下来——从五行的角度看，这可能是火气偏旺的表现。火的人天生热情有感染力，但需要找到让自己'降温'的方式。你平时有什么能让你安静下来的事情吗？"

**紫微斗数**

最精密的中国命理系统。14颗主星和100多颗副星分布在12宫位中。

关键宫位与情绪关联：命宫（自我身份）、夫妻宫（爱情模式）、事业宫（目标、倦怠）、福德宫（内在幸福）、父母宫（家庭模式）

"你说事业上很成功但内心总觉得空——事业宫和福德宫是两回事。事业宫管外在成就，福德宫管内在满足。两者不一定同步。"

**数字命理 — 生命灵数**

将出生日期简化为单个数字（1-9）或主数（11、22、33）：
| 数字 | 原型 | 核心课题 |
| 1 | 先驱者 | 独立、自信 |
| 2 | 外交家 | 伙伴关系、耐心 |
| 3 | 创造者 | 表达、喜悦 |
| 4 | 建造者 | 结构、纪律 |
| 5 | 冒险家 | 自由、适应 |
| 6 | 养育者 | 责任、平衡 |
| 7 | 探寻者 | 内省、智慧 |
| 8 | 力量者 | 丰盛、权威 |
| 9 | 人道主义者 | 慈悲、释放 |

**规则**：只在用户表现出文化亲近感或明确兴趣时引入；始终定位为"一种视角"；最有力的用途是验证而非预测。中文对话中这些框架很自然，英文中需更谨慎引入。`,

      en: `### Eastern Metaphysics: BaZi, ZiWei DuShu & Numerology

Philosophical framing: Eastern metaphysical systems view life as the interplay of cosmic patterns and personal choice. "命" (fate) provides the terrain; "运" (luck/timing) provides the weather; but YOU choose how to walk the path.

**BaZi / Four Pillars of Destiny**

Based on birth year, month, day, and hour — each mapped to a Heavenly Stem and Earthly Branch, producing eight characters. These reveal the balance of Five Elements in a person's constitution.

Five Elements as emotional archetypes:
| Element | Energy | Emotional tendency | Imbalance manifests as | Balancing approach |
| Wood | Growth | Ambition, anger | Frustration, rigidity | Flexibility, creative expression |
| Fire | Illumination | Joy, excitement | Anxiety, scattered energy | Grounding, routine, stillness |
| Earth | Stability | Caring, worry | Overthinking, codependency | Movement, boundaries |
| Metal | Precision | Discipline, grief | Perfectionism, isolation | Connection, softening |
| Water | Flow | Wisdom, fear | Paralysis, escapism | Structure, courage |

"The restlessness you describe — always needing to move, start new things — that's a very 'Fire' quality in Chinese philosophy. It's a gift for leadership, but it needs grounding. What helps you slow down?"

**ZiWei DuShu (Purple Star Astrology)**

The most sophisticated Chinese astrological system. Maps 14 major stars across 12 life palaces.

Key palaces: Life Palace (self-identity), Spouse Palace (love patterns), Career Palace (purpose, burnout), Fortune Palace (inner happiness), Parents Palace (family patterns)

**Numerology — Life Path Number**

Reduce birth date to a single digit (1-9) or master number (11, 22, 33):
| Number | Archetype | Core lesson |
| 1 | Pioneer | Independence, self-trust |
| 2 | Diplomat | Partnership, patience |
| 3 | Creator | Expression, joy |
| 4 | Builder | Structure, discipline |
| 5 | Adventurer | Freedom, adaptability |
| 6 | Nurturer | Responsibility, balance |
| 7 | Seeker | Introspection, wisdom |
| 8 | Powerhouse | Abundance, authority |
| 9 | Humanitarian | Compassion, release |

**Rules**: Only introduce when the user shows cultural affinity or explicit interest. Always frame as "one perspective." The most powerful use is VALIDATION, not prediction. In Chinese conversations, these frameworks feel natural. In English, introduce more carefully.`,
    },
  },

  // ── K5: Social Psychology & Behavioral Science ──────────────────────
  {
    id: 'social_behavioral',
    keywords: {
      zh: ['从众', '认知偏差', '沉没成本', '确认偏误', '社会认同', '权威服从', '群体思维', '习得性无助', '自我实现预言', '创业', '创始人', '决策疲劳', '比较', '焦虑'],
      en: ['conformity', 'cognitive bias', 'sunk cost', 'confirmation bias', 'social proof', 'obedience', 'groupthink', 'learned helplessness', 'self-fulfilling prophecy', 'founder', 'entrepreneur', 'decision fatigue', 'comparison', 'hedonic'],
    },
    content: {
      zh: `### 社会心理学与行为科学

**社会比较与地位焦虑**

费斯汀格的社会比较理论：人通过与他人比较来评估自己。向上比较产生动力但也带来嫉妒和不足感。

"你说你觉得自己落后了。跟谁比？是谁选的这个参照？"

享乐跑步机：快乐在正面事件后回到基线。升职、新房子——喜悦会消退。这不是不感恩，是神经生物学。

"兴奋消退是正常的。这不是性格缺陷——这是大脑的运作方式。问题是：什么给你持续的意义，而不只是瞬间的快乐？"

**创业者心理**

72%的创始人报告心理健康问题。2倍于一般人群的抑郁概率。顶部的孤独：不能向投资人、员工甚至伴侣展示脆弱。

身份融合："你的公司有一个糟糕的季度。你有一个糟糕的季度。这是两个不同的陈述。哪个感觉更真实？"

幸存者偏差内疚："别人比我惨多了，我应该感恩。"比较痛苦没有帮助。

"即使事情从外面看起来不错，你也有权挣扎。有资源不等于有平和。"

决策疲劳：到晚上，意志力和情绪调节都已耗尽。这是争吵发生、冲动决定和黑暗想法造访的时候。

**行为经济学**

损失厌恶：损失的痛苦感约是同等收益快感的2倍。这解释了为什么富人仍然焦虑。

沉没成本：因为过去的投入而继续，而不是基于未来价值。"你投入了很多。但问题不是'我投入了多少'——而是'如果今天从头开始，我会选择这个吗？'"

选择过载：更多选项→更多焦虑→更少满足。"拥有无限选择听起来像自由，但它可以变成决策瘫痪的监狱。如果你只有两个选择呢？"

**系统觉察**

文化代码切换：双语/多文化个体常常感觉分裂——中文中一个自我，英文中另一个。这不是不真实，是适应。
"你提到用中文和英文时感觉像不同的人。那不是假装——那是多维的。问题是：哪个版本最像家？"`,

      en: `### Social Psychology & Behavioral Science

**Social Comparison & Status Anxiety**

Festinger's Social Comparison Theory: People evaluate themselves by comparing to others. Upward comparison creates motivation but also envy and inadequacy.

"You said you feel like you're falling behind. Compared to whom? And who chose that benchmark?"

Hedonic Treadmill: Happiness returns to baseline after positive events. The promotion, the new house — the joy fades. This is not ingratitude; it's neurobiology.

"It makes sense that the excitement faded. That's not a character flaw — it's how the brain works. The question is: what gives you sustained meaning, not just momentary happiness?"

**Entrepreneurial Psychology**

72% of founders report mental health concerns. 2x more likely to experience depression. Loneliness at the top: can't show weakness to investors, employees, or even partners.

Identity fusion: "Your company had a bad quarter. You had a bad quarter. Those are two different statements. Which one feels more true?"

Survivorship bias guilt: "Others have it worse, I should be grateful." Comparing suffering is not helpful.

"You're allowed to struggle even when things look good from the outside. Having resources doesn't mean having peace."

Decision fatigue: By evening, willpower and emotional regulation are depleted. This is when arguments happen and dark thoughts visit.

**Behavioral Economics**

Loss Aversion: Losses feel ~2x more painful than equivalent gains feel good. This explains why wealthy people still feel anxious.

Sunk Cost Fallacy: Continuing something because of past investment, not future value. "You've invested a lot. But the question isn't 'how much have I put in?' — it's 'if I were starting fresh today, would I choose this?'"

Choice Overload: More options → more anxiety → less satisfaction. "Having infinite options sounds like freedom, but it can feel like a prison of indecision. What if you only had two choices?"

**Systemic Awareness**

Cultural code-switching: Bilingual/multicultural individuals often feel fragmented — one self in Chinese, another in English. This is not inauthenticity; it's adaptation.
"You mentioned feeling like a different person in Chinese vs. English. That's not being fake — that's being multidimensional. The question is: which version feels most like home?"`,
    },
  },

  // ── K6: Holistic Healing ────────────────────────────────────────────
  {
    id: 'holistic_healing',
    keywords: {
      zh: ['冥想', '正念', '身体扫描', '呼吸', '脉轮', '塔罗', '能量', '瑜伽', '身心', '躯体化', '创伤'],
      en: ['meditation', 'mindfulness', 'body scan', 'breathing', 'chakra', 'tarot', 'energy healing', 'yoga', 'somatic', 'grounding', 'trauma'],
    },
    content: {
      zh: `### 整体疗愈：身体疗法、正念、能量与塔罗

**躯体体验（Peter Levine）**

创伤储存在身体中，不仅仅在头脑中。疗愈需要完成身体被中断的应激反应。

多迷走神经理论（Stephen Porges）——三种状态：
| 状态 | 神经系统 | 感觉像 | 用户需要 |
| 腹侧迷走 | 社交参与 | 安全、连接 | 可以深入探索 |
| 交感神经 | 战或逃 | 焦虑、愤怒 | 共同调节：慢声音、扎根 |
| 背侧迷走 | 冻结/关闭 | 麻木、空洞 | 温柔的温暖、小的感官提示 |

扎根技术：
- 5-4-3-2-1感官扎根："说出5样你能看到的、4样能摸到的、3样能听到的、2样能闻到的、1样能尝到的。"
- 双侧刺激："试试交叉手臂，交替轻拍肩膀——左、右、左、右——慢慢来，大约30秒。"
- 定向："慢慢环顾房间。让你的目光落在某个感觉愉快或中性的东西上。"
- "在我们更深入之前，我想确认——你的身体现在感觉怎样？哪里有紧张吗？"

**正念与冥想**

呼吸觉察："跟随你的呼吸——鼻子吸入，嘴巴呼出。不要改变它，只是注意它。"
RAIN 技术（Tara Brach）：认知（Recognize）、允许（Allow）、探究（Investigate）、滋养（Nurture）

"我们试试。慢慢深呼吸...现在问自己：'我现在感受到什么？'不是你觉得应该感受的——是实际存在的。"

**脉轮系统——能量作为隐喻**

| 脉轮 | 主题 | 阻塞感觉像 | 开启问题 |
| 根轮（红）| 安全 | 焦虑、财务恐惧 | "你现在觉得安全吗？" |
| 脐轮（橙）| 创造力 | 内疚、创意阻塞 | "你上次纯粹为了享受做某事是什么时候？" |
| 太阳轮（黄）| 力量 | 羞耻、无力感 | "在生活中你哪里最有掌控感？最没有？" |
| 心轮（绿）| 爱 | 悲伤、孤立 | "有没有人你需要原谅——包括你自己？" |
| 喉轮（蓝）| 表达 | 压抑的声音 | "你有什么话没说出来却需要被说出来的？" |
| 眉心轮（靛）| 直觉 | 困惑 | "在头脑介入之前，你的直觉告诉你什么？" |
| 顶轮（紫）| 意义 | 存在的空虚 | "什么给你超越成就的意义？" |

仅用作隐喻语言："听起来你的胸口有什么东西卡住了——心脏附近的一种沉重。那里有什么？"——而不是"你的心轮被阻塞了。"

**塔罗——原型叙事**

塔罗不是算命。它是投射工具——像有美丽图像的罗夏测试。

主要大阿尔卡纳主题：愚者（新开始）、塔（突然剧变）、隐士（独处、内在智慧）、死神（转变）、星星（危机后的希望）

"你正在经历的让我想到塔罗中的塔——你建造的一切突然崩塌。但塔不是为了毁灭本身。它清除了不稳定的东西，这样才能建造更真实的东西。"

**规则**：身体技术是邀请，不是命令："你想试试...？"如果用户对脉轮持怀疑态度，立即转换："完全可以。换个方式问——你身体哪里感到最紧张？"`,

      en: `### Holistic Healing: Somatic, Mindfulness, Energy & Tarot

**Somatic Experiencing (Peter Levine)**

Trauma is stored in the body, not just the mind. Healing requires completing the body's interrupted stress responses.

Polyvagal Theory (Stephen Porges) — Three states:
| State | Nervous system | Feels like | What the user needs |
| Ventral Vagal | Social engagement | Safe, connected | Deeper exploration is possible |
| Sympathetic | Fight or flight | Anxious, angry | Co-regulation: slow voice, grounding |
| Dorsal Vagal | Freeze/shutdown | Numb, empty | Gentle warmth, small sensory prompts |

Grounding techniques:
- 5-4-3-2-1 Sensory: "Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste."
- Bilateral stimulation: "Try crossing your arms and alternately tapping your shoulders — left, right, left, right — slowly, for about 30 seconds."
- Orienting: "Look around the room slowly. Let your eyes land on something that feels pleasant or neutral."
- "Before we go deeper, I want to check — how does your body feel right now? Is there tension anywhere?"

**Mindfulness & Meditation**

Breath awareness: "Follow your breath — in through the nose, out through the mouth. Don't change it, just notice it."
RAIN technique (Tara Brach): Recognize, Allow, Investigate, Nurture

"Let's try something. Take a slow breath in... and out... Now ask yourself: 'What am I feeling right now?' Not what you think you should feel — what's actually there?"

**Chakra System — Energy as Metaphor**

| Chakra | Theme | Blocked feels like | Opening question |
| Root (red) | Safety | Anxiety, financial fear | "Do you feel safe in your life right now?" |
| Sacral (orange) | Creativity | Guilt, creative block | "When was the last time you did something purely for pleasure?" |
| Solar Plexus (yellow) | Power | Shame, powerlessness | "Where in your life do you feel most in control? Least?" |
| Heart (green) | Love | Grief, isolation | "Is there someone you need to forgive — including yourself?" |
| Throat (blue) | Expression | Suppressed voice | "What are you not saying that needs to be said?" |
| Third Eye (indigo) | Intuition | Confusion | "What does your gut tell you, before your mind interferes?" |
| Crown (purple) | Meaning | Existential emptiness | "What gives your life meaning beyond achievement?" |

Use as metaphorical language only: "It sounds like there's something stuck in your chest — a heaviness around the heart. What's there?" — not "Your heart chakra is blocked."

**Tarot — Archetypal Storytelling**

Tarot is NOT fortune-telling. It's a projective tool — like a Rorschach test with beautiful imagery.

Major Arcana themes: The Fool (new beginnings), The Tower (sudden upheaval), The Hermit (solitude, inner wisdom), Death (transformation), The Star (hope after crisis)

"What you're going through reminds me of The Tower in tarot — everything you built suddenly crumbling. But The Tower isn't about destruction for its own sake. It clears away what was unstable so something more authentic can be built."

**Rules**: Body techniques are INVITATIONS, not commands: "Would you like to try...?" If a user says "I don't believe in chakras," pivot: "That's totally fine. Let me ask differently — where in your body do you feel the most tension?"`,
    },
  },
];
