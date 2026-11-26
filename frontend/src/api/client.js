
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

  getSchedule: async (session_token) => {
    const res = await apiClient.get('/events/schedule', { headers: { 'session-token': session_token } });
    return res.data;
  },

  createGroupSpace: async (session_token, group) => {
    const res = await apiClient.post('/group_spaces/create', group, {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  getUserGroupSpaces: async (session_token) => {
    const res = await apiClient.get('/group_spaces/browse', {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  getGroupGoals: async (session_token, group_id) => {
    const res = await apiClient.get(`/group_spaces/${group_id}/goals`, {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  createGroupGoal: async (session_token, group_id, goal) => {
    const res = await apiClient.post(`/group_spaces/${group_id}/create_goal`, goal, {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  getGroupMembers: async (session_token, group_id) => {
    const res = await apiClient.get(`/group_spaces/${group_id}/members`, {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  addGroupAdmin: async (session_token, group_id, username) => {
    const res = await apiClient.post(`/group_spaces/${group_id}/add_admin`, { username }, {
      headers: { 'session-token': session_token },
      params: { add_username: username }
    });
    return res.data;
  },

  inviteToGroup: async (session_token, group_id, username) => {
    const res = await apiClient.post(`/group_spaces/${group_id}/invite`, { username }, {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  getGroupInvites: async (session_token) => {
    const res = await apiClient.get('/group_spaces/invites', {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  respondToInvite: async (session_token, group_id, accept) => {
    const res = await apiClient.post(`/group_spaces/${group_id}/invite/respond`, { accept }, {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  // PBI-B: Group Space Tasks and Events (Admin creation & viewing)
  getGroupTasks: async (session_token, group_id) => {
    const res = await apiClient.get(`/group_spaces/${group_id}/tasks`, {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  createGroupTask: async (session_token, group_id, task) => {
    const res = await apiClient.post(`/group_spaces/${group_id}/tasks`, task, {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  toggleGroupTask: async (session_token, group_id, task_id) => {
    const res = await apiClient.patch(`/group_spaces/${group_id}/tasks/${task_id}/toggle`, {}, {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  getGroupEvents: async (session_token, group_id) => {
    const res = await apiClient.get(`/group_spaces/${group_id}/events`, {
      headers: { 'session-token': session_token }
    });
    return res.data;
  },

  createGroupEvent: async (session_token, group_id, event) => {
    const res = await apiClient.post(`/group_spaces/${group_id}/events`, event, {
      headers: { 'session-token': session_token }
    });
    return res.data;
  }
};

export default api;
export { apiClient };
