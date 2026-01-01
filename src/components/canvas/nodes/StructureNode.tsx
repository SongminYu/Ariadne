'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData, useCanvasStore } from '@/stores/useCanvasStore';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface StructureNodeProps extends NodeProps {
    data: NodeData;
}

/**
 * StructureNode - 中等缩放时显示的节点
 * 只显示问题标题和回答的第一行
 */
export default function StructureNode({ data, id }: StructureNodeProps) {
    const { content, source_anchor, parent_id } = data;
    const [isHovered, setIsHovered] = useState(false);
    const { setSelectedNodeForSheet } = useCanvasStore();

    const isRoot = !parent_id;

    // 提取 AI 响应的第一行
    const firstLine = content.ai_response
        ? content.ai_response.split('\n').filter(line => line.trim())[0]?.slice(0, 50) || ''
        : '';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setSelectedNodeForSheet(id)}
            className={`
                min-w-[180px] max-w-[220px]
                rounded-lg cursor-pointer
                bg-[#12122a]/80 backdrop-blur-sm
                border border-white/10
                overflow-hidden
                transition-all duration-200
                ${isRoot ? 'border-l-2 border-l-cyan-400/60' : ''}
            `}
            style={{
                boxShadow: isHovered
                    ? '0 0 25px rgba(100, 200, 255, 0.2)'
                    : '0 0 15px rgba(100, 200, 255, 0.1)',
            }}
        >
            {/* 连接点 - 输入 */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2 !h-2 !bg-cyan-400/50 !border-cyan-300/30 !border"
            />

            {/* 内容 */}
            <div className="p-3">
                {/* 问题 */}
                <p className="text-xs text-white/90 font-medium truncate mb-1">
                    {content.user_prompt}
                </p>

                {/* 回答预览 */}
                {firstLine && (
                    <p className="text-[10px] text-white/40 truncate">
                        {firstLine}...
                    </p>
                )}

                {/* 锚点来源 */}
                {source_anchor && (
                    <div className="mt-2 px-1.5 py-0.5 bg-cyan-400/10 rounded text-[9px] text-cyan-300/70 truncate">
                        ↳ {source_anchor.text}
                    </div>
                )}
            </div>

            {/* 连接点 - 输出 */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2 !h-2 !bg-cyan-400/50 !border-cyan-300/30 !border"
            />
        </motion.div>
    );
}
