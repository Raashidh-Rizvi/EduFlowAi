import api from './api';

/**
 * Student-side enrollment workflow.
 *
 * Nothing here grants access by itself: a request is always created as PENDING and
 * only the course instructor (or an Admin) can move it to APPROVED. `getCourseAccess`
 * is the single source of truth for whether protected materials may be opened, so the
 * UI never has to guess from a locally cached status.
 */
export const enrollmentService = {
  /** Everything the signed-in student has requested, decided or pending. */
  async getMyRequests() {
    const response = await api.get('/students/me/enrollment-requests');
    return response.data;
  },

  /** Why this course's materials are open or withheld for the signed-in student. */
  async getCourseAccess(courseId) {
    const response = await api.get(`/courses/${courseId}/access`);
    return response.data;
  },

  /** Submit a request (also used to re-request after a rejection or cancellation). */
  async requestEnrollment(courseId) {
    const response = await api.post(`/courses/${courseId}/enroll`);
    return response.data;
  },

  /** Withdraw a pending request, or leave an approved course. */
  async cancelEnrollment(courseId) {
    const response = await api.delete(`/courses/${courseId}/enroll`);
    return response.data;
  }
};

export default enrollmentService;
