import time
import random
import functools
from typing import Callable, Any, Type, Tuple
from core.errors import AIError

def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 0.1,
    multiplier: float = 2.0,
    max_delay: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: Tuple[Type[Exception], ...] = ()
):
    """
    Decorator executing exponential backoff with randomized jitter.
    Only retries errors flagged with is_retryable=True or in retryable_exceptions.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            delay = initial_delay
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    # Check retry eligibility
                    is_retryable = False
                    if isinstance(e, AIError) and e.is_retryable:
                        is_retryable = True
                    elif retryable_exceptions and isinstance(e, retryable_exceptions):
                        is_retryable = True

                    if not is_retryable or attempt == max_retries:
                        raise e

                    # Calculate sleep time with exponential backoff and jitter
                    sleep_time = min(delay, max_delay)
                    if jitter:
                        sleep_time = sleep_time * (0.5 + random.random())
                    
                    time.sleep(sleep_time)
                    delay *= multiplier

            if last_exception:
                raise last_exception
        return wrapper
    return decorator
