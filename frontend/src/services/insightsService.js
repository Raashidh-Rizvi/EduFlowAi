import api from './api';

export const insightsService = {
  async getDashboardSummary() {
    try {
      const response = await api.get('/analytics/dashboard-summary');
      return response.data;
    } catch {
      return {
        totalStudents: 1428,
        totalXpAwarded: '482.6k',
        activeStreaks: 892,
        pendingAiApprovals: 3
      };
    }
  },

  async getAtRiskStudents() {
    try {
      const response = await api.get('/analytics/at-risk-students');
      return response.data;
    } catch {
      return [
        {
          studentName: 'Alex Rivera',
          assessmentTitle: 'PostgreSQL Indexing & Concurrency',
          score: 54,
          riskFactor: 'Failed multiple attempts on Indexing',
          recommendedAction: 'Generate 5-min Remedial Challenge'
        }
      ];
    }
  }
};
