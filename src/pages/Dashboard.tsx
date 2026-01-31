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
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayISO = today.toISOString();

                // 1. Fetch Today's Sales (Revenue & Count)
                const { data: salesData, error: salesError } = await supabase
                    .from('transactions')
                    .select('total_price')
                    .gte('created_at', todayISO)
                    .eq('transaction_type', 'sale');

                if (salesError) throw salesError;

                const todayRevenue = salesData?.reduce((sum, t) => sum + Number(t.total_price), 0) || 0;
                const todaySales = salesData?.length || 0;

                // 2. Fetch Low Stock Items (< 10)
                const { count: lowStockCount, error: inventoryError } = await supabase
                    .from('inventory')
                    .select('*', { count: 'exact', head: true })
                    .lt('quantity', 10);

                if (inventoryError) throw inventoryError;

                setStats({
                    todayRevenue,
                    todaySales,
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
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Hallo, {user?.email?.split('@')[0]}! 👋</h1>
                    <p className="text-sm text-secondary-dark">Hier ist dein Tagesüberblick.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard
                    title="Umsatz Heute"
                    value={loading ? '...' : formatCurrency(stats.todayRevenue)}
                    icon={<CurrencyEuroIcon className="h-5 w-5" />}
                    color="primary"
                />
                <StatCard
                    title="Verkäufe"
                    value={loading ? '...' : stats.todaySales.toString()}
                    icon={<ShoppingBagIcon className="h-5 w-5" />}
                />
                <div onClick={() => navigate('/inventory')} className="cursor-pointer col-span-2">
                    <Card className="bg-red-50 border-red-100 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                            <div>
                                <p className="text-sm font-medium text-red-800">Knapper Bestand</p>
                                <p className="text-xs text-red-600">
                                    {loading ? '...' : `${stats.lowStockCount} Artikel unter Warnschwelle`}
                                </p>
                            </div>
                        </div>
                        <span className="text-red-500 text-sm font-medium">Ansehen &rarr;</span>
                    </Card>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-800">Schnellzugriff</h2>
                <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => navigate('/sale')} variant="primary" className="justify-center h-12">
                        Neuer Verkauf
                    </Button>
                    <Button onClick={() => navigate('/purchase')} variant="outline" className="justify-center h-12 bg-white">
                        Wareneingang
                    </Button>
                    <Button onClick={() => navigate('/bouquet')} variant="secondary" className="justify-center col-span-2 h-12">
                        Blumenstrauß konfigurieren
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
