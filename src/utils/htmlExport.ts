
import { Node, Edge } from '@xyflow/react';
import { NodeData } from '@/stores/useCanvasStore';

export function generateSingleFileHTML(nodes: Node<NodeData>[], edges: Edge[]): string {
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
    })))
        .replace(/<\/script/g, '<\\/script')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');

    const edgesJson = JSON.stringify(edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target
    })))
        .replace(/<\/script/g, '<\\/script')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ariadne Export</title>
    <!-- KaTeX CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <!-- markdown-it with math support -->
    <script src="https://cdn.jsdelivr.net/npm/markdown-it@14.0.0/dist/markdown-it.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/markdown-it-texmath@1.0.0/texmath.min.js"></script>
    <style>
        :root {
            --bg: #0a0a1a;
            --card-bg: #1a1a2e;
            --border: rgba(255, 255, 255, 0.1);
            --text: #ffffff;
            --text-dim: rgba(255, 255, 255, 0.5);
            --text-dim-40: rgba(255, 255, 255, 0.4);
            --text-dim-30: rgba(255, 255, 255, 0.3);
            --accent: #22d3ee;
            --accent-dim: rgba(34, 211, 238, 0.1);
            --cyan-300: #67e8f9;
            --cyan-400: #22d3ee;
            --red-400: #f87171;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            background: var(--bg);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
        }

        /* Container and Canvas */
        #container {
            width: 100%;
            height: 100%;
            cursor: grab;
            position: relative;
        }
        #container:active { cursor: grabbing; }
        #canvas {
            position: absolute;
            top: 0;
            left: 0;
            transform-origin: 0 0;
        }

        /* Node Cards */
        .node {
            position: absolute;
            width: 280px;
            background: rgba(18, 18, 42, 0.9);
            border: 1px solid var(--border);
            border-radius: 12px;
            box-shadow: 0 0 20px rgba(100, 200, 255, 0.1);
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            backdrop-filter: blur(10px);
        }
        .node:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 30px rgba(100, 200, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.2);
        }
        .node-header-anchor {
            padding: 6px 12px;
            background: var(--accent-dim);
            border-bottom: 1px solid rgba(34, 211, 238, 0.2);
            color: rgba(34, 211, 238, 0.7);
            font-size: 10px;
            border-radius: 12px 12px 0 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .node-question {
            padding: 10px 16px;
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid var(--border);
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .node-question.rounded-top { border-radius: 12px 12px 0 0; }
        .node-preview {
            padding: 10px 16px;
            font-size: 12px;
            color: var(--text-dim);
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
            background: rgba(0, 0, 0, 0.6);
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

        /* Modal Content - Exact match to DetailModal.tsx */
        #modal-content {
            width: 100%;
            max-width: 720px;
            max-height: 85vh;
            background: #1a1a2e;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
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
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.02);
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
            background: var(--cyan-400);
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .modal-title {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
            font-size: 16px;
        }
        .branch-badge {
            padding: 2px 8px;
            background: rgba(34, 211, 238, 0.2);
            border-radius: 9999px;
            font-size: 12px;
            color: var(--cyan-300);
        }
        .close-btn {
            padding: 8px;
            border-radius: 8px;
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.4);
            cursor: pointer;
            transition: background 0.2s;
            font-size: 18px;
            line-height: 1;
        }
        .close-btn:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text);
        }

        /* Modal Body */
        .modal-body {
            flex: 1;
            overflow-y: auto;
        }

        /* Source Anchor Section */
        .source-anchor-section {
            padding: 12px 24px;
            background: rgba(34, 211, 238, 0.05);
            border-bottom: 1px solid rgba(34, 211, 238, 0.1);
        }
        .source-anchor-label {
            color: rgba(34, 211, 238, 0.6);
            font-size: 12px;
            margin-right: 8px;
        }
        .source-anchor-text {
            font-size: 14px;
            color: rgba(103, 232, 249, 0.8);
            font-style: italic;
        }

        /* Question Section */
        .question-section {
            padding: 16px 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(255, 255, 255, 0.02);
        }
        .section-label {
            font-size: 12px;
            color: var(--text-dim-40);
            margin-bottom: 8px;
            font-weight: 500;
        }
        .question-text {
            font-size: 18px;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.5;
            font-weight: 500;
        }

        /* Answer Section */
        .answer-section {
            padding: 20px 24px;
        }

        /* Prose styling for markdown content - matches Tailwind prose-invert */
        .prose {
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.7;
            font-size: 16px;
        }
        .prose p { margin: 12px 0; }
        .prose ul, .prose ol { margin: 12px 0; padding-left: 24px; }
        .prose li { margin: 8px 0; }
        .prose strong { color: rgba(255, 255, 255, 0.95); font-weight: 600; }
        .prose em { font-style: italic; }
        .prose code {
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            color: var(--cyan-300);
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.9em;
        }
        .prose pre {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 16px;
            overflow-x: auto;
            margin: 16px 0;
        }
        .prose pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        .prose h1 { font-size: 20px; color: rgba(255, 255, 255, 0.9); margin: 24px 0 12px; }
        .prose h2 { font-size: 18px; color: rgba(255, 255, 255, 0.9); margin: 20px 0 10px; }
        .prose h3 { font-size: 16px; color: rgba(255, 255, 255, 0.8); margin: 16px 0 8px; }
        .prose blockquote {
            border-left: 3px solid rgba(34, 211, 238, 0.5);
            background: rgba(255, 255, 255, 0.05);
            padding: 8px 16px;
            margin: 16px 0;
        }
        .prose a { color: var(--cyan-400); text-decoration: none; }
        .prose a:hover { text-decoration: underline; }
        
        /* Table Styles */
        .prose table {
            width: 100%;
            margin: 16px 0;
            border-collapse: collapse;
        }
        .prose th {
            background: rgba(255, 255, 255, 0.1);
            padding: 8px 16px;
            text-align: left;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .prose td {
            padding: 8px 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
        }
        .prose tr:nth-child(even) {
            background: rgba(255, 255, 255, 0.05);
        }

        /* Anchor Highlight */
        .anchor-highlight {
            background: rgba(34, 211, 238, 0.2);
            color: var(--cyan-300);
            padding: 0 2px;
            border-radius: 2px;
            cursor: pointer;
            border-bottom: 2px dashed rgba(34, 211, 238, 0.5);
            transition: background 0.2s;
        }
        .anchor-highlight:hover {
            background: rgba(34, 211, 238, 0.3);
        }

        /* Selection Hint */
        .selection-hint {
            font-size: 12px;
            color: var(--text-dim-30);
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* Explored Links Section */
        .explored-section {
            padding: 16px 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.02);
        }
        .explored-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
        }
        .explored-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 9999px;
            background: rgba(34, 211, 238, 0.1);
            border: 1px solid rgba(34, 211, 238, 0.3);
            cursor: pointer;
            transition: all 0.2s;
        }
        .explored-chip:hover {
            background: rgba(34, 211, 238, 0.2);
            border-color: rgba(34, 211, 238, 0.5);
        }
        .explored-chip-text {
            font-size: 12px;
            color: var(--cyan-300);
            font-style: italic;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .explored-chip-arrow {
            color: rgba(34, 211, 238, 0.6);
        }
        .explored-chip:hover .explored-chip-arrow {
            color: var(--cyan-400);
        }

        /* Modal Footer */
        .modal-footer {
            padding: 12px 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(255, 255, 255, 0.02);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .back-btn {
            font-size: 12px;
            color: var(--text-dim-30);
            background: none;
            border: none;
            cursor: pointer;
            transition: color 0.2s;
        }
        .back-btn:hover {
            color: var(--cyan-400);
        }
        .delete-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 8px;
            background: none;
            border: none;
            color: rgba(248, 113, 113, 0.7);
            font-size: 12px;
            cursor: not-allowed;
            opacity: 0.5;
        }

    </style>
</head>
<body>
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
                <button class="delete-btn">🗑 Delete</button>
            </div>
        </div>
    </div>

    <script>
        const nodes = ${nodesJson};
        const edges = ${edgesJson};

        const container = document.getElementById('container');
        const canvas = document.getElementById('canvas');
        const nodesContainer = document.getElementById('nodes');
        const connectionsSvg = document.getElementById('connections');
        const modalOverlay = document.getElementById('modal-overlay');
        const modalBody = document.getElementById('modal-body');
        const branchBadge = document.getElementById('branch-badge');
        const backBtn = document.getElementById('back-btn');

        // Initialize markdown-it with math support
        let md;
        try {
            md = window.markdownit();
            if (window.texmath) {
                md.use(window.texmath, {
                    engine: window.katex,
                    delimiters: 'dollars',
                    katexOptions: { throwOnError: false }
                });
            }
        } catch(e) {
            console.error('Markdown init error:', e);
            md = { render: (t) => t };
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

            // Question
            html += '<div class="question-section">';
            html += '<p class="section-label">💭 Question</p>';
            html += '<p class="question-text">' + escapeHtml(content.user_prompt) + '</p>';
            html += '</div>';

            // Answer
            html += '<div class="answer-section">';
            html += '<p class="section-label">✨ Answer</p>';
            html += '<div class="prose">';
            let answerHtml = md.render(content.ai_response || '');
            answerHtml = highlightAnchors(answerHtml, anchors);
            html += answerHtml;
            html += '</div>';
            html += '<p class="selection-hint">💡 Select any text to ask a follow-up question</p>';
            html += '</div>';

            // Explored Links
            if (anchors.length > 0) {
                html += '<div class="explored-section">';
                html += '<p class="section-label">🔗 Explored from this answer (' + anchors.length + ')</p>';
                html += '<div class="explored-chips">';
                anchors.forEach(a => {
                    html += '<div class="explored-chip" onclick="navigateToNode(\\'' + a.childId + '\\')" title="' + escapeHtml(a.question) + '">';
                    html += '<span class="explored-chip-text">"' + escapeHtml(a.text) + '"</span>';
                    html += '<span class="explored-chip-arrow">→</span>';
                    html += '</div>';
                });
                html += '</div>';
                html += '</div>';
            }

            modalBody.innerHTML = html;
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
