
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL
});

export const api = {
  checkHealth: async () => {
    const res = await apiClient.get('/');
    return res.data;
  },

  login: async (username, password) => {
    const res = await apiClient.get(
      `/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`
    );
    return res.data;
  },

  createUser: async ({ username, password, firstName, lastName, email }) => {
    const res = await apiClient.get(
      `/create_user/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${encodeURIComponent(firstName)}/${encodeURIComponent(lastName)}/${encodeURIComponent(email)}`
    );
    return res.data;
  },

  validatUser: async (session_token) => {
    const res = await apiClient.get(
      `/validate_user/${encodeURIComponent(session_token)}`
    );
    return res.data;
  },

  // PBI Z — Retrieve the logged-in user's habits and tasks
  getHabitTasks: async (sessionToken) => {
    const res = await apiClient.get('/habit-tasks', {
      headers: {
        Authorization: `Bearer ${sessionToken}`
      }
    });
    return res.data;
  },

  // PBI Z — Create a new habit or task
  createHabitTask: async (sessionToken, habitTask) => {
    const res = await apiClient.post('/habit-tasks', habitTask, {
      headers: {
        Authorization: `Bearer ${sessionToken}`
      }
    });
    return res.data;
  }
};

export default apiClient;
