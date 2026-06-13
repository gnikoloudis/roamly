from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import functools

from app.config import settings
from app.tracker import check_and_increment_tracker, get_current_usage, force_increment_usage
from app.shoreline_analytics import get_map_client, resolve_address, fetch_and_rank_competitors
from app.config_lang import LANG_DICT

app = FastAPI(title="Shoreline Guide API Backend", version="2.0.0")



# Enable Cross-Origin Resource Sharing (CORS) for Next.js web app and local React Native testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared In-Memory Cache dictionary for Google Maps API to optimize quotas locally
# key format: (lat, lng, radius, food_radius, tuple(categories), keyword)
@functools.lru_cache(maxsize=128)
def get_cached_analytics_data(lat: float, lng: float, radius: int, food_radius: int, categories_tuple: tuple, keyword: str):
    force_increment_usage() # Increment explicitly on cache miss
    client = get_map_client(settings.GOOGLE_API_KEY)
    return fetch_and_rank_competitors(
        client, lat, lng, radius, food_radius, list(categories_tuple), keyword
    )

class AddressResolutionResponse(BaseModel):
    lat: float
    lng: float

@app.get("/api/config/lang")
def get_languages():
    return LANG_DICT

@app.get("/api/usage")
def get_usage():
    return {
        "current_usage": get_current_usage(),
        "max_limit": settings.DAILY_MAX_LIMIT
    }

@app.get("/api/geocode", response_model=AddressResolutionResponse)
def geocode_address(address: str = Query(..., description="The coastal search name target")):
    client = get_map_client(settings.GOOGLE_API_KEY)
    lat, lng = resolve_address(client, address)
    if not lat or not lng:
        raise HTTPException(status_code=400, detail="Could not resolve specified address string.")
    return {"lat": lat, "lng": lng}

@app.get("/api/restaurant/{place_id}")
def get_restaurant_details(place_id: str):
    # Read-only check to block queries only when daily search limit is already exceeded
    if get_current_usage() >= settings.DAILY_MAX_LIMIT:
        raise HTTPException(
            status_code=429, 
            detail="Daily Search Cap Reached! Come back tomorrow for more adventures."
        )
    try:
        client = get_map_client(settings.GOOGLE_API_KEY)
        res = client.place(
            place_id=place_id,
            fields=['name', 'rating', 'user_ratings_total', 'price_level', 'opening_hours', 'place_id', 'reviews',
                    'formatted_address', 'formatted_phone_number', 'website'],
            language="el"
        )
        details = res.get('result') or {}
        
        reviews_data = details.get('reviews') or []
        best_cand = [r for r in reviews_data if r.get('rating', 0) >= 4]
        worst_cand = [r for r in reviews_data if r.get('rating', 0) <= 3]
        
        best_reviews = sorted(best_cand, key=lambda x: x.get('time', 0), reverse=True)[:3]
        worst_reviews = sorted(worst_cand, key=lambda x: x.get('time', 0), reverse=True)[:3]
        
        import numpy as np
        
        response_data = {
            'name': details.get('name', 'Scenic Restaurant'),
            'rating': details.get('rating'),
            'user_ratings_total': details.get('user_ratings_total'),
            'price_level': details.get('price_level'),
            'formatted_address': details.get('formatted_address'),
            'formatted_phone_number': details.get('formatted_phone_number'),
            'website': details.get('website'),
            'best_reviews': best_reviews,
            'worst_reviews': worst_reviews,
            'detailsLoaded': True
        }
        
        # Clean float 'nan' values for JSON compliance
        for k, v in list(response_data.items()):
            try:
                if isinstance(v, float) and np.isnan(v):
                    response_data[k] = None
            except Exception:
                pass
                
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/explore")
def explore_shoreline(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(5000),
    food_radius: int = Query(1500),
    categories: List[str] = Query(["natural_feature"]),
    keyword: Optional[str] = Query("")
):
    # Verify strict tracking system cap before initiating heavy mapping requests
    under_limit, current_usage = check_and_increment_tracker()
    if not under_limit:
        raise HTTPException(
            status_code=429, 
            detail="Daily Search Cap Reached! Come back tomorrow for more adventures."
        )

    try:
        categories_tuple = tuple(sorted(categories))
        results = get_cached_analytics_data(
            round(lat, 4), round(lng, 4), radius, food_radius, categories_tuple, keyword.strip()
        )
        return {
            "success": True,
            "usage": {
                "current": current_usage,
                "max": settings.DAILY_MAX_LIMIT
            },
            "data": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("Launching Shoreline FastAPI Gateway natively...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8080, reload=True)