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

export const preview = (data: any) =>
    api.post('/api/preview', data).then((r) => r.data);

export const getAnalysisProgress = (taskId?: string) =>
    api.get('/api/analyze/progress', { params: { task_id: taskId } }).then((r) => r.data);

// ─── Launch Date ──────────────────────────────────────────────────────────────

export const setLaunchDate = (analysisId: number, targetLaunchDate: string) =>
    api.post(`/api/analyze/${analysisId}/launch-date`, { target_launch_date: targetLaunchDate }).then((r) => r.data);

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

// ─── Business Health ──────────────────────────────────────────────────────────

export const submitBusinessMetric = (data: {
    analysis_id: number;
    date: string;
    daily_revenue: number;
    daily_expenses: number;
    customer_count: number;
    notes?: string;
}) => api.post('/api/business/metrics', data).then((r) => r.data);

export const getBusinessMetrics = (analysisId: number, days = 30) =>
    api.get(`/api/business/metrics/${analysisId}`, { params: { days } }).then((r) => r.data);

// ─── A/B Compare ──────────────────────────────────────────────────────────────

export const compareLocations = (analysisIdA: number, analysisIdB: number) =>
    api.post('/api/compare/locations', { analysis_id_a: analysisIdA, analysis_id_b: analysisIdB }).then((r) => r.data);

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chat = (message: string) =>
    api.post('/api/chat', { message }).then((r) => r.data);

export const copilotChat = (analysisId: number, message: string) =>
    api.post('/api/chat/copilot', { analysis_id: analysisId, message }).then((r) => r.data);
