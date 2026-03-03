import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Ticket, LayoutDashboard, LogIn, UserPlus, LogOut, User, Menu, Zap, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        setIsLoggedIn(!!token);
        if (userData) setUser(JSON.parse(userData));

        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setUser(null);
        navigate('/');
    };

    const navLinks = [
        { name: 'Events', path: '/events', icon: <Calendar className="w-4 h-4" /> },
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    ];

    return (
        <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0B0F19]/80 backdrop-blur-2xl py-4 border-b border-white/10' : 'bg-transparent py-6'
            }`}>
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="bg-purple-600 p-2 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-purple-600/20">
                            <Zap className="w-6 h-6 text-white fill-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-white">
                            FlashTix
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`flex items-center gap-2 font-bold transition-colors ${location.pathname === link.path ? 'text-purple-400' : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {link.icon}
                                {link.name}
                            </Link>
                        ))}

                        <div className="h-4 w-px bg-white/10 mx-2" />

                        {isLoggedIn ? (
                            <div className="flex items-center gap-6">
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-3 group"
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-purple-500/50 transition-colors bg-gradient-to-br from-white/10 to-transparent">
                                        <User className="w-5 h-5 text-slate-400 group-hover:text-purple-400" />
                                    </div>
                                    <div className="hidden lg:block text-left">
                                        <div className="text-sm font-black text-white leading-none mb-1">{user?.name || 'User'}</div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user?.is_organizer ? 'Organizer' : 'Customer'}</div>
                                    </div>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link
                                    to="/login"
                                    className="text-slate-400 hover:text-white font-bold transition-colors"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-2xl font-black transition-all hover:scale-[1.05] shadow-lg shadow-purple-600/20"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-t border-white/10 bg-[#0B0F19]/90 backdrop-blur-2xl overflow-hidden"
                    >
                        <div className="p-6 space-y-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-4 text-xl font-black tracking-tight ${location.pathname === link.path ? 'text-purple-400' : 'text-slate-400'
                                        }`}
                                >
                                    {link.icon}
                                    {link.name}
                                </Link>
                            ))}
                            <div className="border-t border-white/5 pt-6 space-y-4">
                                {isLoggedIn ? (
                                    <>
                                        <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="text-slate-400 font-bold block">Profile</Link>
                                        <button onClick={handleLogout} className="text-rose-400 font-bold block">Logout</button>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-slate-400 font-bold block">Login</Link>
                                        <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="text-purple-400 font-black block">Sign Up</Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
