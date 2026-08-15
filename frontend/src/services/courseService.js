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
          title: 'Software Engineering Frameworks',
          description: 'Enterprise architecture with ASP.NET Core, PostgreSQL, React, Flutter & LangGraph multi-agent systems.',
          category: 'Software Engineering',
          modulesCount: 2,
          lessonsCount: 6,
          isPublished: true
        }
      ];
    }
  },

  async getCourseById(courseId) {
    const response = await api.get(`/courses/${courseId}`);
    return response.data;
  },

  async enrollCourse(courseId) {
    const response = await api.post(`/courses/${courseId}/enroll`);
    return response.data;
  },

  async completeLesson(lessonId) {
    const response = await api.post(`/courses/lessons/${lessonId}/complete`);
    return response.data;
  }
};
