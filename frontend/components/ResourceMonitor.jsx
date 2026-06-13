import React from 'react';

export default function ResourceMonitor({ label, limitLabel, current, max, theme }) {
    const percentage = Math.min((current / max) * 100, 100);
    const isLimitReached = current >= max;

    return (
        <div style={{ backgroundColor: theme.semantic.sunken, borderRadius: theme.radius.lg }} className="p-4 space-y-3">
            <h3 style={{ color: theme.semantic.textHeading }} className="text-xs font-bold uppercase tracking-wider">
                {label.replace('### ', '')}
            </h3>
            <div className="flex justify-between text-sm">
                <span className="opacity-80">{limitLabel}</span>
                <span className="font-bold">{current} / {max} APIs</span>
            </div>
            <div style={{ backgroundColor: theme.semantic.borderSubtle, borderRadius: theme.radius.full }} className="w-full h-2 overflow-hidden">
                <div
                    style={{
                        backgroundColor: isLimitReached ? theme.semantic.error : theme.semantic.success,
                        width: `${percentage}%`
                    }}
                    className="h-full transition-all duration-300"
                />
            </div>
        </div>
    );
}