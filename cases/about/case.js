// Case-owned definition. Keep About changes in this directory.
export const definition = Object.freeze({
  id: "about",
  kicker: "Profile · AI-native PM",
  title: "About Me",
  summary: "动画专业背景转 AI 产品经理，用 PRD、项目规则、Agent 协作和验证闭环构建 AI-native 工作系统。",
  status: "About Me · 工作经历、Back Engineering、开发验证闭环和实践地图。",
  visual: "profile",
  headerImage: "assets/headers/about-header-pixel.png",
  headerAlt: "像素风 AI-native 产品经理工作流工作台",
  pages: [
    {
      type: "about-profile",
      label: "Profile",
      title: "工作经历、教育与兴趣爱好",
      summary: "4 年+ 海外 C 端创作工具与 AI Agent 产品经验，从动画和动效设计背景进入产品，关注模型能力如何变成用户能完成任务的流程。",
      image: "assets/shane-profile.png",
      stickers: ["Animation", "Music", "Design", "Vibe coding"],
      timeline: [
        {
          title: "成熟 C 端创作工具",
          meta: "Viva Video · AI Editing",
          copy: "在出海创作 App 中做 AI 图 / 视频 / 音频玩法、首页路径和内容供给，理解成熟产品里的 AI 落地约束。",
        },
        {
          title: "AI 图像 0→1",
          meta: "Colada · Sticker / Collage",
          copy: "从用户场景、生成结果稳定性、编辑保存链路到增长验证，把 AI 图像能力转成可复用视觉资产工具。",
        },
        {
          title: "办公 Agent 工作流",
          meta: "Dokie · Workspace",
          copy: "围绕多格式生成、Agent 路由、资料复用和可精修结果，把对话能力推进到可交付文件流程。",
        },
        {
          title: "独立产品 / 内部工具",
          meta: "AI-native Build",
          copy: "用 AI coding 推进独立 App、业务后台、自动化流程和可运行原型，把产品判断接到真实可运行产物。",
        },
      ],
      cards: [
        {
          title: "动画专业",
          copy: "重庆邮电大学动画专业，本科。动效和视觉训练让我更关注表达节奏、画面质量和用户感受。",
        },
        {
          title: "兴趣爱好",
          copy: "音乐、设计、心理学、个人 App 和 vibe coding。喜欢把抽象想法拆成可以被执行的系统。",
        },
      ],
      chips: ["AI Product", "Design Sense", "Agent Workflow", "Build Loop"],
    },
    {
      type: "about-system",
      label: "Back Engineering",
      title: "把模糊想法反向工程成项目系统",
      summary: "先把目标、边界和规则写进项目结构，再让人和 Agent 在同一套上下文里推进。",
      core: "AGENTS.md / Project Rules",
      nodes: [
        {
          title: "Idea Intake",
          label: "想法入口",
          copy: "把口头想法拆成用户场景、目标、约束和不做什么，先避免方向漂移。",
        },
        {
          title: "PRD Skill",
          label: "需求规格",
          copy: "用 prd skill 固定 What & Why：价值、优先级、公开边界、反面边界和验收口径。",
        },
        {
          title: "Product Dev Loop",
          label: "开发闭环",
          copy: "用 product-dev-loop 把 PRD 翻译成技术方案，再进入开发、验证、review 和修复。",
        },
        {
          title: "Isolated Acceptance",
          label: "隔离验收",
          copy: "开发完成后用浏览器、命令、截图和隔离 reviewer 检查真实链路，不让开发者自检替代验收。",
        },
        {
          title: "Eval Memory",
          label: "规则记忆",
          copy: "把失败样例沉淀成 eval 回归集，把规则记忆写回 AGENTS.md 和项目级规范。",
        },
      ],
      folders: ["AGENTS.md", "prd/", "tech-plans/", "review-notes/", "eval/"],
    },
    {
      type: "about-loop",
      label: "Build Loop",
      title: "Plan → Build → Verify → Improve",
      summary: "AI-native 不是一次性提效，而是把规划、开发、验收和规则反补做成持续升级的工作系统。",
      stages: [
        {
          title: "Plan",
          artifact: "PRD Skill / Boundary",
          copy: "用 prd skill 明确目标、用户场景、边界、不做什么和验收口径。",
        },
        {
          title: "Build",
          artifact: "product-dev-loop",
          copy: "用 product-dev-loop 把 PRD 翻译成技术方案，确认后推进可运行原型、网页、后台、自动化脚本或内部工具。",
        },
        {
          title: "Verify",
          artifact: "Isolated Acceptance",
          copy: "用浏览器、命令、截图、数据核对和隔离 review 检查真实链路，不让自检冒充验收。",
        },
        {
          title: "Improve",
          artifact: "Eval / AGENTS.md",
          copy: "把失败原因沉淀成 eval 回归集，并把规则记忆反补进 AGENTS.md、项目规范和踩坑记录。",
        },
      ],
    },
    {
      type: "about-practice",
      label: "Practice",
      title: "三条 AI-native 实践线路",
      summary: "把产品判断、AI coding 和业务场景接到可运行工具、独立产品和内容生产系统里。",
      tracks: [
        {
          title: "业务后台支持",
          meta: "BI / Ops / SEO Backend",
          copy: "协助开发 BI 看板、积分 / 业务配置后台，批量生产 Blog 和内容模板，并将选题、生成、发布、复盘串成自动化流程，提升业务内部效率。",
          steps: [
            ["数据看板", "把业务问题整理成可查看的指标和状态。"],
            ["配置后台", "把高频配置收进可复用的后台流程。"],
            ["Blog / 模板批量生产", "批量生产 Blog 和内容模板，减少重复制作。"],
            ["全流程自动化", "把选题、生成、发布和复盘串成自动化流程。"],
          ],
        },
        {
          title: "独立产品",
          meta: "FlashCam / SoundsNomad",
          copy: "把市场信号、产品设计、AI coding 协作、上线准备和复盘串成短周期验证。",
          steps: [
            ["设计", "从市场信号和使用场景整理产品方向。"],
            ["原型验证", "用可运行产品原型验证核心体验。"],
            ["协作开发", "和 AI coding 协作推进产品实现。"],
            ["上线复盘", "整理上线准备、反馈和下一轮判断。"],
          ],
        },
        {
          title: "TikTok 内容自动化工作流",
          meta: "IM → Workflow → TikTok",
          copy: "用 IM 入口收集选题和素材，进入任务 workflow，再完成视频 / 图文内容生成、验收、发布和复盘。",
          steps: [
            ["IM 输入", "从 IM 入口收集选题和素材。"],
            ["选题", "把素材整理成可执行的内容方向。"],
            ["生成", "进入 workflow 完成内容生成。"],
            ["验收发布", "检查、发布并沉淀复盘结果。"],
          ],
        },
      ],
    },
  ],
});
