import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, Zap as Flash, Activity, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react';
import { useRef } from 'react';

const Landing = () => {
    const navigate = useNavigate();
    const targetRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ["start end", "end start"]
    });

    const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
    const scale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1]);

    const fadeIn = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    };

    const staggerContainer = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const features = [
        {
            icon: <Flash className="w-8 h-8 text-purple-400" />,
            title: "Flash Sales Engine",
            description: "Proprietary queueing system handles millions of concurrent users without breaking a sweat.",
            color: "from-purple-500/20 to-purple-500/0",
            border: "group-hover:border-purple-500/30"
        },
        {
            icon: <Shield className="w-8 h-8 text-blue-400" />,
            title: "Bank-Grade Security",
            description: "AES-256 encryption and advanced bot-protection keeps your inventory safe from scalpers.",
            color: "from-blue-500/20 to-blue-500/0",
            border: "group-hover:border-blue-500/30"
        },
        {
            icon: <Activity className="w-8 h-8 text-emerald-400" />,
            title: "Real-time Analytics",
            description: "Watch your sales metrics update millisecond by millisecond. Total visibility, zero delay.",
            color: "from-emerald-500/20 to-emerald-500/0",
            border: "group-hover:border-emerald-500/30"
        }
    ];

    return (
        <div className="min-h-screen bg-[#030712] text-slate-200 overflow-hidden font-sans selection:bg-purple-500/30">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full mix-blend-screen" />

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 glass-dark border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="relative flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] group-hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all duration-300">
                            <Zap className="w-6 h-6 text-white fill-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-white">FlashTix</span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <button
                            onClick={() => navigate('/login')}
                            className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 transition-colors"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="relative group px-6 py-2.5 rounded-xl font-semibold bg-white text-black overflow-hidden transition-all hover:scale-105"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Start Free <ArrowRight className="w-4 h-4" />
                            </span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative pt-40 pb-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col items-center text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-purple-500/20 mb-8"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                            </span>
                            <span className="text-purple-300 text-xs font-semibold tracking-wide uppercase">FlashTix v2.0 is now live</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                            className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.05] text-white max-w-5xl"
                        >
                            Ticketing infrastructure that <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400">
                                never goes down.
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="text-xl md:text-2xl text-slate-400 mt-8 max-w-3xl leading-relaxed"
                        >
                            The enterprise-grade platform for high-demand event ticketing. Built to handle massive traffic spikes with zero lag and perfect fairness.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-5 mt-12"
                        >
                            <button
                                onClick={() => navigate('/signup')}
                                className="px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:scale-105 flex items-center justify-center gap-2"
                            >
                                Deploy Your Event
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => navigate('/events')}
                                className="px-8 py-4 rounded-2xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 text-white"
                            >
                                Explore Live Events
                            </button>
                        </motion.div>
                    </div>

                    {/* Dashboard Preview Mockup */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.5, type: "spring" }}
                        className="mt-28 relative max-w-5xl mx-auto"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent z-10 bottom-0 h-1/3 mt-auto pointer-events-none" />

                        <div className="glass rounded-t-3xl border-b-0 p-2 sm:p-4 backdrop-blur-2xl shadow-2xl overflow-hidden relative">
                            {/* Browser Header */}
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                </div>
                                <div className="ml-4 px-3 py-1 rounded-md bg-white/5 text-xs text-slate-400 font-medium font-mono border border-white/5 flex-1 max-w-sm flex items-center gap-2">
                                    <Shield className="w-3 h-3 text-emerald-400" /> flashtix.io/dashboard
                                </div>
                            </div>

                            {/* App Interface */}
                            <div className="bg-[#0B0F19] rounded-2xl border border-white/5 overflow-hidden">
                                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                    <div className="font-semibold text-white">Live Event Dashboard</div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#0B0F19] ${i === 1 ? 'bg-purple-500' : i === 2 ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                            ))}
                                        </div>
                                        <div className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-md">8,492 online</div>
                                    </div>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="col-span-1 space-y-6">
                                        <div className="glass-dark border border-purple-500/20 rounded-2xl p-5 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="text-purple-400 text-xs font-bold mb-1 flex items-center gap-2">
                                                <Activity className="w-3 h-3" /> ACTIVE QUEUE
                                            </div>
                                            <div className="text-4xl font-black text-white">42,891</div>
                                            <div className="text-xs text-slate-400 mt-2">+12% from last minute</div>
                                        </div>
                                        <div className="glass-dark border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="text-emerald-400 text-xs font-bold mb-1 flex items-center gap-2">
                                                <CheckCircle2 className="w-3 h-3" /> TICKETS SOLD
                                            </div>
                                            <div className="text-4xl font-black text-white">15,024</div>
                                            <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                                                <div className="bg-emerald-400 h-full w-[65%]" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 glass-dark border border-white/5 rounded-2xl p-5 flex flex-col">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="text-xs font-bold text-slate-400">TRAFFIC OVER TIME</div>
                                            <div className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded font-medium">Auto-refreshing</div>
                                        </div>
                                        {/* Abstract Chart */}
                                        <div className="flex-1 flex items-end gap-2 mt-auto pt-10">
                                            {[40, 30, 45, 60, 50, 80, 70, 90, 85, 100, 95, 110].map((h, i) => (
                                                <div key={i} className="flex-1 bg-gradient-to-t from-purple-600/50 to-indigo-400 hover:to-indigo-300 transition-colors rounded-t-sm" style={{ height: `${h}%` }}></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* Trusted By */}
            <div className="border-y border-white/5 bg-white/[0.01] py-16 relative z-20">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-sm font-semibold text-slate-500 mb-8 tracking-widest uppercase">Trusted by the most demanding event organizers</p>
                    <div className="flex flex-wrap justify-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {['EVENTBRITE', 'TICKETMASTER', 'DICE', 'LIVENATION'].map((brand) => (
                            <div key={brand} className="text-2xl font-black italic tracking-tighter text-white/80 select-none">
                                {brand}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <section ref={targetRef} className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Built for scale. Designed for speed.</h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">Everything you need to run high-profile ticketing events without worrying about technical limitations.</p>
                    </div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: "-100px" }}
                        className="grid md:grid-cols-3 gap-6"
                    >
                        {features.map((feature, i) => (
                            <motion.div
                                key={i}
                                variants={fadeIn}
                                className={`p-8 rounded-3xl glass-dark border border-white/5 hover:bg-white/[0.03] transition-colors group relative overflow-hidden ${feature.border}`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                                <div className="relative z-10">
                                    <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 text-white">{feature.title}</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">
                                        {feature.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-900/20" />
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-5xl font-black mb-6 tracking-tight">Ready to launch your event?</h2>
                    <p className="text-xl text-slate-400 mb-10">Join thousands of organizers who trust FlashTix for their biggest sales.</p>
                    <button
                        onClick={() => navigate('/signup')}
                        className="px-10 py-5 rounded-2xl font-bold bg-white text-black hover:bg-slate-200 transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)] text-lg"
                    >
                        Create Your First Event
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-sm">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-500 fill-purple-500" />
                    <span className="font-bold text-white tracking-tight">FlashTix</span>
                    <span className="ml-2">© 2026 All rights reserved.</span>
                </div>
                <div className="flex gap-8">
                    <a href="#" className="hover:text-white transition-colors">Documentation</a>
                    <a href="#" className="hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms</a>
                    <a href="#" className="hover:text-white transition-colors">Twitter</a>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
