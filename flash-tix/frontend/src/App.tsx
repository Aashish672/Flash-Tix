import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Storefront from './pages/Storefront';
import Dashboard from './pages/Dashboard';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Landing from './pages/Landing';
import EventDetail from './pages/EventDetail';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

const Layout = () => (
    <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Outlet />
        </main>
    </>
);

function App() {
    return (
        <Router>
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#1e1b2e',
                        color: '#e2e8f0',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: '16px',
                        padding: '14px 18px',
                        fontSize: '14px',
                        fontWeight: '600',
                    },
                    success: { iconTheme: { primary: '#a855f7', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
                }}
            />
            <div className="min-h-screen bg-[#0B0F19] text-slate-200 selection:bg-purple-500/30">
                <Routes>
                    <Route path="/" element={<Landing />} />
                    {/* Public routes with layout */}
                    <Route element={<Layout />}>
                        <Route path="/events" element={<Storefront />} />
                        <Route path="/events/:eventId" element={<EventDetail />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                    </Route>
                    {/* Protected routes with layout */}
                    <Route element={<Layout />}>
                        <Route element={<ProtectedRoute />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/checkout/:eventId" element={<Checkout />} />
                            <Route path="/profile" element={<Profile />} />
                        </Route>
                    </Route>
                </Routes>
            </div>
        </Router>
    );
}

export default App;
