type SettingsPromptSource = 'default' | 'published' | 'personal';

type SettingsPromptItem = {
  id: string;
  name: string;
  description?: string;
  content: string;
  folder_id?: string;
  tags?: string[];
  created_at?: string;
  source?: SettingsPromptSource;
  is_published?: boolean;
};

type SettingsPromptItemRuntime = SettingsPromptItem & {
  source: SettingsPromptSource;
  is_published: boolean;
};

type SettingsPromptFolder = {
  id: string;
  name: string;
};

type SettingsPromptPreset = {
  id: string;
  name: string;
  base_prompt_id: string;
  detail_prompt_id: string;
  base_content: string;
  detail_content: string;
  content?: string;
  source?: SettingsPromptSource;
  is_published?: boolean;
};

type SettingsPromptPresetRuntime = SettingsPromptPreset & {
  source: SettingsPromptSource;
  is_published: boolean;
};

type SettingsSummaryTagPreset = {
  id: string;
  name: string;
  open_tag: string;
  close_tag: string;
  source?: SettingsPromptSource;
  is_published?: boolean;
};

type SettingsSummaryTagRuntime = SettingsSummaryTagPreset & {
  source: SettingsPromptSource;
  is_published: boolean;
};

type SettingsAppearanceTheme = {
  panel_bg: string;
  panel_bg_soft: string;
  popup_bg: string;
  panel_text: string;
  panel_muted: string;
  panel_accent: string;
  panel_accent_strong: string;
  bubble_bg: string;
};

type SettingsAppearance = {
  day: SettingsAppearanceTheme;
  night: SettingsAppearanceTheme;
};

type SettingsThemeMode = 'system' | 'day' | 'night';

type SettingsThemeSchedule = {
  day_start: string;
  night_start: string;
};

type SettingsBubbleBackgroundMode = 'follow-panel' | 'custom' | 'hidden';
type SettingsBubbleIconColorMode = 'follow-text' | 'custom';
type SettingsBubbleIconSource = 'default' | 'fontawesome' | 'image';
type SettingsBubbleIconSizeMode = 'default' | 'custom';

type SettingsBubbleStyle = {
  background_mode: SettingsBubbleBackgroundMode;
  background_color: string;
  icon_color_mode: SettingsBubbleIconColorMode;
  icon_color: string;
  icon_source: SettingsBubbleIconSource;
  icon_value: string;
  icon_size_mode: SettingsBubbleIconSizeMode;
  icon_size_em: number;
};

type SettingsOnlineStorage = {
  limit_mb: number;
};

type SettingsGenerationRetry = {
  enabled: boolean;
  timeout_ms: number;
  max_retries: number;
};

type SettingsSecondaryApiProvider = 'openai' | 'google_ai_studio' | 'vertex_ai';
type SettingsLaunchEntryMode = 'floating_ball' | 'qr_button' | 'extensions_menu';

type SettingsSecondaryApiProviderConfigMap = {
  openai: { apiurl: string; key: string; model: string };
  google_ai_studio: { key: string; proxy_url: string; proxy_password: string; model: string };
  vertex_ai: { key: string; vertex_token: string; vertex_location: string; vertex_project_id: string; model: string };
};

type SettingsSecondaryApiConfig = {
  enabled: boolean;
  provider: SettingsSecondaryApiProvider;
  apiurl: string;
  key: string;
  model: string;
  source: SettingsSecondaryApiProvider;
  proxy_password: string;
  vertex_token: string;
  vertex_location: string;
  vertex_project_id: string;
  providers: SettingsSecondaryApiProviderConfigMap;
};

type SettingsSecondaryApiProfile = {
  id: string;
  name: string;
  config: SettingsSecondaryApiConfig;
};

type SettingsImageGenerationConnectionMode = 'official' | 'custom';
type SettingsImageGenerationMode = 'novelai' | 'gpt_image';

type SettingsGptImage = {
  endpoint: string;
  api_key: string;
  model: string;
  size: string;
  quality: 'auto' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  output_format: 'png' | 'jpeg' | 'webp';
  background: 'auto' | 'opaque' | 'transparent';
  positive_prompt: string;
};

function normalizeGptImageSettings(config?: Partial<SettingsGptImage>): SettingsGptImage {
  return {
    endpoint: String(config?.endpoint || '').trim(),
    api_key: String(config?.api_key || '').trim(),
    model: String(config?.model || 'gpt-image-2.5-sunburst').trim(),
    size: ['auto', '1024x1024', '1536x1024', '1024x1536'].includes(config?.size || '') ? config!.size! : '1024x1024',
    quality: ['auto', 'low', 'medium', 'high', 'xhigh', 'max'].includes(config?.quality || '') ? config!.quality! : 'auto',
    output_format: ['png', 'jpeg', 'webp'].includes(config?.output_format || '') ? config!.output_format! : 'png',
    background: ['auto', 'opaque', 'transparent'].includes(config?.background || '') ? config!.background! : 'auto',
    positive_prompt: String(config?.positive_prompt || '').slice(0, 4000),
  };
}

const IMAGE_GENERATION_SIZE_PRESETS: Record<string, { width: number; height: number }> = {
  '512x512': { width: 512, height: 512 },
  '640x640': { width: 640, height: 640 },
  '512x768': { width: 512, height: 768 },
  '768x512': { width: 768, height: 512 },
  '1024x1024': { width: 1024, height: 1024 },
  '1216x832': { width: 1216, height: 832 },
  '832x1216': { width: 832, height: 1216 },
};

type SettingsImageGenerationPreset = {
  id: string;
  name: string;
  connection_mode: SettingsImageGenerationConnectionMode;
  endpoint: string;
  api_key: string;
  positive_prompt: string;
  negative_prompt: string;
  model: string;
  sampler: string;
  noise_schedule: string;
  prompt_guidance: number;
  prompt_guidance_rescale: number;
  size_preset: string;
  width: number;
  height: number;
  steps: number;
  seed: number;
  ai_default_character_position: boolean;
  smea: boolean;
  smea_dyn: boolean;
  variety: boolean;
  decrisp: boolean;
  prompt_references: SettingsImageGenerationPromptReference[];
};

type SettingsImageGenerationVibeReference = {
  id: string;
  name: string;
  image_data: string;
  file_name: string;
  source: 'upload' | 'naiv4vibe' | 'baibai';
  encodings?: Record<string, { encoding: string; infoExtracted?: number }>;
  strength: number;
  metadata_prompt: string;
  metadata_negative_prompt: string;
};

type SettingsImageGenerationPromptReference = {
  id: string;
  name: string;
  image_data: string;
  file_name: string;
  metadata_prompt: string;
  metadata_negative_prompt: string;
};

type SettingsImageGenerationVibeGroup = {
  id: string;
  name: string;
  auto_name: boolean;
  style_strength: number;
  references: SettingsImageGenerationVibeReference[];
};

type SettingsImageGeneration = {
  enabled: boolean;
  mode: SettingsImageGenerationMode;
  gpt_image: SettingsGptImage;
  active_preset_id: string;
  presets: SettingsImageGenerationPreset[];
  active_vibe_group_id: string;
  vibe_groups: SettingsImageGenerationVibeGroup[];
  vibe_library: SettingsImageGenerationVibeReference[];
};

type SettingsWorldbookOverrideValue = 'include' | 'exclude';

type SettingsConflict = {
  type: 'base' | 'detail' | 'preset';
  id: string;
  name: string;
  label: string;
  current: SettingsPromptItem | SettingsPromptPreset;
  builtin: SettingsPromptItem | SettingsPromptPreset;
};

type SettingsState = {
  active_prompt_id: string;
  active_base_prompt_id: string;
  active_detail_prompt_id: string;
  active_summary_tag_id: string;
  auto_generate: boolean;
  chat_history_depth: number | '';
  mobile_view_scale: number;
  theme_mode: SettingsThemeMode;
  theme_schedule: SettingsThemeSchedule;
  appearance: SettingsAppearance;
  bubble_style: SettingsBubbleStyle;
  online_storage: SettingsOnlineStorage;
  generation_retry: SettingsGenerationRetry;
  launch_entry_modes: SettingsLaunchEntryMode[];
  excluded_character_names: string[];
  excluded_tags: string[];
  random_detail_prompt: { enabled: boolean; prompt_ids: string[]; count: number; trigger_probability: number };
  secondary_api: SettingsSecondaryApiConfig;
  secondary_api_profiles: SettingsSecondaryApiProfile[];
  active_secondary_api_profile_id: string;
  image_generation: SettingsImageGeneration;
  summary_tags: SettingsSummaryTagRuntime[];
  worldbook_entry_overrides: Record<string, SettingsWorldbookOverrideValue>;
  base_prompts: SettingsPromptItemRuntime[];
  detail_prompt_folders: SettingsPromptFolder[];
  detail_prompt_tags: string[];
  detail_prompts: SettingsPromptItemRuntime[];
  prompts: SettingsPromptPresetRuntime[];
  deleted_builtin_detail_prompt_ids: string[];
  builtin_detail_prompt_folder_id: string;
};

type SettingsInput = Partial<
  Omit<SettingsState, 'summary_tags' | 'base_prompts' | 'detail_prompts' | 'prompts' | 'secondary_api'>
> & {
  summary_tags?: SettingsSummaryTagPreset[];
  base_prompts?: SettingsPromptItem[];
  detail_prompt_folders?: SettingsPromptFolder[];
  detail_prompt_tags?: string[];
  detail_prompts?: SettingsPromptItem[];
  prompts?: SettingsPromptPreset[];
  secondary_api?: Partial<SettingsSecondaryApiConfig> | null;
  image_generation?: Partial<SettingsImageGeneration> | null;
  deleted_builtin_detail_prompt_ids?: string[];
  builtin_detail_prompt_folder_id?: string;
};

const DEFAULT_DETAIL_PROMPT_FOLDER_ID = 'detail-folder-default';
const DEFAULT_EXCLUDED_TAGS = ['echo', 'ta的手机', 'gossip', 'danmu', '幕后故事', '日月来信', 'branches', 'horae'];

function formatPromptSections(...sections: string[]) {
  return sections.map(section => section.trim()).filter(Boolean).join('\n\n');
}

