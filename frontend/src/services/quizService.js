import api from './api';

export const quizService = {
  async getQuizzes(courseId) {
    const response = await api.get(`/quizzes/course/${courseId}`);
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

  async getAiStatus() {
    const response = await api.get('/quizzes/ai-status');
    return response.data;
  },

  async generateAiQuiz(data) {
    const response = await api.post('/quizzes/generate-ai', data);
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
  }
};

