import { useState, useEffect } from 'react';
import { Plus, Users, Calendar, Tag, AlertCircle, CheckCircle2, Ticket, Clock, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Event {
    id: number;
    name: string;
    date: string;
    price_inr: number;
    available_tickets: number;
    total_tickets: number;
}

interface Attendee {
    id: number;
    customer_name: string;
    customer_email: string;
    quantity: number;
    status: string;
    created_at: string;
}

interface UserOrder {
    id: number;
    event_id: number;
    quantity: number;
    price_paid_inr: number;
    status: string;
    created_at: string;
    event_name?: string;
    event_date?: string;
}

const Dashboard = () => {
    const [user, setUser] = useState<any>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [showForm, setShowForm] = useState(false);

    const [newEvent, setNewEvent] = useState({
        name: '',
        date: '',
        price_inr: 0,
        total_tickets: 100
    });

    const [loading, setLoading] = useState(false);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            if (parsedUser.is_organizer) {
                fetchOrganizerEvents(parsedUser.id);
            } else {
                fetchCustomerOrders(parsedUser.id);
            }
        }
    }, []);

    const fetchOrganizerEvents = async (organizerId: number) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_INVENTORY_URL}/organizer/events/${organizerId}`);
            setEvents(res.data);
        } catch (err) {
            console.error('Failed to fetch organizer events', err);
        }
    };

    const fetchCustomerOrders = async (userId: number) => {
        setOrdersLoading(true);
        try {
            const [ordersRes, eventsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/orders/user/${userId}`),
                axios.get(`${import.meta.env.VITE_INVENTORY_URL}/events`)
            ]);
            const orders = ordersRes.data;
            const events = eventsRes.data;
            const enriched = orders.map((order: any) => {
                const event = events.find((e: any) => e.id === order.event_id);
                return { ...order, event_name: event?.name, event_date: event?.date };
            });
            setUserOrders(enriched.sort((a: any, b: any) => b.id - a.id));
        } catch (err) {
            console.error('Failed to fetch customer orders', err);
        } finally {
            setOrdersLoading(false);
        }
    };

    const fetchAttendees = async (eventId: number) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/organizer/attendees/${eventId}`);
            setAttendees(res.data);
            setSelectedEventId(eventId);
        } catch (err) {
            console.error('Failed to fetch attendees', err);
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_INVENTORY_URL}/events`, {
                ...newEvent,
                organizer_id: user.id
            });
            toast.success('Event created successfully!');
            setShowForm(false);
            fetchOrganizerEvents(user.id);
            setNewEvent({ name: '', date: '', price_inr: 0, total_tickets: 100 });
        } catch {
            toast.error('Failed to create event. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // SSE: listen for order confirmations and refresh order list
    useEffect(() => {
        if (!user || user.is_organizer) return;
        const es = new EventSource(`${import.meta.env.VITE_INVENTORY_URL}/events/stream`);
        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'stock_update') {
                    // Re-fetch orders to pick up any status changes
                    fetchCustomerOrders(user.id);
                }
            } catch { }
        };
        return () => es.close();
    }, [user]);

    if (!user) return null;

    const OrganizerView = () => (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-5xl font-black mb-2 tracking-tighter">Organizer Hub</h1>
                    <p className="text-slate-400">Manage your events and track ticket sales in real-time.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-purple-600 px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-purple-500 hover:scale-[1.02] transition-all shadow-lg shadow-purple-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Create New Event
                </button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleCreateEvent}
                        className="bg-white/5 border border-white/10 p-8 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden backdrop-blur-xl"
                    >
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Event Name</label>
                            <input
                                type="text"
                                required
                                placeholder="E.g. Summer Music Festival"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                                value={newEvent.name}
                                onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Event Date</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                                value={newEvent.date}
                                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Tickets</label>
                            <input
                                type="number"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                                value={newEvent.total_tickets}
                                onChange={e => setNewEvent({ ...newEvent, total_tickets: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ticket Price (INR)</label>
                            <input
                                type="number"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                                value={newEvent.price_inr}
                                onChange={e => setNewEvent({ ...newEvent, price_inr: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="md:col-span-2 flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-purple-600 px-8 py-3 rounded-2xl font-bold hover:bg-purple-500 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Launch Event'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="bg-white/5 px-8 py-3 rounded-2xl font-bold hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-purple-400" />
                        Active Events
                    </h2>
                    <div className="space-y-4">
                        {events.length > 0 ? events.map(event => (
                            <motion.div
                                key={event.id}
                                whileHover={{ scale: 1.01 }}
                                onClick={() => fetchAttendees(event.id)}
                                className={`p-6 rounded-[32px] border transition-all cursor-pointer group ${selectedEventId === event.id ? 'bg-purple-600/10 border-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-2xl font-black tracking-tight">{event.name}</h3>
                                    <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-full uppercase tracking-tighter">
                                        EVT-{event.id}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-6 text-sm">
                                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                                        <Calendar className="w-4 h-4 text-purple-400/50" />
                                        {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                                        <Tag className="w-4 h-4 text-purple-400/50" />
                                        ₹{event.price_inr}
                                    </div>
                                    <div className="col-span-2 space-y-2 pt-2">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                            <span className="text-slate-500">Sales Progress</span>
                                            <span className="text-purple-400">{((event.total_tickets - event.available_tickets) / event.total_tickets * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full bg-purple-500"
                                                style={{ width: `${((event.total_tickets - event.available_tickets) / event.total_tickets * 100)}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {event.total_tickets - event.available_tickets} sold of {event.total_tickets} tickets
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="p-12 text-center bg-white/5 border border-white/10 rounded-[32px] border-dashed">
                                <p className="text-slate-500">No events found. Create your first one!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-400" />
                        Attendee List
                    </h2>
                    <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-xl">
                        {selectedEventId ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/5">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Customer</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Qty</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {attendees.length > 0 ? (
                                            attendees.map(attendee => (
                                                <tr key={attendee.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-200">{attendee.customer_name}</div>
                                                        <div className="text-xs text-slate-500">{attendee.customer_email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-400">
                                                        {attendee.quantity}x
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border border-emerald-500/20">
                                                            {attendee.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-20 text-center text-slate-500 italic">
                                                    No confirmed tickets yet for this event.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-20 text-center text-slate-500/50 flex flex-col items-center gap-4">
                                <Users className="w-12 h-12 opacity-20" />
                                <p className="font-medium italic">Select an event to view the guest list.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Analytics Charts */}
            {events.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-purple-400" />
                        Sales Analytics
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Tickets Sold per Event</div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={events.map((e: Event) => ({
                                    name: e.name.length > 12 ? e.name.slice(0, 12) + '…' : e.name,
                                    sold: e.total_tickets - e.available_tickets,
                                    remaining: e.available_tickets,
                                }))} barSize={28}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ background: '#1e1b2e', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, color: '#e2e8f0' }} />
                                    <Bar dataKey="sold" name="Sold" fill="#9333ea" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="remaining" name="Remaining" fill="rgba(139,92,246,0.15)" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Revenue per Event (₹)</div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={events.map((e: Event) => ({
                                    name: e.name.length > 12 ? e.name.slice(0, 12) + '…' : e.name,
                                    revenue: (e.total_tickets - e.available_tickets) * e.price_inr,
                                }))} barSize={28}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`} contentStyle={{ background: '#1e1b2e', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, color: '#e2e8f0' }} />
                                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const CustomerView = () => (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-5xl font-black mb-2 tracking-tighter">My Bookings</h1>
                    <p className="text-slate-400">Track your upcoming and past event tickets.</p>
                </div>
                <button
                    onClick={() => window.location.href = '/events'}
                    className="bg-purple-600 px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-purple-500 hover:scale-[1.02] transition-all shadow-lg shadow-purple-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Book New Ticket
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {ordersLoading ? (
                    // Skeleton loading cards
                    [1, 2, 3].map(i => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-[40px] p-8 animate-pulse space-y-6">
                            <div className="flex justify-between">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl" />
                                <div className="w-16 h-6 bg-white/10 rounded-full" />
                            </div>
                            <div className="h-6 bg-white/10 rounded-xl w-3/4" />
                            <div className="space-y-3">
                                <div className="h-4 bg-white/5 rounded-lg w-full" />
                                <div className="h-4 bg-white/5 rounded-lg w-2/3" />
                                <div className="h-4 bg-white/5 rounded-lg w-1/2" />
                            </div>
                            <div className="h-px bg-white/5" />
                            <div className="flex justify-between">
                                <div className="h-3 bg-white/10 rounded w-24" />
                            </div>
                        </div>
                    ))
                ) : userOrders.length > 0 ? userOrders.map(order => {
                    const isConfirmed = order.status === 'CONFIRMED';
                    const isCancelled = order.status === 'CANCELLED' || order.status === 'PAYMENT_FAILED';
                    const isPending = !isConfirmed && !isCancelled;
                    const eventDateObj = order.event_date ? new Date(order.event_date) : null;
                    const isExpired = eventDateObj ? eventDateObj < new Date() : false;
                    return (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-white/5 border rounded-[40px] p-8 relative group overflow-hidden ${isCancelled ? 'border-rose-500/20' : isConfirmed ? 'border-white/10' : 'border-amber-500/20'
                                }`}
                        >
                            {/* Decorative Glow */}
                            <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full ${isCancelled ? 'bg-rose-600/10' : 'bg-purple-600/10 group-hover:bg-purple-600/20'
                                } transition-colors`} />

                            <div className="flex justify-between items-start mb-8">
                                <div className={`p-3 rounded-2xl border ${isCancelled ? 'bg-rose-600/10 border-rose-500/20' : 'bg-purple-600/20 border-purple-500/20'
                                    }`}>
                                    <Ticket className={`w-6 h-6 ${isCancelled ? 'text-rose-400' : 'text-purple-400'
                                        }`} />
                                </div>
                                <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${isCancelled
                                    ? 'border-rose-500/30 text-rose-400 bg-rose-500/10'
                                    : isPending
                                        ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                                        : isExpired
                                            ? 'border-slate-500/20 text-slate-500 bg-slate-500/5'
                                            : 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5'
                                    }`}>
                                    {isCancelled ? 'Cancelled' : isPending ? 'Pending' : isExpired ? 'Expired' : 'Live ✓'}
                                </div>
                            </div>

                            <h3 className="text-2xl font-black tracking-tighter mb-2 line-clamp-1">
                                {order.event_name || `Event #${order.event_id}`}
                            </h3>

                            <div className="space-y-3 mb-8">
                                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                    <Clock className="w-4 h-4" />
                                    {eventDateObj ? eventDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date Pending'}
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                    <Users className="w-4 h-4" />
                                    {order.quantity} {order.quantity === 1 ? 'Ticket' : 'Tickets'}
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                    <Tag className="w-4 h-4" />
                                    Total ₹{order.price_paid_inr}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order ID: {order.id}</div>
                                {isCancelled && (
                                    <span className="text-rose-500 text-xs font-bold">Payment Failed</span>
                                )}
                            </div>
                        </motion.div>
                    );
                }) : (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-[40px] border-dashed">
                        <div className="bg-slate-800/50 p-6 rounded-full mb-6 relative">
                            <Ticket className="w-12 h-12 text-slate-600" />
                            <div className="absolute top-0 right-0 w-4 h-4 bg-purple-500 rounded-full animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-black mb-2">No Tickets Yet</h3>
                        <p className="text-slate-500 mb-8 max-w-xs text-center">Looks like you haven't booked any tickets yet. Catch the next flash sale!</p>
                        <button
                            onClick={() => window.location.href = '/events'}
                            className="bg-purple-600 px-8 py-3 rounded-2xl font-bold hover:bg-purple-500 transition-all"
                        >
                            Explore Events
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto">
            {message.text && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 mb-8 rounded-2xl border flex items-center justify-between gap-3 backdrop-blur-xl ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                    <div className="flex items-center gap-3">
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shadow-sm" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-bold">{message.text}</span>
                    </div>
                    <button onClick={() => setMessage({ type: '', text: '' })} className="opacity-50 hover:opacity-100 transition-opacity">✕</button>
                </motion.div>
            )}

            {user.is_organizer ? <OrganizerView /> : <CustomerView />}
        </div>
    );
};

export default Dashboard;
