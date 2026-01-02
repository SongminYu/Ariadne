'use client';

import { useState } from 'react';
import { Coffee } from 'lucide-react';

interface BuyMeCoffeeProps {
    size?: 'default' | 'small';
}

export default function BuyMeCoffee({ size = 'default' }: BuyMeCoffeeProps) {
    const [selectedQR, setSelectedQR] = useState<string | null>(null);

    // Determine styles based on size
    const buttonSizeClass = size === 'small' ? 'w-8 h-8' : 'w-9 h-9';
    const iconSizeClass = size === 'small' ? 'w-4 h-4' : 'w-5 h-5';

    return (
        <div
            className="relative group"
            onMouseLeave={() => setSelectedQR(null)} // Reset when mouse leaves
        >
            <button className={`${buttonSizeClass} flex items-center justify-center rounded-full glass-panel 
                       text-[var(--text-secondary)] hover:text-[var(--accent-primary)] 
                       transition-all hover:shadow-md`}>
                <Coffee className={iconSizeClass} />
            </button>

            {/* Popover */}
            <div className="absolute bottom-full right-0 mb-3 p-4 rounded-xl glass-panel 
                    flex gap-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                    transition-all duration-300 translate-y-2 group-hover:translate-y-0
                    shadow-xl border border-[var(--card-border)] bg-[var(--card-bg)]/95 backdrop-blur-xl z-50">

                {selectedQR === null ? (
                    // Default: Show all 3 options
                    <>
                        <QRThumbnail
                            src="/wechat.jpg"
                            label="WeChat"
                            onClick={() => setSelectedQR('wechat')}
                        />
                        <QRThumbnail
                            src="/alipay.jpg"
                            label="Alipay"
                            onClick={() => setSelectedQR('alipay')}
                        />
                        <QRThumbnail
                            src="/paypal.jpg"
                            label="PayPal"
                            onClick={() => setSelectedQR('paypal')}
                        />
                    </>
                ) : (
                    // Expanded: Show only the selected one, larger
                    <div
                        className="flex flex-col items-center cursor-pointer animate-in fade-in zoom-in duration-200"
                        onClick={() => setSelectedQR(null)} // Click to reset
                    >
                        <div className="w-64 h-64 rounded-lg overflow-hidden bg-white p-2 shadow-sm hover:scale-[1.02] transition-transform">
                            <img
                                src={`/${selectedQR}.jpg`}
                                alt={selectedQR}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <span className="text-sm font-medium text-[var(--text-secondary)] mt-3 capitalize">
                            {selectedQR}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)] mt-1">
                            (Click to restore)
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function QRThumbnail({ src, label, onClick }: { src: string; label: string; onClick: () => void }) {
    return (
        <div
            className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
            onClick={onClick}
        >
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-white p-1 shadow-sm">
                <img src={src} alt={label} className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
        </div>
    );
}
