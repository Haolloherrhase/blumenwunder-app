import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    CurrencyEuroIcon,
    ShoppingBagIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    BanknotesIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
    todayRevenue: number;
    todaySales: number;
    lowStockCount: number;
}

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats>({
        todayRevenue: 0,
        todaySales: 0,
        lowStockCount: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const now = new Date();
                const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

                const { data: todaySales, error: salesError } = await supabase
                    .from('transactions')
                    .select('total_price')
                    .in('transaction_type', ['sale', 'sale_bouquet'])
                    .gte('created_at', dayStart);

                if (salesError) throw salesError;

                const todayRev = todaySales?.reduce((sum, t) => sum + Number(t.total_price), 0) || 0;
                const todayCount = todaySales?.length || 0;

                const { count: lowStockCount, error: inventoryError } = await supabase
                    .from('inventory')
                    .select('*', { count: 'exact', head: true })
                    .lt('quantity', 10);

                if (inventoryError) throw inventoryError;

                setStats({
                    todayRevenue: todayRev,
                    todaySales: todayCount,
                    lowStockCount: lowStockCount || 0
                });

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    return (
        <div className="min-h-screen pb-24 relative">
            {/* Gradient Background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-primary/5 via-secondary/5 to-neutral-bg" />
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(76,175,80,0.1),transparent_50%)]" />
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_70%_80%,rgba(248,187,208,0.1),transparent_50%)]" />

            <div className="space-y-6 px-4 py-6">
                {/* Header */}
                <div className="backdrop-blur-xl bg-white/60 rounded-3xl p-6 shadow-2xl border border-white/20">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                            <SparklesIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                Hallo, {user?.email?.split('@')[0]}! 👋
                            </h1>
                            <p className="text-sm text-gray-500">
                                {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Today's Stats - Glass Cards */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Revenue Card */}
                    <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-6 shadow-xl border border-white/30 hover:shadow-2xl hover:bg-white/50 transition-all duration-300">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                                <CurrencyEuroIcon className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Umsatz Heute
                                </p>
                                <p className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
                                    {loading ? '...' : formatCurrency(stats.todayRevenue)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sales Card */}
                    <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-6 shadow-xl border border-white/30 hover:shadow-2xl hover:bg-white/50 transition-all duration-300">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-secondary-dark flex items-center justify-center shadow-lg">
                                <ShoppingBagIcon className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Verkäufe
                                </p>
                                <p className="text-3xl font-bold bg-gradient-to-br from-secondary to-secondary-dark bg-clip-text text-transparent">
                                    {loading ? '...' : stats.todaySales}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions - Glass Buttons */}
                <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-6 shadow-xl border border-white/30">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Schnellzugriff</h2>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => navigate('/purchase')}
                                className="backdrop-blur-sm bg-white/60 hover:bg-white/80 border border-white/40 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center space-y-2 group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <PlusIcon className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-sm font-semibold text-gray-700">Einkauf</span>
                            </button>

                            <button
                                onClick={() => navigate('/sale')}
                                className="backdrop-blur-sm bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center space-y-2 group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <BanknotesIcon className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-sm font-semibold text-white">Verkauf</span>
                            </button>
                        </div>

                        <button
                            onClick={() => navigate('/bouquet')}
                            className="w-full backdrop-blur-sm bg-gradient-to-r from-secondary/60 to-secondary/40 hover:from-secondary/70 hover:to-secondary/50 border border-white/40 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-3 group"
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">🌸</span>
                            <span className="text-sm font-bold text-secondary-dark">Strauß konfigurieren</span>
                        </button>
                    </div>
                </div>

                {/* Low Stock Warning - Glass Alert */}
                {stats.lowStockCount > 0 && (
                    <div
                        onClick={() => navigate('/inventory')}
                        className="backdrop-blur-xl bg-red-50/60 border border-red-100/50 rounded-3xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-red-800">Lager-Warnung</p>
                                    <p className="text-xs text-red-600">
                                        {loading ? '...' : `${stats.lowStockCount} Artikel unter Warnschwelle`}
                                    </p>
                                </div>
                            </div>
                            <span className="text-red-500 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                                →
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;