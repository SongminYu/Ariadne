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
        <>
            {/* Glow effect layer */}
            <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                d={edgePath}
                fill="none"
                stroke="rgba(100, 200, 255, 0.3)"
                strokeWidth={8}
                filter="blur(4px)"
            />

            {/* Main line */}
            <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                d={edgePath}
                fill="none"
                stroke="rgba(100, 200, 255, 0.8)"
                strokeWidth={2}
                strokeLinecap="round"
                markerEnd={markerEnd}
            />

            {/* 能量流动动画点 */}
            {/* Energy flow animation dot - Using native SVG animation to avoid React/Framer prop issues */}
            <circle
                r={3}
                fill="rgba(150, 220, 255, 1)"
                filter="drop-shadow(0 0 4px rgba(100, 200, 255, 0.8))"
            >
                <animateMotion
                    dur="2s"
                    repeatCount="indefinite"
                    path={edgePath}
                />
            </circle>
        </>
    );
}
