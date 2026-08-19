"""
===============================================================================
EduFlow AI - Resilience & Exponential Backoff Decorator
===============================================================================
This module implements an exponential backoff retry mechanism with randomized
jitter to make LLM calls and tool executions resilient against transient errors.

Why we use Exponential Backoff with Jitter:
1. Prevents Thundering Herd Problem:
   - When multiple agent tasks fail simultaneously due to a rate limit or service hiccup,
     fixed sleep intervals cause all retries to hit the service at the exact same moment.
   - Adding randomized jitter distributes retries evenly across time.
2. Smart Error Filtering:
   - Only retries transient failures (`is_retryable=True` or explicitly whitelisted exceptions).
   - Fails fast on deterministic errors like schema validation violations.
"""

# Import time module for sleep delays between retry attempts
import time
# Import random module for generating jitter factors (0.5 to 1.5)
import random
# Import functools.wraps to preserve original function docstrings, names, and metadata
import functools
# Import typing annotations for higher-order function signatures
from typing import Callable, Any, Type, Tuple
# Import custom AIError base exception to inspect the is_retryable flag
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
    Decorator executing exponential backoff with randomized jitter on transient errors.
    
    Args:
        max_retries: Maximum number of retry attempts before giving up and raising the error (default 3).
        initial_delay: Initial sleep duration in seconds before the first retry (default 0.1s).
        multiplier: Factor by which the delay increases after each failed attempt (default 2.0).
        max_delay: Upper bound cap on sleep duration in seconds to prevent excessive waiting (default 2.0s).
        jitter: When True, multiplies the sleep time by a random factor between 0.5 and 1.5.
        retryable_exceptions: Optional tuple of standard Exception classes that should also trigger retries.
        
    Returns:
        Decorated callable function with built-in resilience.
    """
    def decorator(func: Callable) -> Callable:
        # wraps preserves the decorated function's name and signature
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Start delay at initial configured delay
            delay = initial_delay
            # Track the last caught exception to re-raise if all retries are exhausted
            last_exception = None

            # Loop through attempts from 0 up to max_retries
            for attempt in range(max_retries + 1):
                try:
                    # Attempt to execute the wrapped target function
                    return func(*args, **kwargs)
                except Exception as e:
                    # Capture the caught exception
                    last_exception = e
                    
                    # -------------------------------------------------------------
                    # Check retry eligibility
                    # -------------------------------------------------------------
                    is_retryable = False
                    
                    # Check if error is an AIError flagged with is_retryable=True
                    if isinstance(e, AIError) and e.is_retryable:
                        is_retryable = True
                    # Check if error matches any explicitly passed retryable exception classes
                    elif retryable_exceptions and isinstance(e, retryable_exceptions):
                        is_retryable = True

                    # If the error is NOT retryable, or we have exhausted max_retries, raise immediately
                    if not is_retryable or attempt == max_retries:
                        raise e

                    # -------------------------------------------------------------
                    # Calculate sleep time with exponential backoff and jitter
                    # -------------------------------------------------------------
                    # Cap delay at max_delay
                    sleep_time = min(delay, max_delay)
                    
                    # Apply randomized jitter: (0.5 + random()) gives a float in [0.5, 1.5)
                    if jitter:
                        sleep_time = sleep_time * (0.5 + random.random())
                    
                    # Sleep for the calculated duration before the next attempt
                    time.sleep(sleep_time)
                    
                    # Multiply delay for the next iteration (exponential growth)
                    delay *= multiplier

            # If loop ends without returning, re-raise the final exception
            if last_exception:
                raise last_exception
        return wrapper
    return decorator