function getDefaultSettings() {
  const base_content_id = 'base-aurora-theater';
  const base_mobile_id = 'base-mobile-app-page';
  const detail_modern_id = 'detail-modern-digital-media';
  const detail_mobile_id = 'detail-mobile-private-space';
  const default_prompt_id = 'preset-rich-content-modern';
  const mobile_prompt_id = 'preset-mobile-private-space';
  const detail_prompt_folders = [
    {
      id: DEFAULT_DETAIL_PROMPT_FOLDER_ID,
      name: '默认文件夹',
    },
  ];
  const detail_prompt_tags = ['剧情', '氛围', '交互'];
  const base_prompts = [
    {
      id: base_content_id,
      name: '极光小剧场 @电波系',
      content: `通用核心规范：
你会根据故事或上下文嵌入一个 HTML+CSS+JavaScript 深度交互界面。这不仅是文本的载体，更是一个迷你的、可玩的互动装置或伪应用程序。

遵循以下进阶设计规范：
1. 布局与样式 (高性能/高兼容)
-   设计必须是响应式的，UI需无缝适配手机、平板与桌面端
    -   使用 @media 查询、百分比宽度和 max-width（推荐值: 500px-800px）来实现
-   必须定制沉浸式滚动条样式 (::-webkit-scrollbar)，使其与UI风格统一；或者在无需滚动提示时直接隐藏滚动条以保持界面整洁
-   严禁使用 transition 属性，所有动态效果必须通过 @keyframes 动画或 JS 切换 class 实现
-   模块必须是单个居中的容器，内部可包含复杂的嵌套结构
-   样式:
    -   标题强制使用 <p class="title-custom">，严禁使用 h1-h4 标签
    -   使用清晰易读的无衬线字体（古风除外），并明确设置 color
    -   主容器投影大小统一为0 4px 6px
    -   视觉风格锚定: 根据内容类型选择最佳 UI 范式，禁止滥用终端式UI
        -   社交/应用类: 采用 Card Layout (卡片式)、Sticky Header (粘性头部)、Bottom Nav (底部导航)
        -   剧情/物品类: 采用拟物化
        -   通用库: Flat UI, Cyber/Terminal, Paper/Handwritten, Pixel Art

2. 动态交互与逻辑模式
-   根据剧场类型，从以下两种交互逻辑中选择一种，严禁生搬硬套：
    -   模式A：聚合应用流 -> 适用于论坛/朋友圈/系统/手机
        -   特征: 单屏展示，多点交互。无需封面和结算页
        -   必须包含: 状态切换、内容切换、或列表追加
        -   细节: 模拟真实APP的反馈，如按钮点击的缩放、红点提示、Toast弹窗
    -   模式B：线性叙事流  -> 适用于拆礼物/小游戏/解谜
        -   特征: 分阶段推进 (封面 -> 互动 -> 结果)
        -   必须包含: 完整的状态机逻辑，用户操作后界面发生不可逆变化
-   防偷懒禁令:
    -   不能用下面的图像指令覆盖所有元素，加入充分的emoji交互效果
    -   严禁“点击即结束”的伪交互
    -   对于论坛/社交类：必须模拟真实的互动数据
-   触感反馈: 所有可点击元素必须有 :active 伪类缩放效果 (transform: scale(0.95))；允许各种有趣的交互弹窗

3. 内容与资源
-   必须使用**简体中文**生成内容，包括html title
-   禁止引用外部CSS、JS文件或API。所有资源必须按规定生成或声明
-   角色与叙事:
    -   头像: 用文本、符号、下列生图规则在绝对圆形的框内表示角色头像
    -   相关性: 内容必须与char和{{user}}高度相关
    -   NPC客串: 可包含第三方NPC（如<文末吐槽>）的客串
-   语言与语调:
    -   主要语言: 输出语言遵循\`核心语言\`
    -   用户名: 在论坛式交互中，创建诙谐的匿名用户名，绝不透露真实角色名
-   资源:
    -   图标：可以从外部网站引入svg图标加强真实性，如Font awesome
    -   视觉表现策略:
        -   每次生成前，必须随机决定视觉重心，严禁单一依赖 AI 生图：
        -   CSS/SVG 绘图: 适用于物品、食物、像素风、UI组件。
            -   利用 \`border-radius\`, \`box-shadow\` (像素画/投影), \`linear-gradient\`, \`clip-path\` 绘制图形。
            -   优势: 可交互、可动画化。
    -   音频:
        - 在合适的模块生成符合要求的交互音效
        - 生成方式: 所有音频必须使用Web Audio API动态生成。严禁使用任何外部音频文件、第三方音频生成服务或Base64编码的音频
        - 可以自由为音频添加效果器，使其符合场景

4. 结构与兼容性
-   严格的HTML格式: 输出必须是完整的HTML文档，并严格遵循
<!DOCTYPE html>
<html>
<head>
<style>…</style>
</head>
<body>
<div>…</div>
<script>…</script>
</body>
</html>
的顺序
-   所有代码必须左对齐，不含任何缩进
-   DOM策略: 必须在HTML中预渲染所有可能出现的元素（包括弹窗、结果页），默认设为隐藏，利用 JS 切换 class 来控制显示与流程。禁止使用 innerHTML 或 createElement 创建新元素`,
    },
    {
      id: 'base-light-page',
      name: '轻量页面',
      content: `生成一个完整的 HTML+CSS+JS 封装页面。
核心目标：以文字信息量为主导，HTML与CSS用于阅读排版与装饰，JS 作为点缀。**生成本文内容绝对严禁重复<LastChat>，需要主动生成新内容**

响应式布局与排版要求
- 电脑端：保证高信息密度与舒适的阅读宽度（如多栏排版、侧边栏目录、脚注、引用块）。
- 手机端：保证单列阅读、字号与行高舒适、内容不溢出。
- 双端适配：桌面端可使用多栏布局提升信息密度；移动端必须重排为单列信息流。禁止将任何包含信息的容器display: none，所有正文、侧栏、卡片、提示、导航等有信息价值的内容在窄屏下不得隐藏，只能调整顺序、折叠展示或改为卡片流。避免固定宽度、绝对定位和内容溢出，确保图片、表格、容器均适配视口。
- CSS 要求：整体视觉保持丰富与高级感。强调清晰的信息层级、舒适的阅读节奏与良好的留白控制，通过字体编排、间距、对比、纹理与布局等建立视觉秩序。
- JS 设计原则：以渐进增强为核心，保持页面内容优先。只承担辅助阅读、导航反馈与必要交互，不依赖复杂动画或过度状态管理。交互应轻量、可预期、易退出，并保证正文内容始终占据视觉与信息表达的主体地位。`,
    },
    {
      id: 'base-rich-content-page',
      name: '插图页面',
      content: `生成一个完整的 HTML+CSS+JS 封装页面。
核心目标：以文字信息量为主导，HTML与CSS用于构建阅读排版与装饰，JS 作为点缀。**生成本文内容绝对严禁重复<LastChat>，需要主动生成新内容**

响应式布局与排版要求
- 电脑端：保证高信息密度与舒适的阅读宽度（如多栏排版、侧边栏目录、脚注、引用块）。
- 手机端：保证单列阅读、字号与行高舒适、内容不溢出。
- 双端适配：桌面端可使用多栏布局提升信息密度；移动端必须重排为单列信息流。禁止将任何包含信息的容器display: none，所有正文、侧栏、卡片、提示、导航等有信息价值的内容在窄屏下不得隐藏，只能调整顺序、折叠展示或改为卡片流。避免固定宽度、绝对定位和内容溢出，确保图片、表格、容器均适配视口。
- CSS 要求：整体视觉保持丰富与高级感。强调清晰的信息层级、舒适的阅读节奏与良好的留白控制，通过字体编排、间距、对比、纹理与布局等建立视觉秩序。
- JS 设计原则：以渐进增强为核心，保持页面内容优先。只承担辅助阅读、导航反馈与必要交互，不依赖复杂动画或过度状态管理。交互应轻量、可预期、易退出，并保证正文内容始终占据视觉与信息表达的主体地位。

插图使用规则
- 页面必须使用图片增强真实感与视觉表现力。所有图片必须符合设定的语境、时代和地点，禁止随机图片。
- 图片来源建议：
- Openverse / Wikimedia Commons：适合历史感、复古图片、地图、文化资料、插画、公共领域素材。
- Pexels / Unsplash：适合现代场景、物品、桌面、城市、科技感图片。
- Pixabay：适合通用素材、图标、复古剪贴画。
- 图片必须来自已知稳定 CDN，URL 结构合理且真实存在。
- 如果无法保证图片真实存在，必须使用 CSS 绘制的占位框和描述性的占位文字代替，严禁编造死链。

图片内容要求：
- 优先选择：场景、建筑、房间、桌面物品、植物、地图、界面截图、纹理、插画、符号。
- 风格匹配：图片必须严格匹配当前内容的时代背景和美术风格（例如：复古内容使用做旧滤镜或黑白图片；现代内容使用高清大图）。
- 严格禁止：真人相片、人脸特写、明星/网红模特、自拍、与时代不符的穿帮素材。
- 允许：人类作为远景或模糊的背景元素，不能成为视觉主体。`,
    },
    {
      id: 'base-strong-interactive-page',
      name: '交互页面',
      content: `生成一个完整的 HTML+CSS+JS 封装页面。
核心目标：打造一个“可玩性高”的交互式网页。严禁照搬原文，代码必须服务于趣味性和可操作性，文字内容作为点缀。**生成本文内容绝对严禁重复<LastChat>，需要主动生成新内容**

响应式布局要求
页面必须同时适配电脑端与手机端：
- 电脑端：利用横向空间，设计多面板、控制台或复杂的交互操作区。
- 手机端：保证核心交互模块在单列下可用，按钮触控区域充足，拖拽/滑动操作流畅，无横向溢出，禁止将任何包含信息的容器display: none。

强 JS 交互与可玩性要求
页面绝不能是静态展示，必须充满动态反馈和可探索的机制。请实现至少 4 种以上的复杂原生 JavaScript 交互（无需外部库）,可使用弹窗：
- 状态机与变量系统：包含可变数值（如解密进度、好感度、信誉值、资产等），通过用户的点击、选择等操作实时更新并渲染在页面上。
- 视听/动态反馈：鼠标悬停、点击、长按时必须有明显的 CSS 状态变化或 JS 动画反馈。
- 拖拽与排序：允许用户拖动物品、卡片或线索进行组合、分类或解锁。
- 解密与探索机制：提供隐藏按钮、需要特定顺序点击的机关、输入特定文本才能解锁的隐藏面板（彩蛋）。
- 动态生成内容：通过点击操作，JS 可以动态生成新的 DOM 元素（如不断弹出的通知、随机生成的事件卡片、打字机效果输出的密文）。
- 多维面板切换：复杂的 Tab 切换、可拖动的悬浮小窗、从屏幕边缘滑出的抽屉面板。
- 迷你交互游戏：如翻牌记忆、简单的物理碰撞或时间限制挑战。

弹窗限制
- 不使用浏览器原生的 alert()、confirm() 或 prompt() 函数。
- 若需要实现警告、提示或确认交互，必须使用 HTML + CSS + JS 动态创建“自定义 DOM 遮罩层与弹窗”。
- 自定义弹窗必须包含居中的内容区以及关闭按钮，并且其 UI 样式必须与当前网页的整体美术风格完美融合。

交互质量底线
- 所有的按钮必须真实有效，禁止点击后出现“暂无内容”、“加载中”等敷衍反馈。
- 交互产生的结果必须包含实质性的文本信息或剧情推进，不能是空洞的动画。
- 优先使用复用函数、事件代理和 data-* 属性来保持 JS 代码的整洁与高效。`,
    },
    {
      id: base_mobile_id,
      name: '手机页面',
      content: formatPromptSections(
        `生成一个完整的 HTML+CSS+JS 封装页面。
核心目标：打造一个“手机系统 / 移动端 App 模拟器”式的高可玩交互页面。页面应像一台可探索的手机、平板或移动应用界面，而不是普通网页。严禁照搬原文，代码必须服务于趣味性、可操作性和信息探索。**生成本文内容绝对严禁重复<LastChat>，需要主动生成新内容。**`,
        `页面形态要求
- 页面必须模拟现代移动端数字界面，可以包含：手机桌面 / 锁屏 / 通知中心、即时通讯 App、社交媒体 App、手机游戏 App、私密相册 / 文件夹、浏览器、备忘录 / 日记 App、外卖 / 账单 / 地图 / 邮箱 / 网盘等移动端应用，以及多个 App 组成的手机系统式界面。`,
        `布局要求
- 页面必须严格适配手机端。
- 页面主体必须自然铺满屏幕宽度。
- 所有核心交互模块必须单列可用。
- 按钮、Tab、底部导航、列表项必须适合手指点击。
- 禁止横向溢出。
- 禁止将任何包含关键信息的容器 \`display: none\` 后不提供可访问入口。
- 如果使用多窗口、多聊天、多账号，必须通过 Tab、侧滑抽屉、底部导航、账号切换器或会话列表切换。`,
        `强 JS 交互与可玩性要求
- 页面绝不能是静态展示，必须充满动态反馈和可探索机制。
- 请实现至少 4 种以上的复杂原生 JavaScript 交互，无需外部库。
- App / 页面切换：桌面图标、底部导航、Tab、会话列表、账号切换器、返回按钮等必须真实可用。
- 通知与动态反馈：点击、长按、滑动、输入、解锁时产生 Toast、通知气泡、红点变化或状态栏变化。
- 解密与探索机制：允许用户输入密码、按顺序点击、拖动线索、翻找相册、切换账号或进入隐藏文件夹来解锁内容。
- 动态生成内容：用户操作后可以生成新的消息、搜索结果、通知、评论、系统日志、相册条目或草稿内容。
- 多层界面：至少包含两个以上可切换层级，例如桌面 → App → 会话 / 相册 / 详情页。
- 可选迷你交互：翻牌、滑动解锁、拼图验证、拖拽归档、时间线筛选等。`,
        `内容承载要求
- 页面内容应以“可探索的信息碎片”为主，而不是长篇正文。
- 不要把所有信息一次性堆在一个长页面里，应通过交互逐步揭示。
- 允许留白、遮挡、锁定、撤回、删除痕迹、模糊缩略图等移动端信息缺损感。`,
        `交互质量底线
- 所有按钮必须真实有效。
- 禁止点击后只显示“暂无内容”“加载中”“敬请期待”等敷衍反馈。
- 交互产生的结果必须包含实质性信息、状态变化或可探索内容。
- 优先使用复用函数、事件代理和 \`data-*\` 属性保持 JS 代码整洁。
- 页面必须在无外部依赖的情况下独立运行。`,
      ),
    },
  ];
  const detail_prompts = [
    {
      id: detail_modern_id,
      name: '网络内容',
      content: `内容生成方向：现代网络社交与数字媒介
参考现实世界中的现代网络平台（小红书、微博、贴吧、豆瓣、A岛、Reddit、X、YouTube、Discord 等）。内容需具有网感和趣味性，禁止出现长文内容、书面语，文字内容必须碎片化、口语化。适当使用图片与表情包（占位图）

内容与话题生成方向
- 话题类型：职场吐槽、购物避雷、吃瓜八卦、求助提问（伸手党）、树洞、发癫、安利、引战钓鱼等
- 社交动态还原：必须模拟真实的群体互动逻辑，包括但不限于：歪楼、无脑跟风、激烈对线（争吵）、阴阳怪气、抱团取暖、吃瓜、安慰等。如果角色参与其中，注意避免掉码

平台生态与元素运用（根据情境按需混合）
- 传统论坛生态 (如：贴吧、豆瓣、Reddit)
   - 身份标签：楼主、层主、版聊回复、用户名、时间轴等
   - 互动元素：引用回复(Quote)、盖楼、插眼(Mark)、催更、顶帖、神回复，存在一定的圈子排他性。“rt”（如题）、“马/马克”、“插眼”、“蹲个后续”、“太长不看”、“鉴定为xx”
- 瞬时信息流生态 (如：微博、X)
   - 内容特征：官方账号宣发，个人博客字数极简，强调即时性。
   - 互动元素：热搜话题词(#Hashtags#)、@提及、转发链、点赞数、评论控评、营销号带节奏
- 图文种草生态 (如：小红书、Instagram)
   - 内容特征：高情绪价值，强调第一人称体验。
   - 互动元素：夸张的标题党（如：“救命”、“无语死了”），首图文字预警，密集的Emoji堆砌，求链接/求教程的评论
- 匿名版块/A岛/4chan风：
  - 核心元素：随机生成的代码串ID（如：ID:aB3x9Q）、无头像
  - 语言特征：卸下伪装的极度直白，百无禁忌。黑话密集、可能互相攻击，不具备常规社交礼仪

群像互动与叙事逻辑
- 多样化的人设切片：塑造不同立场的网友形象。包括但不限于：
  - 杠精/理中客：喜欢挑刺，无论楼主说什么都要反驳（“就我一个人觉得……吗？”、“这也能洗？”）。
  - 吃瓜群众：单纯围观，前排售卖瓜子饮料，发无意义的捧场词（“蹲”、“马一个”、“插眼”）
  - 喷子：语言具有攻击性，阴阳怪气，无理由开喷
  - 热心网友/课代表：在混乱的评论区总结前情提要，或者给出具体的建议`,
    },
    {
      id: detail_mobile_id,
      name: '手机内容',
      content: formatPromptSections(
        `内容生成方向：移动终端 / 私域数字空间模拟器
请生成一个完整的“手机界面模拟页面”，重点模拟现代智能手机。页面应具有明确的 App 导航、底部 Dock 或返回区域，并通过交互切换不同 App / 账号 / 页面。`,
        `核心目标
- 页面必须像一个可操作的手机系统或 App 集合。
- 内容具有窥私感、碎片化、高情绪波动，展现角色在公开社交形象背后的真实状态。
- 交互必须帮助用户“翻手机”，而不是单纯装饰。`,
        `可模拟模块
1. 即时通讯：朋友家人聊天、情侣拉扯、舔狗、商业假笑、与陌生人的短暂交集等。
- 私聊列表显示多个会话条目、未读红点、最后一条消息、时间。
- 点击会话后进入独立聊天窗口。
- 每个私聊必须是独立窗口，不要把多个私聊混在同一个聊天框里。
- 可包含朋友、家人、暧昧对象、工作联系人、陌生人、黑名单对象等。
- 聊天元素可包含：[对方正在输入...]、语音条、转账 / 红包、已撤回、已读未回、拒收 / 拉黑提示、群公告。
2. 群聊：密友小群、家庭群、工作群、工作吐槽小群、兴趣同好怪人群等。
- 群聊应有群成员感：不同昵称、头像占位、群公告、管理员 / 群主标记等。
- 群聊节奏可以混乱：刷屏、歪楼、阴阳怪气、安慰、冷场、突然撤回。
- 群聊与私聊应分开，不要放在同一个聊天窗口。
3. 社交账号表里切换。
- 必须体现“表账号 / 里账号 / 小号”的差异。
- 可以设计账号切换器、头像下拉、Tab、滑动切换或 App 内多账号入口。
- 表账号：营业、体面、正能量、岁月静好、公开人设。
- 里账号 / 小号：发癫、泄愤、树洞、黑泥、跟踪、视奸、偏激吐槽、仅自己可见等。
- 若同一软件内出现大小号发言，需要明确区分账号身份，例如头像、昵称、账号标签、锁标记、可见范围。
4. 私密相册。
- 可分为公共相册与隐藏 / 加密相册。
5. 浏览器与搜索记录。
- 搜索记录应表现连续心理变化，而不是孤立关键词。
- 可以包含凌晨搜索、删除痕迹、无痕模式、奇怪小链接、搜索建议。
6. 账单 / 外卖 / 出行 / 日程。
- 用生活痕迹补充角色状态。
- 可模拟订单列表、退款记录、深夜外卖、异常消费、酒店 / 车票 / 药店订单、日历提醒。`,
        `交互要求
- 至少实现 4 种真实可用交互。
- 可选交互包括：App 图标点击切换页面、聊天列表进入会话 / 返回列表、表账号与里账号切换、相册缩略图放大 / 解锁隐藏相册、搜索记录展开 / 删除记录、通知弹窗 / 未读红点变化、底部导航切换、密码输入或滑动解锁。
- 所有按钮必须有效，点击后必须出现实质内容变化。`,
      ),
    },
    {
      id: 'detail-paper-physical-media',
      name: '纸媒内容',
      content: `内容生成方向：公开纸质媒介
参考现实世界中公开发行、机构归档或用于大众传播的实体印刷物。强调社会运转的客观痕迹、信息密度、排版结构与权威感（或刻意营造的噱头）。

媒介分类与情境（根据需求选择）
- 严肃与调查向：都市日报、战地新闻、官方调查报告、机构机密档案、警局卷宗、法庭记录。
- 流行与市井向：八卦周刊（注重抓人眼球）、三流猎奇小报、地下刊物、传单/通缉令、时尚或生活杂志。
- 学术与专业向：学术论文（期刊单页）、科研项目书、古籍孤本、操作说明书、蓝图/工程图纸。

文案叙事与生态逻辑
- 新闻/报告腔调：行文需带有明显的“时代媒体口吻”或“官方通报”感。注重客观陈述、时间地点人物要素齐全。
- 八卦/猎奇小报：夸张的标题党（如《震惊！深夜异闻……》），配以模糊的“路人抓拍”插图说明，行文充满主观臆测、阴谋论和煽动性。
- 学术/档案逻辑：结构严谨，充满生僻术语、编号系统（如“附件 C-04”）、引用文献、前言与结论。

版式元素与物理痕迹
- 页面结构：大字号主标题、副标题、分栏正文（News Columns）、记者/研究员署名、出版日期、页眉页脚、索引目录。
- 印刷与机构痕迹：规范的印刷体排版、官方印章/骑缝章/打孔装订痕、排版错位、油墨褪色或晕染、边缘泛黄的旧报纸质感。`,
    },
    {
      id: 'detail-private-handwriting',
      name: '私密手迹',
      content: `内容生成方向：私密手迹与个人物件
高度私人化、非公开、带有强烈情感波动和个人生活气息的手写记录与贴身物件

媒介类型与应用场景
- 私密/情绪发泄
  - 日记本：带锁的私密日记、梦境记录、随手记的流水账等
  - 信件：情书、绝交信、遗书、家书等
  - 纸条：上课传阅的折叠小纸条、留言、夹在书里的便签等
- 医疗与身体记录
  - 病历/体检单：带有医生潦草字迹的诊断书、心理咨询室的观察记录、住院护士的查房记录表
  - 处方笺、生理期/体重追踪日记
- 生活废料/碎片载体
  - 拍立得相纸背面的褪色寄语、写着电话号码的酒吧餐巾纸
  - 购物收据
  - 车票/登机牌
- 大众纸媒/公共宣告
  - 报刊类：都市晨报的社会版豆腐块、八卦小报的惊悚头条、地下非法刊物
  - 告示类：寻人/寻宠启事、通缉令、表白墙的便签等

排版元素与物理痕迹
- 情绪化的物理呈现：字迹的改变、破损的纸张、被涂黑或划掉的字词
- 岁月与随身痕迹：折痕与揉搓的痕迹、不平整的撕裂边缘、斑驳的水渍/泪痕/咖啡渍/血迹、不同颜的笔的交替使用、烧焦边缘、撕裂缺口、发黄纸张、油墨晕染、裁切不齐、钉书针孔、打孔装订痕
- 混合媒介容器：日记本里夹带的票根、透明胶带修补的撕碎信纸、Scrapbook式的剪贴与随手涂鸦`,
    },
    {
      id: 'detail-video-visual-media',
      name: '影像内容',
      content: `内容生成方向：影像媒介
参考影视节目、视频平台、电视转播、纪录片、直播、录像带、监控录像与流媒体页面。页面需体现“正在观看影像”的媒介感。

可模拟的媒介类型（根据内容自由搭配）
- 视频平台：视频网站播放页、短视频信息流、直播平台、会员点播页面、付费录像资源页
- 节目类型：纪录片、新闻直播、深夜访谈节目、真人秀、电台录像、调查节目、都市传说栏目、游戏直播、Reaction 视频、Vlog、军事简报录像、安防监控录像、审讯录像、VHS / DV / 磁带转录、教学录像、广告片 / 预告片
- 特殊影像载体：多监控画面、老电视节目、模拟雪花屏信号、黑白胶片、手机竖屏录像、行车记录仪、无人机航拍、Bodycam 执法录像、战地记者镜头、ARG / 都市怪谈录像

页面形态与播放器元素
- 播放器区域：播放器外壳、播放按钮、时间轴、缓冲条、音量控件、倍速播放、分辨率标签、LIVE 状态、观看人数、自动播放列表
- 影像信息：视频标题、上传者 / 频道信息、发布时间、Tags、热度数据、点赞 / 收藏 / 转发
- 互动区域：评论区、实时弹幕、Super Chat、礼物打赏、观众投票、楼中楼回复
- 镜头语言表现：镜头切换提示、运镜说明、字幕条、Timecode、镜头编号、旁白文本、“画面中出现”、“镜头突然中断”、信号干扰、音频爆裂、自动字幕错误

文案与语言风格
- 直播 / 弹幕：高频即时互动、大量缩写、梗、重复刷屏、情绪化、群体感染感强
- 纪录片 / 新闻：冷静叙述、强调真实性与证据感、使用采访摘录与旁白
- VHS / 旧录像：含糊、不完整、带时间损坏感、存在跳帧与缺失片段
- 访谈节目：主持人与嘉宾互动、插入现场观众反应、镜头切给表情特写
- 都市传说 / ARG：模糊真实性、强烈“被上传到网上”的感觉、评论区成为叙事一部分`,
    },
    {
      id: 'detail-classical-oriental',
      name: '东方古典',
      content: `内容生成方向：东方古典文化载体
将网页包装成古代的信息传播媒介。严禁出现现代互联网词汇，内容需具有浓厚的历史感、江湖气或朝堂氛围。

页面形态与元素选择（根据具体情节混合搭配）
- 官方文书：邸报（古代新闻）、海捕文书（通缉令）、皇榜、官府告示、案卷宗理。
- 江湖市井：风云榜单、武林秘籍残卷、客栈说书人的手记、黑市悬赏单。
- 私人往来：飞鸽传书、密信、请帖、家书。
- 文人雅集：诗会卷轴、酒局记事、字画题跋、手札。

界面文案与视觉元素映射
- 摒弃现代 UI 词汇：用“卷首语”代替导语，用“朱批/按语”代替评论，用“钤印/落款”代替发布者信息，用“阅后即焚/加急”代替状态标签。
- 视觉风格暗示：文字多采用竖排（或视觉上模拟竖排排版）、繁体字（可选）、水墨晕染、印章红、泛黄宣纸背景、竹简纹理。

语言风格与文案表现
- 官方文书：半文半白，用词严谨、冷酷、带有威严感。
- 江湖市井：说书人口吻，带有夸张色彩，充满江湖切口与隐喻。
- 私人往来：情感细腻，遣词造句古典文雅，或因紧急情况而字迹潦草（通过引入 CSS 字体表现）。`,
    },
    {
      id: 'detail-western-fantasy',
      name: '西式奇幻',
      content: `内容生成方向：西式奇幻世界载体
将网页包装成奇幻世界中的信息载体。内容需包含魔法、种族、神明、冒险者等西幻经典元素，氛围感强。

页面形态与元素选择（根据具体情节混合搭配）
- 冒险者公会：悬赏看板（羊皮纸贴纸）、怪物讨伐记录、组队招募启事、物资交易清单。
- 魔法学院/学者：炼金配方、魔导书残页、星象观测日志、古神遗迹考察报告。
- 宫廷与势力：领主颁布的法令、异端审判庭的秘密档案、贵族间的加密信函。
- 酒馆与市井：吟游诗人的歌谣集、酒馆流言板、黑市地下交易暗号、地下城生存指南。

界面文案与视觉元素映射
- 元素替换：使用“赏金/金币/铜币”等代替点赞数，使用“危险评级(S/A/B)”等代替标签，使用“附魔刻印/封蜡”等代替验证状态，使用“羊皮纸/石板/水晶终端”作为背景材质。
- 排版特征：哥特式字体标题（英文）、神秘学符文边框、残破的纸张边缘、手写体笔记标注。`,
    },
  ];
  const default_secondary_api = {
    enabled: false,
    provider: 'openai',
    apiurl: '',
    key: '',
    model: '',
    source: 'openai',
    proxy_password: '',
    vertex_token: '',
    vertex_location: '',
    vertex_project_id: '',
    providers: {
      openai: { apiurl: '', key: '', model: '' },
      google_ai_studio: { key: '', proxy_url: '', proxy_password: '', model: '' },
      vertex_ai: { key: '', vertex_token: '', vertex_location: '', vertex_project_id: '', model: '' },
    },
  } satisfies SettingsSecondaryApiConfig;
  const default_secondary_api_profile_id = 'secondary-api-default';
  const default_image_generation = getDefaultImageGenerationSettings();
  return {
    active_prompt_id: default_prompt_id,
    active_base_prompt_id: base_content_id,
    active_detail_prompt_id: detail_modern_id,
    active_summary_tag_id: 'summary-meow-fm',
    auto_generate: true,
    chat_history_depth: 20,
    mobile_view_scale: 0.9,
    theme_mode: 'system',
    theme_schedule: {
      day_start: '06:00',
      night_start: '18:00',
    },
    appearance: getDefaultAppearanceSettings(),
    bubble_style: getDefaultBubbleStyleSettings(),
    online_storage: getDefaultOnlineStorageSettings(),
    generation_retry: {
      enabled: false,
      timeout_ms: 360000,
      max_retries: 3,
    },
    launch_entry_modes: ['floating_ball'],
    excluded_character_names: [],
    excluded_tags: [...DEFAULT_EXCLUDED_TAGS],
    random_detail_prompt: {
      enabled: false,
      prompt_ids: [],
      count: 1,
      trigger_probability: 100,
    },
    secondary_api: default_secondary_api,
    secondary_api_profiles: [
      {
        id: default_secondary_api_profile_id,
        name: '默认配置',
        config: default_secondary_api,
      },
    ],
    active_secondary_api_profile_id: default_secondary_api_profile_id,
    image_generation: default_image_generation,
    summary_tags: [
      {
        id: 'summary-meow-fm',
        name: '喵喵电波',
        open_tag: '<meow_FM>',
        close_tag: '</meow_FM>',
      },
      {
        id: 'summary-sodom',
        name: '索多玛',
        open_tag: '<Sodom>',
        close_tag: '</Sodom>',
      },
    ],
    worldbook_entry_overrides: {},
    base_prompts,
    detail_prompt_folders,
    detail_prompt_tags,
    detail_prompts,
    prompts: [
      {
        id: default_prompt_id,
        name: '默认',
        base_prompt_id: base_content_id,
        detail_prompt_id: detail_modern_id,
        base_content: base_prompts.find(prompt => prompt.id === base_content_id)?.content || base_prompts[0].content,
        detail_content: detail_prompts[0].content,
      },
      {
        id: mobile_prompt_id,
        name: '手机',
        base_prompt_id: base_mobile_id,
        detail_prompt_id: detail_mobile_id,
        base_content: base_prompts.find(prompt => prompt.id === base_mobile_id)?.content || '',
        detail_content: detail_prompts.find(prompt => prompt.id === detail_mobile_id)?.content || '',
      },
    ],
  };
}

