import axios from 'axios';

const instance = axios.create({
    baseURL: '/api',
    timeout: 10000
});

// Request interceptor for token
instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('sesame_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth APIs
export const register = (data) => instance.post('/register', data);
export const login = (data) => instance.post('/login', data);
export const getUserInfo = () => instance.get('/user/info');

// Grouping APIs
export const getGroupings = (params) => instance.get('/grouping', { params });
export const createGrouping = (data) => instance.post('/grouping', data);
export const updateGrouping = (id, data) => instance.put(`/grouping/${id}`, data);
export const deleteGrouping = (id) => instance.delete(`/grouping/${id}`);
export const getStats = () => instance.get('/grouping/stats');
export const getGroupingDetails = (id) => instance.get(`/grouping/${id}`);

// Admin APIs
export const adminGetUsers = () => instance.get('/admin/users');
export const adminUpdateUser = (id, data) => instance.put(`/admin/users/${id}`, data);

export default instance;
