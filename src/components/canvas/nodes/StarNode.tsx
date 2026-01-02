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
                className="!w-1 !h-1 !bg-cyan-400/50 !border-0"
            />

            {/* Glowing core */}
            <div
                className={`
                    w-4 h-4 rounded-full
                    ${isRoot ? 'bg-cyan-400' : 'bg-cyan-400/70'}
                    shadow-[0_0_12px_rgba(100,200,255,0.6)]
                    transition-all duration-200
                `}
                style={{
                    boxShadow: isHovered
                        ? '0 0 20px rgba(100, 200, 255, 0.9), 0 0 40px rgba(100, 200, 255, 0.4)'
                        : '0 0 12px rgba(100, 200, 255, 0.6)',
                    transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                }}
            />

            {/* Hover tooltip */}
            {isHovered && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-2
                               px-3 py-2 rounded-lg
                               bg-[#1a1a2e]/95 backdrop-blur-md
                               border border-white/10
                               shadow-lg
                               whitespace-nowrap max-w-[200px]
                               z-50"
                >
                    <p className="text-xs text-white/90 truncate">
                        {content.user_prompt}
                    </p>
                </motion.div>
            )}

            {/* Connection handle - output */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-1 !h-1 !bg-cyan-400/50 !border-0"
            />
        </motion.div>
    );
}
