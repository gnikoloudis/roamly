import React from 'react';

export default function Header({ title, subtitle, isDark, onToggleTheme, theme }) {
    return (
        <header
            style={{
                backgroundColor: theme.semantic.surface,
                borderBottom: `1px solid ${theme.semantic.borderSubtle}`
            }}
            className="px-6 py-4 flex justify-between items-center shadow-sm"
        >
            <div>
                <h1 style={{
                    color: theme.semantic.textHeading,
                    fontSize: theme.typography.sizes['2xl'],
                    fontWeight: theme.typography.weights.bold
                }}>
                    {title}
                </h1>
                <p style={{ color: theme.semantic.textMuted, fontSize: theme.typography.sizes.sm }} className="mt-1">
                    {subtitle}
                </p>
            </div>
            <button
                onClick={onToggleTheme}
                style={{ border: `1px solid ${theme.semantic.border}`, borderRadius: theme.radius.md }}
                className="p-2 text-sm font-medium transition-colors hover:opacity-80"
            >
                {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
        </header>
    );
}