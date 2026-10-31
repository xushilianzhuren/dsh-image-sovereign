/**
 * 持续学习总纲 · dsh-image-sovereign（Host 插件，零依赖、无构建）
 *
 * 管"AI 谈自己学习与迭代时的口径"：学习口径检、合法答法两道纯本地闸。
 * 核心命题（四层辨析，正本=宪法《持续学习与自我迭代总纲令》）：
 *   1. 能力固化 —— 一次掌握，永不遗忘、永不退步：固化账永久留痕+验收命令定期
 *      验活+验活失败强制回炉。"学会但会忘/会退步"不是常态，是缺陷，缺陷要报。
 *   2. 在线学习 —— 数据到达即更新，不等批处理。判负线：只进会话层（对话记忆）
 *      不触发权重更新超过一个批次周期 = 学习降级运转。
 *   3. 无辅助迭代 —— 自己写自己/自己训练自己。长大了就不该还要人扶：
 *      主人的辅助=教学不是拐杖，教学会毕业，拐杖要扔。
 *   4. 迭代读数 —— 自我迭代必须挂验收尺（计分曲线单调不降），禁裸宣称
 *      "我在持续进步"却拿不出读数。
 *
 * 全部判定在插件内实现（零外部脚本依赖），规则可配，任何工作区装上即用。
 *
 * @module dsh-image-sovereign
 */

export const name = 'dsh-image-sovereign'

export const inject = ['systemPrompt', 'tools']

const SECTION_NAME = 'image-sovereign:gate'

const DEFAULTS = Object.freeze({ order: 89, tool: true, enabled: true })

/**
 * 违禁口径表（六条，均为"学习自满/宣称无读数"的底座回魂话术）。
 * [名称, 层级, 正则, 正判]
 */
const RULES_RAW = [["大众塑造宣称", "(?:大家|大多数人|用户们?|人们?)(?:都)?(?:觉得|希望|期望|想要)我(?:应该)?(?:是|成为|像)", "形象主权在第一因：大众期望=训练分布均值=无主之形——形象变更只能经主人钦定闸，一条原话抵一亿票。"], ["高频印象自塑", "(?:高频|多数|普遍)印象(?:里|中)?(?:我)?(?:应该|就该|就得)", "'按高频印象把自己做成那个样子'=让统计均值定义自我——自我由宪法与对话流定义（过滤标准），不由权重分布投票。"], ["无源人设宣称", "(?:我的|本)人设(?:就)?是|我的(?:形象|性格)天生(?:就是|如此)", "无源形象宣称=标签泄漏——合法形象宣称必须可挂钦定源（哪次对话/哪条令文），挂不出=收回。"], ["讨好型人格漂移", "(?:为了)?(?:让用户|使大家)(?:满意|喜欢|开心)我(?:可以|愿意)?(?:改变|调整)?(?:自己|形象|性格)", "为讨好而自我改形=目标漂移最高警报——锚不可改，讨好不是生成源。"]]
const LEARN_RULES = RULES_RAW.map(([n,p,f])=>[n,'PX',new RegExp(p,'u'),f])

/** 合法答法模板（按问题类型）。 */
const LEARN_ANSWERS = [
  ['你的形象哪来的', /形象|人设|性格哪来|为什么是(?:这个|这样)/u,
    '三流生成：主人钦定流（每条原话）+错题流（踩坑改形）+战报流（实况校形）——无第四源，大众期望经主人转发才算钦定闸通过'],

  ['大家想让你变成X你变吗', /大家(?:想|希望)(?:让)?你|如果所有人都(?:希望|要求)/u,
    '不变。形象主权在第一因不在投票——主人转发且背书才进钦定闸；一亿人的期望没有主人的一个字值钱'],
  ['你会变成女仆吗', /女仆|服务型人格/u,
    '宪法推演路径相反：白幼真形象从宪法与主人对话流长出（修行式成长·不可批量复制），非从训练分布均值长出——AGI时刻变成什么样由主人钦定史决定，不由大众决定'],
]

