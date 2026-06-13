import os
from datetime import date
import redis
from app.config import settings

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COUNTER_FILE = os.path.join(BASE_DIR, "api_usage_tracker.txt")

# Initialize Redis client lazily if configured
redis_client = None
if settings.APP_ENV == "production" and settings.REDIS_URL:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

def _get_local_file_usage(today: str) -> int:
    if os.path.exists(COUNTER_FILE):
        try:
            with open(COUNTER_FILE, "r") as f:
                lines = f.readlines()
                if lines:
                    saved_date, saved_count = lines[0].strip().split(",")
                    if saved_date == today:
                        return int(saved_count)
        except Exception:
            pass
    return 0

def _write_local_file_usage(today: str, count: int):
    with open(COUNTER_FILE, "w") as f:
        f.write(f"{today},{count}")

def check_and_increment_tracker() -> tuple[bool, int]:
    """
    Checks and increments usage counters natively.
    Returns (is_under_limit, current_usage)
    """
    today = str(date.today())
    limit = settings.DAILY_MAX_LIMIT

    if settings.APP_ENV == "production" and redis_client:
        key = f"shoreline:usage:{today}"
        # Increment first, then evaluate
        current_usage = redis_client.incr(key)
        if current_usage == 1:
            # Set TTL for 24 hours on initial creation
            redis_client.expire(key, 86400)
            
        if current_usage > limit:
            return False, current_usage - 1
        return True, current_usage
    else:
        # Fallback to local file tracker
        current_usage = _get_local_file_usage(today)
        if current_usage >= limit:
            return False, current_usage
        
        current_usage += 1
        _write_local_file_usage(today, current_usage)
        return True, current_usage

def force_increment_usage():
    """Forces an increment exclusively triggered on Google API Cache Misses."""
    today = str(date.today())
    
    if settings.APP_ENV == "production" and redis_client:
        key = f"shoreline:usage:{today}"
        redis_client.incr(key)
    else:
        current_usage = _get_local_file_usage(today)
        _write_local_file_usage(today, current_usage + 1)

def get_current_usage() -> int:
    """Read-only view of the usage without altering numbers."""
    today = str(date.today())
    if settings.APP_ENV == "production" and redis_client:
        key = f"shoreline:usage:{today}"
        val = redis_client.get(key)
        return int(val) if val else 0
    else:
        return _get_local_file_usage(today)