import api from './api';

/**
 * Platform review-moderation API (administrators only).
 * Approve publishes a review into every aggregate; reject hides it while
 * keeping the row auditable; delete removes it permanently.
 */
export const adminReviewService = {
  /** Every review with its moderation state. Filters: status, courseId, take. */
  async listReviews(params = {}) {
    const response = await api.get('/admin/reviews', { params });
    return response.data;
  },

  async approveReview(reviewId) {
    const response = await api.post(`/admin/reviews/${reviewId}/approve`);
    return response.data;
  },

  async rejectReview(reviewId, note) {
    const response = await api.post(
      `/admin/reviews/${reviewId}/reject`,
      note ? { note } : {}
    );
    return response.data;
  },

  async deleteReview(reviewId) {
    const response = await api.delete(`/admin/reviews/${reviewId}`);
    return response.data;
  }
};

export default adminReviewService;
