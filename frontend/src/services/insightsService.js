import api from './api';

export const insightsService = {
  async getDashboardSummary() {
    const response = await api.get('/analytics/dashboard-summary');
    return response.data;
  },

  async getPlatformAnalytics() {
    const response = await api.get('/analytics/platform');
    return response.data;
  },

  async getAtRiskStudents() {
    const response = await api.get('/analytics/at-risk-students');
    return response.data;
  },

  async getStudentAnalytics(studentId) {
    const response = await api.get(`/analytics/student/${studentId}`);
    return response.data;
  },

  async getCourseAnalytics(courseId) {
    const response = await api.get(`/analytics/course/${courseId}`);
    return response.data;
  },

  async getTopicMastery() {
    const response = await api.get('/analytics/topic-mastery');
    return response.data;
  },

  async getReports(type) {
    const response = await api.get('/reports', { params: { type } });
    return response.data;
  },

  async generateReport(reportType, title) {
    const response = await api.post('/reports', { reportType, title });
    return response.data;
  },

  async getAuditLogs(limit = 50) {
    const response = await api.get('/analytics/audit-logs', { params: { limit } });
    return response.data;
  }
};
