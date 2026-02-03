import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import Card from '../components/ui/Card';

const COLORS = ['#D4A373', '#CCD5AE', '#E9EDC9', '#FEFAE0', '#FAEDCD'];

interface AnalyticsData {
    revenueByDay: any[];
    paymentMethods: any[];
    topCategories: any[];
    vatSummary: {
        vat7: { net: number; vat: number; gross: number };
        vat19: { net: number; vat: number; gross: number };
    };
}

const Analytics = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startStr = thirtyDaysAgo.toISOString();

            const { data: txs, error } = await supabase
                .from('transactions')
                .select(`
                    total_price,
                    created_at,
                    payment_method,
                    vat_rate,
                    vat_amount,
                    transaction_type,
                    products (
                        categories (name)
                    )
                `)
                .gte('created_at', startStr)
                .in('transaction_type', ['sale', 'sale_bouquet']);

            if (error) throw error;

            // Process Data
            const dayMap: Record<string, number> = {};
            const payMap: Record<string, number> = { cash: 0, card: 0 };
            const catMap: Record<string, number> = {};
            const vat = {
                vat7: { net: 0, vat: 0, gross: 0 },
                vat19: { net: 0, vat: 0, gross: 0 }
            };

            txs?.forEach(t => {
                const date = new Date(t.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                const gross = Number(t.total_price);
                const vatAmt = Number(t.vat_amount) || 0;
                const net = gross - vatAmt;
                const payMethod = t.payment_method || 'cash';
                const catName = (t as any).products?.categories?.name || (t.transaction_type === 'sale_bouquet' ? 'Sträuße' : 'Sonstiges');

                // Revenue by Day
                dayMap[date] = (dayMap[date] || 0) + gross;

                // Payment Methods
                payMap[payMethod] = (payMap[payMethod] || 0) + gross;

                // Categories
                catMap[catName] = (catMap[catName] || 0) + gross;

                // VAT Summary
                const rate = Number(t.vat_rate);
                if (rate === 7) {
                    vat.vat7.gross += gross;
                    vat.vat7.vat += vatAmt;
                    vat.vat7.net += net;
                } else if (rate === 19) {
                    vat.vat19.gross += gross;
                    vat.vat19.vat += vatAmt;
                    vat.vat19.net += net;
                }
            });

            // Convert maps to arrays for Recharts
            const revenueByDay = Object.entries(dayMap).map(([name, value]) => ({ name, value }));
            const paymentMethods = Object.entries(payMap).map(([name, value]) => ({
                name: name === 'cash' ? 'Bar' : 'Karte',
                value
            }));
            const topCategories = Object.entries(catMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            setData({ revenueByDay, paymentMethods, topCategories, vatSummary: vat });
        } catch (err) {
            console.error('Analytics error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Analysedaten werden geladen...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Fehler beim Laden der Analysedaten.</div>;

    return (
        <div className="space-y-6 pb-24">
            <h1 className="text-2xl font-bold text-gray-800">Berichte & Analyse</h1>

            {/* Revenue Trend */}
            <Card title="Umsatzverlauf (30 Tage)">
                <div className="h-64 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.revenueByDay}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" fontSize={10} tickMargin={10} />
                            <YAxis fontSize={10} tickFormatter={(val) => `${val}€`} />
                            <Tooltip
                                formatter={(value) => [`${Number(value).toFixed(2)}€`, 'Umsatz']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#D4A373"
                                strokeWidth={3}
                                dot={{ fill: '#D4A373', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Methods */}
                <Card title="Zahlungsarten">
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.paymentMethods}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.paymentMethods.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${Number(value).toFixed(2)}€`} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Categories */}
                <Card title="Umsatz nach Kategorien">
                    <div className="h-64 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topCategories} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" fontSize={10} width={80} />
                                <Tooltip formatter={(value) => `${Number(value).toFixed(2)}€`} />
                                <Bar dataKey="value" fill="#CCD5AE" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* VAT Summary Table */}
            <Card title="Steuer-Zusammenfassung (Letzte 30 Tage)">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Satz</th>
                                <th className="px-4 py-3">Netto</th>
                                <th className="px-4 py-3">MwSt</th>
                                <th className="px-4 py-3 font-bold text-gray-800">Brutto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr>
                                <td className="px-4 py-4 font-medium">7% MwSt</td>
                                <td className="px-4 py-4">{data.vatSummary.vat7.net.toFixed(2)}€</td>
                                <td className="px-4 py-4">{data.vatSummary.vat7.vat.toFixed(2)}€</td>
                                <td className="px-4 py-4 font-bold">{data.vatSummary.vat7.gross.toFixed(2)}€</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-4 font-medium">19% MwSt</td>
                                <td className="px-4 py-4">{data.vatSummary.vat19.net.toFixed(2)}€</td>
                                <td className="px-4 py-4">{data.vatSummary.vat19.vat.toFixed(2)}€</td>
                                <td className="px-4 py-4 font-bold">{data.vatSummary.vat19.gross.toFixed(2)}€</td>
                            </tr>
                            <tr className="bg-primary/5">
                                <td className="px-4 py-4 font-bold">Gesamt</td>
                                <td className="px-4 py-4 font-bold">{(data.vatSummary.vat7.net + data.vatSummary.vat19.net).toFixed(2)}€</td>
                                <td className="px-4 py-4 font-bold">{(data.vatSummary.vat7.vat + data.vatSummary.vat19.vat).toFixed(2)}€</td>
                                <td className="px-4 py-4 font-bold text-primary">{(data.vatSummary.vat7.gross + data.vatSummary.vat19.gross).toFixed(2)}€</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Analytics;
