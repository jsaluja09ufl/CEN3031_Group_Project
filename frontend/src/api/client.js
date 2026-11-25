
import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL;

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
  },

  // https://axios-http.com/docs/req_config
  createEvent: async (session_token, event) => {
    const res = await apiClient.post('/events', event, { headers: { 'session-token': session_token } });
    return res.data;
  },

  getEvents: async (session_token) => {
    const res = await apiClient.get('/events', { headers: { 'session-token': session_token } });
    return res.data;
  },

  // PBI B — Group Spaces
  getGroups: async (sessionToken) => {
    const res = await apiClient.get('/groups', {
      headers: { 'session-token': sessionToken, Authorization: `Bearer ${sessionToken}` }
    });
    return res.data;
  },

  createGroup: async (sessionToken, groupData) => {
    const res = await apiClient.post('/groups', groupData, {
      headers: { 'session-token': sessionToken, Authorization: `Bearer ${sessionToken}` }
    });
    return res.data;
  },

  getGroup: async (sessionToken, groupId) => {
    const res = await apiClient.get(`/groups/${groupId}`, {
      headers: { 'session-token': sessionToken, Authorization: `Bearer ${sessionToken}` }
    });
    return res.data;
  },

  addGroupMember: async (sessionToken, groupId, memberData) => {
    const res = await apiClient.post(`/groups/${groupId}/members`, memberData, {
      headers: { 'session-token': sessionToken, Authorization: `Bearer ${sessionToken}` }
    });
    return res.data;
  },

  getGroupTasks: async (sessionToken, groupId) => {
    const res = await apiClient.get(`/groups/${groupId}/tasks`, {
      headers: { 'session-token': sessionToken, Authorization: `Bearer ${sessionToken}` }
    });
    return res.data;
  },

  createGroupTask: async (sessionToken, groupId, taskData) => {
    const res = await apiClient.post(`/groups/${groupId}/tasks`, taskData, {
      headers: { 'session-token': sessionToken, Authorization: `Bearer ${sessionToken}` }
    });
    return res.data;
  },

  toggleGroupTask: async (sessionToken, groupId, taskId) => {
    const res = await apiClient.patch(`/groups/${groupId}/tasks/${taskId}/toggle`, {}, {
      headers: { 'session-token': sessionToken, Authorization: `Bearer ${sessionToken}` }
    });
    return res.data;
  },

  getGroupEvents: async (sessionToken, groupId) => {
    const res = await apiClient.get(`/groups/${groupId}/events`, {
      headers: { 'session-token': sessionToken, Authorization: `Bearer ${sessionToken}` }
    });
    return res.data;
  },

  createGroupEvent: async (sessionToken, groupId, eventData) => {
    const res = await apiClient.post(`/groups/${groupId}/events`, eventData, {
      headers: { 'session-token': sessionToken, Authorization: `Bearer ${sessionToken}` }
    });
    return res.data;
  }
};

export default apiClient;