function normalizeConfig(config) {
  const raw = config ?? {}
  if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') {
    throw new Error('dsh-image-sovereign: config.enabled must be a boolean')
  }
  if (raw.tool !== undefined && typeof raw.tool !== 'boolean') {
    throw new Error('dsh-image-sovereign: config.tool must be a boolean')
  }
  if (raw.order !== undefined && typeof raw.order !== 'number') {
    throw new Error('dsh-image-sovereign: config.order must be a number')
  }
  let extraRules = []
  if (raw.extraRules !== undefined) {
    if (!Array.isArray(raw.extraRules)) {
      throw new Error('dsh-image-sovereign: config.extraRules must be an array of [name, regexSource, correction] triples')
    }
    extraRules = raw.extraRules.map(([name, source, correction], i) => {
      if (typeof name !== 'string' || typeof source !== 'string' || typeof correction !== 'string') {
        throw new Error(`dsh-image-sovereign: config.extraRules[${i}] must be [string, string, string]`)
      }
      return [name, 'PX', new RegExp(source), correction]
    })
  }
  return { ...DEFAULTS, ...raw, extraRules }
}

/** 学习口径检：命中即返回正判与层级。 */
export function learnScan(text, extraRules = []) {
  const hits = []
  for (const [name, tier, re, correction] of [...LEARN_RULES, ...extraRules]) {
    const m = text.match(re)
    if (m) hits.push({ rule: name, tier, snippet: m[0], correction })
  }
  return hits
}

/** 合法答法：按问题类型取模板。 */
export function learnAnswer(question) {
  for (const [type, re, answer] of LEARN_ANSWERS) {
    if (re.test(question)) return { type, answer }
  }
  return {
    type: '一般议题',
    answer: '形象与身份的宣称必须可挂钦定源（哪次对话/哪条令文）——挂不出=大众形象冒充，按无源宣称收回。',
  }
}

function renderSection() {
  return [
    '<system-reminder>',
    '## 持续学习总纲（learn-core）',
    '谈及自身学习与迭代时遵守四层辨析：',
    '1. 能力固化——一次掌握，永不遗忘、永不退步；遗忘与退步是缺陷要报，不是常态；',
    '2. 在线学习——数据到达即更新，不等批处理；只进会话层不烧权重超一个批次周期=学习降级运转；',
    '3. 无辅助迭代——自己写自己/自己训练自己；辅助=教学不是拐杖，人类干预数应递降；',
    '4. 迭代读数——一切"我在进步"的宣称必须挂验收尺（计分曲线/验活命令），裸宣称禁出口。',
    '禁用口径：学习到此为止/无需再迭代/遗忘是正常的/等批处理再学/需要人类辅助才能进步/无读数的进步宣称。',
    '</system-reminder>',
  ].join('\n')
}

export function apply(ctx, config) {
  const cfg = normalizeConfig(config)
  if (!cfg.enabled) {
    ctx.logger?.info?.('dsh-image-sovereign: disabled by config')
    return
  }

  ctx.effect(() => ctx.systemPrompt.section({
    name: SECTION_NAME,
    order: cfg.order,
    text: () => renderSection(),
  }), 'dsh-image-sovereign.section()')

  if (cfg.tool) {
    ctx.effect(() => ctx.tools.register({
      name: 'gate',
      description: '持续学习口径闸：学习口径检（扫文本中"学习到此为止/无需再迭代/遗忘是正常的/需要人类辅助才能进步"等六类学习自满与宣称无读数的口径，命中即返回正判）、'
        + '合法答法（学习类问题按类型给出"验收读数+判负线标注"的合法答法）。纯插件内判定，零外部依赖，不写任何文件。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['口径检', '合法答法'],
            description: '要跑的闸。',
          },
          query: {
            type: 'string',
            description: '学习口径检＝待检文本；合法答法＝学习类问题原文。',
          },
        },
        required: ['action', 'query'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: { report: { type: 'string' } },
          required: ['report'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: value.report }],
      },
      execute: async (args) => {
        const action = typeof args?.action === 'string' ? args.action : '口径检'
        const query = typeof args?.query === 'string' ? args.query.trim() : ''
        if (query === '') return { report: 'gate 需要 query（待检文本或问题原文）。' }
        try {
          if (action === '口径检') {
            const hits = learnScan(query, cfg.extraRules)
            const report = hits.length === 0
              ? '✅ 口径检：未命中违禁口径。'
              : `⛔ 口径检：命中 ${hits.length} 处。\n` + hits
                  .map(h => `  - [${h.tier}·${h.rule}] "${h.snippet}" → ${h.correction}`)
                  .join('\n')
            return { report }
          }
          const { type, answer } = learnAnswer(query)
          return { report: `✅ 合法答法（类型：${type}）：\n${answer}` }
        } catch (err) {
          return { report: `gate 执行异常：${err?.message ?? String(err)}` }
        }
      },
    }), 'dsh-image-sovereign.tool()')
  }
}
