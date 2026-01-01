# 实施计划 (Implementation Plan)

本文档将 `CONCEPT_DESIGN.md` 中定义的产品设计和 `TECH_DESIGN.md` 中规划的技术架构，拆解为可执行的开发阶段和具体步骤。

---

## Phase 0: 项目初始化 (Project Scaffolding)

**目标**: 搭建开发环境，安装所有核心依赖，跑通一个空白的 Next.js + React Flow 画布。

**预计时间**: 0.5 天

### 步骤

1.  **创建 Next.js 项目**
    ```bash
    npx create-next-app@latest ariadne --typescript --tailwind --eslint --app --src-dir
    cd ariadne
    ```

2.  **安装核心依赖**
    ```bash
    # Canvas Engine
    npm install @xyflow/react

    # State Management
    npm install zustand

    # Animation
    npm install framer-motion

    # UI Components
    npm install @radix-ui/react-sheet @radix-ui/react-tooltip

    # Markdown Rendering
    npm install react-markdown remark-gfm

    # AI SDK (for later)
    npm install ai @ai-sdk/openai
    ```

3.  **配置 Tailwind CSS Variables**
    *   在 `tailwind.config.ts` 中扩展颜色，引用 CSS Variables。
    *   在 `src/app/globals.css` 中定义初始主题 Token (Biomimetic Light)。

4.  **创建基础目录结构**
    ```
    src/
    ├── app/                 # Next.js App Router
    │   ├── page.tsx         # 主画布页面
    │   └── api/             # API Routes (AI, Auth)
    ├── components/
    │   ├── canvas/          # React Flow 相关组件
    │   │   ├── Canvas.tsx
    │   │   ├── nodes/       # 自定义节点 (StarNode, StructureNode, FullNode)
    │   │   └── edges/       # 自定义连线 (TendrilEdge)
    │   └── ui/              # 通用 UI (Sheet, Tooltip, Input)
    ├── stores/              # Zustand Stores
    │   └── useCanvasStore.ts
    ├── lib/                 # 工具函数
    └── styles/              # 主题 CSS
    ```

5.  **验收标准 (Definition of Done)**
    *   [ ] `npm run dev` 成功启动，浏览器显示空白画布。
    *   [ ] React Flow 的 `<ReactFlow />` 组件正常渲染（可以看到默认的 MiniMap 或背景网格）。

---

## Phase 1: MVP 核心交互 (The Seed)

**目标**: 实现产品的灵魂交互——用户输入第一个问题，AI 回答；用户在回答中选中文本，发起追问，生成子节点。

**预计时间**: 3-5 天

### 步骤

#### 1.1 Zustand Store 设计
*   创建 `useCanvasStore.ts`。
*   定义核心状态：
    *   `nodes: Node[]`
    *   `edges: Edge[]`
    *   `selectedAnchor: { nodeId, text, range } | null`
*   定义核心 Actions：
    *   `addNode(node)`
    *   `addEdge(edge)`
    *   `updateNodeContent(nodeId, content)`
    *   `setSelectedAnchor(anchor)`
*   集成 `persist` middleware，自动保存到 LocalStorage。

#### 1.2 根节点创建 (The First Seed)
*   在 `page.tsx` 中：
    *   如果 `nodes` 为空，显示居中的 `<Input />` 组件。
    *   用户输入问题并按 Enter。
    *   调用 `addNode()` 在画布中心 `(0, 0)` 创建 Root Node。

#### 1.3 自定义节点组件 (`FullNode.tsx`)
*   创建 `components/canvas/nodes/FullNode.tsx`。
*   组件接收 `data: { content: { user_prompt, ai_response } }`。
*   渲染结构：
    ```
    ┌────────────────────────────────┐
    │ [User Prompt - 小字灰色]       │
    ├────────────────────────────────┤
    │ [AI Response - Markdown 渲染]  │
    │ (使用 react-markdown)          │
    └────────────────────────────────┘
    ```
*   **关键**: 给 AI Response 区域添加 `onMouseUp` 事件监听文本选择。

#### 1.4 AI 流式响应集成
*   创建 API Route: `src/app/api/chat/route.ts`。
*   使用 Vercel AI SDK 的 `streamText` 函数。
*   前端使用 `useChat` Hook 或 `useCompletion`。
*   当 Root Node 创建时，立即触发 API 请求，流式填充 `ai_response`。

#### 1.5 文本选择与追问触发
*   在 `FullNode` 的 AI Response 区域：
    *   `onMouseUp` 时，检测 `window.getSelection()`。
    *   如果有选区，调用 `setSelectedAnchor({ nodeId, text, range })`。
    *   在选区附近显示一个浮动的 `<Input />` 气泡（使用 Radix Tooltip 或 Popover）。

