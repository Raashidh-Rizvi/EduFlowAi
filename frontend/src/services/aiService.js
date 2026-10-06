import api from './api';

export const aiService = {
  async getPendingProposals() {
    const response = await api.get('/aireview/pending-proposals');
    return response.data;
  },

  async getWorkflows(status) {
    const response = await api.get('/aireview/workflows', { params: { status } });
    return response.data;
  },

  async getWorkflowById(id) {
    const response = await api.get(`/aireview/workflows/${id}`);
    return response.data;
  },

  async orchestrateStudyPlan(data) {
    const response = await api.post('/aireview/orchestrate', data);
    return response.data;
  },

  async generateQuiz(data) {
    const response = await api.post('/aireview/generate-quiz', data);
    return response.data;
  },

  async getRetentionInsights(data) {
    const response = await api.post('/aireview/retention-insights', data);
    return response.data;
  },

  async getAgentsTopology() {
    const response = await api.get('/aireview/agents-topology');
    return response.data;
  },

  async getToolsRegistry() {
    const response = await api.get('/aireview/tools-registry');
    return response.data;
  },

  async getObservabilityMetrics() {
    const response = await api.get('/aireview/observability-metrics');
    return response.data;
  },

  async submitDecision(proposalId, decision, comments) {
    const response = await api.post(`/aireview/proposals/${proposalId}/decision`, { decision, comments });
    return response.data;
  },

  async approveProposal(proposalId, comments) {
    const response = await api.post(`/aireview/proposals/${proposalId}/approve`, { comments });
    return response.data;
  },

  async rejectProposal(proposalId, comments) {
    const response = await api.post(`/aireview/proposals/${proposalId}/reject`, { comments });
    return response.data;
  },

  async requestRevision(proposalId, comments) {
    const response = await api.post(`/aireview/proposals/${proposalId}/revise`, { comments });
    return response.data;
  },

  async updateProposal(proposalId, data) {
    const response = await api.put(`/aireview/proposals/${proposalId}`, data);
    return response.data;
  },

  async chatWithCoach(message, studentId = null, courseId = 'it3012-se', sourceFile = null, sessionId = null) {
    const payload = {
      student_id: studentId,
      course_id: courseId,
      message: message,
      source_file: sourceFile || null,
      session_id: sessionId
    };

    try {
      const { data } = await api.post('/aireview/coach/chat', payload, { timeout: 150000 });
      const reply = data?.reply || data?.answer;
      if (typeof reply === 'string' && reply.trim() && data.source !== 'fallback') {
        return { ...data, reply };
      }
      throw new Error('The AI assistant returned no answer. Please retry.');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.isAxiosError) throw new Error(typeof detail === 'string' ? detail : 'The AI assistant is unavailable. Please try again shortly.');
      throw err;
    }
  },

  async learn(payload) {
    try {
      const response = await api.post('/aireview/learn', payload, { timeout: 150000 });
      return response.data;
    } catch (err) {
      const detail = err.response?.data?.detail;
      throw new Error(typeof detail === 'string' ? detail : 'The learning service is unavailable. Please try again shortly.');
    }
  },

  async getSlideDecks() {
    try {
      const response = await api.get('/aireview/learning/slide-decks');
      return response.data.slide_decks || [];
    } catch (e) {
      console.warn('Failed to load slide decks from AI microservice:', e);
    }
    throw new Error('Indexed lectures could not be loaded. Check that the AI service is running, then retry.');
  },

  async ragChat(question, courseId = 'it3012-se', moduleId = 'lecture-04', sourceFile = null) {
    const response = await api.post('/aireview/rag/chat', {
      question, course_id: courseId, module_id: moduleId, source_file: sourceFile
    });
    return response.data;
  }
};
