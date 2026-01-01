'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData, useCanvasStore } from '@/stores/useCanvasStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { useCallback, useState } from 'react';

interface FullNodeProps extends NodeProps {
    data: NodeData;
}

export default function FullNode({ data, id }: FullNodeProps) {
    const { content, source_anchor } = data;
    const { setSelectedAnchor } = useCanvasStore();
    const [isHovered, setIsHovered] = useState(false);

    const handleTextSelect = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            const selectedText = selection.toString().trim();

            // 获取选区位置
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // 设置选中的锚点
            setSelectedAnchor({
                nodeId: id,
                text: selectedText,
                range: {
                    start: range.startOffset,
                    end: range.endOffset,
                },
                // 额外存储位置信息用于 popover
                position: {
                    x: rect.left + rect.width / 2,
                    y: rect.bottom,
                },
            } as any);
        }
    }, [id, setSelectedAnchor]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="min-w-[320px] max-w-[480px] rounded-xl 
                 bg-[#12122a]/90 backdrop-blur-md 
                 border border-white/10
                 shadow-[0_0_30px_rgba(100,200,255,0.1)]
                 overflow-hidden
                 transition-shadow duration-300"
            style={{
                boxShadow: isHovered
                    ? '0 0 50px rgba(100, 200, 255, 0.2), 0 0 100px rgba(100, 200, 255, 0.1)'
                    : '0 0 30px rgba(100, 200, 255, 0.1)',
            }}
        >
            {/* 连接点 - 输入 */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-cyan-400/50 !border-cyan-300/50 !border-2"
            />

            {/* 用户问题区域 */}
            <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                <p className="text-xs text-white/40 mb-1 font-medium">💭 Question</p>
                <p className="text-sm text-white/90 leading-relaxed">{content.user_prompt}</p>

                {/* 显示锚点来源 */}
                {source_anchor && (
                    <div className="mt-2 px-2 py-1 bg-cyan-400/10 rounded text-xs text-cyan-300/80 italic">
                        ↳ "{source_anchor.text}"
                    </div>
                )}
            </div>

            {/* AI 回答区域 */}
            <div
                className="px-4 py-3 text-sm text-white/80 
                   prose prose-invert prose-sm max-w-none
                   [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 
                   [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-cyan-300
                   [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm
                   [&_h1]:text-white/90 [&_h2]:text-white/90 [&_h3]:text-white/80
                   [&_a]:text-cyan-400 [&_a]:no-underline hover:[&_a]:underline
                   [&_blockquote]:border-l-cyan-400/50 [&_blockquote]:bg-white/5 [&_blockquote]:px-3 [&_blockquote]:py-1
                   select-text cursor-text
                   nodrag nowheel selectable"
                onMouseUp={handleTextSelect}
            >
                {content.ai_response ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content.ai_response}
                    </ReactMarkdown>
                ) : (
                    <div className="flex items-center gap-2 text-white/40 py-2">
                        <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                        <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150" />
                        <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-300" />
                        <span className="ml-2">思考中...</span>
                    </div>
                )}
            </div>

            {/* 提示文字 */}
            {content.ai_response && (
                <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02]">
                    <p className="text-xs text-white/20">
                        💡 选中文本即可追问
                    </p>
                </div>
            )}

            {/* 连接点 - 输出 */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-cyan-400/50 !border-cyan-300/50 !border-2"
            />
        </motion.div>
    );
}
