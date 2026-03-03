import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Tag, Users, ArrowRight, Zap, ChevronLeft, Minus, Plus } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Event {
    id: number;
    name: string;
    date: string;
    price_inr: number;
    available_tickets: number;
    total_tickets: number;
    organizer_id: number;
}

const EventDetail = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_INVENTORY_URL}/events`);
                const found = res.data.find((e: Event) => e.id === Number(eventId));
                if (!found) {
                    toast.error('Event not found');
                    navigate('/events');
                    return;
                }
                setEvent(found);
            } catch {
                toast.error('Failed to load event details');
                navigate('/events');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [eventId, navigate]);

    const handleBook = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please login to book a ticket');
            navigate('/login');
            return;
        }
        navigate(`/checkout/${eventId}?qty=${quantity}`);
    };

    const soldPercent = event
        ? ((event.total_tickets - event.available_tickets) / event.total_tickets) * 100
        : 0;
    const isSoldOut = event?.available_tickets === 0;

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-12 animate-pulse space-y-8">
                <div className="h-10 bg-white/5 rounded-2xl w-64" />
                <div className="h-80 bg-white/5 rounded-[40px]" />
            </div>
        );
    }

    if (!event) return null;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back */}
            <button
                onClick={() => navigate('/events')}
                className="flex items-center gap-2 text-slate-500 hover:text-white font-bold transition-colors mb-10 group"
            >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Back to Events
            </button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-5 gap-8"
            >
                {/* Main Info */}
                <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-[40px] p-10 space-y-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                {new Date(event.date).getFullYear()} Edition
                            </div>
                            <h1 className="text-5xl font-black tracking-tighter text-white">{event.name}</h1>
                        </div>
                        <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-600/30">
                            <Zap className="w-6 h-6 text-white fill-white" />
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="flex items-center gap-4 text-slate-300">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Date & Time</div>
                                <div className="font-bold">{new Date(event.date).toLocaleString('en-IN', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-slate-300">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Tag className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ticket Price</div>
                                <div className="text-2xl font-black text-white">₹{event.price_inr.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-slate-300">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Availability</div>
                                <div className="font-bold">{event.available_tickets} of {event.total_tickets} tickets left</div>
                            </div>
                        </div>
                    </div>

                    {/* Stock bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                            <span className="text-slate-500">Inventory Status</span>
                            <span className={event.available_tickets < 10 ? 'text-amber-400' : 'text-emerald-400'}>
                                {soldPercent.toFixed(0)}% Sold
                            </span>
                        </div>
                        <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${soldPercent}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className={`h-full ${soldPercent > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Booking Panel */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-8">
                        <div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Select Quantity</div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Minus className="w-5 h-5" />
                                </button>
                                <span className="text-3xl font-black text-white w-8 text-center">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(q => Math.min(event.available_tickets, q + 1))}
                                    disabled={quantity >= event.available_tickets || quantity >= 10}
                                    className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center hover:bg-purple-600/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-5 h-5 text-purple-400" />
                                </button>
                            </div>
                            <div className="text-xs text-slate-500 mt-3">Max 10 tickets per booking</div>
                        </div>

                        <div className="border-t border-white/10 pt-6 space-y-3">
                            <div className="flex justify-between text-sm font-bold text-slate-400">
                                <span>{quantity} × ₹{event.price_inr.toLocaleString()}</span>
                                <span>₹{(quantity * event.price_inr).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-black text-white">
                                <span>Total</span>
                                <span className="text-xl text-purple-400">₹{(quantity * event.price_inr).toLocaleString()}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleBook}
                            disabled={isSoldOut}
                            className={`w-full py-5 rounded-3xl font-black text-lg flex items-center justify-center gap-3 transition-all ${isSoldOut
                                    ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-xl shadow-purple-600/20 active:scale-95'
                                }`}
                        >
                            {isSoldOut ? 'SOLD OUT' : (
                                <>Book {quantity} {quantity === 1 ? 'Ticket' : 'Tickets'} <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </div>

                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 text-xs text-slate-500 space-y-1">
                        <p className="font-bold text-slate-400">🔒 Secure Checkout</p>
                        <p>Tickets are reserved for 5 minutes after booking initiation.</p>
                        <p>Payment confirmation sent via email instantly.</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EventDetail;
