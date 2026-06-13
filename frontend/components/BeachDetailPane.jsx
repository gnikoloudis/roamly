import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Securely fix marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

const createEmojiIcon = (emoji) => L.divIcon({
    html: `<div style="font-size: 32px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); text-align: center;">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    className: 'bg-transparent border-none'
});

// Listens for clicks and intercepts coordinate data map events
function MapClickHandler({ onMapClick }) {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            onMapClick(lat, lng);
        },
    });
    return null;
}

// Automatically re-centers the map if coordinates change externally
function ChangeMapView({ center }) {
    const map = useMapEvents({});
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

export default function BeachDetailPane({
    searchLat,
    searchLng,
    beaches = [],
    selectedBeach,
    onSelectBeach,
    beach,
    t,
    theme,
    onMapCoordinatesSelected
}) {
    // 1. Establish bulletproof initial fallback values (Defaulting to Athens/Vouliagmeni)
    const lat = parseFloat(searchLat ?? beach?.lat ?? 37.8084);
    const lng = parseFloat(searchLng ?? beach?.lng ?? beach?.lon ?? 23.7745);
    const mapCenter = [lat, lng];

    const [activeBeachTab, setActiveBeachTab] = useState('hours'); // 'hours', 'contact', 'reviews'
    const [activeRestExpander, setActiveRestExpander] = useState(null); // index or null
    const [activeRestTabs, setActiveRestTabs] = useState({}); // idx -> 'best' / 'worst'
    const [loadingRestIdx, setLoadingRestIdx] = useState(null);

    const handleToggleReviews = async (idx, rest) => {
        if (activeRestExpander === idx) {
            setActiveRestExpander(null);
            return;
        }
        setActiveRestExpander(idx);

        if (rest.detailsLoaded === false) {
            setLoadingRestIdx(idx);
            try {
                const res = await fetch(`${API_BASE_URL}/api/restaurant/${rest.place_id}`);
                const details = await res.json();
                if (details && details.detailsLoaded) {
                    const updatedRests = beach.top_5_restaurants.map((r, i) => 
                        i === idx ? { ...r, ...details } : r
                    );
                    onSelectBeach({ ...beach, top_5_restaurants: updatedRests });
                }
            } catch (e) {
                console.error("Failed loading restaurant details", e);
            } finally {
                setLoadingRestIdx(null);
            }
        }
    };

    return (
        <div className="space-y-6 block clear-both w-full min-h-[500px]">

            {/* LIVE INTERACTIVE MAP VISUALIZER */}
            <div
                style={{
                    backgroundColor: theme.semantic.surface,
                    borderRadius: theme.radius.xl,
                    border: `1px solid ${theme.semantic.borderSubtle}`
                }}
                className="p-4 shadow-sm block w-full"
            >
                <div className="mb-3 px-2 flex justify-between items-center">
                    <h3 style={{ color: theme.semantic.textHeading }} className="font-bold text-sm uppercase tracking-wider">
                        🗺️ Live Interactive Map (Click to select target)
                    </h3>
                    <span className="text-xs opacity-60 font-mono">
                        Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
                    </span>
                </div>

                {/* Explicitly styled height wrapper container */}
                <div
                    style={{
                        height: '400px', // Slightly enlarged layout height target
                        minHeight: '400px',
                        borderRadius: theme.radius.lg,
                        overflow: 'hidden',
                        backgroundColor: theme.semantic.sunken,
                        position: 'relative'
                    }}
                    className="w-full shadow-inner border border-zinc-100 dark:border-zinc-800 z-10 block"
                >
                    <MapContainer
                        center={mapCenter}
                        zoom={12}
                        style={{ height: '100%', width: '100%', display: 'block' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            className={theme.vibe === 'dark' ? 'dark-map-tiles' : ''}
                        />

                        {/* Selection Epicenter Pin */}
                        <Marker position={[lat, lng]} icon={createEmojiIcon("📍")} />

                        {/* Beaches Result Pins */}
                        {beaches.map((b, i) => {
                            const bLat = parseFloat(b.lat);
                            const bLng = parseFloat(b.lng);
                            if (isNaN(bLat) || isNaN(bLng)) return null;

                            return (
                                <Marker
                                    key={i}
                                    position={[bLat, bLng]}
                                    icon={createEmojiIcon("🏖️")}
                                    eventHandlers={{
                                        click: () => {
                                            if (onSelectBeach) {
                                                onSelectBeach(b);
                                            }
                                        }
                                    }}
                                />
                            );
                        })}

                        <MapClickHandler onMapClick={onMapCoordinatesSelected} />
                        <ChangeMapView center={mapCenter} />
                    </MapContainer>
                </div>
            </div>

            {/* SPLIT INFRASTRUCTURE & GASTRONOMY CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Beach Metadata Card */}
                <div style={{ backgroundColor: theme.semantic.surface, borderRadius: theme.radius.xl, border: `1px solid ${theme.semantic.borderSubtle}` }} className="p-6 lg:col-span-5 space-y-4 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                        <div>
                            <span style={{ color: theme.semantic.primary }} className="text-xs font-bold tracking-widest uppercase">Target Details View</span>
                            <h2 style={{ color: theme.semantic.textHeading, fontSize: theme.typography.sizes.xl }} className="font-bold mt-1">
                                {beach?.name || "Selected Location Pivot"}
                            </h2>
                        </div>

                        {/* Beach Info Tabs Header */}
                        <div className="flex border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold">
                            <button
                                onClick={() => setActiveBeachTab('hours')}
                                className="pb-2 px-3 border-b-2 transition-all focus:outline-none"
                                style={{
                                    borderColor: activeBeachTab === 'hours' ? theme.semantic.primary : 'transparent',
                                    color: activeBeachTab === 'hours' ? theme.semantic.primary : theme.semantic.text
                                }}
                            >
                                ⏰ Hours
                            </button>
                            <button
                                onClick={() => setActiveBeachTab('contact')}
                                className="pb-2 px-3 border-b-2 transition-all focus:outline-none"
                                style={{
                                    borderColor: activeBeachTab === 'contact' ? theme.semantic.primary : 'transparent',
                                    color: activeBeachTab === 'contact' ? theme.semantic.primary : theme.semantic.text
                                }}
                            >
                                📞 Contact
                            </button>
                            <button
                                onClick={() => setActiveBeachTab('reviews')}
                                className="pb-2 px-3 border-b-2 transition-all focus:outline-none"
                                style={{
                                    borderColor: activeBeachTab === 'reviews' ? theme.semantic.primary : 'transparent',
                                    color: activeBeachTab === 'reviews' ? theme.semantic.primary : theme.semantic.text
                                }}
                            >
                                💬 Reviews
                            </button>
                        </div>

                        {/* Beach Info Tabs Body */}
                        <div className="min-h-[140px] text-sm">
                            {activeBeachTab === 'hours' && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs uppercase tracking-wider font-bold opacity-60">Status:</span>
                                        {beach?.is_open_now === true ? (
                                            <span className="text-emerald-600 font-bold text-xs uppercase bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">🟢 Open</span>
                                        ) : beach?.is_open_now === false ? (
                                            <span className="text-rose-600 font-bold text-xs uppercase bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded">🔴 Closed</span>
                                        ) : (
                                            <span className="text-zinc-500 font-bold text-xs uppercase bg-zinc-50 dark:bg-zinc-950/20 px-2 py-0.5 rounded">⚪ N/A</span>
                                        )}
                                    </div>
                                    <div className="space-y-1 max-h-36 overflow-y-auto">
                                        {beach?.opening_hours && beach.opening_hours.length > 0 ? (
                                            beach.opening_hours.map((line, i) => (
                                                <p key={i} className="font-mono text-xs opacity-80">{line}</p>
                                            ))
                                        ) : (
                                            <p className="text-xs italic opacity-50">Hours N/A</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeBeachTab === 'contact' && (
                                <div className="space-y-3">
                                    <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                                        <span className="font-medium opacity-70">{t?.phone_label || "Phone"}</span>
                                        {beach?.phone ? (
                                            <a href={`tel:${beach.phone}`} style={{ color: theme.semantic.textLink }} className="font-mono text-xs hover:underline">{beach.phone}</a>
                                        ) : <span className="text-xs opacity-40">{t?.not_available || "Does not exist"}</span>}
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                                        <span className="font-medium opacity-70">{t?.website_label || "Website"}</span>
                                        {beach?.beach_website ? (
                                            <a href={beach.beach_website} target="_blank" rel="noreferrer" style={{ color: theme.semantic.textLink }} className="hover:underline text-xs truncate max-w-[180px] font-semibold">
                                                {t?.visit_website || "Visit Website"} ↗
                                            </a>
                                        ) : <span className="text-xs opacity-40">{t?.not_available || "Does not exist"}</span>}
                                    </div>
                                </div>
                            )}

                            {activeBeachTab === 'reviews' && (
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                    {beach?.beach_reviews && (beach.beach_reviews.highest?.length > 0 || beach.beach_reviews.lowest?.length > 0) ? (
                                        <div className="space-y-4">
                                            {beach.beach_reviews.highest?.slice(0, 2).map((rev, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        backgroundColor: theme.semantic.sunken,
                                                        color: theme.semantic.text,
                                                        borderColor: theme.semantic.borderSubtle
                                                    }}
                                                    className="text-xs space-y-1 p-2.5 rounded-lg border"
                                                >
                                                    <div className="flex justify-between font-semibold">
                                                        <span className="opacity-95">{rev.author_name || "Anonymous"}</span>
                                                        <span className="text-amber-500">{"⭐".repeat(rev.rating || 0)}</span>
                                                    </div>
                                                    <p className="opacity-80 italic leading-relaxed">{rev.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs italic opacity-50 py-4 text-center">No reviews available for this beach.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-60">Calculated Infrastructure Profile</span>
                        <div className="flex flex-wrap gap-1.5">
                            {beach?.amenities ? (
                                beach.amenities.split(' | ').map((item, i) => (
                                    <span key={i} style={{ backgroundColor: theme.semantic.sunken, border: `1px solid ${theme.semantic.borderSubtle}` }} className="px-2 py-1 rounded text-xs font-medium">
                                        {item}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs opacity-50 italic">Click anywhere on the map above to scout local amenities profile.</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Nearby Gastronomy Card */}
                <div style={{ backgroundColor: theme.semantic.surface, borderRadius: theme.radius.xl, border: `1px solid ${theme.semantic.borderSubtle}` }} className="p-6 lg:col-span-7 space-y-4 shadow-sm">
                    <div>
                        <h3 style={{ color: theme.semantic.textHeading }} className="font-bold text-lg">🍴 Top Rated Nearby Gastronomy</h3>
                    </div>
                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                        {!beach?.top_5_restaurants || beach.top_5_restaurants.length === 0 ? (
                            <p className="text-sm opacity-60 py-6 text-center">No dining targets populated yet. Select a map focal zone to analyze.</p>
                        ) : (
                            beach.top_5_restaurants.map((rest, idx) => {
                                const isExpanded = activeRestExpander === idx;
                                const restTab = activeRestTabs[idx] || 'best';
                                const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rest.name)}&query_place_id=${rest.place_id}`;

                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            backgroundColor: theme.semantic.sunken,
                                            border: `1px solid ${theme.semantic.borderSubtle}`,
                                            borderRadius: theme.radius.lg
                                        }}
                                        className="p-4 space-y-3 transition-all"
                                    >
                                        {/* Gastronomy Item Header */}
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="space-y-1 max-w-[70%]">
                                                <h4 style={{ color: theme.semantic.textHeading }} className="font-bold text-sm truncate">{rest.name}</h4>
                                                <p className="text-xs opacity-60 truncate">{rest.formatted_address}</p>
                                                <div className="flex items-center gap-3 text-xs pt-1">
                                                    <span className="font-bold text-amber-500">⭐ {(rest.rating ?? 0).toFixed(1)}</span>
                                                    <span className="opacity-50">({rest.user_ratings_total || 0} reviews)</span>
                                                    <span className="font-semibold text-emerald-600">{"$".repeat(rest.price_level || 2)}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {rest.website && (
                                                    <a
                                                        href={rest.website}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{
                                                            backgroundColor: theme.semantic.surface,
                                                            borderColor: theme.semantic.border
                                                        }}
                                                        className="px-2.5 py-1 rounded text-xs font-semibold shadow-sm hover:brightness-95 border transition-all"
                                                        title="Visit Website"
                                                    >
                                                        🌐
                                                    </a>
                                                )}
                                                <a
                                                    href={googleMapsUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        backgroundColor: theme.semantic.surface,
                                                        borderColor: theme.semantic.border
                                                    }}
                                                    className="px-2.5 py-1 rounded text-xs font-semibold shadow-sm hover:brightness-95 border transition-all"
                                                    title="View on Google Maps"
                                                >
                                                    🧭
                                                </a>
                                            </div>
                                        </div>
 
                                        {/* Expandable Review Section trigger */}
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleToggleReviews(idx, rest)}
                                                className="text-xs font-bold transition-all focus:outline-none flex items-center gap-1 opacity-70 hover:opacity-100"
                                                style={{ color: theme.semantic.primary }}
                                            >
                                                {isExpanded ? "Collapse Reviews ▴" : "Show Reviews ▾"}
                                            </button>
                                        </div>
 
                                        {/* Expandable Review Tabs */}
                                        {isExpanded && (
                                            <div className="mt-3 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-3">
                                                {loadingRestIdx === idx ? (
                                                    <div className="flex justify-center items-center py-6 text-xs gap-2 opacity-60">
                                                        <span className="animate-spin text-sm">🔄</span>
                                                        <span>Loading reviews & details...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex border-b border-zinc-200/50 dark:border-zinc-800/50 text-[10px] uppercase font-bold tracking-wider">
                                                            <button
                                                                onClick={() => setActiveRestTabs({ ...activeRestTabs, [idx]: 'best' })}
                                                                className="pb-1.5 px-2.5 border-b-2 transition-all focus:outline-none"
                                                                style={{
                                                                    borderColor: restTab === 'best' ? theme.semantic.primary : 'transparent',
                                                                    color: restTab === 'best' ? theme.semantic.primary : theme.semantic.text
                                                                }}
                                                            >
                                                                👍 Best Reviews
                                                            </button>
                                                            <button
                                                                onClick={() => setActiveRestTabs({ ...activeRestTabs, [idx]: 'worst' })}
                                                                className="pb-1.5 px-2.5 border-b-2 transition-all focus:outline-none"
                                                                style={{
                                                                    borderColor: restTab === 'worst' ? theme.semantic.primary : 'transparent',
                                                                    color: restTab === 'worst' ? theme.semantic.primary : theme.semantic.text
                                                                }}
                                                            >
                                                                👎 Worst Reviews
                                                            </button>
                                                        </div>
 
                                                        <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                                                            {restTab === 'best' ? (
                                                                rest.best_reviews && rest.best_reviews.length > 0 ? (
                                                                    rest.best_reviews.map((rev, rIdx) => (
                                                                        <div
                                                                            key={rIdx}
                                                                            style={{
                                                                                backgroundColor: theme.semantic.surface,
                                                                                color: theme.semantic.text,
                                                                                borderColor: theme.semantic.borderSubtle
                                                                            }}
                                                                            className="text-xs space-y-1 p-2.5 rounded border"
                                                                        >
                                                                            <div className="flex justify-between font-semibold">
                                                                                <span className="opacity-90">{rev.author_name || "Anonymous"}</span>
                                                                                <span className="text-amber-500">{"⭐".repeat(rev.rating || 0)}</span>
                                                                            </div>
                                                                            <p className="opacity-75 italic leading-relaxed">{rev.text}</p>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-xs italic opacity-50 py-2 text-center">No recent positive reviews available.</p>
                                                                )
                                                            ) : (
                                                                rest.worst_reviews && rest.worst_reviews.length > 0 ? (
                                                                    rest.worst_reviews.map((rev, rIdx) => (
                                                                        <div
                                                                            key={rIdx}
                                                                            style={{
                                                                                backgroundColor: theme.semantic.surface,
                                                                                color: theme.semantic.text,
                                                                                borderColor: theme.semantic.borderSubtle
                                                                            }}
                                                                            className="text-xs space-y-1 p-2.5 rounded border"
                                                                        >
                                                                            <div className="flex justify-between font-semibold">
                                                                                <span className="opacity-90">{rev.author_name || "Anonymous"}</span>
                                                                                <span className="text-amber-500">{"⭐".repeat(rev.rating || 0)}</span>
                                                                            </div>
                                                                            <p className="opacity-75 italic leading-relaxed">{rev.text}</p>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-xs italic opacity-50 py-2 text-center">No recent negative reviews available.</p>
                                                                )
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}