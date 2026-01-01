# 技术设计文档 (Technical Design Document)

本文档旨在定义 "Ariadne" 产品的技术架构、数据结构与核心实现路径。设计重点在于支持**无限画布的高性能渲染（LOD）**、**无缝的本地/云端数据同步**以及**流式 AI 响应**。

## 1. 系统架构概览 (System Architecture)

采用 **Serverless-First** 架构，以降低运维成本并最大化扩展性。

```mermaid
graph TD
    User[用户 Browser] -->|HTTPS/WebSocket| Edge[Next.js Edge Runtime]
    
    subgraph Frontend [Client Side]
        Canvas[React Flow Canvas]
        LOD[LOD Visualizer]
        State[Zustand Local Store]
    end
    
    subgraph Backend [Serverless Infra]
        Auth[Supabase Auth]
        DB[(Supabase Postgres)]
        AI_Orch[AI Orchestrator (Vercel AI SDK)]
    end
    
    subgraph Ext [External Services]
        LLM[LLM Provider (OpenAI/Anthropic)]
    end

    User --> Canvas
    Canvas -->|Read/Write| State
    State -->|Sync (On Login)| DB
    Edge -->|Stream| LLM
    Edge -->|Auth Check| Auth
```

## 2. 技术栈选型 (Tech Stack)

### 2.1 前端 (Frontend)
*   **Framework**: **Next.js 14+ (App Router)**
    *   **核心定位**：基于 React 的全栈框架。它不仅仅是 UI 库，而是类似于 Python 的 **Django**，集成了路由、服务器端渲染 (SSR) 和 API 接口。
    *   **理由**：React 生态标准，Vercel 原生支持。
    *   **竞品对比**：
        *   *vs. Vue/Nuxt*：Vue 更简单，但 React/Next.js 生态统治力更强，遇到问题更容易找到答案。
        *   *vs. Pure React*：Next.js 提供了开箱即用的工程化（路由、优化），省去了自己搭建“脚手架”的麻烦。

*   **Canvas Engine**: **React Flow 12**
    *   **核心定位**：处理节点(Node)与连线(Edge)的交互引擎。类似于 Python 的 **NetworkX** (逻辑) 加上可交互的 **Matplotlib** (渲染)。
    *   **理由**：它基于 **DOM** (HTML 元素) 渲染，意味着我们可以直接在节点里使用输入框、选中文本，这对于文本交互至关重要。
    *   **竞品对比**：
        *   *vs. Three.js / PixiJS*：这些是 WebGL 游戏引擎，性能无敌（能渲染 10 万个点），但**极难**实现文本光标选择和复制粘贴。React Flow 是性能与交互的最佳平衡点。
        *   *vs. HTML5 Canvas*：原生 Canvas 开发难度极大，需要手写光标坐标判定。

*   **State Management**: **Zustand** + `persist` middleware
    *   **核心定位**：全局状态管家。类似于一个存在内存里的 **全局单例字典 (Singleton Dict)** 或客户端的 **Redis**。
    *   **理由**：极简主义，代码风格非常像 Python 的 Hooks。内置 `persist` 中间件，一行代码实现 LocalStorage 自动保存（解决“无感存储”）。
    *   **竞品对比**：
        *   *vs. Redux*：太繁琐，写一个功能要改 4 个文件（Boilerplate heavy）。
        *   *vs. React Context*：性能有坑，容易导致全页面不必要的重绘。

*   **Animation**: **Framer Motion**
    *   **核心定位**：声明式动画库，处理节点的生成、展开、收起、路径绘制等动画。
    *   **理由**：API 简洁（类似 CSS Transition 的写法），支持 Layout Animation（当元素位置改变时自动过渡）和 SVG Path 动画（用于 Tendril 生长效果）。

*   **Styling**: **Tailwind CSS** + **Radix UI**
    *   **核心定位**：Tailwind 是“原子化 CSS”，就像写行内样式但用的是预设好的类名。
    *   **理由**：开发速度极快，便于维护设计系统 (Design Tokens)。

### 2.2 后端 (Backend & Database)
*   **Platform**: **Supabase** (BaaS)
    *   **核心定位**：**PostgreSQL** + **Auto API** + **Auth**。
    *   **类比**：想象一个不用运维的云端 **SQLite**，但是自带了一个为你写好的 **Django Admin** 和 **Rest Framework** 接口。你不需要写后端 CRUD 代码，直接在前端调 JS 库读写数据库。
    *   **理由**：省去 docker/k8s 等运维成本。Postgres 内核支持 `pgvector`，未来做 AI 知识库检索无缝衔接。
    *   **竞品对比**：
        *   *vs. Firebase*：Firebase 是 NoSQL，处理复杂的关系图谱（节点连接）不如 SQL 方便。
        *   *vs. Self-hosted*：太累，MVP 阶段不值得。

