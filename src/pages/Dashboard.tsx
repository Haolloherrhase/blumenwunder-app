import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import StatCard from '../components/dashboard/StatCard';
import Button from '../components/ui/Button';
import {
    CurrencyEuroIcon,
    ShoppingBagIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
    todayRevenue: number;
    todaySales: number;
    monthRevenue: number;
    yearRevenue: number;
    lowStockCount: number;
    topProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats>({
        todayRevenue: 0,
        todaySales: 0,
        monthRevenue: 0,
        yearRevenue: 0,
        lowStockCount: 0,
        topProducts: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const now = new Date();

                const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

                // 1. Fetch Sales Data for different periods
                const { data: allSales, error: salesError } = await supabase
                    .from('transactions')
                    .select(`
                        total_price, 
                        created_at, 
                        quantity,
                        products (name)
                    `)
                    .in('transaction_type', ['sale', 'sale_bouquet'])
                    .gte('created_at', yearStart);

                if (salesError) throw salesError;

                let todayRev = 0;
                let todayCount = 0;
                let monthRev = 0;
                let yearRev = 0;

                const productMap: Record<string, { quantity: number; revenue: number }> = {};

                allSales?.forEach(t => {
                    const price = Number(t.total_price);
                    const date = t.created_at;
                    const name = (t as any).products?.name || 'Indiv. Strauß';

                    if (date >= dayStart) {
                        todayRev += price;
                        todayCount++;
                    }
                    if (date >= monthStart) {
                        monthRev += price;
                    }
                    yearRev += price;

                    // Aggregate for Top Products
                    if (!productMap[name]) productMap[name] = { quantity: 0, revenue: 0 };
                    productMap[name].quantity += t.quantity;
                    productMap[name].revenue += price;
                });

                // Sort and Slice Top Products
                const topProducts = Object.entries(productMap)
                    .map(([name, data]) => ({ name, ...data }))
                    .sort((a, b) => b.quantity - a.quantity)
                    .slice(0, 5);

                // 2. Fetch Low Stock Items (< 10)
                const { count: lowStockCount, error: inventoryError } = await supabase
                    .from('inventory')
                    .select('*', { count: 'exact', head: true })
                    .lt('quantity', 10);

                if (inventoryError) throw inventoryError;

                setStats({
                    todayRevenue: todayRev,
                    todaySales: todayCount,
                    monthRevenue: monthRev,
                    yearRevenue: yearRev,
                    lowStockCount: lowStockCount || 0,
                    topProducts
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
        <div className="space-y-6 pb-24">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Hallo, {user?.email?.split('@')[0]}! 👋</h1>
                    <p className="text-sm text-secondary-dark">Hier ist dein Geschäftsüberblick.</p>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard
                    title="Umsatz Heute"
                    value={loading ? '...' : formatCurrency(stats.todayRevenue)}
                    icon={<CurrencyEuroIcon className="h-5 w-5" />}
                    color="primary"
                />
                <StatCard
                    title="Verkäufe Heute"
                    value={loading ? '...' : stats.todaySales.toString()}
                    icon={<ShoppingBagIcon className="h-5 w-5" />}
                />

                <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Diesen Monat</p>
                        <p className="text-lg font-bold text-gray-800">{loading ? '...' : formatCurrency(stats.monthRevenue)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Dieses Jahr</p>
                        <p className="text-lg font-bold text-gray-800">{loading ? '...' : formatCurrency(stats.yearRevenue)}</p>
                    </div>
                </div>

                <div onClick={() => navigate('/inventory')} className="cursor-pointer col-span-2">
                    <Card className="bg-red-50 border-red-100 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                            <div>
                                <p className="text-sm font-medium text-red-800">Lager-Warnung</p>
                                <p className="text-xs text-red-600">
                                    {loading ? '...' : `${stats.lowStockCount} Artikel unter Warnschwelle`}
                                </p>
                            </div>
                        </div>
                        <span className="text-red-500 text-sm font-medium">Lager &rarr;</span>
                    </Card>
                </div>
            </div>

            {/* Top Products */}
            <Card title="🏆 Top Bestseller">
                {loading ? (
                    <p className="text-sm text-gray-400 py-4">Lade Daten...</p>
                ) : stats.topProducts.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 italic">Noch keine Verkaufsdaten vorhanden.</p>
                ) : (
                    <div className="space-y-4 pt-2">
                        {stats.topProducts.map((p, idx) => {
                            const maxQty = stats.topProducts[0].quantity;
                            const percentage = (p.quantity / maxQty) * 100;
                            return (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-gray-700">{p.name}</span>
                                        <span className="text-gray-500">{p.quantity} Stk. ({formatCurrency(p.revenue)})</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all duration-1000"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Quick Actions */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-800 px-1">Schnellzugriff</h2>
                <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => navigate('/sale')} variant="primary" className="justify-center h-12 !rounded-2xl">
                        Kasse öffnen
                    </Button>
                    <Button onClick={() => navigate('/purchase')} variant="outline" className="justify-center h-12 bg-white !rounded-2xl">
                        Wareneingang
                    </Button>
                    <Button onClick={() => navigate('/bouquet')} variant="secondary" className="justify-center col-span-2 h-12 !rounded-2xl text-primary font-bold">
                        🌸 Strauß konfigurieren
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
