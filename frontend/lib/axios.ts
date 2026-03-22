import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000',
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            // Check if token is expired before sending the request
            // This provides an early client-side check without a server round-trip
            try {
                const [, payload] = token.split('.');
                if (payload) {
                    const decoded = JSON.parse(atob(payload));
                    const expiryMs = decoded.exp * 1000;
                    if (Date.now() >= expiryMs) {
                        // Token already expired locally — clear auth and redirect
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.href = '/login?reason=session_expired';
                        return Promise.reject(new Error('Token expired'));
                    }
                }
            } catch {
                // Malformed token — leave server to reject it
            }
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// On 401 (expired/invalid token from server), clear auth and redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Preserve current path so user can be redirected back after login
            const currentPath = encodeURIComponent(window.location.pathname);
            window.location.href = `/login?reason=session_expired&next=${currentPath}`;
        }
        return Promise.reject(error);
    }
);

export default api;
