import api from './api';

// ─────────────────────────────────────────────────────────────────
// QUIZ SERVICE — All quiz-related API calls with rich error logging
// ─────────────────────────────────────────────────────────────────

export const quizService = {
  async getQuizzes(courseId) {
    const response = await api.get(`/quizzes/course/${courseId}`);
    return response.data;
  },

  async getQuizzesByScope(scopeType, scopeId) {
    const response = await api.get(`/quizzes/scope/${scopeType}/${scopeId}`);
    return response.data;
  },

  async getQuizById(quizId) {
    const response = await api.get(`/quizzes/${quizId}`);
    return response.data;
  },

  async createQuiz(data) {
    const response = await api.post('/quizzes', data);
    return response.data;
  },

  async updateQuiz(quizId, data) {
    const response = await api.put(`/quizzes/${quizId}`, data);
    return response.data;
  },

  async deleteQuiz(quizId) {
    const response = await api.delete(`/quizzes/${quizId}`);
    return response.data;
  },

  async validateQuiz(quizId) {
    const response = await api.post(`/quizzes/${quizId}/validate`);
    return response.data;
  },

  async publishQuiz(quizId) {
    const response = await api.post(`/quizzes/${quizId}/publish`);
    return response.data;
  },

  async unpublishQuiz(quizId) {
    const response = await api.post(`/quizzes/${quizId}/unpublish`);
    return response.data;
  },

  async duplicateQuiz(quizId) {
    const response = await api.post(`/quizzes/${quizId}/duplicate`);
    return response.data;
  },

  // ─────────────────────────────────────────────────────────────────
  // AI STATUS CHECK — Check if the AI Microservice is reachable
  // ─────────────────────────────────────────────────────────────────
  async getAiStatus() {
    const endpoint = '/quizzes/ai-status';
    console.group('%c[QuizService] 🤖 Checking AI Microservice Status', 'color: #9c27b0; font-weight: bold;');
    console.log('Endpoint:', endpoint);
    console.log('This proxies through .NET backend to Python AI service at http://localhost:8000');
    try {
      const response = await api.get(endpoint);
      console.log('AI Status Response:', response.data);
      const { status, status_color, message, can_generate, indexed_chunks } = response.data;
      console.log('  Status Color:', status_color);
      console.log('  Can Generate:', can_generate);
      console.log('  Indexed Chunks in ChromaDB:', indexed_chunks ?? 'unknown');
      if (status_color === 'red') {
        console.error('  ❌ AI Service is OFFLINE or UNREACHABLE');
      } else if (status_color === 'yellow') {
        console.warn('  ⚠️ AI Service is RATE LIMITED — generation is paused');
      } else {
        console.log('  ✅ AI Service is HEALTHY');
      }
      console.groupEnd();
      return response.data;
    } catch (err) {
      console.error('  ❌ getAiStatus FAILED');
      console.error('  Error Code:', err.errorCode ?? 'N/A');
      console.error('  Friendly Message:', err.friendlyMessage ?? err.message);
      console.error('  Raw Error:', err);
      console.groupEnd();
      throw err;
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // AI QUIZ GENERATION — The main quiz generation call
  // This is the most critical call — must succeed for AI quizzes to work.
  // Chain: Frontend → .NET /quizzes/generate-ai → Python /generate-quiz
  // ─────────────────────────────────────────────────────────────────
  async generateAiQuiz(data) {
    const endpoint = '/quizzes/generate-ai';

    console.group('%c[QuizService] 🧠 AI Quiz Generation Request', 'color: #2196f3; font-weight: bold;');
    console.log('━━━━━━━━━━━━ REQUEST PAYLOAD ━━━━━━━━━━━━');
    console.log('Endpoint:', endpoint);
    console.log('Course ID:', data.courseId);
    console.log('Topic:', data.topic);
    console.log('Difficulty:', data.difficulty);
    console.log('Quiz Type:', data.quizType);
    console.log('Blooms Focus:', data.bloomsFocus);
    console.log('Question Count:', data.questionCount);
    console.log('Scope Type:', data.scopeType);
    console.log('Scope ID:', data.scopeId);
    console.log('PDF/Slide URL:', data.pdfUrl || data.slideUrl || '(none — topic-only mode)');
    console.log('Module Title:', data.moduleTitle);
    console.log('Question Types:', data.questionTypes);
    console.log('Full Payload:', data);
    console.log('');
    console.log('ℹ️  NOTE: This endpoint requires [Authorize(Roles = "Instructor,Admin")]');
    console.log('ℹ️  If you get a 401, check the Token State logged above.');
    console.log('ℹ️  The .NET backend will then call Python at http://localhost:8000/generate-quiz');

    try {
      const response = await api.post(endpoint, data);
      console.log('━━━━━━━━━━━━ SUCCESS ━━━━━━━━━━━━');
      console.log('Quiz Generated Successfully!');
      console.log('Quiz ID:', response.data?.id ?? response.data?.quizId ?? 'N/A');
      console.log('Title:', response.data?.title ?? 'N/A');
      console.log('Questions Count:', response.data?.questions?.length ?? 0);
      console.log('AI Source:', response.data?.source ?? 'N/A');
      console.log('Full Response:', response.data);
      console.groupEnd();
      return response.data;
    } catch (err) {
      console.log('━━━━━━━━━━━━ FAILURE ━━━━━━━━━━━━');
      console.error('❌ AI Quiz Generation FAILED');
      console.error('HTTP Status:', err.response?.status ?? 'No Response (Network Error)');
      console.error('Error Code:', err.errorCode ?? 'UNKNOWN');
      console.error('Backend Error Code:', err.response?.data?.code ?? 'N/A');
      console.error('Backend Message:', err.response?.data?.message ?? 'N/A');
      console.error('Backend Detail:', err.response?.data?.detail ?? 'N/A');
      console.error('Friendly Message:', err.friendlyMessage ?? err.message);
      console.error('Actionable Steps:', err.actionableSteps ?? []);
      console.error('');
      console.error('COMMON ROOT CAUSES:');
      console.error('  401 → Not logged in / token expired / user is not Instructor or Admin');
      console.error('  400 → Backend rejected the request (check courseId exists, user owns the course)');
      console.error('  400 (AI_GENERATION_FAILED) → Python AI microservice is offline or Gemini/Groq API key is invalid');
      console.error('  503 / Network → .NET backend is not running at http://localhost:5204');
      console.error('');
      console.error('Raw Error Object:', err);
      console.groupEnd();
      throw err;
    }
  },

  async regenerateQuestion(questionId, data) {
    const response = await api.post(`/quizzes/questions/${questionId}/regenerate`, data);
    return response.data;
  },

  async uploadQuiz(data) {
    const response = await api.post('/quizzes/upload-quiz', data);
    return response.data;
  },

  async startQuiz(quizId) {
    const response = await api.post(`/quizzes/${quizId}/start`);
    return response.data;
  },

  async submitQuiz(quizId, answers) {
    const response = await api.post('/quizzes/submit', { quizId, answers });
    return response.data;
  },

  async getQuizSubmissions(quizId) {
    const response = await api.get(`/quizzes/${quizId}/submissions`);
    return response.data;
  },

  async sendSubmissionFeedback(submissionId, feedback) {
    const response = await api.post(`/quizzes/submissions/${submissionId}/feedback`, { feedback });
    return response.data;
  },
};
