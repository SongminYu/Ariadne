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

// 注册自定义节点和边类型
const nodeTypes = {
    compact: CompactNode,
    star: StarNode,
};

const edgeTypes = {
    tendril: TendrilEdge,
};

// LOD 阈值：只有极端缩放时切换到 Star 视图
const STAR_THRESHOLD = 0.25;

// 根据 zoom 获取节点类型
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

    // 点击画布背景清除路径高亮
    const handlePaneClick = useCallback(() => {
        if (highlightedPath) {
            setHighlightedPath(null);
        }
    }, [highlightedPath, setHighlightedPath]);

    // 根据 zoom 更新节点类型
    const nodesWithLOD = useMemo(() => {
        const nodeType = getNodeTypeForZoom(currentZoom);
        return nodes.map(node => ({
            ...node,
            type: nodeType,
            // 添加高亮状态
            style: highlightedPath && !highlightedPath.has(node.id)
                ? { opacity: 0.3, filter: 'blur(1px)' }
                : undefined,
        }));
    }, [nodes, currentZoom, highlightedPath]);

    // 边的样式（根据高亮路径）
    const edgesWithStyle = useMemo(() => {
        return edges.map(edge => ({
            ...edge,
            style: highlightedPath && !highlightedPath.has(edge.source) && !highlightedPath.has(edge.target)
                ? { opacity: 0.2 }
                : undefined,
        }));
    }, [edges, highlightedPath]);

    // 同步 Store 变化到本地状态
    useEffect(() => {
        setNodes(storeNodes);
    }, [storeNodes, setNodes]);

    useEffect(() => {
        setEdges(storeEdges);
    }, [storeEdges, setEdges]);

    // 处理节点变化（包括拖拽位置更新）
    const handleNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
        onNodesChange(changes);

        // 同步位置变化到 Store
        changes.forEach((change) => {
            if (change.type === 'position' && change.position && !change.dragging) {
                updateNodePosition(change.id, change.position);
            }
        });
    }, [onNodesChange, updateNodePosition]);

    // 监听视口变化
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
                    color="rgba(100, 200, 255, 0.08)"
                />
                <Controls
                    className="!bg-[#2e2e3e]/40 !border-white/10 !rounded-lg !shadow-lg backdrop-blur-md [&>button]:!border-white/10 [&>button]:!bg-transparent hover:[&>button]:!bg-white/10 [&>button>svg]:!fill-white/80"
                    showZoom={true}
                    showFitView={true}
                    showInteractive={false}
                />

            </ReactFlow>
        </div>
    );
}

// 包装组件以提供 ReactFlowProvider
export default function Canvas() {
    return (
        <ReactFlowProvider>
            <CanvasInner />
        </ReactFlowProvider>
    );
}
