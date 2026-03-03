import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Ticket, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import axios from 'axios';

interface Booking {
    id: number;
    event_id: number;
    status: string;
    quantity: number;
    price_paid_inr: number;
    created_at: string;
    event?: {
        name: string;
        date: string;
    };
}

const Profile = () => {
    const [user, setUser] = useState<any>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            fetchBookings(parsedUser.id);
        }
    }, []);

    const fetchBookings = async (userId: number) => {
        try {
            // Get orders for user
            const ordersRes = await axios.get(`${import.meta.env.VITE_API_URL}/orders/user/${userId}`);
            const orders = ordersRes.data;

            // Get events to enrich order data
            const eventsRes = await axios.get(`${import.meta.env.VITE_INVENTORY_URL}/events`);
            const events = eventsRes.data;

            const enrichedBookings = orders.map((order: any) => ({
                ...order,
                event: events.find((e: any) => e.id === order.event_id)
            }));

            setBookings(enrichedBookings.sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ));
        } catch (err) {
            console.error("Failed to fetch bookings", err);
        } finally {
            setLoading(false);
        }
    };

    const isEventPast = (date: string) => {
        return new Date(date).getTime() < new Date().getTime();
    };

    if (!user) return <div className="text-center py-20">Please login to view your profile.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <header className="flex items-center gap-6 p-8 bg-white/5 border border-white/10 rounded-3xl">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                    <User className="w-10 h-10 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-black">{user.name}</h1>
                    <p className="text-muted-foreground">{user.email}</p>
                    <div className="mt-2 inline-block px-3 py-1 bg-white/5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10">
                        {user.is_organizer ? 'Event Organizer' : 'Customer'}
                    </div>
                </div>
            </header>

            <section className="space-y-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Ticket className="w-6 h-6 text-primary" />
                    Your Bookings
                </h2>

                <div className="space-y-4">
                    {loading ? (
                        [1, 2].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl animate-pulse" />)
                    ) : bookings.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
                            <p className="text-muted-foreground">No bookings found yet. Go to the storefront to find events!</p>
                        </div>
                    ) : (
                        bookings.map(booking => {
                            const past = booking.event ? isEventPast(booking.event.date) : false;
                            const confirmed = booking.status === 'CONFIRMED';

                            return (
                                <motion.div
                                    key={booking.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-primary/30 transition-colors"
                                >
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                                            {booking.event?.name || 'Unknown Event'}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {booking.event ? new Date(booking.event.date).toLocaleDateString() : 'N/A'}
                                            </div>
                                            <span>•</span>
                                            <div>{booking.quantity} Ticket(s)</div>
                                            <span>•</span>
                                            <div className="font-bold text-white">₹{booking.price_paid_inr}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {past ? (
                                            <span className="flex items-center gap-1 px-3 py-1 bg-white/5 text-white/40 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest">
                                                <Clock className="w-3 h-3" />
                                                Expired
                                            </span>
                                        ) : confirmed ? (
                                            <span className="flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-bold uppercase tracking-widest">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Confirmed
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 px-3 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-full text-xs font-bold uppercase tracking-widest">
                                                <AlertCircle className="w-3 h-3" />
                                                {booking.status}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
};

export default Profile;
