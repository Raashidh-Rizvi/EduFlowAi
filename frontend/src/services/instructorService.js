import api from './api';

/**
 * Instructor-scoped API surface.
 * Every endpoint is scoped on the server to the authenticated instructor's JWT —
 * there is no way to pass another instructor's id and widen visibility.
 */
export const instructorService = {
  async getDashboard() {
    const response = await api.get('/instructor/dashboard');
    return response.data;
  },

  async getMyCourses() {
    const response = await api.get('/instructor/courses');
    return response.data;
  },

  async getMyCourse(courseId) {
    const response = await api.get(`/instructor/courses/${courseId}`);
    return response.data;
  },

  async getEnrollmentRequests(params = {}) {
    const response = await api.get('/instructor/enrollment-requests', { params });
    return response.data;
  },

  async getEnrollmentRequestSummary() {
    const response = await api.get('/instructor/enrollment-requests/summary');
    return response.data;
  },

  async approveEnrollment(enrollmentId, notes) {
    const response = await api.post(`/instructor/enrollment-requests/${enrollmentId}/approve`, { notes });
    return response.data;
  },

  async declineEnrollment(enrollmentId, notes) {
    const response = await api.post(`/instructor/enrollment-requests/${enrollmentId}/decline`, { notes });
    return response.data;
  },

  async getMyStudents() {
    const response = await api.get('/instructor/students');
    return response.data;
  },

  async getMyReviews() {
    const response = await api.get('/instructor/reviews');
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/instructor/profile');
    return response.data;
  },

  // -------------------------------------------------------------------------
  // Public instructor profiles (no privileged role required)
  // -------------------------------------------------------------------------

  /** Directory of every active instructor with public statistics. */
  async listInstructors() {
    const response = await api.get('/instructors');
    return response.data;
  },

  /** One instructor's full public profile: bio, expertise, courses, feedback. */
  async getPublicProfile(instructorId) {
    const response = await api.get(`/instructors/${instructorId}`);
    return response.data;
  },

  /** Approved reviews across the instructor's published courses. */
  async getInstructorReviews(instructorId, take = 20) {
    const response = await api.get(`/instructors/${instructorId}/reviews`, { params: { take } });
    return response.data;
  },

  // -------------------------------------------------------------------------
  // Own public-profile editor (Instructor/Admin; bound to the JWT identity)
  // -------------------------------------------------------------------------

  /** The signed-in instructor's own profile shaped for the edit form. */
  async getMyPublicProfile() {
    const response = await api.get('/instructors/me/profile');
    return response.data;
  },

  /**
   * Partial update of the signed-in instructor's own public profile.
   * Omitted fields are left unchanged server-side.
   */
  async updateMyProfile(payload) {
    const response = await api.put('/instructors/me/profile', payload);
    return response.data;
  }
};

export default instructorService;
