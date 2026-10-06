import api from './api';

/** Attempt scoring rule values (backend AttemptScoringRule enum). */
export const ATTEMPT_SCORING = Object.freeze({ Highest: 0, Latest: 1 });

/**
 * Course grading configuration and results. Grades are always calculated by the server;
 * the client only edits the configuration (policy, weights, attempt rule) and displays results.
 */
export const gradingService = {
  async getConfiguration(courseId) {
    const response = await api.get(`/courses/${courseId}/grading`);
    return response.data;
  },

  /** weights: [{ assessmentId, weightPercent | null }]; bands (optional): [{ label, minPercentage }] */
  async saveConfiguration(courseId, { attemptScoring, weights, bands }) {
    const response = await api.put(`/courses/${courseId}/grading`, { attemptScoring, weights, bands });
    return response.data;
  },

  async activate(courseId) {
    const response = await api.post(`/courses/${courseId}/grading/activate`);
    return response.data;
  },

  /** The caller's own course grade (students) or a given student's (instructors). */
  async getGrade(courseId, studentId) {
    const query = studentId ? `?studentId=${studentId}` : '';
    const response = await api.get(`/courses/${courseId}/grade${query}`);
    return response.data;
  },

  async getCourseGrades(courseId) {
    const response = await api.get(`/courses/${courseId}/grades`);
    return response.data;
  },

  /** grade = null clears an override; a reason is always required. */
  async overrideGrade(courseId, studentId, grade, reason) {
    const response = await api.post(`/courses/${courseId}/grades/${studentId}/override`, { grade, reason });
    return response.data;
  }
};
