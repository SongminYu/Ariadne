'use client';

import dynamic from 'next/dynamic';
import { useCanvasStore, NodeData } from '@/stores/useCanvasStore';
import { useState, useCallback, useEffect } from 'react';
import SelectionPopover from '@/components/ui/SelectionPopover';
import DetailModal from '@/components/ui/DetailModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Node } from '@xyflow/react';
import { Bot, Mail, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/stores/useThemeStore';
import { generateSingleFileHTML } from '@/utils/export';
import { API_KEY } from '@/config/apiConfig';
import ThemeBackground from '@/components/ui/ThemeBackground';
import InteractionDemo from '@/components/ui/InteractionDemo';

// Dynamically import Canvas component to avoid SSR issues
const Canvas = dynamic(() => import('@/components/canvas/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="text-[var(--text-tertiary)] animate-pulse">Loading Canvas...</div>
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
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro');
  const { theme, toggleTheme } = useThemeStore();

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load model preference from localStorage on mount
  useEffect(() => {
    const savedModel = localStorage.getItem('ariadne_model');
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  // Save model preference to localStorage
  const handleSaveModelSettings = useCallback(() => {
    localStorage.setItem('ariadne_model', selectedModel);
    setShowModelSettings(false);
  }, [selectedModel]);

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

  // Calculate new node position (with collision detection)
  const calculateNewPosition = useCallback((parentId: string | null) => {
    if (!parentId) {
      return { x: 0, y: 0 };
    }

    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) {
      return { x: 0, y: 0 };
    }

    // Node size constants
    const NODE_WIDTH = 400;
    const NODE_HEIGHT = 200;
    const HORIZONTAL_GAP = 150;
    const VERTICAL_GAP = 50;

    // New node base position: right of parent node
    const baseX = parentNode.position.x + NODE_WIDTH + HORIZONTAL_GAP;

    // Get all nodes in the same column (similar X position)
    const nodesInColumn = nodes.filter(n =>
      Math.abs(n.position.x - baseX) < NODE_WIDTH / 2
    );

    // Calculate existing children of this parent
    const siblingEdges = edges.filter(e => e.source === parentId);
    const siblingCount = siblingEdges.length;

    // Base Y position: centered on parent, offset by sibling count
    let baseY = parentNode.position.y + (siblingCount * (NODE_HEIGHT + VERTICAL_GAP));

    // Collision detection: check for overlap with existing nodes
    const isColliding = (y: number) => {
      return nodesInColumn.some(n =>
        Math.abs(n.position.y - y) < NODE_HEIGHT + VERTICAL_GAP
      );
    };

    // If colliding, search downwards for empty space
    let attempts = 0;
    while (isColliding(baseY) && attempts < 20) {
      baseY += NODE_HEIGHT + VERTICAL_GAP;
      attempts++;
    }

    return { x: baseX, y: baseY };
  }, [nodes, edges]);

  // Stream AI response
  // Direct Gemini API call (works on GitHub Pages without backend)
  const streamAIResponse = async (
    nodeId: string,
    prompt: string,
    context?: string,
    anchor?: string
  ) => {
    try {
      // Using built-in API key from config

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
    - **NEVER** use horizontal rules (---) to separate sections

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
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${API_KEY}`,
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

  // Create node
  const createNode = useCallback(async (
    prompt: string,
    parentId: string | null = null,
    anchorText?: string
  ) => {
    const nodeId = crypto.randomUUID();
    const position = calculateNewPosition(parentId);

    // Create node object
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

    // If parent exists, create edge
    if (parentId) {
      addEdge({
        id: `edge-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'tendril',
      });
    }

    // Get context information
    let context: string | undefined;
    if (parentId && anchorText) {
      const parentNode = nodes.find(n => n.id === parentId);
      if (parentNode) {
        context = parentNode.data.content.ai_response;
      }
    }

    // Trigger streaming AI request
    streamAIResponse(nodeId, prompt, context, anchorText);

    return nodeId;
  }, [addNode, addEdge, calculateNewPosition, nodes, updateNodeContent, selectedModel]);

  // Handle root node creation
  const handleCreateRootNode = async () => {
    if (!inputValue.trim() || isCreatingNode) return;

    setIsCreatingNode(true);
    await createNode(inputValue);
    setInputValue('');
    setIsCreatingNode(false);
  };

  // Handle follow-up (create child node)
  const handleFollowUp = async (question: string) => {
    if (!selectedAnchor) return;

    const newNodeId = await createNode(
      question,
      selectedAnchor.nodeId,
      selectedAnchor.text
    );

    setSelectedAnchor(null);

    // Automatically open detail modal for new node, waiting for AI response
    setSelectedNodeForSheet(newNodeId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+Enter (Mac) or Ctrl+Enter (Windows) to send
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCreateRootNode();
    }
  };

  // Reusable Model Settings Modal
  const renderModelSettingsModal = () => (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
        onClick={() => setShowModelSettings(false)}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[400px] card-elevation rounded-[var(--radius-lg)]
                      z-[101] overflow-hidden transition-all">
        <div className="p-6 border-b border-[var(--card-border)]">
          <h3 className="text-[var(--text-primary)] font-serif text-xl flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--accent-primary)]" />
            Model Settings
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold block mb-2">Company</label>
            <div className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-[var(--bg-dots)] border border-[var(--card-border)]
                          text-[var(--text-primary)] text-sm opacity-70 cursor-not-allowed">
              Google (Gemini)
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold block mb-2">Model</label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--card-border)]
                           text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]
                           appearance-none cursor-pointer hover:border-[var(--accent-primary)] transition-colors"
              >
                <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
                <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>
        <div className="flex border-t border-[var(--card-border)] p-2 bg-[var(--bg-dots)]">
          <button
            onClick={() => setShowModelSettings(false)}
            className="flex-1 px-4 py-2 text-sm text-[var(--text-secondary)] 
                       hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] rounded-[var(--radius-sm)] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveModelSettings}
            className="flex-1 px-4 py-2 text-sm text-white bg-[var(--accent-primary)] 
                       hover:opacity-90 transition-opacity rounded-[var(--radius-sm)] shadow-md"
          >
            Save
          </button>
        </div>
      </div>
    </>
  );

  // If no nodes, show initial input screen
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden relative transition-colors duration-500">

        {/* Top Right Controls Group */}
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-3 rounded-full glass-panel text-[var(--text-secondary)] hover:text-[var(--text-primary)] 
                       hover:scale-110 transition-all duration-300 shadow-sm"
            title={theme === 'light' ? "Switch to Night Mode" : "Switch to Day Mode"}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowModelSettings(true)}
            className="p-3 rounded-full glass-panel text-[var(--text-secondary)] hover:text-[var(--text-primary)] 
                       hover:scale-110 transition-all duration-300 shadow-sm"
            title="Model Settings"
          >
            <Bot className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Button - Bottom Right */}
        <a
          href="mailto:songmin.yu@outlook.com?subject=Ariadne Feedback"
          className="fixed bottom-6 right-6 px-4 py-2 rounded-full z-50
                     glass-panel text-[var(--text-secondary)] hover:text-[var(--accent-primary)]
                     transition-all flex items-center gap-2 hover:shadow-md text-sm font-medium"
          title="Send Feedback"
        >
          <Mail className="w-4 h-4" />
          <span>Feedback</span>
        </a>

        {/* Background Decorative Elements */}
        {theme === 'light' ? (
          /* Day Mode: Subtle Clouds/Gradient */
          <div className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(107, 144, 128, 0.08), transparent 50%), radial-gradient(circle at 70% 80%, rgba(14, 165, 233, 0.06), transparent 40%)'
            }}
          />
        ) : (
          /* Night Mode: Deep Glow */
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(56, 189, 248, 0.1), transparent 50%), radial-gradient(circle at 70% 80%, rgba(129, 140, 248, 0.08), transparent 40%)'
            }}
          />
        )}

        {/* Two-Column Layout Container */}
        <div className="z-10 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 w-full max-w-6xl px-6 py-12">

          {/* Left Column: Interactive Demo */}
          <div className="w-full lg:w-1/2 flex items-center justify-center">
            <InteractionDemo theme={theme} />
          </div>

          {/* Right Column: Branding & Input */}
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start">
            {/* Logo & Tagline */}
            <h1 className="text-5xl md:text-7xl tracking-tight mb-3 font-serif text-[var(--text-primary)] drop-shadow-sm">
              Ariadne
            </h1>
            <p className="text-[var(--text-secondary)] mb-8 font-light text-lg tracking-wide">
              Follow the thread of thought
            </p>

            {/* Slogan */}
            <p className="text-xl md:text-2xl text-[var(--text-primary)] font-serif italic opacity-90 leading-relaxed mb-10 text-center lg:text-left">
              &ldquo;Thinking isn&apos;t linear. Why should your chat be?&rdquo;
            </p>

            {/* Input */}
            <div className="w-full relative group">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind?"
                disabled={isCreatingNode}
                rows={1}
                style={{ minHeight: '72px' }}
                className="w-full px-6 py-5 rounded-[var(--radius-lg)]
                  bg-[var(--card-bg)]
                  border border-[var(--card-border)]
                  text-[var(--text-primary)] placeholder-[var(--text-muted)]
                  text-lg resize-none
                  shadow-[var(--card-shadow)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)]
                  transition-all duration-300"
              />
              {isCreatingNode && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
                </div>
              )}
              {!isCreatingNode && inputValue.trim() && (
                <button
                  onClick={handleCreateRootNode}
                  className="absolute right-4 top-1/2 -translate-y-1/2 px-5 py-2 rounded-full
                                bg-[var(--accent-primary)] hover:opacity-90 text-white
                                text-sm font-medium shadow-lg hover:shadow-xl
                                transition-all"
                >
                  Send
                </button>
              )}
            </div>

            <p className="text-[var(--text-tertiary)] text-xs mt-4 opacity-60">
              ⌘/Ctrl + Enter to send
            </p>
          </div>
        </div>

        {/* Model Settings Modal */}
        {showModelSettings && renderModelSettingsModal()}
      </div>
    );
  }

  // Show canvas when nodes exist
  return (
    <div className="w-full h-screen bg-[var(--bg-primary)] transition-colors duration-500 overflow-hidden relative">
      <ThemeBackground />
      <div className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, var(--bg-dots) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <Canvas />

      {/* Detail modal (floating centered) */}
      <DetailModal onFollowUp={handleFollowUp} />

      {/* Top toolbar - Integrated Capsule */}
      <div className="fixed top-6 right-6 z-50 flex items-center p-1.5 rounded-full glass-panel shadow-sm">

        {/* Theme Toggle (Integrated) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all"
          title={theme === 'light' ? "Switch to Night Mode" : "Switch to Day Mode"}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        <div className="w-px h-4 bg-[var(--text-muted)] mx-1 opacity-30"></div>

        {/* Export ZIP */}
        <button
          onClick={() => exportAsZip(nodes, edges)}
          title="Export as ZIP"
          className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        {/* Reset */}
        <button
          onClick={() => setShowResetConfirm(true)}
          title="Reset Canvas"
          className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] hover:bg-[var(--card-bg)] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* Model Settings */}
        <button
          onClick={() => setShowModelSettings(true)}
          title="Model Settings"
          className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all"
        >
          <Bot className="w-4 h-4" />
        </button>

        {/* Save status */}
        <div className="flex items-center gap-2 pl-3 pr-2 border-l border-[var(--text-muted)] border-opacity-20 ml-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
      </div>

      {/* Feedback Button - Bottom Left */}
      <a
        href="mailto:songmin.yu@outlook.com?subject=Ariadne Feedback"
        className="fixed bottom-6 right-6 px-3 py-1.5 rounded-full z-50
                   glass-panel text-[var(--text-secondary)] hover:text-[var(--accent-primary)]
                   transition-all flex items-center gap-2 text-xs opacity-50 hover:opacity-100"
        title="Send Feedback"
      >
        <Mail className="w-3 h-3" />
        <span>Feedback</span>
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

      {/* Model Settings Modal */}
      {showModelSettings && renderModelSettingsModal()}
    </div>
  );
}
