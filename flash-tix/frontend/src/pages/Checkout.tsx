import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, ShieldCheck, User, Loader2, CheckCircle2, AlertTriangle, Timer, ArrowLeft, Zap, ShoppingBag, Shield } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

interface Event {
    id: number;
    name: string;
    price_inr: number;
}

const Checkout = () => {
    const { eventId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [timeLeft, setTimeLeft] = useState<number>(300);
    const [timeLeftStr, setTimeLeftStr] = useState('05:00');
    const [orderId, setOrderId] = useState<number | null>(null);
    const idempotencyKeyRef = useRef(`pay-${eventId}-${Math.random().toString(36).substr(2, 9)}`);

    const quantity = Math.max(1, parseInt(searchParams.get('qty') || '1', 10));

    const [customerInfo, setCustomerInfo] = useState({ name: '', email: '' });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setCustomerInfo({ name: parsedUser.name, email: parsedUser.email });
        }

        const fetchEventDetails = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_INVENTORY_URL}/events`);
                const targetEvent = res.data.find((e: any) => e.id === parseInt(eventId || ''));
                if (targetEvent) {
                    setEvent(targetEvent);
                } else {
                    toast.error('Event not found');
                    navigate('/events');
                }
            } catch {
                toast.error('Failed to load event details');
                navigate('/events');
            } finally {
                setLoading(false);
            }
        };

        fetchEventDetails();

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [eventId, navigate]);

    useEffect(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        setTimeLeftStr(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        if (timeLeft === 0 && bookingStatus !== 'success') {
            toast.error('Reservation expired! Your ticket has been released.');
            setTimeout(() => navigate('/events'), 3000);
        }
    }, [timeLeft, bookingStatus, navigate]);

    const totalPrice = (event?.price_inr || 0) * quantity;

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (timeLeft <= 0) return;
        setBookingStatus('processing');
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/orders`, {
                event_id: parseInt(eventId || ''),
                user_id: user?.id || 0,
                customer_name: customerInfo.name,
                customer_email: customerInfo.email,
                quantity,
                price_paid_inr: totalPrice,
                idempotency_key: idempotencyKeyRef.current,
            });
            if (res.status === 200) {
                setOrderId(res.data.order_id);
                setBookingStatus('success');
                toast.success('Booking confirmed! 🎉');
            }
        } catch (err: any) {
            setBookingStatus('error');
            const msg = err.response?.data?.detail || 'Booking failed. The event might be sold out.';
            setErrorMsg(msg);
            toast.error(msg);
        }
    };

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Securing your spot...</p>
        </div>
    );

    if (bookingStatus === 'success') {
        const qrData = JSON.stringify({ orderId, event: event?.name, qty: quantity, email: customerInfo.email });
        return (
            <div className="max-w-3xl mx-auto py-12 px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/5 border border-white/10 rounded-[60px] p-12 text-center backdrop-blur-3xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />

                    <div className="w-20 h-20 bg-emerald-500/20 rounded-[28px] flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>

                    <h1 className="text-4xl font-black mb-4 tracking-tighter text-white">RESERVATION CONFIRMED!</h1>
                    <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed mb-10">
                        Your {quantity} {quantity === 1 ? 'ticket' : 'tickets'} for{' '}
                        <span className="text-white font-black underline decoration-purple-500 underline-offset-4">{event?.name}</span>{' '}
                        {quantity === 1 ? 'is' : 'are'} ready. Confirmation sent to{' '}
                        <span className="text-slate-200 font-bold">{customerInfo.email}</span>.
                    </p>

                    {/* QR Code Ticket */}
                    <div className="inline-flex flex-col items-center bg-white rounded-3xl p-6 mb-10 shadow-2xl shadow-purple-600/20">
                        <QRCodeSVG value={qrData} size={160} level="H" includeMargin={false} />
                        <div className="mt-3 text-center">
                            <div className="text-black font-black text-sm">FlashTix Digital Ticket</div>
                            <div className="text-gray-500 text-xs font-bold">Order #{orderId || '—'}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-10">
                        <div className="bg-white/5 p-4 rounded-[24px] border border-white/5">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tickets</div>
                            <div className="text-lg font-black text-white">{quantity}×</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-[24px] border border-white/5">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Paid</div>
                            <div className="text-lg font-black text-emerald-400">₹{totalPrice.toLocaleString()}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-[24px] border border-white/5">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</div>
                            <div className="text-lg font-black text-emerald-400">ACTIVE</div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-purple-600 px-10 py-5 rounded-[24px] font-black text-lg hover:bg-purple-500 transition-all shadow-xl shadow-purple-600/20"
                        >
                            View in Dashboard
                        </button>
                        <button
                            onClick={() => navigate('/events')}
                            className="bg-white/5 px-10 py-5 rounded-[24px] font-black text-lg border border-white/10 hover:bg-white/10 transition-all"
                        >
                            Back to Storefront
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <button
                onClick={() => navigate(`/events/${eventId}`)}
                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group mb-12 font-bold uppercase tracking-widest text-[10px]"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Event
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <div className="lg:col-span-12">
                    <AnimatePresence>
                        {timeLeft > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mb-12 p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 border backdrop-blur-3xl ${timeLeft < 60
                                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                        : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                    }`}
                            >
                                <div className="flex items-center gap-4 text-xl font-black tracking-tighter">
                                    <div className={`p-3 rounded-2xl ${timeLeft < 60 ? 'bg-rose-500/20' : 'bg-purple-500/20'}`}>
                                        <Timer className={`w-6 h-6 ${timeLeft < 60 ? 'animate-pulse' : ''}`} />
                                    </div>
                                    <span>TICKET RESERVED FOR: <span className="font-mono">{timeLeftStr}</span></span>
                                </div>
                                <p className="text-sm font-bold opacity-80 max-w-md text-center md:text-right">
                                    Your {quantity} {quantity === 1 ? 'ticket is' : 'tickets are'} locked. Complete payment now.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="lg:col-span-7 space-y-12 pb-20">
                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-purple-600/20 p-3 rounded-2xl border border-purple-500/20">
                                <User className="w-6 h-6 text-purple-400" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tighter">CUSTOMER INFO</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Full Name</label>
                                <input
                                    type="text"
                                    readOnly
                                    className="w-full bg-white/5 border border-white/10 rounded-[20px] px-6 py-4 outline-none font-bold text-slate-300 cursor-not-allowed opacity-60"
                                    value={customerInfo.name}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Email Address</label>
                                <input
                                    type="email"
                                    readOnly
                                    className="w-full bg-white/5 border border-white/10 rounded-[20px] px-6 py-4 outline-none font-bold text-slate-300 cursor-not-allowed opacity-60"
                                    value={customerInfo.email}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600/20 p-3 rounded-2xl border border-blue-500/20">
                                <CreditCard className="w-6 h-6 text-blue-400" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tighter">SECURE PAYMENT</h2>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-8 backdrop-blur-xl relative overflow-hidden">
                            <div className="flex items-center gap-4 p-5 bg-blue-500/10 rounded-[24px] border border-blue-500/20 text-blue-400">
                                <Shield className="w-5 h-5 flex-shrink-0" />
                                <span className="text-xs font-black uppercase tracking-widest">End-to-End Encrypted Mock Payment Gateway</span>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Card Number</label>
                                    <div className="w-full bg-black/40 border border-white/5 rounded-[20px] px-6 py-4 font-mono text-slate-400/50 flex justify-between items-center text-lg">
                                        <span>4242 4242 4242 4242</span>
                                        <CreditCard className="w-6 h-6 opacity-20" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Expiry</label>
                                        <div className="w-full bg-black/40 border border-white/5 rounded-[20px] px-6 py-4 font-mono text-slate-400/50 text-lg text-center">12/26</div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">CVC</label>
                                        <div className="w-full bg-black/40 border border-white/5 rounded-[20px] px-6 py-4 font-mono text-slate-400/50 text-lg text-center">***</div>
                                    </div>
                                </div>
                            </div>
                            <ShieldCheck className="absolute -bottom-10 -right-10 w-40 h-40 text-white opacity-[0.02]" />
                        </div>
                    </section>

                    {bookingStatus === 'error' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[32px] flex items-center gap-4 text-rose-400 font-bold"
                        >
                            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                            {errorMsg}
                        </motion.div>
                    )}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-5">
                    <div className="bg-white/5 border border-white/10 rounded-[48px] p-10 sticky top-28 shadow-2xl backdrop-blur-3xl overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-3xl rounded-full" />

                        <div className="flex items-center gap-3 mb-10">
                            <ShoppingBag className="w-6 h-6 text-purple-400" />
                            <h3 className="text-2xl font-black tracking-tighter">ORDER SUMMARY</h3>
                        </div>

                        <div className="space-y-6 mb-10">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <div className="text-xl font-black text-white leading-tight mb-1">{event?.name}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{quantity} × Entry Ticket</div>
                                </div>
                                <span className="text-xl font-black text-white">₹{(event?.price_inr || 0).toLocaleString()}</span>
                            </div>

                            <div className="h-px bg-white/10" />

                            <div className="flex justify-between items-center py-1">
                                <span className="text-sm font-bold text-slate-400">Quantity</span>
                                <span className="text-sm font-black text-white">{quantity}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-sm font-bold text-slate-400">Transaction Fee</span>
                                <span className="text-sm font-bold text-slate-400">₹0.00</span>
                            </div>

                            <div className="bg-purple-500/10 p-6 rounded-[32px] border border-purple-500/10">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Amount</span>
                                    <div className="text-right">
                                        <div className="text-4xl font-black text-white tracking-tighter">₹{totalPrice.toLocaleString()}</div>
                                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] mt-1 italic">All Inclusive</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handlePayment}
                            disabled={bookingStatus === 'processing' || timeLeft <= 0}
                            className="w-full bg-purple-600 py-6 rounded-[28px] font-black text-xl hover:bg-purple-500 active:scale-95 transition-all flex items-center justify-center gap-4 text-white shadow-2xl shadow-purple-600/30 disabled:opacity-50 disabled:grayscale relative group"
                        >
                            {bookingStatus === 'processing' ? (
                                <><Loader2 className="w-6 h-6 animate-spin" />SECURE PROCESSING...</>
                            ) : (
                                <>CONFIRM BOOKING <Zap className="w-6 h-6 fill-white group-hover:scale-125 transition-transform" /></>
                            )}
                        </button>

                        <div className="mt-8 flex items-center justify-center gap-4 opacity-30">
                            <div className="text-[8px] font-black uppercase tracking-[0.3em]">PCI DSS COMPLIANT</div>
                            <div className="h-1 w-1 rounded-full bg-slate-500" />
                            <div className="text-[8px] font-black uppercase tracking-[0.3em]">AES-256 BIT</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
