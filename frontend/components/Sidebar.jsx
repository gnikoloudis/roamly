import React from 'react';
import ResourceMonitor from './ResourceMonitor';

export default function Sidebar({
    t, lang, setLang, locMode, setLocMode, address, setAddress,
    lat, setLat, lng, setLng, radius, setRadius, foodRadius, setFoodRadius,
    keyword, setKeyword, onSearch, loading, usage, theme,
    categories, setCategories
}) {
    return (
        <aside
            style={{ backgroundColor: theme.semantic.surface, borderRight: `1px solid ${theme.semantic.borderSubtle}` }}
            className="w-full lg:w-96 p-6 space-y-6 flex-shrink-0"
        >
            <div>
                <h2 style={{ color: theme.semantic.textHeading, fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold }}>
                    {t.sidebar_settings}
                </h2>
            </div>

            {/* Language Switcher */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider opacity-70">{t.lang_lbl}</label>
                <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    style={{ backgroundColor: theme.semantic.sunken, border: `1px solid ${theme.semantic.border}`, borderRadius: theme.radius.md }}
                    className="w-full p-2 text-sm focus:outline-none"
                >
                    <option value="en">English</option>
                    <option value="el">Ελληνικά</option>
                </select>
            </div>

            {/* Selection Mode */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider opacity-70">{t.loc_mode_lbl}</label>
                <div className="flex flex-col gap-2">
                    {t.loc_mode_opt.map((mode, idx) => (
                        <button
                            key={idx}
                            onClick={() => setLocMode(idx)}
                            style={{
                                backgroundColor: locMode === idx ? theme.semantic.primary : theme.semantic.sunken,
                                color: locMode === idx ? '#fff' : theme.semantic.text,
                                borderRadius: theme.radius.md
                            }}
                            className="w-full text-left px-3 py-2 text-sm transition-all"
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {/* Geolocation Fields */}
            {locMode === 0 ? (
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider opacity-70">{t.addr_lbl}</label>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={t.addr_ph}
                        style={{ backgroundColor: theme.semantic.sunken, border: `1px solid ${theme.semantic.border}`, borderRadius: theme.radius.md }}
                        className="w-full p-2 text-sm focus:outline-none"
                    />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs opacity-70">Latitude</label>
                        <input type="number" step="any" value={lat} onChange={e => setLat(parseFloat(e.target.value))} style={{ backgroundColor: theme.semantic.sunken, border: `1px solid ${theme.semantic.border}`, borderRadius: theme.radius.md }} className="w-full p-2 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs opacity-70">Longitude</label>
                        <input type="number" step="any" value={lng} onChange={e => setLng(parseFloat(e.target.value))} style={{ backgroundColor: theme.semantic.sunken, border: `1px solid ${theme.semantic.border}`, borderRadius: theme.radius.md }} className="w-full p-2 text-sm" />
                    </div>
                </div>
            )}

            {/* Sliders */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                        <span>{t.radius_lbl}</span>
                        <span className="font-bold">{radius}m</span>
                    </div>
                    <input type="range" min="1000" max="20000" step="500" value={radius} onChange={e => setRadius(parseInt(e.target.value))} className="w-full accent-[var(--theme-primary)]" />
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                        <span>{t.food_radius_lbl}</span>
                        <span className="font-bold">{foodRadius}m</span>
                    </div>
                    <input type="range" min="500" max="5000" step="250" value={foodRadius} onChange={e => setFoodRadius(parseInt(e.target.value))} className="w-full accent-[var(--theme-primary)]" />
                </div>
            </div>

            {/* Beach Profiles Category Selection */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider opacity-70">
                    {t.categories_title || "Select Beach Profiles:"}
                </label>
                <div className="flex flex-col gap-2">
                    {Object.entries(t.categories_opt || {}).map(([label, val]) => {
                        const isSelected = categories.includes(val);
                        return (
                            <button
                                key={val}
                                onClick={() => {
                                    if (isSelected) {
                                        if (categories.length > 1) {
                                            setCategories(categories.filter(c => c !== val));
                                        }
                                    } else {
                                        setCategories([...categories, val]);
                                    }
                                }}
                                style={{
                                    backgroundColor: isSelected ? theme.semantic.secondary : theme.semantic.sunken,
                                    color: isSelected ? theme.semantic.secondaryForeground : theme.semantic.text,
                                    borderRadius: theme.radius.md,
                                    border: `1px solid ${isSelected ? theme.semantic.borderStrong : theme.semantic.borderSubtle}`
                                }}
                                className="w-full text-left px-3 py-2 text-sm transition-all flex justify-between items-center"
                            >
                                <span>{label}</span>
                                {isSelected && <span className="text-xs">✓</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Sub-Filter Text Field */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider opacity-70">{t.keyword_lbl}</label>
                <input
                    type="text"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder={t.keyword_ph}
                    style={{ backgroundColor: theme.semantic.sunken, border: `1px solid ${theme.semantic.border}`, borderRadius: theme.radius.md }}
                    className="w-full p-2 text-sm focus:outline-none"
                />
            </div>

            <button
                onClick={onSearch}
                disabled={loading || usage.current >= usage.max}
                style={{
                    backgroundColor: theme.semantic.primary,
                    color: '#fff',
                    borderRadius: theme.radius.md,
                    opacity: (loading || usage.current >= usage.max) ? 0.6 : 1
                }}
                className="w-full py-3 font-bold text-sm transition-all shadow-md hover:brightness-110 active:scale-[0.99]"
            >
                {loading ? t.btn_spinner : t.btn_run}
            </button>

            <hr style={{ borderColor: theme.semantic.borderSubtle }} />

            <ResourceMonitor
                label={t.resource_lbl}
                limitLabel={t.limit_lbl}
                current={usage.current}
                max={usage.max}
                theme={theme}
            />
        </aside>
    );
}