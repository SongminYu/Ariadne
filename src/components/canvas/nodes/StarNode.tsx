'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData, useCanvasStore } from '@/stores/useCanvasStore';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface StarNodeProps extends NodeProps {
    data: NodeData;
}

/**
 * StarNode - Light point node shown at extreme zoom out
 * Only shows a glowing dot, displaying question summary on hover
 */
export default function StarNode({ data, id }: StarNodeProps) {
    const { content, parent_id } = data;
    const [isHovered, setIsHovered] = useState(false);
    const { setSelectedNodeForSheet } = useCanvasStore();

    const isRoot = !parent_id;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setSelectedNodeForSheet(id)}
            className="relative cursor-pointer"
        >
            {/* Connection handle - input */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-1 !h-1 !bg-[var(--edge-active)] !border-0"
            />

            {/* Glowing core */}
            <div
                className={`
                    w-4 h-4 rounded-full
                    ${isRoot ? 'bg-[var(--accent-primary)]' : 'bg-[var(--accent-primary)]/70'}
                    transition-all duration-200
                `}
                style={{
                    boxShadow: isHovered
                        ? '0 0 20px var(--accent-primary), 0 0 40px var(--accent-dim)'
                        : '0 0 12px var(--accent-dim)',
                    transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                }}
            />

            {/* Hover tooltip */}
            {isHovered && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-2
                               px-3 py-2 rounded-[var(--radius-sm)]
                               bg-[var(--card-bg)]/95 backdrop-blur-md
                               border border-[var(--card-border)]
                               shadow-[var(--card-shadow)]
                               whitespace-nowrap max-w-[200px]
                               z-50"
                >
                    <p className="text-xs text-[var(--text-primary)] truncate font-medium">
                        {content.user_prompt}
                    </p>
                </motion.div>
            )}

            {/* Connection handle - output */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-1 !h-1 !bg-[var(--edge-active)] !border-0"
            />
        </motion.div>
    );
}