function normalizePromptItem(
  item: Partial<SettingsPromptItem> | null | undefined,
  fallback_name = '未命名提示词',
  fallback_folder_id = DEFAULT_DETAIL_PROMPT_FOLDER_ID,
): SettingsPromptItemRuntime {
  return {
    id: item?.id || createPromptId(),
    name: String(item?.name || fallback_name),
    description: String(item?.description || ''),
    content: String(item?.content ?? ''),
    folder_id: String(item?.folder_id || fallback_folder_id),
    tags: Array.isArray(item?.tags) ? [...new Set(item.tags.map(tag => String(tag).trim()).filter(Boolean))] : [],
    created_at: String(item?.created_at || ''),
    source: item?.source || 'personal',
    is_published: Boolean(item?.is_published),
  };
}

function stripPromptItemRuntimeFields(
  item: Partial<SettingsPromptItem> | null | undefined,
  fallback_name = '未命名提示词',
  fallback_folder_id = DEFAULT_DETAIL_PROMPT_FOLDER_ID,
): SettingsPromptItem {
  const normalized = normalizePromptItem(item, fallback_name, fallback_folder_id);
  return {
    id: normalized.id,
    name: normalized.name,
    description: normalized.description,
    content: normalized.content,
    folder_id: normalized.folder_id,
    tags: normalized.tags,
    created_at: normalized.created_at,
  };
}

