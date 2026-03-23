'use client';
import { useState } from 'react';
import { useAnalysisData } from '@/lib/hooks';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';

export default function FeedbackPage() {
    const { data, isLoading } = useAnalysisData();
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setSubmitted(true);
        setLoading(false);
        setFeedback('');
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-10 bg-gray-200 rounded-lg w-1/3"></div>
                <div className="h-96 bg-gray-100 rounded-2xl"></div>
            </div>
        );
    }

    return (
        <DashboardErrorBoundary>
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                        <span className="material-symbols-outlined text-3xl text-purple-500">loop</span>
                        Learning Loop
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        Help us improve BizMind with your feedback and suggestions.
                    </p>
                </div>

                {submitted ? (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                        <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
                        <h3 className="text-xl font-bold text-green-900 mt-4">Thank you for your feedback!</h3>
                        <p className="text-green-700 mt-2">We'll review your suggestions and use them to improve BizMind.</p>
                        <button 
                            onClick={() => setSubmitted(false)}
                            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Submit More Feedback
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Feedback Form */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        What do you like about BizMind?
                                    </label>
                                    <textarea
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                        rows={4}
                                        placeholder="Tell us what features you find most valuable..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        What could be improved?
                                    </label>
                                    <textarea
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                        rows={4}
                                        placeholder="Share your ideas for making BizMind better..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Missing features?
                                    </label>
                                    <textarea
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                        rows={4}
                                        placeholder="What tools or insights would help your business even more?"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">
                                        Overall experience
                                    </label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((rating) => (
                                            <button
                                                key={rating}
                                                type="button"
                                                className="w-12 h-12 rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-primary/10 transition-colors"
                                            >
                                                <span className="text-xl">⭐</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Feedback Options */}
                        <div className="bg-gray-50 rounded-2xl p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Quick Feedback</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    'Analysis accuracy could be better',
                                    'Need more export options',
                                    'Mobile app would be helpful',
                                    'Want more business types',
                                    'Dashboard is confusing',
                                    'Love the AI insights!',
                                ].map((option, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className="text-left px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors text-sm"
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="bg-blue-50 rounded-2xl p-6">
                            <h3 className="font-bold text-blue-900 mb-2">Want to talk directly?</h3>
                            <p className="text-blue-700 text-sm mb-4">
                                Join our community or schedule a call with our team.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                    Schedule Call
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm border border-blue-200"
                                >
                                    Join Community
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-center">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">refresh</span>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">send</span>
                                        Submit Feedback
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* Previous Feedback Summary */}
                <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Recent Improvements Based on Your Feedback</h3>
                    <div className="space-y-3">
                        {[
                            '✅ Added PDF export for reports',
                            '✅ Improved mobile map experience',
                            '✅ Enhanced loading states',
                            '✅ Fixed dashboard navigation',
                        ].map((improvement, i) => (
                            <div key={i} className="text-sm text-gray-600 flex items-center gap-2">
                                <span>{improvement}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardErrorBoundary>
    );
}
