'use client';

import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    OnNodesChange,
    NodeChange,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasStore, NodeData } from '@/stores/useCanvasStore';
import { useEffect, useCallback, useState, useMemo } from 'react';
import CompactNode from './nodes/CompactNode';
import StarNode from './nodes/StarNode';
import TendrilEdge from './edges/TendrilEdge';
import { Node } from '@xyflow/react';

// Register custom node and edge types
const nodeTypes = {
    compact: CompactNode,
    star: StarNode,
};

const edgeTypes = {
    tendril: TendrilEdge,
};

// LOD threshold: switch to Star view only at extreme zoom levels
const STAR_THRESHOLD = 0.25;

// Get node type based on zoom level
function getNodeTypeForZoom(zoom: number): string {
    return zoom < STAR_THRESHOLD ? 'star' : 'compact';
}

function CanvasInner() {
    const {
        nodes: storeNodes,
        edges: storeEdges,
        updateNodePosition,
        highlightedPath,
        setHighlightedPath,
    } = useCanvasStore();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes as any);
    const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
    const [currentZoom, setCurrentZoom] = useState(1);

    const { getZoom } = useReactFlow();

    // Clear highlighted path when clicking on canvas background
    const handlePaneClick = useCallback(() => {
        if (highlightedPath) {
            setHighlightedPath(null);
        }
    }, [highlightedPath, setHighlightedPath]);

    // Update node types based on zoom and apply highlight styles
    const nodesWithLOD = useMemo(() => {
        const nodeType = getNodeTypeForZoom(currentZoom);
        return nodes.map(node => ({
            ...node,
            type: nodeType,
            // Add highlight state
            style: highlightedPath && !highlightedPath.has(node.id)
                ? { opacity: 0.3, filter: 'blur(1px)' }
                : undefined,
        }));
    }, [nodes, currentZoom, highlightedPath]);

    // Apply styles to edges based on highlighted path
    const edgesWithStyle = useMemo(() => {
        return edges.map(edge => ({
            ...edge,
            style: highlightedPath && !highlightedPath.has(edge.source) && !highlightedPath.has(edge.target)
                ? { opacity: 0.2 }
                : undefined,
        }));
    }, [edges, highlightedPath]);

    // Sync Store changes to local state
    useEffect(() => {
        setNodes(storeNodes);
    }, [storeNodes, setNodes]);

    useEffect(() => {
        setEdges(storeEdges);
    }, [storeEdges, setEdges]);

    // Handle node changes (including drag position updates)
    const handleNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
        onNodesChange(changes);

        // Sync position changes to Store
        changes.forEach((change) => {
            if (change.type === 'position' && change.position && !change.dragging) {
                updateNodePosition(change.id, change.position);
            }
        });
    }, [onNodesChange, updateNodePosition]);

    // Listen for viewport changes
    const handleMove = useCallback(() => {
        const zoom = getZoom();
        setCurrentZoom(zoom);
    }, [getZoom]);

    return (
        <div className="w-full h-full">
            <ReactFlow
                nodes={nodesWithLOD}
                edges={edgesWithStyle}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onMove={handleMove}
                onPaneClick={handlePaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{
                    padding: 0.5,
                    maxZoom: 1,
                }}
                minZoom={0.1}
                maxZoom={2}
                defaultEdgeOptions={{
                    type: 'tendril',
                }}
                proOptions={{
                    hideAttribution: true,
                }}
                className="bg-canvas"
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1}
                    color="var(--bg-dots)"
                    className="opacity-50"
                />
                <Controls
                    className="glass-panel !border-[var(--glass-border)] !rounded-[var(--radius-sm)] !shadow-lg 
                               [&>button]:!border-[var(--glass-border)] [&>button]:!bg-transparent 
                               hover:[&>button]:!bg-[var(--card-bg)] [&>button]:!transition-colors
                               [&>button>svg]:!fill-[var(--text-secondary)]"
                    showZoom={true}
                    showFitView={true}
                    showInteractive={false}
                />

            </ReactFlow>
        </div>
    );
}

// Wrap component to provide ReactFlowProvider
export default function Canvas() {
    return (
        <ReactFlowProvider>
            <CanvasInner />
        </ReactFlowProvider>
    );
}
