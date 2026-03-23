'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="h-16 flex items-center justify-between">

                    {/* Logo */}
                    <div className="flex-1 flex justify-center md:justify-start">
                        <Link href="/" className="focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg p-1">
                            <Image src="/favicon.ico" alt="BizMind" width={120} height={120} className="h-10 md:h-12 w-auto" />
                        </Link>
                    </div>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{user.full_name}</span>
                                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                                <Link href="/history" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg px-2 py-1">
                                    My History
                                </Link>
                                <button
                                    onClick={logout}
                                    className="bg-gray-100 dark:bg-gray-800 px-5 py-2 rounded-full text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link href="/login" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg px-2 py-1">
                                    Login
                                </Link>
                                <Link href="/register" className="bg-primary text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-primary-hover transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30">
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile toggle */}
                    <button
                        className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        <span className="material-symbols-outlined !text-2xl">{mobileOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className="md:hidden bg-white dark:bg-[#101c22] border-t border-gray-200 dark:border-gray-800 shadow-lg rounded-b-2xl overflow-hidden pb-4 px-4 space-y-3">
                        {user ? (
                            <>
                                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl mt-3">
                                    <div className="bg-primary/20 p-2.5 rounded-full">
                                        <span className="material-symbols-outlined text-primary !text-xl">person</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Signed in as</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{user.full_name}</p>
                                    </div>
                                </div>
                                <Link href="/history" onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 p-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">
                                    <span className="material-symbols-outlined text-gray-500">history</span>
                                    <span className="font-semibold">My History</span>
                                </Link>
                                <button onClick={logout}
                                    className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl">
                                    <span className="material-symbols-outlined">logout</span>
                                    <span className="font-semibold">Logout</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" onClick={() => setMobileOpen(false)}
                                    className="block w-full text-center py-3 px-4 mt-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-white hover:border-primary hover:text-primary transition-all">
                                    Login
                                </Link>
                                <Link href="/register" onClick={() => setMobileOpen(false)}
                                    className="block w-full text-center py-3 px-4 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-all shadow-lg">
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}
