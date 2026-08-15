import api from './api';

export const authService = {
  async register(data) {
    const response = await api.post('/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('eduflow_token', response.data.token);
      localStorage.setItem('eduflow_user', JSON.stringify(response.data));
    }
    return response.data;
  },

  async login(data) {
    const response = await api.post('/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('eduflow_token', response.data.token);
      localStorage.setItem('eduflow_user', JSON.stringify(response.data));
    }
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('eduflow_token');
    localStorage.removeItem('eduflow_user');
  }
};
