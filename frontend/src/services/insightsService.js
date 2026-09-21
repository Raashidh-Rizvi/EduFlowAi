import api from './api';

export const insightsService = {
  async getDashboardSummary() {
    try {
      const response = await api.get('/analytics/dashboard-summary');
      return response.data;
    } catch {
      return {
        totalStudents: 0,
        totalInstructors: 0,
        totalCourses: 0,
        totalQuizzesPassed: 0,
        totalXpAwarded: 0,
        activeStreaks: 0,
        pendingAiApprovals: 0
      };
    }
  },

  async getPlatformAnalytics() {
    try {
      const response = await api.get('/analytics/platform');
      return response.data;
    } catch {
      return {
        totalUsers: 0,
        totalStudents: 0,
        totalCourses: 0,
        publishedCourses: 0,
        totalEnrollments: 0,
        totalSubmissions: 0,
        passedSubmissions: 0,
        quizPassRate: 0,
        totalChallenges: 0,
        totalXpAwarded: 0,
        totalBadgesUnlocked: 0,
        aiWorkflows: { pending: 0, approved: 0, total: 0 }
      };
    }
  },

  async getAtRiskStudents() {
    try {
      const response = await api.get('/analytics/at-risk-students');
      return response.data;
    } catch {
      return [];
    }
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
    try {
      const response = await api.get('/analytics/topic-mastery');
      return response.data;
    } catch {
      return [];
    }
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
    try {
      const response = await api.get('/analytics/audit-logs', { params: { limit } });
      return response.data;
    } catch {
      return [];
    }
  }
};
