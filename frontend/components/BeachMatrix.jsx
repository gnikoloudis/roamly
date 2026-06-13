import React from 'react';

export default function BeachMatrix({ title, data, selectedBeach, onSelectBeach, theme }) {
    return (
        <div style={{ backgroundColor: theme.semantic.surface, borderRadius: theme.radius.xl, border: `1px solid ${theme.semantic.borderSubtle}` }} className="overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <h3 style={{ color: theme.semantic.textHeading }} className="font-bold text-base">{title}</h3>
                <span className="text-xs opacity-60 font-mono">{data.length} Locations Found</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr style={{ backgroundColor: theme.semantic.sunken, color: theme.semantic.textHeading }} className="border-b border-zinc-200 dark:border-zinc-800 font-semibold">
                            <th className="p-4">Name</th>
                            <th className="p-4">Amenities Sub-Set</th>
                            <th className="p-4">Dining Score Reference</th>
                            <th className="p-4">Access Profile</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {data.map((beach, index) => (
                            <tr
                                key={index}
                                onClick={() => onSelectBeach(beach)}
                                style={{ backgroundColor: selectedBeach?.name === beach.name ? theme.semantic.sunken : 'transparent' }}
                                className="hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
                            >
                                <td className="p-4 font-bold" style={{ color: theme.semantic.textHeading }}>{beach.name}</td>
                                <td className="p-4 text-xs max-w-xs truncate opacity-80">{beach.amenities}</td>
                                <td className="p-4 font-semibold text-amber-500">
                                    ⭐ {beach.rating.toFixed(1)} <span className="text-xs text-gray-400">({beach.total_reviews})</span>
                                </td>
                                <td className="p-4">
                                    <span
                                        style={{
                                            backgroundColor: theme.semantic.sunken,
                                            color: theme.semantic.text,
                                            border: `1px solid ${theme.semantic.borderSubtle}`
                                        }}
                                        className="text-xs px-2.5 py-1 rounded-md font-medium inline-block"
                                    >
                                        {beach.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}