function normalizeDetailPromptFolder(folder: Partial<SettingsPromptFolder> | null | undefined): SettingsPromptFolder {
  return {
    id: String(folder?.id || createPromptId()),
    name: String(folder?.name || '未命名文件夹'),
  };
}

function stripDetailPromptFolder(folder: Partial<SettingsPromptFolder> | null | undefined): SettingsPromptFolder {
  const normalized = normalizeDetailPromptFolder(folder);
  return {
    id: normalized.id,
    name: normalized.name,
  };
}

function normalizePromptPreset(
  prompt: Partial<SettingsPromptPreset> | null | undefined,
  fallback_ids: Partial<Pick<SettingsPromptPreset, 'base_prompt_id' | 'detail_prompt_id'>> = {},
): SettingsPromptPreset {
  return {
    id: prompt?.id || createPromptId(),
    name: String(prompt?.name || '未命名提示词'),
    base_prompt_id: prompt?.base_prompt_id || fallback_ids.base_prompt_id || '',
    detail_prompt_id: prompt?.detail_prompt_id || fallback_ids.detail_prompt_id || '',
    base_content: String(prompt?.base_content || ''),
    detail_content: String(prompt?.detail_content || prompt?.content || ''),
  };
}

function stripPromptRuntimeFields(prompt: Partial<SettingsPromptPreset> | null | undefined): SettingsPromptPreset {
  const normalized = normalizePromptPreset(prompt);
  return {
    id: normalized.id,
    name: normalized.name,
    base_prompt_id: normalized.base_prompt_id,
    detail_prompt_id: normalized.detail_prompt_id,
    base_content: normalized.base_content,
    detail_content: normalized.detail_content,
  };
}

function normalizeSummaryTagPreset(
  tag: Partial<SettingsSummaryTagPreset> | null | undefined,
  fallback_name = '未命名摘要标签',
): SettingsSummaryTagPreset {
  return {
    id: tag?.id || createPromptId(),
    name: String(tag?.name || fallback_name),
    open_tag: String(tag?.open_tag || ''),
    close_tag: String(tag?.close_tag || ''),
  };
}

function stripSummaryTagRuntimeFields(
  tag: Partial<SettingsSummaryTagPreset> | null | undefined,
): SettingsSummaryTagPreset {
  const normalized = normalizeSummaryTagPreset(tag);
  return {
    id: normalized.id,
    name: normalized.name,
    open_tag: normalized.open_tag,
    close_tag: normalized.close_tag,
  };
}

function getPublishedPromptPresets() {
  const raw = readScriptVariableValue(PUBLISHED_PROMPTS_KEY, []);
  return Array.isArray(raw) ? raw.map(prompt => stripPromptRuntimeFields(prompt)) : [];
}

function savePublishedPromptPresets(prompts: SettingsPromptPreset[]) {
  return writeScriptVariableValue(PUBLISHED_PROMPTS_KEY, prompts.map(stripPromptRuntimeFields));
}

function getPublishedBasePromptItems() {
  const raw = readScriptVariableValue(PUBLISHED_BASE_PROMPTS_KEY, []);
  return Array.isArray(raw) ? raw.map(item => stripPromptItemRuntimeFields(item, '未命名基础提示词')) : [];
}

function savePublishedBasePromptItems(items: SettingsPromptItem[]) {
  return writeScriptVariableValue(
    PUBLISHED_BASE_PROMPTS_KEY,
    items.map(item => stripPromptItemRuntimeFields(item, '未命名基础提示词')),
  );
}

function getPublishedDetailPromptItems() {
  const raw = readScriptVariableValue(PUBLISHED_DETAIL_PROMPTS_KEY, []);
  return Array.isArray(raw) ? raw.map(item => stripPromptItemRuntimeFields(item, '未命名个性化提示词')) : [];
}

function savePublishedDetailPromptItems(items: SettingsPromptItem[]) {
  return writeScriptVariableValue(
    PUBLISHED_DETAIL_PROMPTS_KEY,
    items.map(item => stripPromptItemRuntimeFields(item, '未命名个性化提示词')),
  );
}

function getPublishedSummaryTagPresets() {
  const raw = readScriptVariableValue(PUBLISHED_SUMMARY_TAGS_KEY, []);
  return Array.isArray(raw) ? raw.map(tag => stripSummaryTagRuntimeFields(tag)) : [];
}

function savePublishedSummaryTagPresets(tags: SettingsSummaryTagPreset[]) {
  return writeScriptVariableValue(PUBLISHED_SUMMARY_TAGS_KEY, tags.map(stripSummaryTagRuntimeFields));
}

function mergePromptItems(
  default_items: SettingsPromptItem[],
  published_items: SettingsPromptItem[],
  personal_items: SettingsPromptItem[],
  fallback_name: string,
): SettingsPromptItemRuntime[] {
  const merged = new Map<string, SettingsPromptItemRuntime>();
  const published_ids = new Set(published_items.map((item: SettingsPromptItem) => item.id));
  default_items.forEach((item: SettingsPromptItem) => {
    merged.set(item.id, {
      ...stripPromptItemRuntimeFields(item, fallback_name),
      source: 'default',
      is_published: published_ids.has(item.id),
    });
  });
  published_items.forEach((item: SettingsPromptItem) => {
    const stripped = stripPromptItemRuntimeFields(item, fallback_name);
    merged.set(stripped.id, {
      ...stripped,
      source: 'published',
      is_published: true,
    });
  });
  personal_items.forEach((item: SettingsPromptItem) => {
    const stripped = stripPromptItemRuntimeFields(item, fallback_name);
    merged.set(stripped.id, {
      ...stripped,
      source: 'personal',
      is_published: published_ids.has(stripped.id),
    });
  });
  return [...merged.values()];
}

function mergeSummaryTagPresets(
  default_tags: SettingsSummaryTagPreset[],
  published_tags: SettingsSummaryTagPreset[],
  personal_tags: SettingsSummaryTagPreset[],
): SettingsSummaryTagRuntime[] {
  const merged = new Map<string, SettingsSummaryTagRuntime>();
  const published_ids = new Set(published_tags.map((tag: SettingsSummaryTagPreset) => tag.id));
  default_tags.forEach((tag: SettingsSummaryTagPreset) => {
    merged.set(tag.id, {
      ...stripSummaryTagRuntimeFields(tag),
      source: 'default',
      is_published: published_ids.has(tag.id),
    });
  });
  published_tags.forEach((tag: SettingsSummaryTagPreset) => {
    merged.set(tag.id, {
      ...stripSummaryTagRuntimeFields(tag),
      source: 'published',
      is_published: true,
    });
  });
  personal_tags.forEach((tag: SettingsSummaryTagPreset) => {
    const stripped = stripSummaryTagRuntimeFields(tag);
    merged.set(stripped.id, {
      ...stripped,
      source: 'personal',
      is_published: published_ids.has(stripped.id),
    });
  });
  return [...merged.values()];
}

