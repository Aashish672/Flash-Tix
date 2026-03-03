import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            params.append('username', formData.username);
            params.append('password', formData.password);

            const res = await axios.post(`${import.meta.env.VITE_AUTH_URL}/login`, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            localStorage.setItem('token', res.data.access_token);

            // Fetch user info
            const userRes = await axios.get(`${import.meta.env.VITE_AUTH_URL}/me`, {
                headers: { Authorization: `Bearer ${res.data.access_token}` }
            });
            localStorage.setItem('user', JSON.stringify(userRes.data));

            // Use navigate instead of full refresh for better UX, but update Navbar state somehow
            // For now, full refresh is safer to ensure all contexts update if not using a reactive store
            window.location.href = '/dashboard';
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
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
                    <h2 className="text-4xl font-black tracking-tighter text-white">Welcome Back</h2>
                    <p className="mt-2 text-sm text-slate-400 font-medium">
                        Enter your credentials to access your FlashTix account
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
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                    placeholder="name@example.com"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
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

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-white/10 rounded bg-white/5"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400 font-medium">
                                Remember me
                            </label>
                        </div>

                        <div className="text-sm">
                            <a href="#" className="font-bold text-purple-400 hover:text-purple-300 transition-colors">
                                Forgot password?
                            </a>
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
                                Sign In
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center pt-4 relative">
                    <p className="text-sm text-slate-400 font-medium">
                        Don't have an account?{' '}
                        <Link to="/signup" className="font-black text-purple-400 hover:text-purple-300 transition-colors">
                            Create Account
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
