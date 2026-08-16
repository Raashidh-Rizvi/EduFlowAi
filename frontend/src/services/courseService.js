import api from './api';

export const courseService = {
  async getCourses() {
    try {
      const response = await api.get('/courses');
      return response.data;
    } catch {
      return [
        {
          id: '44444444-4444-4444-4444-444444444444',
          code: 'SE3090',
          title: 'Software Engineering Frameworks & Adaptive Systems',
          description: 'Enterprise architecture with ASP.NET Core, PostgreSQL, React, Flutter & LangGraph multi-agent systems.',
          category: 'Software Engineering',
          modulesCount: 2,
          lessonsCount: 5,
          isPublished: true
        }
      ];
    }
  },

  async getCourseById(courseId) {
    try {
      const response = await api.get(`/courses/${courseId}`);
      return response.data;
    } catch (err) {
      console.warn('Falling back to local course detail', err);
      return null;
    }
  },

  async createCourse(data) {
    const response = await api.post('/courses', data);
    return response.data;
  },

  async updateCourse(courseId, data) {
    const response = await api.put(`/courses/${courseId}`, data);
    return response.data;
  },

  async deleteCourse(courseId) {
    const response = await api.delete(`/courses/${courseId}`);
    return response.data;
  },

  async getModules(courseId) {
    const response = await api.get(`/courses/${courseId}/modules`);
    return response.data;
  },

  async createModule(courseId, data) {
    const response = await api.post(`/courses/${courseId}/modules`, data);
    return response.data;
  },

  async updateModule(moduleId, data) {
    const response = await api.put(`/courses/modules/${moduleId}`, data);
    return response.data;
  },

  async deleteModule(moduleId) {
    const response = await api.delete(`/courses/modules/${moduleId}`);
    return response.data;
  },

  async getLessonDetail(lessonId) {
    const response = await api.get(`/courses/lessons/${lessonId}`);
    return response.data;
  },

  async createLesson(moduleId, data) {
    const response = await api.post(`/courses/modules/${moduleId}/lessons`, data);
    return response.data;
  },

  async updateLesson(lessonId, data) {
    const response = await api.put(`/courses/lessons/${lessonId}`, data);
    return response.data;
  },

  async uploadPdf(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/courses/upload-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async enrollCourse(courseId) {
    const response = await api.post(`/courses/${courseId}/enroll`);
    return response.data;
  },

  async unenrollCourse(courseId) {
    const response = await api.delete(`/courses/${courseId}/enroll`);
    return response.data;
  },

  async getMyCourses() {
    const response = await api.get('/students/me/courses');
    return response.data;
  },

  async completeLesson(lessonId) {
    const response = await api.post(`/courses/lessons/${lessonId}/complete`);
    return response.data;
  }
};
