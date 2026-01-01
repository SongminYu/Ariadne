
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
    <style>
        :root {
            --bg: #0a0a1a;
            --card-bg: #12122a;
            --border: rgba(255, 255, 255, 0.1);
            --text: #ffffff;
            --text-dim: rgba(255, 255, 255, 0.5);
            --accent: #22d3ee;
            --accent-dim: rgba(34, 211, 238, 0.1);
        }

        * {
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 0;
            background: var(--bg);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
        }

        #container {
            width: 100%;
            height: 100%;
            cursor: grab;
            position: relative;
            transform-origin: 0 0;
        }

        #container:active {
            cursor: grabbing;
        }

        #canvas {
            position: absolute;
            top: 0;
            left: 0;
            transform-origin: 0 0;
        }

        .node {
            position: absolute;
            width: 280px;
            background: rgba(18, 18, 42, 0.9);
            border: 1px solid var(--border);
            border-radius: 12px;
            box-shadow: 0 0 20px rgba(100, 200, 255, 0.1);
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            overflow: visible; /* Allow anchor to stick out if needed, but we handle corners */
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

        .node-question.rounded-top {
            border-radius: 12px 12px 0 0;
        }

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

        /* Modal */
        #modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
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

        #modal-content {
            background: var(--bg);
            border: 1px solid var(--border);
            width: 720px;
            max-width: 90%;
            max-height: 85vh;
            border-radius: 16px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            transform: scale(0.95);
            transition: transform 0.2s;
        }

        #modal-overlay.visible #modal-content {
            transform: scale(1);
        }

        .modal-header {
            padding: 16px 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255,255,255,0.02);
        }

        .close-btn {
            background: none;
            border: none;
            color: var(--text-dim);
            cursor: pointer;
            font-size: 24px;
            padding: 4px;
        }
        .close-btn:hover { color: var(--text); }

        .modal-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        }

        .modal-section { margin-bottom: 24px; }
        .modal-label { font-size: 12px; color: var(--text-dim); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .modal-text { font-size: 16px; line-height: 1.6; white-space: pre-wrap; }
        
        .answer-text p { margin-bottom: 1em; }
        .answer-text code { background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; color: var(--accent); font-family: monospace; }
        
        /* Visual Debug for SVG */
        svg#connections {
            /* background: rgba(255, 0, 0, 0.1);  Debug: Visible background */
        }
        
        /* 
        path.edge rules removed to prevent CSS override. 
        We rely on JS attributes now.
        */

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
                <h3 style="margin:0">Details</h3>
                <button class="close-btn" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body" id="modal-body-content"></div>
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
        const modalBody = document.getElementById('modal-body-content');

        // State
        let transform = { x: 0, y: 0, scale: 1 };
        let isDragging = false;
        let startPos = { x: 0, y: 0 };

        // Render Nodes
        nodes.forEach(node => {
            const el = document.createElement('div');
            el.className = 'node';
            el.style.left = node.position.x + 'px';
            el.style.top = node.position.y + 'px';
            
            let html = '';
            
            // Anchor
            if (node.data.source_anchor) {
                html += \`<div class="node-header-anchor">↳ "\${escapeHtml(node.data.source_anchor.text)}"\</div>\`;
            }

            // Question
            const questionClass = node.data.source_anchor ? 'node-question' : 'node-question rounded-top';
            html += \`<div class="\${questionClass}">\${escapeHtml(node.data.content.user_prompt)}</div>\`;

            // Preview
            let preview = node.data.content.ai_response || '...';
            if (preview.length > 80) preview = preview.slice(0, 80) + '...';
            html += \`<div class="node-preview">\${escapeHtml(preview)}</div>\`;

            el.innerHTML = html;
            el.onclick = (e) => {
                if (!isDragging) openModal(node);
                e.stopPropagation();
            };
            nodesContainer.appendChild(el);
        });

        // Render Edges
        function renderEdges() {
            console.log('[Ariadne Export] renderEdges called');
            console.log('[Ariadne Export] Edges array length:', edges.length);
            console.log('[Ariadne Export] Edges data:', JSON.stringify(edges));
            
            // Clear existing
            while (connectionsSvg.firstChild) {
                connectionsSvg.removeChild(connectionsSvg.firstChild);
            }

            const ns = "http://www.w3.org/2000/svg";
            let pathCount = 0;
            
            edges.forEach((edge, i) => {
                console.log('[Ariadne Export] Processing edge', i, ':', edge.source, '->', edge.target);
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                console.log('[Ariadne Export] Source found:', !!source, 'Target found:', !!target);
                
                if (source && target) {
                    const sx = source.position.x + 280; // Right side
                    const sy = source.position.y + 40; // Mid height
                    const tx = target.position.x;
                    const ty = target.position.y + 40;
                    
                    const dist = Math.abs(tx - sx);
                    const c1x = sx + dist * 0.5;
                    const c2x = tx - dist * 0.5;
                    
                    const d = \`M \${sx} \${sy} C \${c1x} \${sy}, \${c2x} \${ty}, \${tx} \${ty}\`;
                    console.log('[Ariadne Export] Path d:', d);
                    
                    const path = document.createElementNS(ns, "path");
                    path.setAttribute("d", d);
                    path.setAttribute("fill", "none");
                    path.setAttribute("stroke", "#22d3ee");
                    path.setAttribute("stroke-width", "2");
                    path.setAttribute("stroke-opacity", "0.6");
                    
                    connectionsSvg.appendChild(path);
                    pathCount++;
                }
            });
            
            console.log('[Ariadne Export] Total paths created:', pathCount);
            console.log('[Ariadne Export] SVG children:', connectionsSvg.children.length);
        }
        renderEdges();

        // Modal
        function openModal(node) {
            const content = node.data.content;
            let html = '';
            
            if (node.data.source_anchor) {
                 html += \`<div class="modal-section"><div class="modal-label">From</div><div style="font-style:italic; color:var(--accent);">"\${escapeHtml(node.data.source_anchor.text)}"\</div></div>\`;
            }

            html += \`<div class="modal-section"><div class="modal-label">Question</div><div class="modal-text" style="font-weight:500">\${escapeHtml(content.user_prompt)}</div></div>\`;
            
            // Simple markdown-ish rendering for answer
            const answerHtml = parseMarkdown(content.ai_response || '');
            html += \`<div class="modal-section"><div class="modal-label">Answer</div><div class="modal-text answer-text">\${answerHtml}</div></div>\`;

            modalBody.innerHTML = html;
            modalOverlay.classList.add('visible');
        }

        function closeModal() {
            modalOverlay.classList.remove('visible');
        }

        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) closeModal();
        };

        // Helpers
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function parseMarkdown(text) {
            if (!text) return '';
            // Very basic parser
            let html = escapeHtml(text);
            // Bold
            html = html.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
            // Italic
            html = html.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
            // Code blocks
            html = html.replace(/\\\`\\\`\\\`([\\s\\S]*?)\\\`\\\`\\\`/g, '<pre><code>$1</code></pre>');
            // Inline code
            html = html.replace(/\\\`(.*?)\\\`/g, '<code>$1</code>');
            // Paragraphs
            html = html.replace(/\\n\\n/g, '</p><p>');
            return '<p>' + html + '</p>';
        }

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
            const scaleSpeed = 0.001;
            const newScale = transform.scale - e.deltaY * scaleSpeed;
            transform.scale = Math.max(0.1, Math.min(5, newScale));
            updateTransform();
        };

        function updateTransform() {
            canvas.style.transform = \`translate(\${transform.x}px, \${transform.y}px) scale(\${transform.scale})\`;
        }
        
        // Initial center (rough approx)
        if (nodes.length > 0) {
            // Find bounds
            // ... (optional for now, start 0,0)
        }

    </script>
</body>
</html>`;
}
