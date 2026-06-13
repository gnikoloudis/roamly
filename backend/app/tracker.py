import os
import sys
from datetime import date
import redis
from app.config import settings

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Fallback to /tmp if running on Vercel to prevent Read-only file system OSError
if os.environ.get("VERCEL") == "1":
    COUNTER_FILE = "/tmp/api_usage_tracker.txt"
else:
    COUNTER_FILE = os.path.join(BASE_DIR, "api_usage_tracker.txt")

# Initialize Redis client lazily if configured (accepts REDIS_URL dynamically in any environment)
redis_client = None
if settings.REDIS_URL and settings.REDIS_URL.strip():
    try:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception as e:
        print(f"Failed to initialize Redis client from REDIS_URL: {e}", file=sys.stderr)

def _get_local_file_usage(today: str) -> int:
    if os.path.exists(COUNTER_FILE):
        try:
            with open(COUNTER_FILE, "r") as f:
                lines = f.readlines()
                if lines:
                    saved_date, saved_count = lines[0].strip().split(",")
                    if saved_date == today:
                        return int(saved_count)
        except Exception as e:
            print(f"Failed to read local counter file: {e}", file=sys.stderr)
    return 0

def _write_local_file_usage(today: str, count: int):
    try:
        with open(COUNTER_FILE, "w") as f:
            f.write(f"{today},{count}")
    except Exception as e:
        print(f"Failed to write local counter file: {e}", file=sys.stderr)

def check_and_increment_tracker() -> tuple[bool, int]:
    """
    Checks and increments usage counters.
    Returns (is_under_limit, current_usage)
    """
    today = str(date.today())
    limit = settings.DAILY_MAX_LIMIT

    if redis_client:
        try:
            key = f"shoreline:usage:{today}"
            # Increment first, then evaluate
            current_usage = redis_client.incr(key)
            if current_usage == 1:
                # Set TTL for 24 hours on initial creation
                redis_client.expire(key, 86400)
                
            if current_usage > limit:
                return False, current_usage - 1
            return True, current_usage
        except Exception as e:
            print(f"Redis tracker failed (check_and_increment), falling back to local file: {e}", file=sys.stderr)

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
    
    if redis_client:
        try:
            key = f"shoreline:usage:{today}"
            redis_client.incr(key)
            return
        except Exception as e:
            print(f"Redis tracker failed (force_increment), falling back to local file: {e}", file=sys.stderr)

    current_usage = _get_local_file_usage(today)
    _write_local_file_usage(today, current_usage + 1)

def get_current_usage() -> int:
    """Read-only view of the usage without altering numbers."""
    today = str(date.today())
    if redis_client:
        try:
            key = f"shoreline:usage:{today}"
            val = redis_client.get(key)
            return int(val) if val else 0
        except Exception as e:
            print(f"Redis tracker failed (get_current_usage), falling back to local file: {e}", file=sys.stderr)

    return _get_local_file_usage(today)