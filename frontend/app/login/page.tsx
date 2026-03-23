'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { setAuth } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await login(email, password);
            setAuth(data.token, data.user);
            router.push('/');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center px-4 md:px-6 pt-20 md:pt-16 bg-background-light">
            <div className="w-full max-w-md animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 border border-gray-100">
                    <div className="text-center mb-6 md:mb-8">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">Welcome Back</h1>
                        <p className="text-gray-600 text-sm md:text-base">Sign in to continue your business analysis</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Email</label>
                            <input
                                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary text-gray-900 placeholder:text-gray-400"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Password</label>
                            <input
                                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary text-gray-900 placeholder:text-gray-400"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold py-3 md:py-4 rounded-xl shadow-lg transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-primary/30"
                        >
                            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="text-primary font-bold hover:underline">Sign up</Link>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
