import api from './api';

/**
 * Student course-review API.
 * Every write binds ownership server-side to the JWT identity: the backend
 * derives the student id from the token, so callers can only ever create,
 * edit or delete their OWN review. Instructors are rejected by role policy.
 */
export const reviewService = {
  /** Approved reviews for a course (public). */
  async listCourseReviews(courseId) {
    const response = await api.get(`/courses/${courseId}/reviews`);
    return response.data;
  },

  /** The signed-in student's own review for a course (or { hasReview: false }). */
  async getMyReview(courseId) {
    const response = await api.get(`/courses/${courseId}/reviews/mine`);
    return response.data;
  },

  /**
   * Creates the student's review, or updates it when one already exists
   * (one active review per student per course). Returns { message, review }.
   */
  async submitReview(courseId, { rating, comment }) {
    const response = await api.post(`/courses/${courseId}/reviews`, { rating, comment });
    return response.data;
  },

  /** Deletes a review owned by the signed-in student. */
  async deleteReview(courseId, reviewId) {
    const response = await api.delete(`/courses/${courseId}/reviews/${reviewId}`);
    return response.data;
  }
};

export default reviewService;
