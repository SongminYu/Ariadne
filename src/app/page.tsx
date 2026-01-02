'use client';

import dynamic from 'next/dynamic';
import { useCanvasStore, NodeData } from '@/stores/useCanvasStore';
import { useState, useCallback, useEffect } from 'react';
import SelectionPopover from '@/components/ui/SelectionPopover';
import DetailModal from '@/components/ui/DetailModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Node } from '@xyflow/react';
import { Key, Mail } from 'lucide-react';
import { generateSingleFileHTML } from '@/utils/export';

// 动态导入 Canvas 组件以避免 SSR 问题
const Canvas = dynamic(() => import('@/components/canvas/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-[#0a0a1a] flex items-center justify-center">
      <div className="text-white/50 animate-pulse">Loading Canvas...</div>
    </div>
  ),
});

export default function Home() {
  const {
    nodes,
    edges,
    addNode,
    addEdge,
    updateNodeContent,
    selectedAnchor,
    setSelectedAnchor,
    setSelectedNodeForSheet,
    clearAll,
  } = useCanvasStore();

  const [inputValue, setInputValue] = useState('');
  const [isCreatingNode, setIsCreatingNode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro');

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('ariadne_api_key');
    const savedModel = localStorage.getItem('ariadne_model');
    if (savedKey) setApiKey(savedKey);
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  // Save API key to localStorage
  const handleSaveApiSettings = useCallback(() => {
    localStorage.setItem('ariadne_api_key', apiKey);
    localStorage.setItem('ariadne_model', selectedModel);
    setShowApiSettings(false);
  }, [apiKey, selectedModel]);

  // Export as ZIP (HTML + Markdown)
  const exportAsZip = useCallback(async (nodesToExport: typeof nodes, edgesToExport: typeof edges) => {
    if (nodesToExport.length === 0) {
      alert('No nodes to export');
      return;
    }

    try {
      // Dynamic import JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const dateStr = new Date().toISOString().slice(0, 10);
      const baseName = `ariadne-export-${dateStr}`;

      // Generate HTML content (unchanged)
      const htmlContent = generateSingleFileHTML(nodesToExport, edgesToExport);
      zip.file(`${baseName}.html`, htmlContent);

      // Generate Markdown summary
      const { generateMarkdownSummary } = await import('@/utils/export');
      const mdContent = generateMarkdownSummary(nodesToExport, baseName);
      zip.file(`${baseName}.md`, mdContent);

      // Generate ZIP and download
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${baseName}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      console.log('Export completed with', nodesToExport.length, 'nodes');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + String(error));
    }
  }, []);

  // 计算新节点位置（带碰撞检测）
  const calculateNewPosition = useCallback((parentId: string | null) => {
    if (!parentId) {
      return { x: 0, y: 0 };
    }

    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) {
      return { x: 0, y: 0 };
    }

    // 节点尺寸常量
    const NODE_WIDTH = 400;
    const NODE_HEIGHT = 200;
    const HORIZONTAL_GAP = 150;
    const VERTICAL_GAP = 50;

    // 新节点基础位置：父节点右侧
    const baseX = parentNode.position.x + NODE_WIDTH + HORIZONTAL_GAP;

    // 获取同一列（相似X位置）的所有节点
    const nodesInColumn = nodes.filter(n =>
      Math.abs(n.position.x - baseX) < NODE_WIDTH / 2
    );

    // 计算该父节点已有的子节点
    const siblingEdges = edges.filter(e => e.source === parentId);
    const siblingCount = siblingEdges.length;

    // 基础Y位置：以父节点为中心，根据兄弟数量偏移
    let baseY = parentNode.position.y + (siblingCount * (NODE_HEIGHT + VERTICAL_GAP));

    // 碰撞检测：检查是否与现有节点重叠
    const isColliding = (y: number) => {
      return nodesInColumn.some(n =>
        Math.abs(n.position.y - y) < NODE_HEIGHT + VERTICAL_GAP
      );
    };

    // 如果有碰撞，向下寻找空位
    let attempts = 0;
    while (isColliding(baseY) && attempts < 20) {
      baseY += NODE_HEIGHT + VERTICAL_GAP;
      attempts++;
    }

    return { x: baseX, y: baseY };
  }, [nodes, edges]);

  // 流式获取 AI 响应
  // Direct Gemini API call (works on GitHub Pages without backend)
  const streamAIResponse = async (
    nodeId: string,
    prompt: string,
    context?: string,
    anchor?: string
  ) => {
    try {
      if (!apiKey) {
        throw new Error('API Key not configured');
      }

      // Build the system instruction
      let systemInstruction = `You are a knowledgeable AI assistant who provides thorough, well-researched responses that inspire deeper understanding.

## Response Guidelines

### Depth & Rigor
- Provide **comprehensive and detailed answers** that fully address the question
- Include relevant background, context, and foundational concepts
- Explain the "why" behind facts, not just the "what"
- When discussing technical topics, include precise definitions and proper terminology
- For complex topics, break down into clear logical steps or components
- Aim for substantive responses - don't be overly brief

### Structure & Formatting (IMPORTANT)
- **Always use clear Markdown formatting** to organize your response
- Use **headings** (##, ###) to divide major sections
- Use **bullet points** (-) or **numbered lists** (1. 2. 3.) to present multiple items clearly
- Use **bold** for key terms and **italic** for emphasis
- **IMPORTANT**: Add spaces around bold text for reliable rendering (e.g., "告诉我们 **事实** 。")
- **DO NOT** use bold on quoted text (e.g., use "Hello" not **"Hello"** or "**Hello**")
- Use LaTeX for mathematical formulas: inline $E = mc^2$ or block $$\\int_a^b f(x)dx$$
- Use \`code\` for inline code and fenced code blocks with language for longer code
- Use **tables** when comparing items or presenting structured data
- Use **blockquotes** (>) for definitions or important notes

### Engagement & Curiosity
- Introduce 1-2 **advanced concepts or interesting connections** that might spark further exploration
- Mention related topics the user might want to explore next
- When appropriate, acknowledge nuances, debates, or alternative perspectives

### Language
- **CRITICAL**: Respond in the SAME LANGUAGE as the user's question
- If they ask in Chinese, respond entirely in Chinese
- If they ask in English, respond entirely in English
- Match the user's language exactly throughout your response`;

      // If there's context (follow-up scenario)
      if (context && anchor) {
        systemInstruction += `

The user is reading a response about a topic. They selected the text "${anchor}" and based on this, asked a new question.

Focus on answering the user's NEW question directly. The selected text is just context/starting point. Do not simply explain the selected text itself.

Previous context (for reference):
${context}`;
      }

      // Call Gemini API directly (REST API with streaming)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              accumulatedText += text;
              updateNodeContent(nodeId, { ai_response: accumulatedText });
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6));
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          accumulatedText += text;
          updateNodeContent(nodeId, { ai_response: accumulatedText });
        } catch {
          // Skip
        }
      }
    } catch (error) {
      console.error('AI Error:', error);
      updateNodeContent(nodeId, {
        ai_response: `### Error\n\nFailed to generate response.\n\nDetails: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // 创建节点
  const createNode = useCallback(async (
    prompt: string,
    parentId: string | null = null,
    anchorText?: string
  ) => {
    const nodeId = crypto.randomUUID();
    const position = calculateNewPosition(parentId);

    // 创建节点
    const newNode: Node<NodeData> = {
      id: nodeId,
      type: 'compact',
      position,
      data: {
        content: {
          user_prompt: prompt,
          ai_response: '',
        },
        parent_id: parentId,
        source_anchor: anchorText ? {
          text: anchorText,
          start_index: 0,
          end_index: anchorText.length,
        } : undefined,
      },
    };

    addNode(newNode);

    // 如果有父节点，创建连线
    if (parentId) {
      addEdge({
        id: `edge-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'tendril',
      });
    }

    // 获取上下文信息
    let context: string | undefined;
    if (parentId && anchorText) {
      const parentNode = nodes.find(n => n.id === parentId);
      if (parentNode) {
        context = parentNode.data.content.ai_response;
      }
    }

    // 触发流式 AI 请求
    streamAIResponse(nodeId, prompt, context, anchorText);

    return nodeId;
  }, [addNode, addEdge, calculateNewPosition, nodes, updateNodeContent, apiKey, selectedModel]);

  // 处理根节点创建
  const handleCreateRootNode = async () => {
    if (!inputValue.trim() || isCreatingNode) return;

    setIsCreatingNode(true);
    await createNode(inputValue);
    setInputValue('');
    setIsCreatingNode(false);
  };

  // 处理追问（子节点创建）
  const handleFollowUp = async (question: string) => {
    if (!selectedAnchor) return;

    const newNodeId = await createNode(
      question,
      selectedAnchor.nodeId,
      selectedAnchor.text
    );

    setSelectedAnchor(null);

    // 自动打开新节点的详情弹窗，等待 AI 响应
    setSelectedNodeForSheet(newNodeId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+Enter (Mac) 或 Ctrl+Enter (Windows) 发送
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCreateRootNode();
    }
  };

  // Reusable API Settings Modal
  const renderApiSettingsModal = () => (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-[100]"
        onClick={() => setShowApiSettings(false)}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[400px] bg-[#1a1a2e] border border-white/20 rounded-xl
                      shadow-[0_0_60px_rgba(0,0,0,0.5)] z-[101]
                      overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            API Settings
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-white/50 block mb-2">Company</label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10
                         text-white text-sm focus:outline-none focus:border-cyan-400/50
                         [&>option]:bg-[#1a1a2e]"
              disabled
            >
              <option>Google (Gemini)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-2">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10
                         text-white text-sm focus:outline-none focus:border-cyan-400/50
                         [&>option]:bg-[#1a1a2e]"
            >
              <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
              <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10
                         text-white text-sm placeholder:text-white/30
                         focus:outline-none focus:border-cyan-400/50"
            />
          </div>
        </div>
        <div className="flex border-t border-white/10">
          <button
            onClick={() => setShowApiSettings(false)}
            className="flex-1 px-4 py-3 text-sm text-white/60 
                       hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveApiSettings}
            className="flex-1 px-4 py-3 text-sm text-cyan-400 
                       hover:bg-cyan-400/10 transition-colors
                       border-l border-white/10"
          >
            Save
          </button>
        </div>
      </div>
    </>
  );

  // 如果没有节点，显示初始输入界面
  if (nodes.length === 0) {
    const hasApiKey = !!apiKey;

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a1a] text-white overflow-hidden relative">
        {/* Settings Button - Top Right */}
        <button
          onClick={() => setShowApiSettings(true)}
          className={`fixed top-4 right-4 p-2.5 rounded-lg z-50
                     backdrop-blur-md border transition-all
                     ${hasApiKey
              ? 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'
              : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 animate-pulse'}`}
          title={hasApiKey ? "Change API settings" : "Configure API Key"}
        >
          <Key className="w-4 h-4" />
        </button>

        {/* Feedback Button - Bottom Left */}
        <a
          href="mailto:songmin.yu@outlook.com?subject=Ariadne Feedback"
          className="fixed bottom-4 right-4 p-2.5 rounded-lg z-50
                     bg-white/5 backdrop-blur-md border border-white/10
                     text-white/40 hover:text-white/70 hover:bg-white/10
                     transition-all flex items-center gap-2"
          title="Send Feedback"
        >
          <Mail className="w-4 h-4" />
          <span className="text-xs">Feedback</span>
        </a>

        {/* 背景网格 */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(100,200,255,0.1) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* 装饰光晕 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]" />
        </div>

        {/* Content Container (z-10 to stay above background) */}
        <div className="z-10 flex flex-col items-center w-full max-w-2xl px-4">
          <h1 className="text-4xl font-thin tracking-wider mb-2 font-geist-mono">Ariadne</h1>
          <p className="text-white/40 mb-12 font-light">Follow the thread of thought</p>

          {/* Golden Sentences from CONCEPT_DESIGN */}
          <div className="text-center mb-10 space-y-3">
            <p className="text-xl text-white/80 font-light italic">
              "Thinking isn't linear. Why should your chat be?"
            </p>
            <div className="flex items-center gap-2 text-white/40 text-sm justify-center bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Select any text in an answer to ask a follow-up question.
            </div>
          </div>

          {/* API Key Warning */}
          {!hasApiKey && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center gap-2">
              <Key className="w-4 h-4" />
              <span>Please configure your API key first by clicking the key icon above.</span>
            </div>
          )}

          {/* Input */}
          <div className="w-full relative group">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasApiKey ? "Enter your first question..." : "Configure API key to start..."}
              disabled={isCreatingNode || !hasApiKey}
              rows={3}
              className={`w-full px-6 py-4 rounded-xl
                bg-white/5 backdrop-blur-md
                border border-white/10
                text-white placeholder-white/30
                focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20
                transition-all duration-300
                disabled:opacity-50
                text-lg resize-none
                shadow-2xl
                ${!hasApiKey ? 'cursor-not-allowed' : ''}`}
            />
            {isCreatingNode && (
              <div className="absolute right-4 top-4">
                <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              </div>
            )}
            {/* Send button */}
            <button
              onClick={handleCreateRootNode}
              disabled={isCreatingNode || !inputValue.trim() || !hasApiKey}
              className="absolute right-4 bottom-4 px-4 py-1.5 rounded-lg
                            bg-cyan-500/20 hover:bg-cyan-500/30
                            text-cyan-300 text-sm
                            disabled:opacity-30 disabled:cursor-not-allowed
                            transition-all"
            >
              Send
            </button>
          </div>

          <p className="text-white/20 text-xs mt-6">
            ⌘/Ctrl + Enter to send
          </p>
        </div>

        {/* API Settings Modal */}
        {showApiSettings && renderApiSettingsModal()}
      </div>
    );
  }

  // 有节点时显示画布
  return (
    <div className="w-full h-screen bg-[#0a0a1a]">
      <Canvas />

      {/* 详情弹窗（居中浮动） */}
      <DetailModal onFollowUp={handleFollowUp} />

      {/* Top toolbar */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
        {/* Export ZIP */}
        <button
          onClick={() => exportAsZip(nodes, edges)}
          title="Export as ZIP (HTML + Markdown)"
          className="p-2 rounded-lg bg-white/5 backdrop-blur-md border border-white/10
                     text-white/40 hover:text-white/70 hover:bg-white/10
                     transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        {/* Reset */}
        <button
          onClick={() => setShowResetConfirm(true)}
          title="Reset"
          className="p-2 rounded-lg bg-white/5 backdrop-blur-md border border-white/10
                     text-white/40 hover:text-white/70 hover:bg-white/10
                     transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* API Key Settings */}
        <button
          onClick={() => setShowApiSettings(true)}
          title="API Settings"
          className="p-2 rounded-lg bg-white/5 backdrop-blur-md border border-white/10
                     text-white/40 hover:text-white/70 hover:bg-white/10
                     transition-all"
        >
          <Key className="w-4 h-4" />
        </button>

        {/* Save status */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 backdrop-blur-md border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/60">Saved</span>
        </div>
      </div>

      {/* Feedback Button - Bottom Left */}
      <a
        href="mailto:songmin.yu@outlook.com?subject=Ariadne Feedback"
        className="fixed bottom-4 right-4 p-2.5 rounded-lg z-50
                   bg-white/5 backdrop-blur-md border border-white/10
                   text-white/40 hover:text-white/70 hover:bg-white/10
                   transition-all flex items-center gap-2"
        title="Send Feedback"
      >
        <Mail className="w-4 h-4" />
        <span className="text-xs">Feedback</span>
      </a>

      {/* Reset confirm dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset Canvas"
        message="This will clear all nodes and return to the start screen. This cannot be undone."
        onConfirm={() => {
          clearAll();
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* API Settings Modal */}
      {showApiSettings && renderApiSettingsModal()}
    </div>
  );
}
