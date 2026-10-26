import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({baseURL: API_BASE_URL});

export const api = {
  checkHealth: async () => {
    const res = await apiClient.get('/');
    return res.data;
  },

  login: async (username, password) => {
    const res = await apiClient.get(`/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`);
    return res.data;
  },

  createUser: async ({ username, password, firstName, lastName, email }) => {
    const res = await apiClient.get(
      `/create_user/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${encodeURIComponent(firstName)}/${encodeURIComponent(lastName)}/${encodeURIComponent(email)}`
    );
    return res.data;
  },

  validatUser: async (session_token) => {
    const res = await apiClient.get(`/validate_user/${encodeURIComponent(session_token)}`);
    return res.data;
  },

  // https://axios-http.com/docs/req_config
  createEvent: async (session_token, event) => {
    const res = await apiClient.post('/events', event, { headers: { 'session-token': session_token } });
    return res.data;
  },

  getEvents: async (session_token) => {
    const res = await apiClient.get('/events', { headers: { 'session-token': session_token } });
    return res.data;
  }
};

export default apiClient;
