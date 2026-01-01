'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useCanvasStore } from '@/stores/useCanvasStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X } from 'lucide-react';

export default function DetailSheet() {
    const {
        nodes,
        selectedNodeIdForSheet,
        setSelectedNodeForSheet,
        setHighlightedPath
    } = useCanvasStore();

    const selectedNode = nodes.find(n => n.id === selectedNodeIdForSheet);

    // 追溯路径到根节点
    const tracePath = () => {
        if (!selectedNode) return;

        const path = new Set<string>();
        let currentId: string | null = selectedNode.id;

        while (currentId) {
            path.add(currentId);
            const node = nodes.find(n => n.id === currentId);
            currentId = node?.data.parent_id || null;
        }

        setHighlightedPath(path);
    };

    const clearPath = () => {
        setHighlightedPath(null);
    };

    return (
        <Dialog.Root
            open={!!selectedNodeIdForSheet}
            onOpenChange={(open) => {
                if (!open) {
                    setSelectedNodeForSheet(null);
                    clearPath();
                }
            }}
        >
            <AnimatePresence>
                {selectedNodeIdForSheet && (
                    <Dialog.Portal forceMount>
                        {/* 背景遮罩 */}
                        <Dialog.Overlay asChild>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                            />
                        </Dialog.Overlay>

                        {/* 侧边面板 */}
                        <Dialog.Content asChild>
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                className="fixed right-0 top-0 h-full w-[480px] max-w-[90vw]
                                           bg-[#0a0a1a]/95 backdrop-blur-xl
                                           border-l border-white/10
                                           shadow-[-20px_0_60px_rgba(0,0,0,0.5)]
                                           z-50 overflow-hidden
                                           flex flex-col"
                            >
                                {/* 头部 */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                        <Dialog.Title className="text-white/90 font-medium">
                                            节点详情
                                        </Dialog.Title>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={tracePath}
                                            className="px-3 py-1.5 rounded-lg
                                                       bg-white/5 hover:bg-white/10
                                                       border border-white/10
                                                       text-xs text-white/60 hover:text-white/90
                                                       transition-all"
                                        >
                                            🔍 追溯路径
                                        </button>
                                        <Dialog.Close asChild>
                                            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                <X className="w-4 h-4 text-white/40" />
                                            </button>
                                        </Dialog.Close>
                                    </div>
                                </div>

                                {/* 内容区域 */}
                                {selectedNode && (
                                    <div className="flex-1 overflow-y-auto">
                                        {/* 用户问题 */}
                                        <div className="px-6 py-4 border-b border-white/5">
                                            <p className="text-xs text-white/40 mb-2 font-medium">💭 Question</p>
                                            <p className="text-white/90 leading-relaxed">
                                                {selectedNode.data.content.user_prompt}
                                            </p>

                                            {/* 锚点来源 */}
                                            {selectedNode.data.source_anchor && (
                                                <div className="mt-3 px-3 py-2 bg-cyan-400/10 rounded-lg
                                                               text-sm text-cyan-300/80 italic">
                                                    <span className="text-cyan-400/60 mr-2">↳</span>
                                                    "{selectedNode.data.source_anchor.text}"
                                                </div>
                                            )}
                                        </div>

                                        {/* AI 回答 */}
                                        <div className="px-6 py-4">
                                            <p className="text-xs text-white/40 mb-3 font-medium">✨ Answer</p>
                                            <div className="prose prose-invert prose-sm max-w-none
                                                           [&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3
                                                           [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-cyan-300
                                                           [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm
                                                           [&_h1]:text-white/90 [&_h2]:text-white/90 [&_h3]:text-white/80
                                                           [&_a]:text-cyan-400 [&_a]:no-underline hover:[&_a]:underline
                                                           [&_blockquote]:border-l-cyan-400/50 [&_blockquote]:bg-white/5 [&_blockquote]:px-4 [&_blockquote]:py-2
                                                           [&_pre]:bg-white/5 [&_pre]:rounded-lg [&_pre]:p-4">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {selectedNode.data.content.ai_response || '思考中...'}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 底部元信息 */}
                                {selectedNode && (
                                    <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02]">
                                        <div className="flex items-center justify-between text-xs text-white/30">
                                            <span>ID: {selectedNode.id.slice(0, 8)}...</span>
                                            {selectedNode.data.parent_id && (
                                                <span>Parent: {selectedNode.data.parent_id.slice(0, 8)}...</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </Dialog.Content>
                    </Dialog.Portal>
                )}
            </AnimatePresence>
        </Dialog.Root>
    );
}
