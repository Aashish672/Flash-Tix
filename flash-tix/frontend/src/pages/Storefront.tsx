import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, Calendar, Tag, Zap, Clock, Users, ArrowRight, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface Event {
    id: number;
    name: string;
    date: string;
    price_inr: number;
    available_tickets: number;
    total_tickets: number;
}

const Storefront = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [recentUpdate, setRecentUpdate] = useState<number | null>(null);
    const navigate = useNavigate();

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_INVENTORY_URL}/events`);
            setEvents(res.data);
        } catch (err) {
            console.error('Failed to fetch events', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();

        // Real-time Stock Updates via SSE
        const eventSource = new EventSource(`${import.meta.env.VITE_INVENTORY_URL}/events/stream`);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'stock_update' || data.type === 'event_created') {
                setRecentUpdate(data.event_id);
                setEvents(prev => prev.map(e =>
                    e.id === data.event_id ? { ...e, available_tickets: data.stock } : e
                ));
                // Clear highlight after 2 seconds
                setTimeout(() => setRecentUpdate(null), 2000);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE Error:", err);
            eventSource.close();
            // Fallback: poll every 10 seconds if SSE fails
            const interval = setInterval(fetchEvents, 10000);
            return () => clearInterval(interval);
        };

        return () => eventSource.close();
    }, []);

    const SkeletonCard = () => (
        <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-8 animate-pulse">
            <div className="h-8 bg-white/10 rounded-2xl w-3/4" />
            <div className="space-y-4">
                <div className="h-4 bg-white/5 rounded-full w-1/2" />
                <div className="h-4 bg-white/5 rounded-full w-1/3" />
                <div className="h-12 bg-white/10 rounded-full w-full" />
            </div>
            <div className="h-14 bg-white/10 rounded-2xl w-full" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto py-12 px-2">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 bg-purple-600/10 border border-purple-500/20 px-4 py-2 rounded-full">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                        <span className="text-purple-400 text-[10px] font-black uppercase tracking-widest">Global Live Feed</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
                        LIVE <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">STOREFRONT</span>
                    </h1>
                    <p className="text-slate-400 text-xl max-w-lg leading-relaxed">
                        Tickets are currently moving. Grab yours before the stock hits zero.
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl hidden lg:block backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-purple-600/20 p-3 rounded-2xl">
                                <TrendingUp className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white">42+</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Sales</div>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={fetchEvents}
                        disabled={loading}
                        className="h-full bg-white/5 border border-white/10 hover:bg-white/10 p-6 rounded-3xl transition-all group"
                    >
                        <RefreshCcw className={`w-8 h-8 text-slate-400 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                </div>
            </div>

            {/* Grid Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {loading && events.length === 0 ? (
                    [1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)
                ) : (
                    <AnimatePresence>
                        {events.map((event) => (
                            <motion.div
                                key={event.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    borderColor: recentUpdate === event.id ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                                    backgroundColor: recentUpdate === event.id ? 'rgba(168, 85, 247, 0.05)' : 'rgba(255, 255, 255, 0.05)'
                                }}
                                transition={{ duration: 0.3 }}
                                className={`group relative rounded-[48px] border p-10 backdrop-blur-3xl transition-all flex flex-col h-full overflow-hidden ${recentUpdate === event.id ? 'shadow-[0_0_40px_rgba(168,85,247,0.15)]' : 'hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:bg-white/[0.07]'
                                    }`}
                            >
                                {/* Stock Highlight Effect */}
                                {recentUpdate === event.id && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent -z-10"
                                    />
                                )}

                                <div className="flex-grow">
                                    <div className="flex justify-between items-start mb-10">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{new Date(event.date).getFullYear()} Edition</div>
                                            <h2 className="text-3xl font-black text-white tracking-tighter group-hover:text-purple-400 transition-colors">
                                                {event.name}
                                            </h2>
                                        </div>
                                        <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-600/20 group-hover:scale-110 transition-transform">
                                            <Zap className="w-5 h-5 text-white fill-white" />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 text-slate-300">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-purple-600/10 group-hover:border-purple-500/20 transition-all">
                                                <Calendar className="w-5 h-5 text-slate-400 group-hover:text-purple-400" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Date & Time</div>
                                                <div className="text-sm font-bold">{new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-slate-300">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-emerald-600/10 group-hover:border-emerald-500/20 transition-all">
                                                <Tag className="w-5 h-5 text-slate-400 group-hover:text-emerald-400" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Ticket Price</div>
                                                <div className="text-xl font-black text-white">₹{event.price_inr.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        <div className="pt-6 space-y-3">
                                            <div className="flex justify-between items-end">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inventory Status</div>
                                                <div className={`text-sm font-black ${event.available_tickets < 10 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                                                    {event.available_tickets} LEFT
                                                </div>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(event.available_tickets / event.total_tickets) * 100}%` }}
                                                    className={`h-full transition-all duration-1000 ${event.available_tickets < 10 ? 'bg-amber-400' : 'bg-emerald-500'
                                                        }`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    disabled={event.available_tickets === 0}
                                    onClick={() => navigate(`/checkout/${event.id}`)}
                                    className={`w-full py-5 rounded-3xl font-black transition-all mt-10 text-center flex items-center justify-center gap-3 text-lg ${event.available_tickets === 0
                                            ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-xl shadow-purple-600/20 active:scale-95'
                                        }`}
                                >
                                    {event.available_tickets === 0 ? (
                                        'SOLD OUT'
                                    ) : (
                                        <>
                                            BOOK NOW
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>

                                {/* Background Watermark Logo */}
                                <div className="absolute -bottom-10 -right-10 opacity-[0.03] rotate-12 -z-10 group-hover:scale-110 transition-transform">
                                    <Zap className="w-40 h-40 text-white" />
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Empty State */}
            {!loading && events.length === 0 && (
                <div className="py-40 text-center">
                    <div className="bg-white/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10">
                        <Calendar className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-2">No Live Events</h3>
                    <p className="text-slate-500">Check back later for upcoming flash sales.</p>
                </div>
            )}
        </div>
    );
};

export default Storefront;
