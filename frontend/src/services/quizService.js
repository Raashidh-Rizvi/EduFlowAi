import api from './api';

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

  async getAiStatus() {
    const response = await api.get('/quizzes/ai-status');
    return response.data;
  },

  // Per-provider configuration status (never contains secrets). Instructor/Admin only.
  // Returns { providers: [{ provider, label, configured, missing, models, defaultModel, active }], requestId }.
  async getAiProviders() {
    const response = await api.get('/ai/providers');
    return response.data;
  },

  // Ingestion state of a course document: UPLOADED | PROCESSING | READY | FAILED.
  async getDocumentStatus(fileUrl) {
    const response = await api.get('/ai/documents/status', { params: { fileUrl } });
    return response.data;
  },

  // (Re-)index a module's document into the vector store (owner/admin only).
  async indexDocument(moduleId, fileUrl) {
    const response = await api.post('/ai/documents/index', { moduleId, fileUrl });
    return response.data;
  },

  async generateAiQuiz(data) {
    const response = await api.post('/quizzes/generate-ai', data);
    return response.data;
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

  // attemptId comes from startQuiz; the server completes exactly that attempt.
  async submitQuiz(quizId, answers, attemptId) {
    const response = await api.post('/quizzes/submit', { quizId, answers, attemptId });
    return response.data;
  },

  async getQuizSubmissions(quizId) {
    const response = await api.get(`/quizzes/${quizId}/submissions`);
    return response.data;
  },

  // Authoritative, reproducible result of one attempt (student: own attempts only).
  async getAttemptResult(attemptId) {
    const response = await api.get(`/quizzes/attempts/${attemptId}/result`);
    return response.data;
  },

  // Instructor marking: first mark of an answer awaiting review, or an override (reason required).
  async markAnswer(attemptId, questionId, { awardedMarks, feedback, reason }) {
    const response = await api.post(`/quizzes/attempts/${attemptId}/answers/${questionId}/mark`, {
      awardedMarks,
      feedback,
      reason
    });
    return response.data;
  },

  async sendSubmissionFeedback(submissionId, feedback) {
    const response = await api.post(`/quizzes/submissions/${submissionId}/feedback`, { feedback });
    return response.data;
  },

  async getCourseQuizPerformance(courseId) {
    const response = await api.get(`/quizzes/course/${courseId}/performance`);
    return response.data;
  },

  async getStudentQuizHistory(studentId) {
    const response = await api.get('/quizzes/student/history', { params: studentId ? { studentId } : {} });
    return response.data;
  }
};