#### 1.6 子节点生成 (Branching)
*   用户在浮动气泡中输入追问，按 Enter。
*   执行逻辑：
    1.  计算新节点的 `position` (在父节点右侧偏移)。
    2.  调用 `addNode()` 创建子节点，`parent_id` 指向父节点，`source_anchor` 记录选中的文本。
    3.  调用 `addEdge()` 创建从父节点到子节点的连线。
    4.  触发 AI 请求，填充子节点的 `ai_response`。
    5.  清空 `selectedAnchor`。

#### 1.7 自定义连线组件 (`TendrilEdge.tsx`)
*   创建 `components/canvas/edges/TendrilEdge.tsx`。
*   使用 SVG `<path>` 绘制贝塞尔曲线。
*   初期可使用 React Flow 默认的 `getBezierPath`，后期再加物理感。

### 验收标准 (Definition of Done)
*   [ ] 用户输入第一个问题，AI 流式回答出现在 Root Node 中。
*   [ ] 用户可以在 AI 回答中选中文本。
*   [ ] 选中后出现浮动输入框。
*   [ ] 用户输入追问后，新节点从选中处"长"出来，并显示新的 AI 回答。
*   [ ] 刷新页面后，所有节点和连线依然存在 (LocalStorage)。

---

## Phase 2: 画布探索 (The Network)

**目标**: 用户可以在复杂的思维图中自由导航，通过缩放级别看到不同的信息密度（LOD）。

**预计时间**: 3-4 天

### 步骤

#### 2.1 LOD 渲染管线
*   创建 `StarNode.tsx` (仅 CSS 圆点 + Tooltip)。
*   创建 `StructureNode.tsx` (仅标题)。
*   在 `Canvas.tsx` 中：
    *   使用 `useViewport()` 获取 `zoom` 值。
    *   根据 `zoom` 动态设置每个节点的 `type` 属性：
        *   `zoom < 0.4` -> `type: 'star'`
        *   `0.4 <= zoom < 1.0` -> `type: 'structure'`
        *   `zoom >= 1.0` -> `type: 'full'`

#### 2.2 详情面板 (Side Sheet)
*   使用 Radix UI `Sheet` 组件。
*   在 Store 中添加 `selectedNodeIdForSheet: string | null`。
*   在任意节点上 `onClick` 时，设置 `selectedNodeIdForSheet`。
*   Sheet 打开时，渲染该节点的完整 Markdown 内容，支持滚动。

#### 2.3 路径高亮 (Path Tracing)
*   在 Store 中添加 `highlightedPath: Set<string> | null`。
*   当用户双击一个叶子节点时：
    *   从该节点向上遍历 `parent_id`，收集路径上的所有 `node_id`。
    *   设置 `highlightedPath`。
*   在节点和边的渲染中，根据是否在 `highlightedPath` 中，应用不同的 `opacity` 和 `filter`。
*   点击画布空白处，清空 `highlightedPath`。

#### 2.4 视觉打磨 (Biomimetic Light Theme)
*   在 `globals.css` 中完善 `--canvas-bg`, `--node-bg`, `--node-glow`, `--tendril-color` 等变量。
*   给 `FullNode` 添加 `backdrop-blur`, `border`, `box-shadow` 等样式，实现磨砂玻璃效果。
*   给 `TendrilEdge` 添加发光效果 (`filter: drop-shadow`)。

### 验收标准 (Definition of Done)
*   [ ] 缩放画布时，节点平滑切换为"光点" -> "标题" -> "全文"。
*   [ ] 点击任意节点，右侧滑出详情面板，可滚动阅读长文。
*   [ ] 双击叶子节点，从 Root 到该节点的路径被高亮，其他变暗。
*   [ ] 整体视觉呈现"深色发光"的 Biomimetic Light 风格。

---

## Phase 3: 账户与同步 (The Cloud)

**目标**: 用户可以选择登录，将本地数据同步到云端。

**预计时间**: 2-3 天

### 步骤

