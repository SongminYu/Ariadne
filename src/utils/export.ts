
import { Node, Edge } from '@xyflow/react';
import { NodeData } from '@/stores/useCanvasStore';

/**
 * Generate a Markdown summary of all Q&A pairs
 */
export function generateMarkdownSummary(nodes: Node<NodeData>[], title: string): string {
    const lines: string[] = [];

    // H1 title
    lines.push(`# ${title}`);
    lines.push('');

    // Sort nodes by creation order (we'll use position as a rough proxy, or just iterate)
    // For each node, add H2 question and answer content
    for (const node of nodes) {
        const question = node.data.content.user_prompt;
        const answer = node.data.content.ai_response || '';

        // H2: Question
        lines.push(`## ${question}`);
        lines.push('');

        // If there's a source anchor, show it
        if (node.data.source_anchor) {
            lines.push(`> *From: "${node.data.source_anchor.text}"*`);
            lines.push('');
        }

        // Answer content
        lines.push(answer);
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    return lines.join('\n');
}

export function generateSingleFileHTML(nodes: Node<NodeData>[], edges: Edge[]): string {
    // Only escape </script to prevent breaking the script tag
    // The data will be stored in a separate JSON script tag
    const nodesJson = JSON.stringify(nodes.map(n => ({
        id: n.id,
        position: n.position,
        data: {
            content: {
                user_prompt: n.data.content.user_prompt,
                ai_response: n.data.content.ai_response
            },
            source_anchor: n.data.source_anchor,
            parent_id: n.data.parent_id
        }
    }))).replace(/<\/script/gi, '<\\/script');

    const edgesJson = JSON.stringify(edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target
    }))).replace(/<\/script/gi, '<\\/script');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ariadne Export</title>
    <!-- KaTeX CSS for Math Rendering -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <!-- Highlight.js for Code Syntax Highlighting -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <!-- Markdown-it and plugins -->
    <script src="https://cdn.jsdelivr.net/npm/markdown-it@14.0.0/dist/markdown-it.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/markdown-it-texmath@1.0.0/texmath.min.js"></script>
    <style>
        :root {
             /* DAY MODE - "Spring Morning" */
            --bg-primary: #F2F5F3;
            --bg-dots: #A4C3B2;
            --card-bg: #FFFFFF;
            --card-border: #E1E8E4;
            --card-shadow: 0 8px 24px rgba(107, 144, 128, 0.08), 0 2px 8px rgba(107, 144, 128, 0.05);
            --text-primary: #354F52;
            --text-secondary: #52796F;
            --text-tertiary: #84A98C;
            --accent-primary: #6B9080;
            --accent-secondary: #E07A5F;
            --accent-tertiary: #8AA399;
            --edge-color: #CCD5AE;
            --edge-active: #6B9080;
            --glass-bg: rgba(255, 255, 255, 0.6);
            --glass-border: rgba(255, 255, 255, 0.4);
            
            /* Typography - System Fonts */
            --font-serif: system-ui, -apple-system, sans-serif;
            --font-sans: system-ui, -apple-system, sans-serif;
            
            --radius-lg: 24px;
            --radius-md: 16px;
            --radius-sm: 8px;
        }

        [data-theme="dark"] {
             /* NIGHT MODE - "Nature at Night" */
            --bg-primary: #0F172A;
            --bg-dots: #334155;
            --card-bg: #1E293B;
            --card-border: rgba(255, 255, 255, 0.08);
            --card-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            --text-primary: #E2E8F0;
            --text-secondary: #94A3B8;
            --text-tertiary: #64748B;
            --accent-primary: #38BDF8;
            --accent-secondary: #FB7185;
            --accent-tertiary: #818CF8;
            --edge-color: #334155;
            --edge-active: #38BDF8;
            --glass-bg: rgba(15, 23, 42, 0.7);
            --glass-border: rgba(255, 255, 255, 0.08);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            background: var(--bg-primary);
            color: var(--text-primary);
            font-family: var(--font-sans);
            overflow: hidden;
            width: 100vw;
            height: 100vh;
            transition: background-color 0.5s ease, color 0.3s ease;
        }

        /* Container and Canvas */
        #container {
            width: 100%;
            height: 100%;
            cursor: grab;
            position: relative;
            background-image: radial-gradient(circle, var(--bg-dots) 1px, transparent 1px);
            background-size: 24px 24px;
        }
        #container:active { cursor: grabbing; }
        #canvas {
            position: absolute;
            top: 0;
            left: 0;
            transform-origin: 0 0;
        }

        /* Theme Toggle */
        #theme-toggle {
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 2000;
            padding: 10px;
            border-radius: 50%;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            color: var(--text-secondary);
            cursor: pointer;
            box-shadow: var(--card-shadow);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #theme-toggle:hover {
            transform: scale(1.1);
            color: var(--text-primary);
        }

        /* Node Cards */
        .node {
            position: absolute;
            width: 280px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: var(--radius-md);
            box-shadow: var(--card-shadow);
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .node:hover {
            transform: translateY(-4px) scale(1.02);
            border-color: var(--accent-primary);
        }
        .node-header-anchor {
            padding: 8px 16px;
            background: rgba(14, 165, 233, 0.05); /* slightly transparent accent */
            border-bottom: 1px solid var(--card-border);
            color: var(--accent-primary);
            font-size: 11px;
            border-radius: var(--radius-md) var(--radius-md) 0 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 500;
        }
        .node-question {
            padding: 12px 16px;
            background: transparent;
            border-bottom: 1px solid var(--card-border);
            font-size: 14px;
            color: var(--text-primary);
            font-weight: 500;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .node-question.rounded-top { border-radius: var(--radius-md) var(--radius-md) 0 0; }
        .node-preview {
            padding: 12px 16px;
            font-size: 12px;
            color: var(--text-secondary);
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* Modal Overlay */
        #modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: none;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
        }
        #modal-overlay.visible {
            display: flex;
            opacity: 1;
        }

        /* Modal Content */
        #modal-content {
            width: 100%;
            max-width: 720px;
            max-height: 85vh;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: var(--radius-lg);
            box-shadow: var(--card-shadow);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transform: scale(0.95);
            transition: transform 0.2s;
        }
        #modal-overlay.visible #modal-content {
            transform: scale(1);
        }

        /* Modal Header */
        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            border-bottom: 1px solid var(--card-border);
        }
        .modal-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--accent-primary);
        }
        .modal-title {
            color: var(--text-primary);
            font-weight: 600;
            font-family: var(--font-serif);
            font-size: 18px;
        }
        .branch-badge {
            padding: 4px 10px;
            background: var(--bg-dots);
            border-radius: 9999px;
            font-size: 12px;
            color: var(--text-secondary);
        }
        .close-btn {
            padding: 8px;
            border-radius: 8px;
            background: none;
            border: none;
            color: var(--text-tertiary);
            cursor: pointer;
            transition: background 0.2s;
            font-size: 24px;
            line-height: 0.8;
        }
        .close-btn:hover {
            color: var(--text-primary);
            background: var(--bg-dots);
        }

        /* Modal Body */
        .modal-body {
            flex: 1;
            overflow-y: auto;
        }

        /* Source Anchor Section */
        .source-anchor-section {
            padding: 16px 24px;
            background: rgba(14, 165, 233, 0.05);
            border-bottom: 1px solid var(--card-border);
        }
        .source-anchor-label {
            color: var(--accent-primary);
            font-size: 12px;
            margin-right: 8px;
            font-weight: 600;
        }
        .source-anchor-text {
            font-size: 14px;
            color: var(--text-secondary);
            font-style: italic;
        }

        /* Question Section - matches DetailModal.tsx */
        .question-section {
            padding: 24px;
            border-bottom: 1px solid var(--card-border);
            background: rgba(0, 0, 0, 0.02);
        }
        [data-theme="dark"] .question-section {
            background: rgba(255, 255, 255, 0.02);
        }
        .section-label {
            font-size: 12px;
            color: var(--text-tertiary);
            margin-bottom: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .question-text {
            font-size: 20px;
            color: var(--text-primary);
            line-height: 1.5;
            font-family: var(--font-serif);
            font-weight: 500;
        }

        /* Answer Section */
        .answer-section {
            padding: 24px;
        }

        /* Prose styling */
        .prose {
            color: var(--text-primary);
            line-height: 1.75;
            font-size: 16px;
            font-family: var(--font-serif);
        }
        .prose p {
            margin-top: 0.75em;
            margin-bottom: 0.75em;
            line-height: 1.75;
        }
        .prose > p:first-child {
            margin-top: 0;
        }
        .prose ul, .prose ol {
            margin-top: 1.25em;
            margin-bottom: 1.25em;
            padding-left: 1.625em;
        }
        .prose li {
            margin-top: 0.5em;
            margin-bottom: 0.5em;
        }
        .prose strong { color: var(--text-primary); font-weight: 600; }
        .prose code {
            background: var(--bg-dots);
            padding: 2px 6px;
            border-radius: 4px;
            color: var(--accent-secondary);
            font-family: var(--font-geist-mono, monospace);
            font-size: 0.9em;
        }
        .prose blockquote {
            border-left: 4px solid var(--card-border);
            padding-left: 1rem;
            font-style: italic;
            color: var(--text-secondary);
            margin: 0.75em 0;
        }
        .prose a { color: var(--accent-primary); text-decoration: none; }
        
        /* Table styling - matches DetailModal.tsx styling */
        .prose table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1.25em;
            margin-bottom: 1.25em;
            font-size: 14px;
        }
        .prose th {
            padding: 8px;
            text-align: left;
            font-weight: 600;
            color: var(--text-primary);
            border: 1px solid var(--card-border);
        }
        .prose td {
            padding: 8px;
            border: 1px solid var(--card-border);
            color: var(--text-secondary);
            vertical-align: top;
        }
        
        /* H1/H2/H3 headings in prose - match web app styling */
        .prose h1 {
            font-size: 1.25em;
            font-weight: 700;
            margin-top: 1.5em;
            margin-bottom: 0.75em;
            padding-bottom: 0.5em;
            border-bottom: 1px solid var(--card-border);
            color: var(--text-primary);
        }
        .prose h2 {
            font-size: 1.125em;
            font-weight: 700;
            margin-top: 1.25em;
            margin-bottom: 0.5em;
            padding-bottom: 0.5em;
            border-bottom: 1px solid var(--card-border);
            color: var(--text-primary);
        }
        .prose h3 {
            font-size: 1em;
            font-weight: 600;
            margin-top: 1em;
            margin-bottom: 0.5em;
            color: var(--text-primary);
        }
        
        /* Code block styling - compact like web app */
        .prose pre, .prose pre.hljs {
            background: #0d1117;
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 16px;
            overflow-x: auto;
            margin: 0.75em 0;
        }
        .prose pre code, .prose pre.hljs code {
            background: transparent !important;
            padding: 0;
            font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            line-height: 1.5;
            white-space: pre;
            display: block;
            color: #c9d1d9;  /* Default code color for github-dark theme */
        }
        /* Allow highlight.js colors to override */
        .prose pre code .hljs-keyword,
        .prose pre code .hljs-built_in { color: #ff7b72; }
        .prose pre code .hljs-string { color: #a5d6ff; }
        .prose pre code .hljs-comment { color: #8b949e; }
        .prose pre code .hljs-number { color: #79c0ff; }
        .prose pre code .hljs-function { color: #d2a8ff; }
        .prose pre code .hljs-title { color: #d2a8ff; }
        .prose pre code .hljs-params { color: #c9d1d9; }
        .prose pre code .hljs-attr { color: #79c0ff; }
        /* Hide br tags inside code blocks (caused by breaks:true) */
        .prose pre br, .prose pre.hljs br {
            display: none;
        }
        /* Inline code */
        .prose code:not(pre code) {
            background: var(--bg-dots);
            padding: 2px 6px;
            border-radius: 4px;
            color: var(--accent-secondary);
            font-family: monospace;
            font-size: 0.9em;
        }
        /* Anchor Highlight */
        .anchor-highlight {
            background: rgba(14, 165, 233, 0.1);
            color: var(--accent-primary);
            padding: 0 4px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        .anchor-highlight:hover {
            background: var(--accent-primary);
            color: white;
        }

        /* Modal Footer */
        .modal-footer {
            padding: 16px 24px;
            border-top: 1px solid var(--card-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .back-btn {
            font-size: 13px;
            color: var(--text-secondary);
            background: none;
            border: none;
            cursor: pointer;
            transition: color 0.2s;
        }
        .back-btn:hover {
            color: var(--text-primary);
        }
        .delete-btn { display: none; }

    </style>
</head>
<body>
    <!-- Data stored safely in JSON script tags (not executed as JavaScript) -->
    <script id="nodes-data" type="application/json">${nodesJson}</script>
    <script id="edges-data" type="application/json">${edgesJson}</script>

    <button id="theme-toggle" title="Toggle Theme">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
    </button>

    <div id="container">
        <div id="canvas">
            <svg id="connections" width="10000" height="10000" style="position:absolute;top:0;left:0;overflow:visible;pointer-events:none;"></svg>
            <div id="nodes"></div>
        </div>
    </div>

    <div id="modal-overlay">
        <div id="modal-content">
            <div class="modal-header">
                <div class="modal-header-left">
                    <div class="pulse-dot"></div>
                    <span class="modal-title">Details</span>
                    <span class="branch-badge" id="branch-badge" style="display:none;">0 branches</span>
                </div>
                <button class="close-btn" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body" id="modal-body"></div>
            <div class="modal-footer">
                <button class="back-btn" id="back-btn" style="display:none;">← Back to parent</button>
            </div>
        </div>
    </div>

    <script>
        // Safe storage wrapper to prevent crashes in restricted environments (e.g. file://)
        const safeStorage = {
            getItem: (key) => {
                try { return localStorage.getItem(key); } catch(e) { console.warn('Storage accessed error:', e); return null; }
            },
            setItem: (key, value) => {
                try { localStorage.setItem(key, value); } catch(e) { console.warn('Storage set error:', e); }
            }
        };

        // Theme Logic
        const toggleBtn = document.getElementById('theme-toggle');
        const root = document.documentElement;
        
        // Load saved theme or default to light
        let currentTheme = safeStorage.getItem('ariadne_export_theme') || 'light';
        setTheme(currentTheme);

        toggleBtn.onclick = () => {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(currentTheme);
        };

        function setTheme(theme) {
            safeStorage.setItem('ariadne_export_theme', theme);
            if (theme === 'dark') {
                root.setAttribute('data-theme', 'dark');
                toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
            } else {
                root.removeAttribute('data-theme');
                toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
            }
        }
        
        // Load data from JSON script tags (safe from template string issues)
        let nodes = [];
        let edges = [];
        
        try {
            nodes = JSON.parse(document.getElementById('nodes-data').textContent);
            edges = JSON.parse(document.getElementById('edges-data').textContent);
        } catch(e) {
            console.error('Data parsing error:', e);
            document.body.innerHTML += '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border:1px solid red;color:red;">Error loading data: ' + e.message + '</div>';
        }

        const container = document.getElementById('container');
        const canvas = document.getElementById('canvas');
        const nodesContainer = document.getElementById('nodes');
        const connectionsSvg = document.getElementById('connections');
        const modalOverlay = document.getElementById('modal-overlay');
        const modalBody = document.getElementById('modal-body');
        const branchBadge = document.getElementById('branch-badge');
        const backBtn = document.getElementById('back-btn');

        // Initialize markdown-it with GFM-like options and math support
        // Note: Code highlighting is done AFTER rendering via hljs.highlightElement()
        let md;
        try {
            md = window.markdownit({
                html: true,        // Enable HTML tags in source
                linkify: true,     // Autoconvert URL-like text to links
                typographer: true, // Enable smartquotes and other typographic replacements
                breaks: true       // Convert newlines in paragraphs into <br>
            });
            if (window.texmath) {
                md.use(window.texmath, {
                    engine: window.katex,
                    delimiters: 'dollars',
                    katexOptions: { throwOnError: false }
                });
            }
        } catch(e) {
            console.error('Markdown init error:', e);
            md = { render: (t) => '<pre>' + t + '</pre>' };
        }

        let transform = { x: 0, y: 0, scale: 1 };
        let isDragging = false;
        let startPos = { x: 0, y: 0 };

        // Helper: escape HTML
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Get child nodes (branches) for a given node
        function getChildAnchors(nodeId) {
            return edges
                .filter(e => e.source === nodeId)
                .map(e => {
                    const child = nodes.find(n => n.id === e.target);
                    return {
                        childId: e.target,
                        text: child?.data.source_anchor?.text || '',
                        question: child?.data.content.user_prompt || ''
                    };
                })
                .filter(a => a.text);
        }

        // Highlight anchor texts in rendered HTML
        function highlightAnchors(html, anchors) {
            if (!anchors.length) return html;
            let result = html;
            for (const anchor of anchors) {
                // Simple escape: replace each special char individually
                let escaped = anchor.text;
                const specials = ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']'];
                for (const c of specials) {
                    escaped = escaped.split(c).join('\\\\' + c);
                }
                const regex = new RegExp('(' + escaped + ')', 'gi');
                result = result.replace(regex, '<span class="anchor-highlight" data-child-id="' + anchor.childId + '">$1</span>');
            }
            return result;
        }

        // Render Nodes
        try {
            nodes.forEach(node => {
                const el = document.createElement('div');
                el.className = 'node';
                el.style.left = node.position.x + 'px';
                el.style.top = node.position.y + 'px';
                
                let html = '';
                if (node.data.source_anchor) {
                    html += '<div class="node-header-anchor">↳ "' + escapeHtml(node.data.source_anchor.text) + '"</div>';
                }
                const questionClass = node.data.source_anchor ? 'node-question' : 'node-question rounded-top';
                html += '<div class="' + questionClass + '">' + escapeHtml(node.data.content.user_prompt) + '</div>';
                let preview = node.data.content.ai_response || '...';
                if (preview.length > 80) preview = preview.slice(0, 80) + '...';
                html += '<div class="node-preview">' + escapeHtml(preview) + '</div>';

                el.innerHTML = html;
                el.onclick = (e) => {
                    if (!isDragging) openModal(node);
                    e.stopPropagation();
                };
                nodesContainer.appendChild(el);
            });
        } catch(e) {
            console.error('Rendering error:', e);
            document.body.innerHTML += '<div style="color:red;padding:20px;">Error rendering nodes: ' + e.message + '</div>';
        }

        // Render Edges
        function renderEdges() {
            while (connectionsSvg.firstChild) connectionsSvg.removeChild(connectionsSvg.firstChild);
            const ns = "http://www.w3.org/2000/svg";
            edges.forEach(edge => {
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                if (source && target) {
                    const sx = source.position.x + 280;
                    const sy = source.position.y + 40;
                    const tx = target.position.x;
                    const ty = target.position.y + 40;
                    const dist = Math.abs(tx - sx);
                    const d = 'M ' + sx + ' ' + sy + ' C ' + (sx + dist * 0.5) + ' ' + sy + ', ' + (tx - dist * 0.5) + ' ' + ty + ', ' + tx + ' ' + ty;
                    const path = document.createElementNS(ns, "path");
                    path.setAttribute("d", d);
                    path.setAttribute("fill", "none");
                    path.setAttribute("stroke", "#22d3ee");
                    path.setAttribute("stroke-width", "2");
                    path.setAttribute("stroke-opacity", "0.6");
                    connectionsSvg.appendChild(path);
                }
            });
        }
        renderEdges();

        // Open Modal - Exact replica of DetailModal.tsx structure
        function openModal(node) {
            const content = node.data.content;
            const anchors = getChildAnchors(node.id);
            let html = '';

            // Branch badge
            if (anchors.length > 0) {
                branchBadge.textContent = anchors.length + ' branches';
                branchBadge.style.display = 'inline';
            } else {
                branchBadge.style.display = 'none';
            }

            // Back button - store parent_id and set onclick
            if (node.data.parent_id) {
                backBtn.style.display = 'inline';
                backBtn.onclick = () => navigateToNode(node.data.parent_id);
            } else {
                backBtn.style.display = 'none';
                backBtn.onclick = null;
            }

            // Source Anchor
            if (node.data.source_anchor) {
                html += '<div class="source-anchor-section">';
                html += '<span class="source-anchor-label">↳ From:</span>';
                html += '<span class="source-anchor-text">"' + escapeHtml(node.data.source_anchor.text) + '"</span>';
                html += '</div>';
            }

            // Question - matches DetailModal.tsx (no emoji)
            html += '<div class="question-section">';
            html += '<p class="section-label">Question</p>';
            html += '<p class="question-text">' + escapeHtml(content.user_prompt) + '</p>';
            html += '</div>';

            // Answer - no label, direct content (matches web app)
            html += '<div class="answer-section">';
            html += '<div class="prose">';
            let answerHtml = md.render(content.ai_response || '');
            answerHtml = highlightAnchors(answerHtml, anchors);
            html += answerHtml;
            html += '</div>';
            html += '</div>';

            // Explored Links
            if (anchors.length > 0) {
                html += '<div class="explored-section">';
                html += '<p class="section-label">Explored Links (' + anchors.length + ')</p>';
                html += '<div class="explored-chips">';
                anchors.forEach(a => {
                    html += '<div class="explored-chip" onclick="navigateToNode(' + "'" + a.childId + "'" + ')" title="' + escapeHtml(a.question) + '">';
                    html += '<span class="explored-chip-text">"' + escapeHtml(a.text) + '"</span>';
                    html += '<span class="explored-chip-arrow">→</span>';
                    html += '</div>';
                });
                html += '</div>';
                html += '</div>';
            }

            modalBody.innerHTML = html;
            
            // Apply syntax highlighting to code blocks after rendering
            if (window.hljs) {
                const codeBlocks = modalBody.querySelectorAll('pre code');
                console.log('hljs loaded, found code blocks:', codeBlocks.length);
                codeBlocks.forEach((block) => {
                    // Add hljs class to parent pre for styling
                    block.parentElement.classList.add('hljs');
                    window.hljs.highlightElement(block);
                });
            } else {
                console.warn('highlight.js not loaded - window.hljs is:', typeof window.hljs);
            }
            
            modalOverlay.classList.add('visible');

            // Add click handlers for anchor highlights
            modalBody.querySelectorAll('.anchor-highlight').forEach(el => {
                el.onclick = (e) => {
                    e.stopPropagation();
                    const childId = el.getAttribute('data-child-id');
                    if (childId) navigateToNode(childId);
                };
            });
        }

        function navigateToNode(nodeId) {
            const node = nodes.find(n => n.id === nodeId);
            if (node) openModal(node);
        }

        function closeModal() {
            modalOverlay.classList.remove('visible');
        }

        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) closeModal();
        };

        // Stop propagation on modal content
        document.getElementById('modal-content').addEventListener('wheel', (e) => e.stopPropagation());
        document.getElementById('modal-content').addEventListener('mousedown', (e) => e.stopPropagation());

        // Pan/Zoom
        container.onmousedown = (e) => {
            isDragging = true;
            startPos = { x: e.clientX - transform.x, y: e.clientY - transform.y };
            container.style.cursor = 'grabbing';
        };
        window.onmousemove = (e) => {
            if (!isDragging) return;
            transform.x = e.clientX - startPos.x;
            transform.y = e.clientY - startPos.y;
            updateTransform();
        };
        window.onmouseup = () => {
            isDragging = false;
            container.style.cursor = 'grab';
        };
        window.onwheel = (e) => {
            e.preventDefault();
            const newScale = transform.scale - e.deltaY * 0.001;
            transform.scale = Math.max(0.1, Math.min(5, newScale));
            updateTransform();
        };
        function updateTransform() {
            canvas.style.transform = 'translate(' + transform.x + 'px, ' + transform.y + 'px) scale(' + transform.scale + ')';
        }
    </script>
</body>
</html>`;
}
