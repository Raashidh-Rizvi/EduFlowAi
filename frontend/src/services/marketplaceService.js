import api from './api';

/**
 * Public course-marketplace API.
 * Every response is produced by the live backend — no client-side sample data.
 */
export const marketplaceService = {
  /** Platform-level counters used by the hero + trust strip. */
  async getStats() {
    const response = await api.get('/marketplace/stats');
    return response.data;
  },

  /** Distinct course categories with their published-course counts. */
  async getCategories() {
    const response = await api.get('/marketplace/categories');
    return response.data;
  },

  /** Instructors ranked by published courses, learners and rating. */
  async getInstructors(limit = 6) {
    const response = await api.get('/marketplace/instructors', { params: { limit } });
    return response.data;
  },

  /**
   * Paginated, filterable list of published courses.
   * @param {{search?:string, category?:string, level?:string, price?:string, sort?:string, page?:number, pageSize?:number}} params
   */
  async getCourses(params = {}) {
    const query = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        query[key] = value;
      }
    });
    const response = await api.get('/marketplace/courses', { params: query });
    return response.data;
  },

  /** Full course detail: curriculum, instructor profile, ratings and reviews. */
  async getCourse(courseId) {
    const response = await api.get(`/marketplace/courses/${courseId}`);
    return response.data;
  },

  /** Similar courses from the same category (excludes the current course). */
  async getSimilarCourses(courseId, category, limit = 4) {
    const response = await api.get(`/marketplace/courses/${courseId}/similar`, {
      params: { category, limit }
    });
    return response.data;
  },

  /** Student rating + comment for a course they are enrolled in. */
  async submitReview(courseId, payload) {
    const response = await api.post(`/courses/${courseId}/reviews`, payload);
    return response.data;
  },

  /** Self-service enrollment (creates a pending request awaiting approval). */
  async enroll(courseId) {
    const response = await api.post(`/courses/${courseId}/enroll`);
    return response.data;
  }
};

export default marketplaceService;