#### 3.1 Supabase 项目初始化
*   在 [supabase.com](https://supabase.com) 创建新项目。
*   在 Supabase Dashboard 中执行 SQL，创建 `nodes` 和 `edges` 表 (根据 `TECH_DESIGN.md` 的 Schema)。
*   开启 Row Level Security (RLS)，配置策略：用户只能读写自己的 `user_id` 数据。

#### 3.2 前端 Supabase 客户端配置
*   安装 `@supabase/supabase-js` 和 `@supabase/ssr`。
*   创建 `lib/supabase/client.ts` (浏览器端) 和 `lib/supabase/server.ts` (服务端)。
*   配置环境变量 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。

#### 3.3 OAuth 登录
*   在 Supabase Dashboard 启用 Google 和 GitHub Provider。
*   在页面右上角添加 "Sign in" 按钮。
*   点击后调用 `supabase.auth.signInWithOAuth({ provider: 'google' })`。
*   处理 OAuth 回调，获取 `user` 对象。

#### 3.4 数据同步 (Auto-merge)
*   创建 `mergeLocalDataToCloud()` 函数：
    1.  从 Zustand (LocalStorage) 读取所有 `nodes` 和 `edges`。
    2.  调用 Supabase `upsert` 批量写入，附带 `user_id`。
    3.  清空本地 Zustand Store。
*   在 OAuth 回调成功后，自动调用该函数。
*   登录后，Store 切换为直接从 Supabase 读写 (或使用 Supabase Realtime 订阅)。

#### 3.5 保存状态指示器 (Trust & Visibility)
*   在页面右上角显示 `Saved` 状态。
*   根据登录状态显示不同图标（空心云 vs 实心云）。
*   `onMouseEnter` 显示 Tooltip，解释当前存储位置。

### 验收标准 (Definition of Done)
*   [ ] 用户可以点击 "Sign in with Google" 完成登录。
*   [ ] 登录后，之前以游客身份创建的节点被上传到 Supabase。
*   [ ] 刷新页面后，数据从 Supabase 加载，而非 LocalStorage。
*   [ ] 右上角显示 `Saved` 状态及其含义。

---

## Phase 4: 打磨与导出 (The Ecosystem)

**目标**: 完善产品体验，支持多主题、导出、国际化和智能诱导。

**预计时间**: 4-5 天

### 步骤

#### 4.1 主题引擎 (Theme Engine)
*   在 `globals.css` 中定义所有 5 个主题的 CSS Variables (`biomimetic-light`, `sophisticated-paper`, `zen-garden`, `retro-terminal`, `constellation`)。
*   创建 `useThemeStore.ts`，存储 `currentTheme`。
*   在设置菜单中提供主题切换器。
*   切换主题时，更新 `document.documentElement.dataset.theme`。

#### 4.2 Obsidian 导出
*   安装 `jszip` 和 `file-saver`。
*   创建 `lib/export/obsidian.ts`。
*   实现 `exportToObsidian()` 函数：
    1.  遍历所有节点。
    2.  为每个节点生成符合 `TECH_DESIGN.md` 规范的 `.md` 文件内容。
    3.  使用 JSZip 打包。
    4.  触发浏览器下载。
*   在 UI 中添加 "Export to Obsidian" 按钮。

#### 4.3 智能诱导 (Smart Nudge)
*   修改 `api/chat/route.ts` 的 System Prompt，注入"知识差"指令。
*   AI 响应返回后，调用一次轻量级 LLM 请求 (或 Regex) 识别 2-3 个关键词。
*   将关键词存入 `node.content.suggested_anchors`。
*   在 `FullNode` 的 Markdown 渲染中，对这些关键词添加特殊样式 (淡下划线)。
*   `onMouseEnter` 关键词时，显示追问建议 Tooltip。

#### 4.4 国际化 (i18n)
*   安装 `next-intl`。
*   创建 `/messages/en.json` 和 `/messages/zh-CN.json`。
*   将所有 UI 硬编码文本替换为 `t('key')`。
*   在设置菜单中添加语言切换器。

### 验收标准 (Definition of Done)
*   [ ] 用户可以在设置中切换 5 种主题，界面实时变化。
*   [ ] 用户点击 "Export to Obsidian"，下载 `.zip` 文件，解压后可直接导入 Obsidian。
*   [ ] AI 回答中，特定关键词带有淡下划线，hover 时显示追问建议。
*   [ ] 用户可以切换界面语言为中文或英文。

---

## 总结：里程碑概览

| Phase | 名称 | 核心成果 | 预计时间 |
| :---: | :--- | :--- | :---: |
| 0 | Project Setup | 空白画布可运行 | 0.5 天 |
| 1 | The Seed (MVP) | 选中-追问-分叉 核心循环跑通 | 3-5 天 |
| 2 | The Network | LOD + 路径高亮 + 详情面板 | 3-4 天 |
| 3 | The Cloud | 登录 + 云同步 | 2-3 天 |
| 4 | The Ecosystem | 主题 + 导出 + Nudge + i18n | 4-5 天 |
| **Total** | | **功能完整的 V1.0** | **~15 天** |

---

## 附录：关键风险与缓解

1.  **React Flow 性能瓶颈**
    *   风险：节点超过 100 个时可能卡顿。
    *   缓解：严格执行 LOD 策略，低 Zoom 时只渲染轻量组件。使用 `React.memo`。

2.  **文本选择与 React Flow 事件冲突**
    *   风险：React Flow 的拖拽事件可能吞掉 `mouseup`。
    *   缓解：在节点内部使用 `event.stopPropagation()`，或配置 `nodesDraggable: false` 仅在特定模式下。

3.  **AI 流式输出导致布局抖动**
    *   风险：节点高度随内容增长而变化，可能导致其他节点跳动。
    *   缓解：为节点设置 `min-height`，或使用 Framer Motion 的 `layout` 属性平滑过渡。
