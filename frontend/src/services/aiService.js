import api from './api';

export const aiService = {
  async getPendingProposals() {
    try {
      const response = await api.get('/aireview/pending-proposals');
      return response.data;
    } catch {
      return [
        {
          id: 'wf-78a9c2',
          studentName: 'Alex Rivera',
          targetGoal: 'Master Entity Framework Core indexing, transactions, and prepare for Midterm Quiz in 2 weeks.',
          targetWeeks: 2,
          hoursPerWeek: 8.0,
          status: 'PendingInstructorApproval'
        }
      ];
    }
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

  async chatWithCoach(message, studentId = '33333333-3333-3333-3333-333333333333', courseId = '44444444-4444-4444-4444-444444444444') {
    const response = await api.post('/aireview/coach/chat', { student_id: studentId, course_id: courseId, message });
    return response.data;
  }
};