*   **AI SDK**: **Vercel AI SDK**
    *   **核心定位**：连接 LLM 的通用管道。
    *   **理由**：提供了标准化的 `useChat` Hooks，极大简化流式 UI 的开发。

## 3. 数据结构设计 (Data Schema)

这是产品的核心骨架。我们需要存储的是一张**有向图 (Directed Graph)**。

### 3.1 节点表 (`nodes`)
存储画布上的每一个思维斑块。

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | 主键 |
| `user_id` | UUID | 外键，关联 auth.users (允许为空，对应游客数据同步后填充) |
| `thread_id` | UUID |哪怕是无限画布，也可以有不同的“画布/项目” |
| `parent_id` | UUID | 父节点 ID (用于溯源) |
| `content` | JSONB | 存储节点的核心数据，结构如下: `{ "user_prompt": "追问内容", "ai_response": "Markdown格式回答", "model": "gpt-4o", "tokens_used": 1500 }` |
| `position` | JSONB | `{x: float, y: float}` 坐标 |
| `visual_state` | JSONB | `{collapsed: boolean, theme: string, width: int}` 视觉状态 |
| `source_anchor` | JSONB | `{text: "选中的文本", start_index: 10, end_index: 15}` 记录从父节点哪个位置长出来的 |
| `created_at` | Timestamp | |

### 3.2 连线表 (`edges`)
存储节点间的物理连接关系。

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | 主键 |
| `source` | UUID | 源节点 ID |
| `target` | UUID | 目标节点 ID |
| `type` | String | 连线类型 (e.g., 'default', 'inference', 'jump') |
| `label` | String | 连线上的追问摘要 (e.g., "Why?") |

## 4. 关键技术实现策略

### 4.1 LOD 渲染管线 (Level of Detail Pipeline)
为了解决性能问题并实现“星图”效果，我们需监听 Viewport 的 Zoom 变化。

1.  **Zoom Level 监听**: 使用 React Flow `useViewport()` 钩子。
2.  **动态组件切换**:
    *   `if (zoom < 0.4)` -> Render `<StarNode />` (仅渲染 CSS 光点 + Tooltip，极低开销)
    *   `if (0.4 <= zoom < 1.0)` -> Render `<StructureNode />` (渲染大号标题，隐藏正文 DOM)
    *   `if (zoom >= 1.0)` -> Render `<FullNode />` (渲染完整 Markdown 编辑器)
3.  **优化**: 使用 `React.memo` 防止非可视区域的节点重绘。

### 4.2 数据同步策略 (Auto-merge Strategy)
如何实现“先试用，后登录”：

1.  **State A (Guest)**: 所有 `nodes` 和 `edges` 存储在 Zustand 的 LocalStorage 中，UUID 由前端 `crypto.randomUUID()` 生成。
2.  **Action (Login)**: 用户点击登录，OAuth 回调成功。
3.  **Merge Process**:
    *   读取 Zustand 中的本地树。
    *   调用 Supabase RPC (Stored Procedure)，将本地 JSON 树批量插入 `nodes` 表，并将 `user_id` 设为当前用户。
    *   清空本地 Zustand，切换模式为 `Remote Mode` (直接从 Supabase 读写)。

### 4.3 贝塞尔曲线的物理感 (Tendril Physics)
标准的 React Flow 贝塞尔曲线是静态的。为了实现“垂坠感”和“拨动”，我们需要自定义 `<CustomEdge />`。

*   **算法**: 使用 SVG `<path>`，但在计算控制点 (Control Points) 时，加入一个垂直向下的**重力向量 (Gravity Vector)**。随着 Zoom 拉远，重力参数减小，线条变直。
*   **动画**: 使用 Framer Motion 的 `pathLength` 属性实现连线生长动画。

### 4.4 详情面板 (Detail Panel / Side Sheet)
对应 `CONCEPT_DESIGN.md` 中的"无论在哪个层级，单击节点可唤起 Side Sheet"。

*   **组件**: 使用 **Radix UI** 的 `Sheet` 组件（或自研 Drawer）。
*   **触发**: 在任意 LOD 层级下，`onClick` 节点主体时，`setSelectedNodeId(id)`，触发 Sheet 打开。
*   **内容**: Sheet 内部渲染完整的 Markdown 内容，使用 `react-markdown` 库。支持内部滚动 (`overflow-y: auto`)。
*   **关闭**: 点击遮罩层或按 `Esc` 键关闭。

