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

  async chatWithCoach(message, studentId = '33333333-3333-3333-3333-333333333333', courseId = 'it3012-se', sourceFile = null) {
    const payload = {
      student_id: studentId,
      course_id: courseId,
      message: message,
      source_file: sourceFile || null
    };

    let backendResponse = null;

    // 1. Try production path through .NET Backend API Gateway (port 5204)
    try {
      const response = await api.post('/aireview/coach/chat', payload);
      if (response && response.data && (response.data.reply || response.data.answer)) {
        if (response.data.source !== 'fallback') {
          return response.data;
        }
        backendResponse = response.data;
        console.warn('Backend returned fallback response, attempting direct AI microservice connection...');
      }
    } catch (err) {
      console.warn('Backend /aireview/coach/chat unavailable, bridging directly to AI Microservice (port 8000)...', err);
    }

    // 2. Direct fallback bridge to Python AI Microservice (port 8000)
    try {
      const directRes = await fetch('http://localhost:8000/ai-coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (directRes.ok) {
        return await directRes.json();
      }
    } catch (directErr) {
      console.warn('Direct AI microservice unavailable:', directErr);
    }

    return backendResponse;
  },

  async getSlideDecks() {
    try {
      const res = await fetch('http://localhost:8000/api/v1/rag/slide-decks');
      if (res.ok) {
        const data = await res.json();
        return data.slide_decks || [];
      }
    } catch (e) {
      console.warn('Failed to load slide decks from AI microservice:', e);
    }
    return [];
  },

  async ragChat(question, courseId = 'it3012-se', moduleId = 'lecture-04', sourceFile = null) {
    const res = await fetch('http://localhost:8000/api/v1/rag/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, course_id: courseId, module_id: moduleId, source_file: sourceFile })
    });
    return await res.json();
  }
};
