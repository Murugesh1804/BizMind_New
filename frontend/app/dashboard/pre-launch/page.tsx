'use client';
import { useState, useEffect } from 'react';
import { useAnalysisData } from '@/lib/hooks';
import { setLaunchDate } from '@/lib/api';

export default function PreLaunchSetupPage() {
    const { data, isLoading } = useAnalysisData();
    const [launchDate, setLocalLaunchDate] = useState<string>('');
    const [savingDate, setSavingDate] = useState(false);
    const [dateSaved, setDateSaved] = useState(false);
    
    // Parse action items
    const [actionItems, setActionItems] = useState<{ text: string, completed: boolean }[]>([]);

    useEffect(() => {
        if (data) {
            // Check if DB already has a target launch date
            if (data.target_launch_date) {
                setLocalLaunchDate(data.target_launch_date);
            }
            
            // Reconstruct action items list
            const rawItems = data.action_items_json ? JSON.parse(data.action_items_json) : '';
            if (rawItems) {
                // Split by bullets/newlines
                const lines = rawItems.split('\n').filter((l: string) => l.trim().length > 0);
                const items = lines.map((line: string) => ({
                    text: line.replace(/^[\*\-•]\s*/, '').trim(),
                    completed: false // Default to false
                }));
                setActionItems(items);
            } else {
                // Fallback action items
                setActionItems([
                    { text: 'Finalize Business Strategy', completed: false },
                    { text: 'Secure Initial Funding/Budget', completed: false },
                    { text: 'Finalize Location Lease', completed: false },
                    { text: 'Apply for necessary permits and licenses', completed: false },
                    { text: 'Begin marketing campaigns (30 days out)', completed: false },
                ]);
            }
        }
    }, [data]);

    const handleSaveDate = async () => {
        if (!data || !launchDate) return;
        setSavingDate(true);
        try {
            await setLaunchDate(data.id, launchDate);
            // Update session storage so it persists
            const updatedData = { ...data, target_launch_date: launchDate };
            sessionStorage.setItem('analysisResult', JSON.stringify(updatedData));
            setDateSaved(true);
            setTimeout(() => setDateSaved(false), 3000);
        } catch (error) {
            console.error("Failed to save launch date", error);
        } finally {
            setSavingDate(false);
        }
    };

    const toggleItem = (index: number) => {
        const newItems = [...actionItems];
        newItems[index].completed = !newItems[index].completed;
        setActionItems(newItems);
        // We aren't persisting completion state to backend yet, but it works for UI interaction
    };

    const completedCount = actionItems.filter(i => i.completed).length;
    const progressPct = actionItems.length > 0 ? Math.round((completedCount / actionItems.length) * 100) : 0;

    if (isLoading || !data) {
        return <div className="animate-pulse h-96 bg-gray-100 rounded-2xl w-full"></div>;
    }

    return (
        <div className="space-y-8 animate-fade-in font-sans">
            <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900 border-b border-gray-200 pb-4">
                    Pre-Launch Setup
                </h1>
                <p className="text-gray-500 mt-2 text-sm max-w-2xl">
                    Follow the AI-generated strategy to prepare for a successful launch. Set your target date to stay on track.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Date & Status */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 text-blue-600 mb-4">
                            <span className="material-symbols-outlined text-xl">event</span>
                            <h2 className="font-bold">Target Launch Date</h2>
                        </div>
                        <div className="space-y-4">
                            <input 
                                type="date" 
                                value={launchDate}
                                onChange={(e) => setLocalLaunchDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button 
                                onClick={handleSaveDate}
                                disabled={savingDate || !launchDate}
                                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                                    ${dateSaved ? 'bg-emerald-500 text-white' : 'bg-gray-900 hover:bg-black text-white disabled:opacity-50'}
                                `}
                            >
                                {savingDate ? (
                                    <span className="material-symbols-outlined animate-spin">refresh</span>
                                ) : dateSaved ? (
                                    <>
                                        <span className="material-symbols-outlined">check</span> Saved!
                                    </>
                                ) : (
                                    'Set Target Date'
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
                        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                        <h2 className="font-bold mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-300">track_changes</span>
                            Setup Tracker
                        </h2>
                        
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-3xl font-black">{progressPct}%</span>
                            <span className="text-blue-200 text-sm font-medium">{completedCount} of {actionItems.length} complete</span>
                        </div>
                        
                        <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-white/20">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-1000 ease-out"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Checklist */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500">checklist</span>
                                Pre-Launch Action Items
                            </h2>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                            <div className="space-y-3">
                                {actionItems.map((item, idx) => (
                                    <label 
                                        key={idx} 
                                        className={`group relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer
                                            ${item.completed 
                                                ? 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-100' 
                                                : 'bg-white border-blue-100 hover:border-blue-300 shadow-sm hover:shadow group-hover:bg-blue-50/20'
                                            }
                                        `}
                                    >
                                        <div className="pt-1 flex-shrink-0 relative">
                                            <input 
                                                type="checkbox" 
                                                className="peer sr-only"
                                                checked={item.completed}
                                                onChange={() => toggleItem(idx)}
                                            />
                                            <div className="w-6 h-6 rounded border-2 flex items-center justify-center transition-colors
                                                peer-checked:bg-emerald-500 peer-checked:border-emerald-500
                                                border-gray-300 group-hover:border-blue-400
                                            ">
                                                <span className={`material-symbols-outlined text-white text-[16px] transition-transform
                                                    ${item.completed ? 'scale-100' : 'scale-0'}
                                                `}>check</span>
                                            </div>
                                        </div>
                                        <div className={`flex-1 transition-all ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                            <p className="font-medium text-[15px] leading-relaxed select-none" dangerouslySetInnerHTML={{ __html: item.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                        </div>
                                    </label>
                                ))}
                                {actionItems.length === 0 && (
                                    <div className="text-center py-12 text-gray-400">
                                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">rule</span>
                                        <p>No action items found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