### 4.5 路径高亮 (Path Tracing Algorithm)
对应 `CONCEPT_DESIGN.md` 中的"点击 Leaf Node，点亮从 Root 到该节点的唯一路径"。

*   **数据结构**: 每个节点存储 `parent_id`，形成单向链表（树结构）。
*   **算法**:
    1.  从被点击的 `leafNode` 开始。
    2.  循环向上查找 `parent_id`，直到 `parent_id === null` (Root)。
    3.  将路径上的所有 `node_id` 存入 Set。
*   **渲染**:
    *   路径上的节点和边：`opacity: 1`, `filter: none`。
    *   非路径上的节点和边：`opacity: 0.2`, `filter: blur(2px)`。

### 4.6 Obsidian 导出 (Export to Obsidian)
对应 `CONCEPT_DESIGN.md` 中的"一键 Obsidian 园丁模式"。

*   **触发**: 用户点击 "Export to Obsidian" 按钮。
*   **生成逻辑**:
    1.  遍历所有 `nodes`。
    2.  为每个节点生成一个 `.md` 文件，文件名为 `Node-{id的前8位}.md` 或 AI 生成的标题。
    3.  **文件内容**:
        ```markdown
        # [AI 生成的标题]
        
        > [!quote] Anchor from [[Parent-Node-Title]]
        > [source_anchor.text]
        
        **My Question:** [user_prompt]
        
        ---
        
        [ai_response]
        
        ## Branches
        - [[Child-Node-1-Title]]
        - [[Child-Node-2-Title]]
        ```
    4.  使用 **JSZip** 库将所有 `.md` 文件打包为 `.zip`。
    5.  触发浏览器下载。

### 4.7 国际化 (Internationalization / i18n)
对应 `CONCEPT_DESIGN.md` 中的"默认英文，支持中文等"。

*   **技术方案**: 使用 **next-intl** 库。
*   **目录结构**:
    ```
    /messages
      /en.json
      /zh-CN.json
    ```
*   **用法**: 所有 UI 文本通过 `useTranslations('namespace')` Hook 获取。
*   **切换**: 用户在设置页面选择语言，存入 Cookie/LocalStorage，刷新后生效。

### 4.8 主题引擎 (Theme Engine)
对应 `CONCEPT_DESIGN.md` 中的 "2.5 预设主题库"。

*   **技术方案**: 基于 **CSS Variables** 和 **Tailwind CSS** 的 `dark:` / `data-theme` 选择器。
*   **Token 结构** (示例):
    ```css
    :root[data-theme="biomimetic-light"] {
      --canvas-bg: #0a0a1a;
      --node-bg: rgba(255, 255, 255, 0.05);
      --node-glow: rgba(100, 200, 255, 0.3);
      --tendril-color: #4a9eff;
      --text-primary: #f0f0f0;
    }
    :root[data-theme="sophisticated-paper"] {
      --canvas-bg: #f8f5f0;
      --node-bg: #ffffff;
      --node-shadow: 0 4px 12px rgba(0,0,0,0.08);
      --tendril-color: #555555;
      --text-primary: #1a1a1a;
    }
    ```
*   **切换**: 用户在设置中选择主题，JS 修改 `document.documentElement.dataset.theme`。

### 4.9 智能诱导 (Smart Nudge / AI Prompting)
对应 `CONCEPT_DESIGN.md` 中的"知识差注入"与"弱视觉暗示"。

*   **Prompt 注入**:
    *   在向 LLM 发送请求时，System Prompt 中追加指令：
        > "在你的回答中，自然地引入 1-2 个与主题相关但用户可能不熟悉的高级概念或术语。不要刻意解释它们，让用户产生好奇心去追问。"
*   **关键词识别 (后处理)**:
    *   AI 响应返回后，使用轻量级 NLP (或调用 LLM 的第二次请求) 识别出 2-3 个"可追问"的关键词。
    *   将这些关键词存入 `node.content.suggested_anchors: ["Attention", "Transformer"]`。
*   **前端渲染**:
    *   在 Markdown 渲染时，对 `suggested_anchors` 中的词汇添加特殊 CSS 类 (`suggested-anchor`)，使其带有淡下划线。
    *   `onMouseEnter` 时，显示 Tooltip："想了解更多关于 [Keyword]？"