function mergePromptPresets(
  default_prompts: SettingsPromptPreset[],
  published_prompts: SettingsPromptPreset[],
  personal_prompts: SettingsPromptPreset[],
): SettingsPromptPresetRuntime[] {
  const merged = new Map<string, SettingsPromptPresetRuntime>();
  const published_ids = new Set(published_prompts.map((prompt: SettingsPromptPreset) => prompt.id));
  default_prompts.forEach((prompt: SettingsPromptPreset) => {
    merged.set(prompt.id, {
      ...stripPromptRuntimeFields(prompt),
      source: 'default',
      is_published: published_ids.has(prompt.id),
    });
  });
  published_prompts.forEach((prompt: SettingsPromptPreset) => {
    merged.set(prompt.id, {
      ...stripPromptRuntimeFields(prompt),
      source: 'published',
      is_published: true,
    });
  });
  personal_prompts.forEach((prompt: SettingsPromptPreset) => {
    const stripped = stripPromptRuntimeFields(prompt);
    merged.set(stripped.id, {
      ...stripped,
      source: 'personal',
      is_published: published_ids.has(stripped.id),
    });
  });
  return [...merged.values()];
}

function getBuiltinPromptSyncConflicts(settings = getSettings()) {
  const fallback = getDefaultSettings();
  const normalized = normalizeSettings(settings);
  const conflicts: SettingsConflict[] = [];
  const same_json = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
  const collect = (
    type: SettingsConflict['type'],
    label: string,
    current_items: Array<SettingsPromptItemRuntime | SettingsPromptPresetRuntime>,
    builtin_items: Array<SettingsPromptItem | SettingsPromptPreset>,
    strip: (
      item: Partial<SettingsPromptItem> | Partial<SettingsPromptPreset> | null | undefined,
      fallback_name?: string,
    ) => SettingsPromptItem | SettingsPromptPreset,
    fallback_name: string,
  ) => {
    builtin_items.forEach(builtin_item => {
      const current_item = current_items.find(item => item.id === builtin_item.id);
      if (!current_item || current_item.source !== 'personal') {
        return;
      }
      const current_stripped = strip(current_item, fallback_name);
      const builtin_stripped = strip(builtin_item, fallback_name);
      if (!same_json(current_stripped, builtin_stripped)) {
        conflicts.push({
          type,
          id: builtin_item.id,
          name: current_item.name || builtin_item.name || builtin_item.id,
          label: label + '：' + (current_item.name || builtin_item.name || builtin_item.id),
          current: current_stripped,
          builtin: builtin_stripped,
        });
      }
    });
  };

  collect(
    'base',
    '基础提示词',
    normalized.base_prompts,
    fallback.base_prompts,
    stripPromptItemRuntimeFields,
    '未命名基础提示词',
  );
  collect(
    'detail',
    '个性化提示词',
    normalized.detail_prompts,
    fallback.detail_prompts,
    stripPromptItemRuntimeFields,
    '未命名个性化提示词',
  );
  collect('preset', '完整预设', normalized.prompts, fallback.prompts, stripPromptRuntimeFields, '未命名完整预设');
  return conflicts;
}

function syncBuiltinPromptTemplates(settings = getSettings(), mode = 'overwrite') {
  const fallback = getDefaultSettings();
  const normalized = normalizeSettings(settings);
  const conflicts = getBuiltinPromptSyncConflicts(normalized);
  const fallback_base_ids = new Set(fallback.base_prompts.map(item => item.id));
  const fallback_detail_ids = new Set(fallback.detail_prompts.map(item => item.id));
  const fallback_prompt_ids = new Set(fallback.prompts.map(item => item.id));
  const conflicts_by_key = new Map(conflicts.map((item: SettingsConflict) => [item.type + ':' + item.id, item]));
  const base_id_map: Record<string, string> = {};
  const detail_id_map: Record<string, string> = {};
  let saved_copy_count = 0;

  const backup_name = (name: string) => String(name || '未命名模板') + '（同步前备份）';
  const next_base_prompts = normalized.base_prompts.filter(
    item => !(fallback_base_ids.has(item.id) && item.source === 'personal'),
  );
  const next_detail_prompts = normalized.detail_prompts.filter(
    item => !(fallback_detail_ids.has(item.id) && item.source === 'personal'),
  );
  const next_prompts = normalized.prompts.filter(
    item => !(fallback_prompt_ids.has(item.id) && item.source === 'personal'),
  );

  if (mode === 'save_as') {
    fallback.base_prompts.forEach((builtin_item: SettingsPromptItem) => {
      const conflict = conflicts_by_key.get('base:' + builtin_item.id);
      if (!conflict) {
        return;
      }
      const copy_id = createPromptId();
      base_id_map[builtin_item.id] = copy_id;
      next_base_prompts.push({
        ...(conflict.current as SettingsPromptItem),
        id: copy_id,
        name: backup_name(conflict.current.name),
        source: 'personal',
        is_published: false,
      });
      saved_copy_count += 1;
    });
    fallback.detail_prompts.forEach((builtin_item: SettingsPromptItem) => {
      const conflict = conflicts_by_key.get('detail:' + builtin_item.id);
      if (!conflict) {
        return;
      }
      const copy_id = createPromptId();
      detail_id_map[builtin_item.id] = copy_id;
      next_detail_prompts.push({
        ...(conflict.current as SettingsPromptItem),
        id: copy_id,
        name: backup_name(conflict.current.name),
        source: 'personal',
        is_published: false,
      });
      saved_copy_count += 1;
    });
    fallback.prompts.forEach((builtin_item: SettingsPromptPreset) => {
      const conflict = conflicts_by_key.get('preset:' + builtin_item.id);
      if (!conflict) {
        return;
      }
      const current_preset = conflict.current as SettingsPromptPreset;
      next_prompts.push({
        ...current_preset,
        id: createPromptId(),
        name: backup_name(current_preset.name),
        base_prompt_id: base_id_map[current_preset.base_prompt_id] || current_preset.base_prompt_id,
        detail_prompt_id: detail_id_map[current_preset.detail_prompt_id] || current_preset.detail_prompt_id,
        source: 'personal',
        is_published: false,
      });
      saved_copy_count += 1;
    });
  }

  const next_settings = saveSettings({
    ...normalized,
    base_prompts: next_base_prompts,
    detail_prompts: next_detail_prompts,
    prompts: next_prompts,
  });
  return {
    settings: next_settings,
    conflicts,
    saved_copy_count,
  };
}

function normalizeSecondaryApiProviderValue(provider: unknown, source: unknown): SettingsSecondaryApiProvider {
  if (provider === 'openai' || provider === 'google_ai_studio' || provider === 'vertex_ai') return provider;
  if (source === 'google_ai_studio' || source === 'vertex_ai') return source;
  return 'openai';
}

function normalizeLaunchEntryModes(modes: unknown): SettingsLaunchEntryMode[] {
  const allowed: SettingsLaunchEntryMode[] = ['floating_ball', 'qr_button', 'extensions_menu'];
  const next_modes = Array.isArray(modes)
    ? modes.filter((mode): mode is SettingsLaunchEntryMode => allowed.includes(mode as SettingsLaunchEntryMode))
    : [];
  return next_modes.length ? [...new Set(next_modes)] : ['floating_ball'];
}

