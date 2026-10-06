/**
 * Quiz Storage Helper Utility
 * Persists and synchronizes generated quizzes in localStorage and broadcasts window events
 * so all components (e.g. Courses, Dashboard, Assessments & Quizzes tab) have instant access to generated quizzes.
 */

// Display-only mirror of instructor quizzes. The server is the source of truth and
// grades every attempt, so answer keys, explanations and marking schemes are never
// written here (localStorage is readable by any script on the page and by anyone
// using the browser).
const STORAGE_KEY = 'eduflow_generated_quizzes_v2';
// The previous key stored full answer keys; drop it once.
const LEGACY_STORAGE_KEY = 'eduflow_generated_quizzes';

try {
  localStorage.removeItem(LEGACY_STORAGE_KEY);
} catch (err) {
  console.warn('Could not remove legacy quiz cache from localStorage:', err);
}

const sanitizeQuestion = (q, idx) => ({
  id: q.id || `q-item-${idx + 1}`,
  prompt: q.prompt || `Question ${idx + 1}`,
  type: q.type || 'MultipleChoice',
  options: Array.isArray(q.options) ? q.options : [],
  points: q.points || 10,
  slideCitation: q.slideCitation || null
});

export const saveGeneratedQuiz = (quizObj) => {
  if (!quizObj || !quizObj.title) return null;

  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    const existingList = existingRaw ? JSON.parse(existingRaw) : [];

    const formattedQuiz = {
      id: quizObj.id || `q-gen-${Date.now()}`,
      courseId: quizObj.courseId || null,
      courseCode: quizObj.courseCode || '',
      title: quizObj.title,
      description: quizObj.description || '',
      questionsCount: quizObj.questionsCount || (quizObj.questions ? quizObj.questions.length : 5),
      difficulty: quizObj.difficulty || 'Medium',
      xpReward: quizObj.xpReward || 100,
      coinReward: quizObj.coinReward || 25,
      timeLimit: quizObj.timeLimit || quizObj.timeLimitMinutes || 15,
      timeLimitMinutes: quizObj.timeLimitMinutes || quizObj.timeLimit || 15,
      passPercentage: quizObj.passPercentage || quizObj.passThreshold || 70,
      passThreshold: quizObj.passThreshold || quizObj.passPercentage || 70,
      avgScore: quizObj.avgScore || 0,
      status: quizObj.status || 'Published',
      createdAt: quizObj.createdAt || new Date().toISOString(),
      // Hierarchy placement. Without these a module quiz is later mistaken for a
      // course-level (final assessment) quiz and shows up in the wrong place.
      scopeType: quizObj.scopeType || null,
      scopeId: quizObj.scopeId || null,
      moduleId: quizObj.moduleId || null,
      topicId: quizObj.topicId || null,
      isBossBattle: Boolean(quizObj.isBossBattle),
      questions: (quizObj.questions || []).map(sanitizeQuestion)
    };

    // Prepend and deduplicate by id or title
    const filteredList = existingList.filter(q => q.id !== formattedQuiz.id && q.title !== formattedQuiz.title);
    const updatedList = [formattedQuiz, ...filteredList];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

    // Broadcast window event so active components (like Assessments tab) reload immediately
    window.dispatchEvent(new CustomEvent('eduflow_quiz_created', { detail: formattedQuiz }));

    return formattedQuiz;
  } catch (err) {
    console.warn('Failed to save generated quiz to localStorage:', err);
    return quizObj;
  }
};

/**
 * Update an already-persisted quiz in localStorage (edit questions, rename title, etc.).
 * Pass `matchTitle` when the caller only knows the original title (e.g. locally-created quiz ids).
 * Broadcasts 'eduflow_quiz_updated' so every open view refreshes instantly.
 */
export const updateGeneratedQuiz = (quizId, updates = {}, matchTitle = null) => {
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    if (!existingRaw) return null;
    const list = JSON.parse(existingRaw);

    let updatedQuiz = null;
    const newList = list.map(q => {
      const isMatch = q.id === quizId || (matchTitle && q.title === matchTitle);
      if (!isMatch) return q;

      updatedQuiz = {
        ...q,
        ...updates,
        ...(updates.questions ? { questions: updates.questions.map(sanitizeQuestion) } : {}),
        questionsCount: updates.questionsCount
          ?? (updates.questions ? updates.questions.length : q.questionsCount),
        // Keep mirrored legacy fields in sync after a rename
        ...(updates.title ? { title: updates.title } : {})
      };
      return updatedQuiz;
    });

    if (!updatedQuiz) return null;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    window.dispatchEvent(new CustomEvent('eduflow_quiz_updated', { detail: updatedQuiz }));
    return updatedQuiz;
  } catch (err) {
    console.warn('Failed to update generated quiz in localStorage:', err);
    return null;
  }
};

export const getGeneratedQuizzes = (courseId = null) => {
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    if (!existingRaw) return [];
    const list = JSON.parse(existingRaw);
    if (!courseId || courseId === 'ALL') {
      return list;
    }
    return list.filter(q => !q.courseId || q.courseId === courseId || q.courseId === 'ALL');
  } catch (err) {
    console.warn('Failed to read generated quizzes from localStorage:', err);
    return [];
  }
};

export const deleteGeneratedQuiz = (quizId) => {
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    if (!existingRaw) return;
    const list = JSON.parse(existingRaw);
    const filtered = list.filter(q => q.id !== quizId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('eduflow_quiz_deleted', { detail: { quizId } }));
  } catch (err) {
    console.warn('Failed to delete generated quiz from localStorage:', err);
  }
};

/**
 * Removes every locally-mirrored quiz matching `predicate` (e.g. belonging to a
 * deleted course or module) and broadcasts a single refresh event.
 * Returns how many entries were dropped.
 */
export const deleteGeneratedQuizzesWhere = (predicate) => {
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    if (!existingRaw) return 0;
    const list = JSON.parse(existingRaw);
    const kept = list.filter(q => !predicate(q));
    if (kept.length === list.length) return 0;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    window.dispatchEvent(new CustomEvent('eduflow_quiz_deleted', { detail: { removed: list.length - kept.length } }));
    return list.length - kept.length;
  } catch (err) {
    console.warn('Failed to purge generated quizzes from localStorage:', err);
    return 0;
  }
};
