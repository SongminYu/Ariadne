'use client';

import dynamic from 'next/dynamic';
import { useCanvasStore, NodeData } from '@/stores/useCanvasStore';
import { useState, useCallback, useEffect, useRef } from 'react';
import SelectionPopover from '@/components/ui/SelectionPopover';
import DetailModal from '@/components/ui/DetailModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Node } from '@xyflow/react';
import { Bot, Mail, Sun, Moon, Upload, Coffee } from 'lucide-react';
import { useThemeStore } from '@/stores/useThemeStore';
import { generateSingleFileHTML } from '@/utils/export';
import ThemeBackground from '@/components/ui/ThemeBackground';
import InteractionDemo from '@/components/ui/InteractionDemo';
import BuyMeCoffee from '@/components/ui/BuyMeCoffee';
import { CLOUDFLARE_WORKER_URL } from '@/config/apiConfig';

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
    setNodes,
    setEdges,
  } = useCanvasStore();

  const [inputValue, setInputValue] = useState('');
  const [isCreatingNode, setIsCreatingNode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [showSystemPromptInput, setShowSystemPromptInput] = useState(false);
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

    const savedPrompt = localStorage.getItem('ariadne_custom_system_prompt');
    if (savedPrompt) setCustomSystemPrompt(savedPrompt);
  }, []);

  // Save model preference to localStorage
  const handleSaveModelSettings = useCallback(() => {
    localStorage.setItem('ariadne_model', selectedModel);
    localStorage.setItem('ariadne_custom_system_prompt', customSystemPrompt);
    setShowModelSettings(false);
  }, [selectedModel, customSystemPrompt]);

  // Handle .ariadne project file upload
  const handleProjectFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.endsWith('.ariadne')) {
      alert('Please upload a valid .ariadne file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const projectData = JSON.parse(content);

        // Validate project data structure
        if (!projectData.version || !projectData.nodes || !projectData.edges) {
          throw new Error('Invalid project file format');
        }

        // Restore nodes and edges
        setNodes(projectData.nodes);
        setEdges(projectData.edges);

        console.log('Project restored:', projectData.nodes.length, 'nodes,', projectData.edges.length, 'edges');
      } catch (error) {
        console.error('Failed to parse project file:', error);
        alert('Failed to load project: Invalid file format');
      }
    };
    reader.readAsText(file);

    // Reset input value to allow re-uploading same file
    event.target.value = '';
  }, [setNodes, setEdges]);

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

      // Generate HTML content
      const htmlContent = generateSingleFileHTML(nodesToExport, edgesToExport);
      zip.file(`${baseName}.html`, htmlContent);

      // Generate Markdown summary
      const { generateMarkdownSummary } = await import('@/utils/export');
      const mdContent = generateMarkdownSummary(nodesToExport, baseName);
      zip.file(`${baseName}.md`, mdContent);

      // Generate .ariadne project file (JSON format for project restore)
      const projectData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        nodes: nodesToExport,
        edges: edgesToExport,
      };
      zip.file(`${baseName}.ariadne`, JSON.stringify(projectData, null, 2));

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
    - Use **headings** (##, ###) to divide major sections (always precede with a blank line)
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

      // Inject custom system prompt if available
      if (customSystemPrompt && customSystemPrompt.trim()) {
        systemInstruction += `

    ## User Custom Instructions
    The user has provided specific instructions for you to follow. These instructions override default behaviors where applicable:

    ${customSystemPrompt}`;
      }

      // Inject project context (history from other nodes)
      if (nodes.length > 0) {
        systemInstruction += `

    ## Project Context (Knowledge Base from other nodes)
    The following is the conversation history of the current project. Use this to find connections.
    If the user's new question relates to any information in the above Project Context, you MUST consider it in your answer and explicitly mention the connection to the user.

    `;
        nodes.forEach((node, index) => {
          const q = node.data.content.user_prompt || '';
          const a = node.data.content.ai_response || '';
          if (q.trim() || a.trim()) {
            systemInstruction += `Node ${index + 1} (${node.id}):\nUser Question: ${q}\nAI Answer: ${a}\n\n`;
          }
        });
      }

      // If there's context (follow-up scenario)
      if (context && anchor) {
        systemInstruction += `

The user is reading a response about a topic. They selected the text "${anchor}" and based on this, asked a new question.

Focus on answering the user's NEW question directly. The selected text is just context/starting point. Do not simply explain the selected text itself.

Previous context (for reference):
${context}`;
      }

      // Call Gemini API via Cloudflare Worker proxy (API key is securely stored in Worker)
      const response = await fetch(
        CLOUDFLARE_WORKER_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            payload: {
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: systemInstruction }] },
              generationConfig: {
                temperature: 0.7,
              },
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
  }, [addNode, addEdge, calculateNewPosition, nodes, updateNodeContent, selectedModel, customSystemPrompt]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isInputExpanded, setIsInputExpanded] = useState(false);

  // Check input height for button positioning
  useEffect(() => {
    if (textareaRef.current) {
      // If scrollHeight is > 76 (min-height 72 + buffer), we consider it expanded
      setIsInputExpanded(textareaRef.current.scrollHeight > 76);
    }
  }, [inputValue]);

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
      <div className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      ${showSystemPromptInput ? 'w-[600px]' : 'w-[400px]'} 
                      card-elevation rounded-[var(--radius-lg)]
                      z-[101] overflow-hidden transition-all duration-300 ease-in-out`}>
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
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Model</label>
              <button
                onClick={() => setShowSystemPromptInput(!showSystemPromptInput)}
                className="text-xs text-[var(--accent-primary)] hover:underline cursor-pointer font-medium transition-colors"
                title={showSystemPromptInput ? "Hide prompt editor" : "Edit custom system instructions"}
              >
                {showSystemPromptInput ? 'Hide System Prompt' : 'Edit System Prompt'}
              </button>
            </div>
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

            {/* Custom System Prompt Editor */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out
                           ${showSystemPromptInput ? 'max-h-[300px] mt-4 opacity-100' : 'max-h-0 mt-0 opacity-0'}`}>
              <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold block mb-2">
                Custom System Instructions
              </label>
              <textarea
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                className="w-full h-48 px-4 py-3 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--card-border)]
                           text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]
                           resize-none transition-colors overflow-y-auto"
                placeholder="Enter custom instructions for the AI behavior..."
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                These instructions will be prepended to the system prompt.
              </p>
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

        {/* Logo - top left corner */}
        <div className="fixed top-6 left-6 z-50">
          <img
            src={theme === 'dark' ? '/icon-dark.jpg' : '/icon-light.jpg'}
            alt="Ariadne"
            className="w-10 h-10 rounded-lg shadow-md transition-all duration-300"
          />
        </div>

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

        {/* Controls - Bottom Right */}
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <BuyMeCoffee />

          <a
            href="mailto:songmin.yu@outlook.com?subject=Ariadne Feedback"
            className="px-4 py-2 rounded-full
                       glass-panel text-[var(--text-secondary)] hover:text-[var(--accent-primary)]
                       transition-all flex items-center gap-2 hover:shadow-md text-sm font-medium"
            title="Send Feedback"
          >
            <Mail className="w-4 h-4" />
            <span>Feedback</span>
          </a>
        </div>

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
                ref={(el) => {
                  // Assign to ref for scrollHeight check
                  // @ts-ignore
                  textareaRef.current = el;

                  // Auto-resize logic (keep existing behavior)
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
                  }
                }}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind?"
                disabled={isCreatingNode}
                rows={1}
                style={{
                  minHeight: '72px',
                  maxHeight: '200px',
                }}
                className="w-full px-6 py-5 pr-[100px] rounded-[var(--radius-lg)]
                  bg-[var(--card-bg)]
                  border border-[var(--card-border)]
                  text-[var(--text-primary)] placeholder-[var(--text-muted)]
                  text-lg resize-none
                  shadow-[var(--card-shadow)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)]
                  transition-all duration-300 custom-scrollbar overflow-y-auto"
              />
              {isCreatingNode && (
                <div className={`absolute right-5 ${isInputExpanded ? 'bottom-5' : 'top-1/2 -translate-y-1/2'}`}>
                  <div className="w-5 h-5 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
                </div>
              )}
              {!isCreatingNode && inputValue.trim() && (
                <button
                  onClick={handleCreateRootNode}
                  className={`absolute right-4 px-5 py-2 rounded-full
                                bg-[var(--accent-primary)] hover:opacity-90 text-white
                                text-sm font-medium shadow-lg hover:shadow-xl
                                transition-all
                                ${isInputExpanded ? 'bottom-4' : 'top-1/2 -translate-y-1/2 -mt-[3px]'}`}
                >
                  Send
                </button>
              )}
              {/* Upload button - visible when input is empty */}
              {!isCreatingNode && !inputValue.trim() && (
                <label
                  className={`absolute right-5 cursor-pointer group/upload flex items-center ${isInputExpanded ? 'bottom-5' : 'top-1/2 -translate-y-1/2 -mt-0.5'}`}
                  title="Upload .ariadne file to continue working on a previous project"
                >
                  <Upload className="w-5 h-5 text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors" />
                  <input
                    type="file"
                    accept=".ariadne"
                    onChange={handleProjectFileUpload}
                    className="hidden"
                  />
                  {/* Tooltip - appears to the right of input box, vertically centered */}
                  <div className="absolute left-full ml-8 top-1/2 -translate-y-1/2 w-64 p-3 text-xs leading-relaxed
                                   bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-xl
                                   text-[var(--text-secondary)] opacity-0 group-hover/upload:opacity-100
                                   transition-opacity pointer-events-none z-10">
                    <p className="font-medium text-[var(--text-primary)] mb-1">Resume Session</p>
                    <p>Upload an <strong>.ariadne</strong> file to pick up where you left off.</p>
                    <p className="mt-1 opacity-80 italic">You can download the file after your exploration, together with your entire session.</p>
                  </div>
                </label>
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

      {/* Logo - top left corner */}
      <div className="fixed top-4 left-4 z-50">
        <img
          src={theme === 'dark' ? '/icon-dark.jpg' : '/icon-light.jpg'}
          alt="Ariadne"
          className="w-10 h-10 rounded-lg shadow-md transition-all duration-300"
        />
      </div>

      <Canvas />

      {/* Detail modal (floating centered) */}
      <DetailModal onFollowUp={handleFollowUp} />

      {/* Top toolbar - Integrated Capsule */}
      {/* Top toolbar - Split Layout */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        {/* Clear Button (Extracted) */}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="px-4 py-3 rounded-full glass-panel shadow-sm text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] hover:shadow-md transition-all text-xs font-medium tracking-wide uppercase"
        >
          Clear
        </button>

        {/* Capsule for remaining tools */}
        <div className="flex items-center gap-2 px-1.5 py-1 rounded-full glass-panel shadow-sm">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all"
            title={theme === 'light' ? "Switch to Night Mode" : "Switch to Day Mode"}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

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

          {/* Model Settings */}
          <button
            onClick={() => setShowModelSettings(true)}
            title="Model Settings"
            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all"
          >
            <Bot className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <BuyMeCoffee size="small" />

        <a
          href="mailto:songmin.yu@outlook.com?subject=Ariadne Feedback"
          className="px-3 py-1.5 rounded-full
                     glass-panel text-[var(--text-secondary)] hover:text-[var(--accent-primary)]
                     transition-all flex items-center gap-2 text-xs hover:opacity-100"
          title="Send Feedback"
        >
          <Mail className="w-3 h-3" />
          <span>Feedback</span>
        </a>
      </div>

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