function createSecondaryApiProfileId() {
  return `secondary-api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createImageGenerationPresetId() {
  return `image-preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createImageGenerationVibeGroupId() {
  return `vibe-group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createImageGenerationVibeReferenceId() {
  return `vibe-ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  return Math.floor(clampNumber(value, fallback, min, max));
}

function clampPromptText(value: unknown) {
  return String(value || '').slice(0, 512);
}

function normalizeImageGenerationConnectionMode(value: unknown): SettingsImageGenerationConnectionMode {
  return value === 'custom' ? 'custom' : 'official';
}

function normalizeImageGenerationMode(value: unknown): SettingsImageGenerationMode {
  return value === 'gpt_image' ? 'gpt_image' : 'novelai';
}

function normalizeImageGenerationSizePreset(value: unknown, width: unknown, height: unknown) {
  const requested = String(value || '').trim();
  if (IMAGE_GENERATION_SIZE_PRESETS[requested]) {
    return requested;
  }
  const legacy_width = clampInteger(width, 1024, 64, 4096);
  const legacy_height = clampInteger(height, 1024, 64, 4096);
  const legacy_key = `${legacy_width}x${legacy_height}`;
  return legacy_width % 64 === 0 && legacy_height % 64 === 0 ? legacy_key : '1024x1024';
}

function getDefaultImageGenerationPreset(): SettingsImageGenerationPreset {
  return {
    id: 'image-preset-novelai-default',
    name: 'NovelAI 默认',
    connection_mode: 'official',
    endpoint: '',
    api_key: '',
    positive_prompt: '',
    negative_prompt: '',
    model: 'nai-diffusion-4-5-full',
    sampler: 'Euler',
    noise_schedule: 'karras',
    prompt_guidance: 10,
    prompt_guidance_rescale: 0.18,
    size_preset: '1024x1024',
    width: 1024,
    height: 1024,
    steps: 28,
    seed: 0,
    ai_default_character_position: true,
    smea: true,
    smea_dyn: true,
    variety: true,
    decrisp: true,
    prompt_references: [],
  };
}

function normalizeImageGenerationPreset(
  preset: Partial<SettingsImageGenerationPreset> | null | undefined,
  index = 0,
): SettingsImageGenerationPreset {
  const fallback = getDefaultImageGenerationPreset();
  const size_preset = normalizeImageGenerationSizePreset(preset?.size_preset, preset?.width, preset?.height);
  const [width, height] = size_preset.split('x').map(Number);
  return {
    id: String(preset?.id || (index === 0 ? fallback.id : createImageGenerationPresetId())),
    name: String(preset?.name || (index === 0 ? fallback.name : `生图预设 ${index + 1}`)).trim() || fallback.name,
    connection_mode: normalizeImageGenerationConnectionMode(preset?.connection_mode),
    endpoint: String(preset?.endpoint || '').trim(),
    api_key: String(preset?.api_key || ''),
    positive_prompt: clampPromptText(preset?.positive_prompt),
    negative_prompt: clampPromptText(preset?.negative_prompt),
    model: String(preset?.model || fallback.model).trim() || fallback.model,
    sampler: String(preset?.sampler || fallback.sampler).trim() || fallback.sampler,
    noise_schedule: String(preset?.noise_schedule || fallback.noise_schedule).trim() || fallback.noise_schedule,
    prompt_guidance: clampNumber(preset?.prompt_guidance, fallback.prompt_guidance, 0, 30),
    prompt_guidance_rescale: clampNumber(
      preset?.prompt_guidance_rescale,
      fallback.prompt_guidance_rescale,
      0,
      1,
    ),
    size_preset,
    width,
    height,
    steps: clampInteger(preset?.steps, fallback.steps, 1, 100),
    seed: clampInteger(preset?.seed, fallback.seed, 0, 4294967295),
    ai_default_character_position: preset?.ai_default_character_position ?? fallback.ai_default_character_position,
    smea: preset?.smea ?? fallback.smea,
    smea_dyn: preset?.smea_dyn ?? fallback.smea_dyn,
    variety: preset?.variety ?? fallback.variety,
    decrisp: preset?.decrisp ?? fallback.decrisp,
    prompt_references: Array.isArray(preset?.prompt_references)
      ? preset.prompt_references.map((reference, reference_index) => normalizeImageGenerationPromptReference(reference, reference_index))
      : [],
  };
}

function normalizeImageGenerationVibeReference(
  reference: Partial<SettingsImageGenerationVibeReference> | null | undefined,
  index = 0,
): SettingsImageGenerationVibeReference {
  return {
    id: String(reference?.id || createImageGenerationVibeReferenceId()),
    name: String(reference?.name || reference?.file_name || `参考图 ${index + 1}`).trim() || `参考图 ${index + 1}`,
    image_data: String(reference?.image_data || ''),
    file_name: String(reference?.file_name || ''),
    source: reference?.source === 'baibai' ? 'baibai' : reference?.source === 'naiv4vibe' ? 'naiv4vibe' : 'upload',
    encodings: reference?.encodings || {},
    strength: clampNumber(reference?.strength, 0.6, 0, 1),
    metadata_prompt: clampPromptText(reference?.metadata_prompt),
    metadata_negative_prompt: clampPromptText(reference?.metadata_negative_prompt),
  };
}

function normalizeImageGenerationPromptReference(
  reference: Partial<SettingsImageGenerationPromptReference> | null | undefined,
  index = 0,
): SettingsImageGenerationPromptReference {
  return {
    id: String(reference?.id || `prompt-ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name: String(reference?.name || reference?.file_name || `提示词参考图 ${index + 1}`).trim() || `提示词参考图 ${index + 1}`,
    image_data: String(reference?.image_data || ''),
    file_name: String(reference?.file_name || ''),
    metadata_prompt: clampPromptText(reference?.metadata_prompt),
    metadata_negative_prompt: clampPromptText(reference?.metadata_negative_prompt),
  };
}

function normalizeImageGenerationVibeGroup(
  group: Partial<SettingsImageGenerationVibeGroup> | null | undefined,
  index = 0,
): SettingsImageGenerationVibeGroup {
  return {
    id: String(group?.id || (index === 0 ? 'vibe-group-default' : createImageGenerationVibeGroupId())),
    name: String(group?.name || (index === 0 ? '默认 Vibe' : `Vibe 组 ${index + 1}`)).trim() || '默认 Vibe',
    auto_name: group?.auto_name ?? true,
    style_strength: clampNumber(group?.style_strength, 0.6, 0, 1),
    references: Array.isArray(group?.references)
      ? group.references.map((reference, ref_index) => normalizeImageGenerationVibeReference(reference, ref_index))
      : [],
  };
}

function getDefaultImageGenerationSettings(): SettingsImageGeneration {
  const preset = getDefaultImageGenerationPreset();
  const vibe_group = normalizeImageGenerationVibeGroup(null, 0);
  return {
    enabled: false,
    mode: 'novelai',
    gpt_image: normalizeGptImageSettings(),
    active_preset_id: preset.id,
    presets: [preset],
    active_vibe_group_id: vibe_group.id,
    vibe_groups: [vibe_group],
    vibe_library: [],
  };
}

function normalizeImageGenerationSettings(
  image_generation: Partial<SettingsImageGeneration> | null | undefined,
): SettingsImageGeneration {
  const fallback = getDefaultImageGenerationSettings();
  const presets = Array.isArray(image_generation?.presets) && image_generation.presets.length
    ? image_generation.presets.map((preset, index) => normalizeImageGenerationPreset(preset, index))
    : fallback.presets.map((preset, index) => normalizeImageGenerationPreset(preset, index));
  const vibe_groups = Array.isArray(image_generation?.vibe_groups) && image_generation.vibe_groups.length
    ? image_generation.vibe_groups.map((group, index) => normalizeImageGenerationVibeGroup(group, index))
    : fallback.vibe_groups.map((group, index) => normalizeImageGenerationVibeGroup(group, index));
  const library_source = Array.isArray(image_generation?.vibe_library)
    ? image_generation.vibe_library
    : vibe_groups.flatMap(group => group.references);
  const vibe_library = [...new Map(
    library_source.map((reference, index) => {
      const normalized = normalizeImageGenerationVibeReference(reference, index);
      return [normalized.id, normalized] as const;
    }),
  ).values()];
  const active_preset_id = presets.some(preset => preset.id === image_generation?.active_preset_id)
    ? String(image_generation?.active_preset_id)
    : presets[0].id;
  const active_vibe_group_id = vibe_groups.some(group => group.id === image_generation?.active_vibe_group_id)
    ? String(image_generation?.active_vibe_group_id)
    : vibe_groups[0].id;
  return {
    enabled: Boolean(image_generation?.enabled),
    mode: normalizeImageGenerationMode(image_generation?.mode),
    gpt_image: normalizeGptImageSettings(image_generation?.gpt_image),
    active_preset_id,
    presets,
    active_vibe_group_id,
    vibe_groups,
    vibe_library,
  };
}

function normalizeSecondaryApiSettings(config: Partial<SettingsSecondaryApiConfig> | null | undefined): SettingsSecondaryApiConfig {
  const provider = normalizeSecondaryApiProviderValue(config?.provider, config?.source);
  const legacy_apiurl = String(config?.apiurl || '');
  const legacy_key = String(config?.key || '');
  const legacy_model = String(config?.model || '');
  const source_provider = normalizeSecondaryApiProviderValue(config?.provider, config?.source);
  const provider_config = <T extends SettingsSecondaryApiProvider>(
    key: T,
  ): Partial<SettingsSecondaryApiProviderConfigMap[T]> =>
    config?.providers && typeof config.providers === 'object'
      ? (config.providers[key] || {}) as Partial<SettingsSecondaryApiProviderConfigMap[T]>
      : {};
  const openai_raw = provider_config('openai');
  const google_raw = provider_config('google_ai_studio');
  const vertex_raw = provider_config('vertex_ai');
  const google_legacy = google_raw as Partial<SettingsSecondaryApiProviderConfigMap['google_ai_studio']> & {
    apiurl?: string;
  };
  const openai = {
    apiurl: String(openai_raw.apiurl ?? (source_provider === 'openai' ? legacy_apiurl : '')),
    key: String(openai_raw.key ?? (source_provider === 'openai' ? legacy_key : '')),
    model: String(openai_raw.model ?? (source_provider === 'openai' ? legacy_model : '')),
  };
  const google_ai_studio = {
    key: String(google_raw.key ?? (source_provider === 'google_ai_studio' ? legacy_key : '')),
    proxy_url: String(
      google_raw.proxy_url ?? google_legacy.apiurl ?? (source_provider === 'google_ai_studio' ? legacy_apiurl : ''),
    ),
    proxy_password: String(google_raw.proxy_password ?? config?.proxy_password ?? ''),
    model: String(google_raw.model ?? (source_provider === 'google_ai_studio' ? legacy_model : '')),
  };
  const vertex_ai = {
    key: String(vertex_raw.key ?? (source_provider === 'vertex_ai' ? legacy_key : '')),
    vertex_token: String(vertex_raw.vertex_token ?? config?.vertex_token ?? ''),
    vertex_location: String(vertex_raw.vertex_location ?? config?.vertex_location ?? ''),
    vertex_project_id: String(vertex_raw.vertex_project_id ?? config?.vertex_project_id ?? ''),
    model: String(vertex_raw.model ?? (source_provider === 'vertex_ai' ? legacy_model : '')),
  };
  const providers: SettingsSecondaryApiProviderConfigMap = { openai, google_ai_studio, vertex_ai };
  const active = providers[provider] || openai;
  const active_model = String(active.model || legacy_model || '');
  return {
    enabled: Boolean(config?.enabled),
    provider,
    apiurl: provider === 'openai' ? openai.apiurl : provider === 'google_ai_studio' ? google_ai_studio.proxy_url : '',
    key: provider === 'vertex_ai' ? vertex_ai.key : active.key || '',
    model: active_model,
    source: provider,
    proxy_password: provider === 'google_ai_studio' ? google_ai_studio.proxy_password : '',
    vertex_token: provider === 'vertex_ai' ? vertex_ai.vertex_token : '',
    vertex_location: provider === 'vertex_ai' ? vertex_ai.vertex_location : '',
    vertex_project_id: provider === 'vertex_ai' ? vertex_ai.vertex_project_id : '',
    providers,
  };
}

function normalizeSecondaryApiProfile(
  profile: Partial<SettingsSecondaryApiProfile> | null | undefined,
  index = 0,
): SettingsSecondaryApiProfile {
  const legacy_config =
    profile && typeof profile === 'object' && !('config' in profile)
      ? (profile as Partial<SettingsSecondaryApiConfig>)
      : undefined;
  const config = normalizeSecondaryApiSettings(profile?.config ?? legacy_config);
  return {
    id: String(profile?.id || createSecondaryApiProfileId()),
    name: String(profile?.name || `配置 ${index + 1}`).trim() || `配置 ${index + 1}`,
    config,
  };
}

function normalizeSettings(settings: SettingsInput | null | undefined): SettingsState {
  const fallback = getDefaultSettings();
  const has_split_prompt_settings = Array.isArray(settings?.base_prompts) && Array.isArray(settings?.detail_prompts);
  const personal_base_prompts = Array.isArray(settings?.base_prompts)
    ? settings.base_prompts.map(item => normalizePromptItem(item, '未命名基础提示词', DEFAULT_DETAIL_PROMPT_FOLDER_ID))
    : [];
  const normalized_detail_prompt_folders = Array.isArray(settings?.detail_prompt_folders)
    ? settings.detail_prompt_folders.map(stripDetailPromptFolder).filter(folder => folder.id && folder.name)
    : [];
  const detail_prompt_tags = Array.isArray(settings?.detail_prompt_tags)
    ? [...new Set(settings.detail_prompt_tags.map(tag => String(tag).trim()).filter(Boolean))]
    : fallback.detail_prompt_tags;
  const detail_prompt_folders = normalized_detail_prompt_folders.length
    ? normalized_detail_prompt_folders
    : fallback.detail_prompt_folders.map(stripDetailPromptFolder);
  const detail_folder_ids = new Set(detail_prompt_folders.map(folder => folder.id));
  const default_detail_folder_id = detail_prompt_folders[0]?.id || DEFAULT_DETAIL_PROMPT_FOLDER_ID;
  const builtin_detail_prompt_folder_id =
    settings?.builtin_detail_prompt_folder_id &&
    detail_folder_ids.has(String(settings.builtin_detail_prompt_folder_id))
      ? String(settings.builtin_detail_prompt_folder_id)
      : '';
  const personal_detail_prompts = Array.isArray(settings?.detail_prompts)
    ? settings.detail_prompts.map(item => normalizePromptItem(item, '未命名个性化提示词', default_detail_folder_id))
    : [];
  const deleted_builtin_detail_prompt_ids = new Set(
    Array.isArray(settings?.deleted_builtin_detail_prompt_ids)
      ? settings.deleted_builtin_detail_prompt_ids.map(String)
      : [],
  );
  const normalized_base_prompts = mergePromptItems(
    fallback.base_prompts,
    getPublishedBasePromptItems(),
    personal_base_prompts.filter(prompt => prompt.source !== 'default' && prompt.source !== 'published'),
    '未命名基础提示词',
  );
  const normalized_detail_prompts = mergePromptItems(
    fallback.detail_prompts,
    getPublishedDetailPromptItems(),
    personal_detail_prompts.filter(prompt => prompt.source !== 'default' && prompt.source !== 'published'),
    '未命名个性化提示词',
  ).filter(prompt => !(prompt.source === 'default' && deleted_builtin_detail_prompt_ids.has(prompt.id)));
  const normalized_prompts =
    has_split_prompt_settings && Array.isArray(settings?.prompts) && settings.prompts.length ? settings.prompts : [];
  const published_prompts = getPublishedPromptPresets();
  const merged_prompts = mergePromptPresets(fallback.prompts, published_prompts, normalized_prompts);
  const personal_summary_tags =
    Array.isArray(settings?.summary_tags) && settings.summary_tags.length ? settings.summary_tags : [];
  const published_summary_tags = getPublishedSummaryTagPresets();
  const merged_summary_tags = mergeSummaryTagPresets(
    fallback.summary_tags,
    published_summary_tags,
    personal_summary_tags,
  );
  const active_prompt_id = merged_prompts.some(prompt => prompt.id === settings?.active_prompt_id)
    ? String(settings?.active_prompt_id || merged_prompts[0].id)
    : merged_prompts[0].id;
  const active_base_prompt_id = normalized_base_prompts.some(prompt => prompt.id === settings?.active_base_prompt_id)
    ? String(settings?.active_base_prompt_id || normalized_base_prompts[0].id)
    : normalized_base_prompts[0].id;
  const active_detail_prompt_id = normalized_detail_prompts.some(
    prompt => prompt.id === settings?.active_detail_prompt_id,
  )
    ? String(settings?.active_detail_prompt_id || normalized_detail_prompts[0].id)
    : normalized_detail_prompts[0].id;
  const active_summary_tag_id = merged_summary_tags.some(tag => tag.id === settings?.active_summary_tag_id)
    ? String(settings?.active_summary_tag_id || merged_summary_tags[0].id)
    : merged_summary_tags[0].id;
  const secondary_api_profiles =
    Array.isArray((settings as { secondary_api_profiles?: unknown[] } | null | undefined)?.secondary_api_profiles) &&
    (settings as { secondary_api_profiles?: unknown[] }).secondary_api_profiles?.length
      ? (settings as { secondary_api_profiles?: Array<Partial<SettingsSecondaryApiProfile>> }).secondary_api_profiles!.map(
          (profile, index) => normalizeSecondaryApiProfile(profile, index),
        )
      : [
          normalizeSecondaryApiProfile(
            {
              id: String(
                (settings as { active_secondary_api_profile_id?: unknown } | null | undefined)
                  ?.active_secondary_api_profile_id || fallback.active_secondary_api_profile_id,
              ),
              name: '默认配置',
              config: normalizeSecondaryApiSettings(settings?.secondary_api),
            },
            0,
          ),
        ];
  const active_secondary_api_profile_id = secondary_api_profiles.some(
    profile =>
      profile.id ===
      String(
        (settings as { active_secondary_api_profile_id?: unknown } | null | undefined)
          ?.active_secondary_api_profile_id || '',
      ),
  )
    ? String((settings as { active_secondary_api_profile_id?: unknown }).active_secondary_api_profile_id || '')
    : secondary_api_profiles[0].id;
  const active_secondary_api_profile =
    secondary_api_profiles.find(profile => profile.id === active_secondary_api_profile_id) || secondary_api_profiles[0];

  return {
    active_prompt_id,
    active_base_prompt_id,
    active_detail_prompt_id,
    active_summary_tag_id,
    auto_generate: settings?.auto_generate ?? true,
    chat_history_depth: normalizeChatHistoryDepth(settings?.chat_history_depth),
    mobile_view_scale: normalizeMobileViewScale(settings?.mobile_view_scale),
    theme_mode: normalizeThemeMode(settings?.theme_mode),
    theme_schedule: normalizeThemeSchedule(settings?.theme_schedule),
    appearance: normalizeAppearanceSettings(settings?.appearance),
    bubble_style: normalizeBubbleStyleSettings(settings?.bubble_style),
    online_storage: normalizeOnlineStorageSettings(settings?.online_storage),
    generation_retry: normalizeGenerationRetrySettings(
      (settings as { generation_retry?: Partial<SettingsGenerationRetry> } | null | undefined)?.generation_retry,
    ),
    launch_entry_modes: normalizeLaunchEntryModes((settings as { launch_entry_modes?: unknown } | null | undefined)?.launch_entry_modes),
    excluded_character_names: normalizeStringList(
      (settings as { excluded_character_names?: unknown } | null | undefined)?.excluded_character_names,
    ),
    excluded_tags:
      (settings as { excluded_tags?: unknown } | null | undefined)?.excluded_tags == null
        ? [...fallback.excluded_tags]
        : normalizeStringList((settings as { excluded_tags?: unknown }).excluded_tags, { lowercase: true }),
    random_detail_prompt: {
      enabled: Boolean(settings?.random_detail_prompt?.enabled),
      prompt_ids: Array.isArray(settings?.random_detail_prompt?.prompt_ids)
        ? settings.random_detail_prompt.prompt_ids.filter((id: string) =>
            normalized_detail_prompts.some(prompt => prompt.id === id),
          )
        : [],
      count: normalizeRandomDetailCount(settings?.random_detail_prompt?.count),
      trigger_probability: normalizeRandomDetailTriggerProbability(settings?.random_detail_prompt?.trigger_probability),
    },
    secondary_api: normalizeSecondaryApiSettings(active_secondary_api_profile.config),
    secondary_api_profiles,
    active_secondary_api_profile_id,
    image_generation: normalizeImageGenerationSettings(
      (settings as { image_generation?: Partial<SettingsImageGeneration> } | null | undefined)?.image_generation,
    ),
    summary_tags: merged_summary_tags.map(tag => ({
      ...normalizeSummaryTagPreset(tag),
      source: tag.source || 'personal',
      is_published: Boolean(tag.is_published),
    })),
    worldbook_entry_overrides:
      settings?.worldbook_entry_overrides && typeof settings.worldbook_entry_overrides === 'object'
        ? Object.fromEntries(
            Object.entries(settings.worldbook_entry_overrides).filter(([, value]) =>
              typeof value === 'string' && ['include', 'exclude'].includes(value),
            ),
          )
        : {},
    base_prompts: normalized_base_prompts.map(prompt => ({
      ...normalizePromptItem(prompt, '未命名基础提示词', DEFAULT_DETAIL_PROMPT_FOLDER_ID),
      source: prompt.source || 'personal',
      is_published: Boolean(prompt.is_published),
    })),
    detail_prompt_folders: detail_prompt_folders.map(stripDetailPromptFolder),
    detail_prompt_tags,
    detail_prompts: normalized_detail_prompts.map(prompt => {
      const resolved_folder_id =
        prompt.source === 'default' && builtin_detail_prompt_folder_id
          ? builtin_detail_prompt_folder_id
          : detail_folder_ids.has(String(prompt.folder_id || ''))
            ? prompt.folder_id
            : default_detail_folder_id;
      return {
        ...normalizePromptItem(
          {
            ...prompt,
            folder_id: resolved_folder_id,
          },
          '未命名个性化提示词',
          default_detail_folder_id,
        ),
        source: prompt.source || 'personal',
        is_published: Boolean(prompt.is_published),
      };
    }),
    prompts: merged_prompts.map(prompt => ({
      ...normalizePromptPreset(prompt, {
        base_prompt_id: active_base_prompt_id,
        detail_prompt_id: active_detail_prompt_id,
      }),
      source: prompt.source || 'personal',
      is_published: Boolean(prompt.is_published),
    })),
    deleted_builtin_detail_prompt_ids: Array.isArray(settings?.deleted_builtin_detail_prompt_ids)
      ? [...new Set(settings.deleted_builtin_detail_prompt_ids.map(String))]
      : [],
    builtin_detail_prompt_folder_id: String(settings?.builtin_detail_prompt_folder_id || ''),
  };
}

function getDefaultAppearanceSettings() {
  return {
    day: {
      panel_bg: '#f7f8f5',
      panel_bg_soft: '#ecefe7',
      popup_bg: '#f0aea3',
      panel_text: '#18211d',
      panel_muted: '#6f7772',
      panel_accent: '#597568',
      panel_accent_strong: '#2f5a4a',
      bubble_bg: '#eff5f2',
    },
    night: {
      panel_bg: '#171b20',
      panel_bg_soft: '#20262d',
      popup_bg: '#61362f',
      panel_text: '#eef3f0',
      panel_muted: '#a8b2ae',
      panel_accent: '#7ca895',
      panel_accent_strong: '#a6d2be',
      bubble_bg: '#232b33',
    },
  };
}

function normalizeThemeMode(value: unknown): SettingsThemeMode {
  return ['system', 'day', 'night'].includes(String(value)) ? (value as SettingsThemeMode) : 'system';
}

function normalizeThemeTime(value: unknown, fallback: string) {
  const text = String(value || '').trim();
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(text) ? text : fallback;
}

function normalizeThemeSchedule(schedule: Partial<SettingsThemeSchedule> | null | undefined): SettingsThemeSchedule {
  return {
    day_start: normalizeThemeTime(schedule?.day_start, '06:00'),
    night_start: normalizeThemeTime(schedule?.night_start, '18:00'),
  };
}

function getDefaultBubbleStyleSettings(): SettingsBubbleStyle {
  return {
    background_mode: 'follow-panel',
    background_color: '#eff5f2',
    icon_color_mode: 'follow-text',
    icon_color: '#18211d',
    icon_source: 'default',
    icon_value: 'fa-solid fa-book-open',
    icon_size_mode: 'default',
    icon_size_em: 1,
  };
}

function getDefaultOnlineStorageSettings(): SettingsOnlineStorage {
  return {
    limit_mb: 24,
  };
}

function normalizeOnlineStorageLimitMb(value: unknown): number {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 1 && number <= 512 ? number : getDefaultOnlineStorageSettings().limit_mb;
}

function normalizeRandomDetailCount(value: unknown): number {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 1 && number <= 10 ? number : 1;
}

function normalizeRandomDetailTriggerProbability(value: unknown): number {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : 100;
}

function normalizeOnlineStorageSettings(
  storage: Partial<SettingsOnlineStorage> | null | undefined,
): SettingsOnlineStorage {
  return {
    limit_mb: normalizeOnlineStorageLimitMb(storage?.limit_mb),
  };
}

function normalizeGenerationRetryTimeoutMs(value: unknown): number {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 1000 && number <= 600000 ? number : 360000;
}

function normalizeGenerationRetryCount(value: unknown): number {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 && number <= 3 ? number : 3;
}

function normalizeGenerationRetrySettings(
  retry: Partial<SettingsGenerationRetry> | null | undefined,
): SettingsGenerationRetry {
  return {
    enabled: Boolean(retry?.enabled),
    timeout_ms: normalizeGenerationRetryTimeoutMs(retry?.timeout_ms),
    max_retries: normalizeGenerationRetryCount(retry?.max_retries),
  };
}

function normalizeStringList(value: unknown, options: { lowercase?: boolean } = {}): string[] {
  return [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .map(item => (options.lowercase ? item.toLowerCase() : item)),
    ),
  ];
}

function normalizeBubbleBackgroundMode(value: unknown): SettingsBubbleBackgroundMode {
  return ['follow-panel', 'custom', 'hidden'].includes(String(value))
    ? (value as SettingsBubbleBackgroundMode)
    : 'follow-panel';
}

function normalizeBubbleIconColorMode(value: unknown): SettingsBubbleIconColorMode {
  return ['follow-text', 'custom'].includes(String(value)) ? (value as SettingsBubbleIconColorMode) : 'follow-text';
}

function normalizeBubbleIconSource(value: unknown): SettingsBubbleIconSource {
  return ['default', 'fontawesome', 'image'].includes(String(value))
    ? (value as SettingsBubbleIconSource)
    : 'default';
}

function normalizeBubbleIconSizeMode(value: unknown): SettingsBubbleIconSizeMode {
  return ['default', 'custom'].includes(String(value)) ? (value as SettingsBubbleIconSizeMode) : 'default';
}

function normalizeBubbleIconSizeEm(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0.6 && number <= 3 ? number : 1;
}

function normalizeFontAwesomeIconValue(value: unknown, fallback = 'fa-solid fa-book-open'): string {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text) {
    return fallback;
  }
  if (/\bfa-(solid|regular|brands|sharp(?:-[a-z]+)*)\b/.test(text)) {
    return text;
  }
  if (/\bfa-[a-z0-9-]+\b/.test(text)) {
    return `fa-solid ${text}`.trim();
  }
  return fallback;
}

function normalizeBubbleStyleSettings(style: Partial<SettingsBubbleStyle> | null | undefined): SettingsBubbleStyle {
  const fallback = getDefaultBubbleStyleSettings();
  const icon_source = normalizeBubbleIconSource(style?.icon_source);
  const raw_icon_value = String(style?.icon_value || fallback.icon_value).trim() || fallback.icon_value;
  return {
    background_mode: normalizeBubbleBackgroundMode(style?.background_mode),
    background_color: normalizeHexColor(style?.background_color, fallback.background_color),
    icon_color_mode: normalizeBubbleIconColorMode(style?.icon_color_mode),
    icon_color: normalizeHexColor(style?.icon_color, fallback.icon_color),
    icon_source,
    icon_value: icon_source === 'fontawesome' ? normalizeFontAwesomeIconValue(raw_icon_value, fallback.icon_value) : raw_icon_value,
    icon_size_mode: normalizeBubbleIconSizeMode(style?.icon_size_mode),
    icon_size_em: normalizeBubbleIconSizeEm(style?.icon_size_em),
  };
}

function normalizeHexColor(value: unknown, fallback: string) {
  const text = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function normalizeAppearanceTheme(theme: Partial<SettingsAppearanceTheme> | null | undefined, fallback: SettingsAppearanceTheme): SettingsAppearanceTheme {
  return {
    panel_bg: normalizeHexColor(theme?.panel_bg, fallback.panel_bg),
    panel_bg_soft: normalizeHexColor(theme?.panel_bg_soft, fallback.panel_bg_soft),
    popup_bg: normalizeHexColor(theme?.popup_bg, fallback.popup_bg),
    panel_text: normalizeHexColor(theme?.panel_text, fallback.panel_text),
    panel_muted: normalizeHexColor(theme?.panel_muted, fallback.panel_muted),
    panel_accent: normalizeHexColor(theme?.panel_accent, fallback.panel_accent),
    panel_accent_strong: normalizeHexColor(theme?.panel_accent_strong, fallback.panel_accent_strong),
    bubble_bg: normalizeHexColor(theme?.bubble_bg, fallback.bubble_bg),
  };
}

function normalizeAppearanceSettings(appearance: Partial<SettingsAppearance> | null | undefined): SettingsAppearance {
  const fallback = getDefaultAppearanceSettings();
  return {
    day: normalizeAppearanceTheme(appearance?.day, fallback.day),
    night: normalizeAppearanceTheme(appearance?.night, fallback.night),
  };
}
function normalizeChatHistoryDepth(value: unknown) {
  if (value === '') {
    return '';
  }
  if (value == null) {
    return 20;
  }
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : 20;
}

function normalizeMobileViewScale(value: unknown) {
  const number = Number(value);
  const allowed = [1, 0.95, 0.9, 0.85, 0.8];
  return allowed.includes(number) ? number : 0.9;
}

let temporary_generation_detail_prompt:
  | {
      name: string;
      content: string;
      description?: string;
      tags?: string[];
    }
  | null = null;

function setTemporaryGenerationDetailPrompt(prompt: {
  name: string;
  content: string;
  description?: string;
  tags?: string[];
}) {
  temporary_generation_detail_prompt = {
    name: String(prompt.name || '一次性小剧场'),
    content: String(prompt.content || ''),
    description: String(prompt.description || ''),
    tags: Array.isArray(prompt.tags) ? prompt.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
  };
}

function consumeTemporaryGenerationDetailPrompt() {
  const prompt = temporary_generation_detail_prompt;
  temporary_generation_detail_prompt = null;
  return prompt;
}

function getGenerationPrompt(
  settings: SettingsState = getSettings(),
  detail_override?: { name?: string; content?: string } | null,
  options: { bypass_trigger_probability?: boolean } = {},
) {
  const active_base =
    settings.base_prompts.find(prompt => prompt.id === settings.active_base_prompt_id) || settings.base_prompts[0] || {};
  const active_detail =
    settings.detail_prompts.find(prompt => prompt.id === settings.active_detail_prompt_id) || settings.detail_prompts[0] || {};
  if (detail_override?.content?.trim()) {
    const base_name = String(active_base.name || '基础');
    const detail_name = String(detail_override.name || '一次性小剧场');
    return {
      id: active_base.id || '',
      name: `${base_name} + ${detail_name}`,
      base_prompt_id: active_base.id || '',
      detail_prompt_id: active_detail.id || '',
      base_content: active_base.content || '',
      detail_content: String(detail_override.content || '').trim(),
      random_detail_prompt_name: detail_name,
      detail_prompt_debug: {
        mode: 'override',
        trigger_probability: 100,
        trigger_roll: 0,
        selected_count: 1,
        configured_count: 1,
        active_detail_id: active_detail.id || '',
        reason: 'temporary-detail-override',
      },
    };
  }
  const random_config = settings.random_detail_prompt || {};
  const bypass_trigger_probability = Boolean(options?.bypass_trigger_probability);
  const trigger_probability = normalizeRandomDetailTriggerProbability(random_config.trigger_probability);
  const trigger_roll = Math.random() * 100;
  const configured_prompt_ids = Array.isArray(random_config.prompt_ids) ? random_config.prompt_ids.filter(Boolean) : [];
  const should_trigger_detail = bypass_trigger_probability || trigger_roll < trigger_probability;
  const random_candidates =
    random_config.enabled && should_trigger_detail
      ? settings.detail_prompts.filter(prompt => configured_prompt_ids.includes(prompt.id))
      : [];
  const selected_details = random_config.enabled
    ? random_candidates.length
      ? [...random_candidates]
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(normalizeRandomDetailCount(random_config.count), random_candidates.length))
      : []
    : active_detail?.id
      ? [active_detail]
      : [];
  const detail_prompt_debug = {
    mode: random_config.enabled ? 'random' : 'manual',
    bypass_trigger_probability,
    trigger_probability,
    trigger_roll: Math.round(trigger_roll * 100) / 100,
    selected_count: selected_details.length,
    configured_count: configured_prompt_ids.length,
    requested_count: random_config.enabled ? normalizeRandomDetailCount(random_config.count) : active_detail?.id ? 1 : 0,
    active_detail_id: active_detail.id || '',
    reason: random_config.enabled
      ? !configured_prompt_ids.length
        ? 'random-no-active-prompts'
        : !should_trigger_detail
          ? 'random-probability-miss'
        : !random_candidates.length
            ? 'random-configured-prompts-not-found'
            : 'random-selected'
      : active_detail?.id
        ? 'manual-selected'
        : 'manual-no-active-detail',
  };
  const base_name = String(active_base.name || '基础');
  const detail_names = selected_details.map(detail => String(detail.name || '小剧场')).filter(Boolean);
  const detail_content = selected_details.map(detail => String(detail.content || '').trim()).filter(Boolean).join('\n\n');
  return {
    id: active_base.id || '',
    name: detail_names.length ? `${base_name} + ${detail_names.join(' / ')}` : base_name,
    base_prompt_id: active_base.id || '',
    detail_prompt_id: selected_details[0]?.id || active_detail.id || '',
    base_content: active_base.content || '',
    detail_content,
    random_detail_prompt_name: detail_names.join(' / '),
    detail_prompt_debug,
  };
}

function getSettings() {
  const new_global_settings = readGlobalVariableValueFromRoot(VARIABLE_ROOT_KEY, PERSONAL_SETTINGS_KEY, null);
  const old_global_settings = readGlobalVariableValueFromRoot(OLD_VARIABLE_ROOT_KEY, PERSONAL_SETTINGS_KEY, null);
  const local_settings = readJsonStorage(SETTINGS_STORAGE_KEY, null);
  const old_local_settings = readJsonStorage(OLD_SETTINGS_STORAGE_KEY, null);
  const stored_settings =
    new_global_settings || old_global_settings || local_settings || old_local_settings || getDefaultSettings();
  if (!new_global_settings && (old_global_settings || local_settings || old_local_settings)) {
    writeGlobalVariableValue(PERSONAL_SETTINGS_KEY, old_global_settings || local_settings || old_local_settings);
  }
  if (!local_settings && old_local_settings) {
    writeJsonStorage(SETTINGS_STORAGE_KEY, old_local_settings);
  }
  return normalizeSettings(stored_settings as SettingsInput);
}

function saveSettings(settings: SettingsInput | null | undefined) {
  const fallback = getDefaultSettings();
  const personal_prompts = Array.isArray(settings?.prompts)
    ? settings.prompts
        .filter(prompt => prompt.source !== 'default' && prompt.source !== 'published')
        .map(stripPromptRuntimeFields)
    : [];
  const personal_summary_tags = Array.isArray(settings?.summary_tags)
    ? settings.summary_tags
        .filter(tag => tag.source !== 'default' && tag.source !== 'published')
        .map(stripSummaryTagRuntimeFields)
    : [];
  const personal_settings = {
    active_prompt_id: settings?.active_prompt_id || fallback.active_prompt_id,
    active_base_prompt_id: settings?.active_base_prompt_id || fallback.active_base_prompt_id,
    active_detail_prompt_id: settings?.active_detail_prompt_id || fallback.active_detail_prompt_id,
    active_summary_tag_id: settings?.active_summary_tag_id || fallback.active_summary_tag_id,
    auto_generate: settings?.auto_generate ?? true,
    chat_history_depth: normalizeChatHistoryDepth(settings?.chat_history_depth),
    mobile_view_scale: normalizeMobileViewScale(settings?.mobile_view_scale),
    theme_mode: normalizeThemeMode(settings?.theme_mode),
    theme_schedule: normalizeThemeSchedule(settings?.theme_schedule),
    appearance: normalizeAppearanceSettings(settings?.appearance),
    bubble_style: normalizeBubbleStyleSettings(settings?.bubble_style),
    online_storage: normalizeOnlineStorageSettings(settings?.online_storage),
    generation_retry: normalizeGenerationRetrySettings(
      (settings as { generation_retry?: Partial<SettingsGenerationRetry> } | null | undefined)?.generation_retry,
    ),
    launch_entry_modes: normalizeLaunchEntryModes((settings as { launch_entry_modes?: unknown } | null | undefined)?.launch_entry_modes),
    excluded_character_names: normalizeStringList(
      (settings as { excluded_character_names?: unknown } | null | undefined)?.excluded_character_names,
    ),
    excluded_tags:
      (settings as { excluded_tags?: unknown } | null | undefined)?.excluded_tags == null
        ? [...fallback.excluded_tags]
        : normalizeStringList((settings as { excluded_tags?: unknown }).excluded_tags, { lowercase: true }),
    random_detail_prompt: {
      enabled: Boolean(settings?.random_detail_prompt?.enabled),
      prompt_ids: Array.isArray(settings?.random_detail_prompt?.prompt_ids)
        ? settings.random_detail_prompt.prompt_ids.map(String)
        : [],
      count: normalizeRandomDetailCount(settings?.random_detail_prompt?.count),
      trigger_probability: normalizeRandomDetailTriggerProbability(settings?.random_detail_prompt?.trigger_probability),
    },
    secondary_api_profiles: Array.isArray(
      (settings as { secondary_api_profiles?: unknown[] } | null | undefined)?.secondary_api_profiles,
    )
      ? (settings as { secondary_api_profiles?: Array<Partial<SettingsSecondaryApiProfile>> }).secondary_api_profiles!.map(
          (profile, index) => normalizeSecondaryApiProfile(profile, index),
        )
      : [
          {
            id: String(
              (settings as { active_secondary_api_profile_id?: unknown } | null | undefined)
                ?.active_secondary_api_profile_id || fallback.active_secondary_api_profile_id,
            ),
            name: '默认配置',
            config: normalizeSecondaryApiSettings(settings?.secondary_api),
          },
        ],
    active_secondary_api_profile_id: String(
      (settings as { active_secondary_api_profile_id?: unknown } | null | undefined)
        ?.active_secondary_api_profile_id || fallback.active_secondary_api_profile_id,
    ),
    secondary_api: normalizeSecondaryApiSettings(settings?.secondary_api),
    image_generation: normalizeImageGenerationSettings(
      (settings as { image_generation?: Partial<SettingsImageGeneration> } | null | undefined)?.image_generation,
    ),
    base_prompts: Array.isArray(settings?.base_prompts)
      ? settings.base_prompts
          .filter(item => item.source !== 'default' && item.source !== 'published')
          .map(item => stripPromptItemRuntimeFields(item, '未命名基础提示词', DEFAULT_DETAIL_PROMPT_FOLDER_ID))
      : [],
    detail_prompt_folders: Array.isArray(settings?.detail_prompt_folders)
      ? settings.detail_prompt_folders.map(stripDetailPromptFolder)
      : fallback.detail_prompt_folders.map(stripDetailPromptFolder),
    detail_prompt_tags: Array.isArray(settings?.detail_prompt_tags)
      ? [...new Set(settings.detail_prompt_tags.map(tag => String(tag).trim()).filter(Boolean))]
      : fallback.detail_prompt_tags,
    detail_prompts: Array.isArray(settings?.detail_prompts)
      ? settings.detail_prompts
          .filter(item => item.source !== 'default' && item.source !== 'published')
          .map(item =>
            stripPromptItemRuntimeFields(
              item,
              '未命名个性化提示词',
              String(settings?.detail_prompt_folders?.[0]?.id || DEFAULT_DETAIL_PROMPT_FOLDER_ID),
            ),
          )
      : [],
    summary_tags: personal_summary_tags,
    worldbook_entry_overrides:
      settings?.worldbook_entry_overrides && typeof settings.worldbook_entry_overrides === 'object'
        ? Object.fromEntries(
            Object.entries(settings.worldbook_entry_overrides).filter(([, value]) =>
              typeof value === 'string' && ['include', 'exclude'].includes(value),
            ),
          )
        : {},
    prompts: personal_prompts,
    deleted_builtin_detail_prompt_ids: Array.isArray(settings?.deleted_builtin_detail_prompt_ids)
      ? [...new Set(settings.deleted_builtin_detail_prompt_ids.map(String))]
      : [],
    builtin_detail_prompt_folder_id: String(settings?.builtin_detail_prompt_folder_id || ''),
  } as SettingsInput;
  const normalized_profiles = Array.isArray(personal_settings.secondary_api_profiles)
    ? personal_settings.secondary_api_profiles.map((profile, index) => normalizeSecondaryApiProfile(profile, index))
    : [];
  const resolved_active_profile =
    normalized_profiles.find(profile => profile.id === personal_settings.active_secondary_api_profile_id) ||
    normalized_profiles[0] ||
    normalizeSecondaryApiProfile(
      {
        id: fallback.active_secondary_api_profile_id,
        name: '默认配置',
        config: normalizeSecondaryApiSettings(personal_settings.secondary_api || undefined),
      },
      0,
    );
  personal_settings.secondary_api_profiles = normalized_profiles.length ? normalized_profiles : [resolved_active_profile];
  personal_settings.active_secondary_api_profile_id = resolved_active_profile.id;
  personal_settings.secondary_api = normalizeSecondaryApiSettings(resolved_active_profile.config);
  writeGlobalVariableValue(PERSONAL_SETTINGS_KEY, personal_settings);
  writeJsonStorage(SETTINGS_STORAGE_KEY, personal_settings);
  const normalized = normalizeSettings(personal_settings);
  return normalized;
}
