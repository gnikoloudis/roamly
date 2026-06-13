import googlemaps
import pandas as pd
import numpy as np
import logging
import re
import unicodedata
import threading
from concurrent.futures import ThreadPoolExecutor
from math import radians, cos, sin, asin, sqrt
from app.config import settings

logger = logging.getLogger("roamly_backend")

def strip_greek_accents(text):
    normalized = unicodedata.normalize('NFD', text)
    return "".join([c for c in normalized if not unicodedata.combining(c)])

def check_keyword_with_negation(text, keywords):
    negations = {
        "no", "not", "dont", "don't", "without", "lack", "lacks", "zero", "never", "missing",
        "δεν", "χωρις", "οχι", "ελλειψη", "ποτε"
    }
    text_stripped = strip_greek_accents(text.lower())
    normalized_text = re.sub(r'[^\w\s]', ' ', text_stripped)
    words = normalized_text.split()
    
    for idx, word in enumerate(words):
        for kw in keywords:
            if word.startswith(kw) or (kw in word):
                start_idx = max(0, idx - 3)
                context_words = words[start_idx:idx]
                if any(neg in context_words for neg in negations):
                    continue
                return True
    return False

import requests
from requests.adapters import HTTPAdapter

_shared_session = requests.Session()
_adapter = HTTPAdapter(pool_connections=50, pool_maxsize=50)
_shared_session.mount("http://", _adapter)
_shared_session.mount("https://", _adapter)

def get_map_client(api_key):
    return googlemaps.Client(
        key=api_key,
        requests_session=_shared_session,
        queries_per_second=60,
        timeout=10
    )

