import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Node, Edge } from '@xyflow/react';

// 节点数据结构
export interface NodeContent {
    user_prompt: string;
    ai_response: string;
    model?: string;
    tokens_used?: number;
    suggested_anchors?: string[];
}

export interface NodeData {
    [key: string]: unknown;  // Index signature for xyflow compatibility
    content: NodeContent;
    parent_id: string | null;
    source_anchor?: {
        text: string;
        start_index: number;
        end_index: number;
    };
}

// 选中的锚点（包含位置信息用于弹窗）
export interface SelectedAnchor {
    nodeId: string;
    text: string;
    range: { start: number; end: number };
    position?: { x: number; y: number };
}

// Store 状态定义
interface CanvasState {
    // 节点和边
    nodes: Node<NodeData>[];
    edges: Edge[];

    // 交互状态
    selectedAnchor: SelectedAnchor | null;
    selectedNodeIdForSheet: string | null;
    highlightedPath: Set<string> | null;

    // Actions
    addNode: (node: Node<NodeData>) => void;
    updateNodeContent: (nodeId: string, content: Partial<NodeContent>) => void;
    updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
    addEdge: (edge: Edge) => void;
    setSelectedAnchor: (anchor: SelectedAnchor | null) => void;
    setSelectedNodeIdForSheet: (nodeId: string | null) => void;
    setSelectedNodeForSheet: (nodeId: string | null) => void; // alias
    setHighlightedPath: (path: Set<string> | null) => void;
    deleteNode: (nodeId: string) => void;
    clearAll: () => void;

    // Sync helpers
    setNodes: (nodes: Node<NodeData>[]) => void;
    setEdges: (edges: Edge[]) => void;
}

export const useCanvasStore = create<CanvasState>()(
    persist(
        (set, get) => ({
            // 初始状态
            nodes: [],
            edges: [],
            selectedAnchor: null,
            selectedNodeIdForSheet: null,
            highlightedPath: null,

            // Actions
            addNode: (node) =>
                set((state) => ({
                    nodes: [...state.nodes, node],
                })),

            updateNodeContent: (nodeId, content) =>
                set((state) => ({
                    nodes: state.nodes.map((node) =>
                        node.id === nodeId
                            ? {
                                ...node,
                                data: {
                                    ...node.data,
                                    content: { ...node.data.content, ...content }
                                }
                            }
                            : node
                    ),
                })),

            updateNodePosition: (nodeId, position) =>
                set((state) => ({
                    nodes: state.nodes.map((node) =>
                        node.id === nodeId
                            ? { ...node, position }
                            : node
                    ),
                })),

            addEdge: (edge) =>
                set((state) => ({
                    edges: [...state.edges, edge],
                })),

            setSelectedAnchor: (anchor) =>
                set({ selectedAnchor: anchor }),

            setSelectedNodeIdForSheet: (nodeId) =>
                set({ selectedNodeIdForSheet: nodeId }),

            setSelectedNodeForSheet: (nodeId) =>
                set({ selectedNodeIdForSheet: nodeId }),

            setHighlightedPath: (path) =>
                set({ highlightedPath: path }),

            // 删除节点及其所有后代
            deleteNode: (nodeId) =>
                set((state) => {
                    // 收集要删除的所有节点 ID（包括后代）
                    const toDelete = new Set<string>();
                    const collectDescendants = (id: string) => {
                        toDelete.add(id);
                        state.edges
                            .filter(e => e.source === id)
                            .forEach(e => collectDescendants(e.target));
                    };
                    collectDescendants(nodeId);

                    return {
                        nodes: state.nodes.filter(n => !toDelete.has(n.id)),
                        edges: state.edges.filter(
                            e => !toDelete.has(e.source) && !toDelete.has(e.target)
                        ),
                        selectedNodeIdForSheet: toDelete.has(state.selectedNodeIdForSheet || '')
                            ? null
                            : state.selectedNodeIdForSheet,
                    };
                }),

            clearAll: () =>
                set({
                    nodes: [],
                    edges: [],
                    selectedAnchor: null,
                    highlightedPath: null
                }),

            setNodes: (nodes) => set({ nodes }),
            setEdges: (edges) => set({ edges }),
        }),
        {
            name: 'ariadne-canvas-storage',
            partialize: (state) => ({
                nodes: state.nodes,
                edges: state.edges,
            }),
            // 加载时清理孤立边（连接到不存在节点的边）
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const nodeIds = new Set(state.nodes.map(n => n.id));
                    const validEdges = state.edges.filter(
                        e => nodeIds.has(e.source) && nodeIds.has(e.target)
                    );
                    if (validEdges.length !== state.edges.length) {
                        console.log(`Cleaned ${state.edges.length - validEdges.length} orphan edges`);
                        state.edges = validEdges;
                    }
                }
            },
        }
    )
);
