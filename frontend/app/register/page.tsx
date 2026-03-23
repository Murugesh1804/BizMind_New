'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
    const router = useRouter();
    const { setAuth } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const data = await register(email, password, fullName);
            setAuth(data.token, data.user);
            router.push('/');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-gray-50 border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary text-gray-900 placeholder:text-gray-400";

    return (
        <main className="min-h-screen flex items-center justify-center px-4 md:px-6 pt-20 md:pt-16 pb-10 bg-background-light">
            <div className="w-full max-w-md animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 border border-gray-100">
                    <div className="text-center mb-6 md:mb-8">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">Create Account</h1>
                        <p className="text-gray-600 text-sm md:text-base">Start making smarter business decisions</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Full Name</label>
                            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                                className={inputClass} placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Email</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                className={inputClass} placeholder="you@example.com" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Password</label>
                            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                className={inputClass} placeholder="••••••••" />
                            <p className="text-xs text-gray-500">Minimum 8 characters</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Confirm Password</label>
                            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                className={inputClass} placeholder="••••••••" />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold py-3 md:py-4 rounded-xl shadow-lg transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-primary/30">
                            <span>{loading ? 'Creating account...' : 'Create Account'}</span>
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link href="/login" className="text-primary font-bold hover:underline">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
