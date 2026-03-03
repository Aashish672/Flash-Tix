import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

const Signup = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', is_organizer: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post(`${import.meta.env.VITE_AUTH_URL}/register`, formData);
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8 bg-white/5 border border-white/10 p-10 rounded-[40px] backdrop-blur-2xl shadow-2xl relative overflow-hidden"
            >
                {/* Decorative background element */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/10 blur-3xl rounded-full" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/10 blur-3xl rounded-full" />

                <div className="text-center relative">
                    <div className="mx-auto h-16 w-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-600/20">
                        <Zap className="h-10 w-10 text-white fill-white" />
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter text-white">Join FlashTix</h2>
                    <p className="mt-2 text-sm text-slate-400 font-medium">
                        Create your account to start booking or hosting events
                    </p>
                </div>

                <form className="mt-8 space-y-6 relative" onSubmit={handleSubmit}>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-rose-400 text-sm bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20 font-bold flex items-center gap-2"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {error}
                        </motion.div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="text"
                                    required
                                    className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${formData.is_organizer ? 'bg-purple-600/20 border border-purple-500/20' : 'bg-white/5'}`}>
                                    <Zap className={`w-5 h-5 ${formData.is_organizer ? 'text-purple-400' : 'text-slate-600'}`} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">Event Organizer</div>
                                    <div className="text-[10px] text-slate-500 font-medium font-mono">Host & Manage Events</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, is_organizer: !formData.is_organizer })}
                                className={`w-12 h-6 rounded-full relative transition-colors ${formData.is_organizer ? 'bg-purple-600' : 'bg-slate-700'}`}
                            >
                                <motion.div
                                    animate={{ x: formData.is_organizer ? 26 : 2 }}
                                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                />
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all font-black text-lg shadow-lg shadow-purple-600/20 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin h-6 w-6" />
                        ) : (
                            <>
                                Create Account
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center pt-4 relative">
                    <p className="text-sm text-slate-400 font-medium">
                        Already have an account?{' '}
                        <Link to="/login" className="font-black text-purple-400 hover:text-purple-300 transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
