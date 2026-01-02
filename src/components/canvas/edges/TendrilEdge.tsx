'use client';

import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';
import { motion } from 'framer-motion';

export default function TendrilEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}: EdgeProps) {
    // Calculate Bezier curve path
    const midY = (sourceY + targetY) / 2;
    const gravity = Math.min(50, Math.abs(targetX - sourceX) * 0.2); // Gravity effect

    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.4,
    });



    return (
        <g style={style}>
            {/* Glow effect layer */}
            <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                d={edgePath}
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth={6}
                style={{ filter: 'blur(4px)' }}
            />

            {/* Main line */}
            <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                d={edgePath}
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth={2}
                strokeLinecap="round"
                markerEnd={markerEnd}
            />

            {/* Energy flow animation dot */}
            <circle
                r={3}
                fill="var(--bg-primary)"
                stroke="var(--accent-primary)"
                strokeWidth={2}
            >
                <animateMotion
                    dur="3s"
                    repeatCount="indefinite"
                    path={edgePath}
                    keyPoints="0;1"
                    keyTimes="0;1"
                    calcMode="linear"
                />
            </circle>
        </g>
    );
}
