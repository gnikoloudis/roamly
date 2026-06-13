import React, { useState, useEffect } from 'react';
import { themes } from './Sunset-Red-Analogous-theme';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LensSelector from './components/LensSelector';
import BeachMatrix from './components/BeachMatrix';
import BeachDetailPane from './components/BeachDetailPane';
import { LANG_DICT } from './Lang_dict.jsx';

export default function App() {
    const [isDark, setIsDark] = useState(false);
    const theme = isDark ? themes.dark : themes.light;
    const [lang, setLang] = useState('en');
    const t = LANG_DICT[lang];

    // Pipeline execution parameters
    const [locMode, setLocMode] = useState(0);
    const [address, setAddress] = useState("Vouliagmeni, Athens");
    const [lat, setLat] = useState(37.8084);
    const [lng, setLng] = useState(23.7745);
    const [radius, setRadius] = useState(5000);
    const [foodRadius, setFoodRadius] = useState(1500);
    const [keyword, setKeyword] = useState("");
    const [categories, setCategories] = useState(["natural_feature"]);
    const [selectedLens, setSelectedLens] = useState(0);

    // Runtime states
    const [loading, setLoading] = useState(false);
    const [apiData, setApiData] = useState([]);
    const [selectedBeach, setSelectedBeach] = useState(null);
    const [usage, setUsage] = useState({ current: 0, max: 10 });

    // Track if a search has been completed to handle conditional details visibility
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        Object.entries(theme.semantic).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });
    }, [theme]);

    useEffect(() => {
        fetch('http://127.0.0.1:8080/api/usage')
            .then(res => res.json())
            .then(data => setUsage({ current: data.current_usage, max: data.max_limit }))
            .catch(() => console.log("Backend offline or tracking mapping unreachable."));
    }, []);

    const handleSearchPipeline = async (overrideLat, overrideLng) => {
        setLoading(true);
        try {
            let currentLat = overrideLat || lat;
            let currentLng = overrideLng || lng;

            // If searching via text address landmark mode
            if (locMode === 0 && !overrideLat) {
                const geoRes = await fetch(`http://127.0.0.1:8080/api/geocode?address=${encodeURIComponent(address)}`);
                const geoData = await geoRes.json();
                if (geoData.lat && geoData.lng) {
                    currentLat = geoData.lat;
                    currentLng = geoData.lng;
                    setLat(geoData.lat);
                    setLng(geoData.lng);
                }
            }

            const params = new URLSearchParams({ lat: currentLat, lng: currentLng, radius, food_radius: foodRadius, keyword });
            categories.forEach(c => params.append('categories', c));

            const exploreRes = await fetch(`http://127.0.0.1:8080/api/explore?${params.toString()}`);
            const exploreData = await exploreRes.json();

            if (exploreData.success) {
                setApiData(exploreData.data);
                setUsage({ current: exploreData.usage.current, max: exploreData.usage.max });
                setHasSearched(true); // Search succeeded, unblock list grids

                if (exploreData.data.length > 0) {
                    setSelectedBeach(exploreData.data[0]);
                } else {
                    setSelectedBeach({ lat: currentLat, lng: currentLng, name: "Selected Location Point", amenities: "", top_5_restaurants: [] });
                }
            }
        } catch (error) {
            console.error("Pipeline breakdown:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMapPointSelection = (clickedLat, clickedLng) => {
        setLat(clickedLat);
        setLng(clickedLng);
        setLocMode(1); // Shift panel visualization to coordinates view
    };

    return (
        <div style={{ backgroundColor: theme.semantic.background, color: theme.semantic.text, minHeight: '100vh', fontFamily: theme.typography.families.sans }} className="flex flex-col">
            <Header title={t.title} subtitle={t.subtitle} isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} theme={theme} />

            <div className="flex flex-1 flex-col lg:flex-row">
                <Sidebar
                    t={t} lang={lang} setLang={setLang} locMode={locMode} setLocMode={setLocMode}
                    address={address} setAddress={setAddress} lat={lat} setLat={setLat} lng={lng} setLng={setLng}
                    radius={radius} setRadius={setRadius} foodRadius={foodRadius} setFoodRadius={setFoodRadius}
                    keyword={keyword} setKeyword={setKeyword} onSearch={() => handleSearchPipeline()}
                    loading={loading} usage={usage} theme={theme}
                    categories={categories} setCategories={setCategories}
                />

                <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
                    <LensSelector title={t.lens_choices_title} choices={t.lens_choices} selectedLens={selectedLens} setSelectedLens={setSelectedLens} theme={theme} />

                    <BeachDetailPane
                        searchLat={lat}
                        searchLng={lng}
                        beaches={apiData}
                        selectedBeach={selectedBeach}
                        onSelectBeach={setSelectedBeach}
                        beach={selectedBeach || { lat, lng, name: "Initial Map Pivot", amenities: "", top_5_restaurants: [] }}
                        t={t}
                        theme={theme}
                        onMapCoordinatesSelected={handleMapPointSelection}
                        showDetailsOnly={hasSearched} // Custom optimization flag
                    />

                    {apiData.length > 0 && (
                        <BeachMatrix title={t.matrix_title} data={apiData} selectedBeach={selectedBeach} onSelectBeach={setSelectedBeach} theme={theme} />
                    )}
                </main>
            </div>
        </div>
    );
}