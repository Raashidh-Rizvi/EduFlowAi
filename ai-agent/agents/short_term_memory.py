"""Process-local conversation memory: three complete pairs per identity and scope."""
from collections import OrderedDict, deque
from threading import RLock

# Upper bound on remembered conversations; the least recently used one is evicted first.
MAX_CONVERSATIONS = 2000


class ShortTermMemory:
    def __init__(self, max_conversations=MAX_CONVERSATIONS):
        self._pairs = OrderedDict()
        self._max = max_conversations
        self._lock = RLock()

    @staticmethod
    def key(student_id, session_id, course_id=None, source_file=None, module_id=None):
        # Old/anonymous clients remain stateless instead of sharing an anonymous bucket.
        if not student_id or not student_id.strip() or not session_id or not session_id.strip():
            return None
        return (student_id, session_id, course_id or None, source_file or None, module_id or None)

    def history(self, key):
        with self._lock:
            return [
                {"role": role, "content": content}
                for user, assistant in self._pairs.get(key, ())
                for role, content in (("user", user), ("assistant", assistant))
            ]

    def complete(self, key, user, assistant):
        if key is None or not user.strip() or not assistant.strip():
            return
        with self._lock:
            self._pairs.setdefault(key, deque(maxlen=3)).append((user, assistant))
            self._pairs.move_to_end(key)
            while len(self._pairs) > self._max:
                self._pairs.popitem(last=False)
