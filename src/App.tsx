import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Purchase from './pages/Purchase';
import Sale from './pages/Sale';
import Bouquet from './pages/Bouquet';
import Inventory from './pages/Inventory';
import More from './pages/More';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { session, loading } = useAuth();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Lade...</div>;
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { session, loading } = useAuth();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Lade...</div>;
    }

    if (session) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

                    {/* Protected Routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/purchase" element={<ProtectedRoute><Purchase /></ProtectedRoute>} />
                    <Route path="/sale" element={<ProtectedRoute><Sale /></ProtectedRoute>} />
                    <Route path="/bouquet" element={<ProtectedRoute><Bouquet /></ProtectedRoute>} />
                    <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                    <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />

                    {/* Root Redirect */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
