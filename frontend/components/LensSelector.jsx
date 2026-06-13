import React from 'react';

export default function LensSelector({ title, choices, selectedLens, setSelectedLens, theme }) {
    return (
        <div
            style={{
                backgroundColor: theme.semantic.surface,
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.semantic.borderSubtle}`
            }}
            className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
            <span className="text-sm font-bold opacity-80">{title}</span>
            <div className="flex flex-wrap gap-2">
                {choices.map((lens, idx) => (
                    <button
                        key={idx}
                        onClick={() => setSelectedLens(idx)}
                        style={{
                            backgroundColor: selectedLens === idx ? theme.semantic.secondary : theme.semantic.sunken,
                            color: selectedLens === idx ? theme.semantic.secondaryForeground : theme.semantic.text,
                            borderRadius: theme.radius.full,
                            border: `1px solid ${selectedLens === idx ? theme.semantic.borderStrong : theme.semantic.borderSubtle}`
                        }}
                        className="px-4 py-1.5 text-xs font-semibold transition-all"
                    >
                        {lens}
                    </button>
                ))}
            </div>
        </div>
    );
}