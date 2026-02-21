import api from './axios';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const login = (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }).then((r) => r.data);

export const register = (email: string, password: string, full_name: string) =>
    api.post('/api/auth/register', { email, password, full_name }).then((r) => r.data);

export const getMe = () =>
    api.get('/api/auth/me').then((r) => r.data);

// ─── Analysis ─────────────────────────────────────────────────────────────────

export const analyze = (formData: FormData) =>
    api.post('/api/analyze', formData).then((r) => r.data);

// ─── History ──────────────────────────────────────────────────────────────────

export const getHistory = (page = 1, limit = 20) =>
    api.get('/api/history', { params: { page, limit } }).then((r) => r.data);

export const getAnalysis = (id: number) =>
    api.get(`/api/history/${id}`).then((r) => r.data);

export const deleteAnalysis = (id: number) =>
    api.delete(`/api/history/${id}`).then((r) => r.data);

export const downloadJSON = async (id: number, businessName: string) => {
    const response = await api.get(`/api/history/${id}/download`, {
        params: { format: 'json' },
        responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${businessName.replace(/\s+/g, '_')}_analysis.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chat = (message: string) =>
    api.post('/api/chat', { message }).then((r) => r.data);