def haversine(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return c * 6371

def resolve_address(map_client, address_string):
    try:
        search_query = address_string.strip()
        if not search_query: return None, None
        geocode_result = map_client.geocode(search_query, region="gr")
        if geocode_result:
            location_data = geocode_result[0]['geometry']['location']
            return location_data['lat'], location_data['lng']
    except Exception as e:
        logger.error(f"Geocoding Error: {e}")
    return None, None

def get_country_lang(map_client, lat, lng):
    COUNTRY_TO_LANG = {"gr": "el", "cy": "el", "gb": "en", "us": "en"}
    try:
        res = map_client.reverse_geocode((lat, lng))
        for r in res:
            for c in r.get('address_components', []):
                if 'country' in c.get('types', []):
                    cc = c.get('short_name', '').lower()
                    if cc: return COUNTRY_TO_LANG.get(cc, "en")
    except Exception as e:
        logger.warning(f"Reverse geocoding failed: {e}")
    return "el"

def rank_restaurants(restaurants, limit=3):
    if not restaurants: return []
    nested_keys = ['reviews', 'best_reviews', 'worst_reviews']
    saved_nested = []
    clean_restaurants = []
    
    for rest in restaurants:
        saved_nested.append({k: rest.get(k, []) for k in nested_keys})
        clean_restaurants.append({k: v for k, v in rest.items() if k not in nested_keys})

    df_rest = pd.DataFrame(clean_restaurants)
    if df_rest.empty: return []

    df_rest['rating'] = df_rest.get('rating', pd.Series()).fillna(0).astype(float)
    df_rest['user_ratings_total'] = df_rest.get('user_ratings_total', pd.Series()).fillna(0).astype(int)
    df_rest['price_level'] = df_rest.get('price_level', pd.Series()).fillna(2).astype(int)

    max_reviews = df_rest['user_ratings_total'].max() or 1
    df_rest['rating_norm'] = df_rest['rating'] / 5.0
    df_rest['reviews_norm'] = np.log(df_rest['user_ratings_total'] + 1) / np.log(max_reviews + 1)
    df_rest['price_norm'] = (5 - df_rest['price_level'].clip(1, 4)) / 4.0

    df_rest['composite_score'] = (
        df_rest['rating_norm'] * 0.5 +
        df_rest['reviews_norm'] * 0.3 +
        df_rest['price_norm'] * 0.2
    )

    df_rest['_orig_idx'] = range(len(df_rest))
    df_rest = df_rest.sort_values('composite_score', ascending=False)
    top_limit_df = df_rest.head(limit)
    top_ranked = top_limit_df.to_dict('records')

    for record in top_ranked:
        orig_idx = record.pop('_orig_idx', None)
        if orig_idx is not None and orig_idx < len(saved_nested):
            record.update(saved_nested[orig_idx])
        
        # Clean float 'nan' values for JSON compliance
        for k, v in list(record.items()):
            try:
                if isinstance(v, float) and np.isnan(v):
                    record[k] = None
            except Exception:
                pass

    return top_ranked

def fetch_and_rank_competitors(map_client, lat, lng, radius, food_radius, selected_categories, keyword_filter):
    if not selected_categories: return []

    api_lang = get_country_lang(map_client, lat, lng)
    all_beaches = []
    seen_place_ids = set()
    primary_keyword = keyword_filter.strip() if keyword_filter else "beach"

    for category in selected_categories:
        try:
            search_args = {
                "location": (lat, lng),
                "radius": radius,
                "type": category,
                "keyword": primary_keyword,
                "language": api_lang
            }
            places_result = map_client.places_nearby(**search_args)
            results = places_result.get('results', [])

            if not results and primary_keyword != "beach":
                search_args["keyword"] = "beach"
                places_result = map_client.places_nearby(**search_args)
                results = places_result.get('results', [])

            for p in results:
                p_id = p.get('place_id')
                if p_id not in seen_place_ids:
                    seen_place_ids.add(p_id)
                    all_beaches.append(p)
        except Exception as e:
            logger.error(f"Places API Error: {e}")
            continue

    restaurant_cache = {}
    cache_lock = threading.Lock()
    target_subset = all_beaches[:settings.ALL_RAW_RESULTS_LIMIT]

    def hydrate_beach(beach):
        p_id = beach.get('place_id')
        try:
            details = (map_client.place(
                place_id=p_id,
                fields=['name', 'rating', 'user_ratings_total', 'geometry', 'wheelchair_accessible_entrance', 'editorial_summary',
                        'opening_hours', 'website', 'formatted_phone_number', 'reviews'],
                language=api_lang
            ).get('result') or {})

            geom = details.get('geometry') or {}
            loc = geom.get('location') or {}
            b_lat = loc.get('lat')
            b_lng = loc.get('lng')
            if not b_lat or not b_lng: return None

            has_wheelchair = details.get('wheelchair_accessible_entrance', False)
            access_status = "♿ Accessible Entrance" if has_wheelchair else "⚠️ Standard Access"

            reviews_data = details.get('reviews') or []
            editorial = details.get('editorial_summary') or {}
            overview_text = editorial.get('overview') or ''
            reviews_text = " ".join([r.get('text', '') for r in reviews_data])
            search_text = (overview_text + " " + reviews_text).lower()

            amenities = []
            if primary_keyword != "beach" and primary_keyword.lower() in details.get('name', '').lower():
                amenities.append(f"✨ {primary_keyword}")
            if check_keyword_with_negation(search_text, ["bed", "umbrella", "organize", "lounger", "sunbed", "ομπρελ", "ξαπλωστ"]):
                amenities.append("🏖️ Sunbeds/Loungers")
            if check_keyword_with_negation(search_text, ["bar", "cafe", "club", "restaurant", "μπαρ", "καφε", "εστιατορ"]):
                amenities.append("🍹 Beach Bar/Café")
            if check_keyword_with_negation(search_text, ["park", "parking", "παρκιν"]):
                amenities.append("🚗 Parking")
            if check_keyword_with_negation(search_text, ["shallow", "kid", "family", "ρηχ", "παιδ"]):
                amenities.append("👶 Family Friendly")
            if not amenities: amenities = ["🌊 Natural Shoreline"]
            amenity_str = " | ".join(amenities)

            top_5_restaurants = []
            found_nearby_cache = False

            # Thread-safe cache lookup
            with cache_lock:
                for ex_lat, ex_lng, cached_rests in restaurant_cache.get('entries', []):
                    if haversine(b_lng, b_lat, ex_lng, ex_lat) <= 1.0:
                        top_5_restaurants = cached_rests
                        found_nearby_cache = True
                        break

            if not found_nearby_cache:
                rest_search = map_client.places_nearby(
                    location=(b_lat, b_lng), radius=food_radius, type="restaurant", language=api_lang
                )
                raw_restaurants = rest_search.get('results', [])
                if raw_restaurants:
                    top_raw = rank_restaurants(raw_restaurants, limit=settings.RESTAURANT_LIMIT)
                    
                    # Skip heavy upfront place details queries. Instead, build a basic restaurant profile 
                    # using search result data. Detailed reviews/websites are loaded on-demand.
                    for rest in top_raw:
                        top_5_restaurants.append({
                            'name': rest.get('name', 'Scenic Restaurant'),
                            'rating': rest.get('rating'),
                            'user_ratings_total': rest.get('user_ratings_total'),
                            'price_level': rest.get('price_level'),
                            'place_id': rest.get('place_id'),
                            'formatted_address': rest.get('vicinity'),
                            'best_reviews': [],
                            'worst_reviews': [],
                            'website': None,
                            'detailsLoaded': False
                        })

                # Thread-safe cache write
                with cache_lock:
                    if 'entries' not in restaurant_cache: restaurant_cache['entries'] = []
                    restaurant_cache['entries'].append((b_lat, b_lng, top_5_restaurants))

            highest_rest_rating = 0.0
            total_reviews = 0
            price_tier = 2
            if top_5_restaurants:
                best_rest = top_5_restaurants[0]
                highest_rest_rating = best_rest.get('rating', 0.0)
                total_reviews = best_rest.get('user_ratings_total', 0)
                price_tier = best_rest.get('price_level', 2)

            def safe_int(val, default=2):
                try:
                    if val is None: return default
                    return int(val)
                except (ValueError, TypeError):
                    return default

            def safe_float(val, default=0.0):
                try:
                    if val is None: return default
                    return float(val)
                except (ValueError, TypeError):
                    return default

            opening_hours = details.get('opening_hours') or {}
            weekday_text = opening_hours.get('weekday_text') or []
            is_open_now = opening_hours.get('open_now')

            return {
                'name': f"🏖️ {details.get('name', 'Scenic Coastal Spot')}",
                'status': access_status,
                'lat': b_lat,
                'lng': b_lng,
                'rating': safe_float(highest_rest_rating, 0.0),
                'total_reviews': safe_int(total_reviews, 0),
                'price_level': safe_int(price_tier, 2),
                'website': f"https://www.google.com/maps/search/?api=1&query={b_lat},{b_lng}",
                'amenities': amenity_str,
                'top_5_restaurants': top_5_restaurants,
                'opening_hours': weekday_text,
                'is_open_now': is_open_now,
                'phone': details.get('formatted_phone_number'),
                'beach_website': details.get('website'),
                'beach_reviews': {
                    'highest': sorted([r for r in reviews_data if r.get('rating', 0) >= 4], key=lambda x: x.get('time', 0), reverse=True)[:3],
                    'lowest': sorted([r for r in reviews_data if r.get('rating', 0) <= 3], key=lambda x: x.get('time', 0), reverse=True)[:3]
                }
            }
        except Exception as e:
            logger.error(f"Error compiling pipeline data: {e}", exc_info=True)
            return None

    # Resolve all beaches concurrently
    with ThreadPoolExecutor(max_workers=len(target_subset) or 1) as beach_executor:
        results = list(beach_executor.map(hydrate_beach, target_subset))

    processed_beaches = [r for r in results if r is not None]
    processed_beaches.sort(key=lambda x: x.get('rating', 0.0), reverse=True)
    return processed_beaches