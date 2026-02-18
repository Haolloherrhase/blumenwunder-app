import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SaleEntryModal from '../components/dashboard/SaleEntryModal';
import ReceiptModal from '../components/dashboard/ReceiptModal';

// ── Categories ──────────────────────────────────────────────
const CATEGORIES = [
    { id: 'schnittblumen', label: 'Schnittblumen', icon: '✂️' },
    { id: 'topfpflanzen', label: 'Topfpflanzen', icon: '🪴' },
    { id: 'deko', label: 'Deko', icon: '🎀' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

const STARTING_BALANCE = 200;

// ── Types ───────────────────────────────────────────────────
interface DaySale {
    id: string;
    category: CategoryId;
    total_price: number;
    description: string | null;
    notes: string | null;
    created_at: string;
    product_id: string | null;
    quantity: number | null;
    transaction_type: string;
    payment_method?: string;
}

interface DayPurchase {
    total_price: number;
}

// ── Helpers ─────────────────────────────────────────────────
const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

const getTodayStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
};

const getCategoryLabel = (id: string) =>
    CATEGORIES.find(c => c.id === id)?.label ?? id;

// ── Dashboard Component ─────────────────────────────────────
const Dashboard = () => {
    const { user } = useAuth();
    const [sales, setSales] = useState<DaySale[]>([]);
    const [totalSales, setTotalSales] = useState(0);
    const [totalPurchases, setTotalPurchases] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<DaySale | null>(null);
    const [receiptSale, setReceiptSale] = useState<DaySale | null>(null);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const [storeSettings, setStoreSettings] = useState({ store_name: 'Blumenwunder', store_address: '' });

    // Fetch today's data
    const fetchTodayData = useCallback(async () => {
        try {
            const dayStart = getTodayStart();

            // Today's sales (from dashboard quick-sales AND regular sales)
            const { data: salesData, error: salesError } = await supabase
                .from('transactions')
                .select('id, category, total_price, description, notes, created_at, product_id, quantity, transaction_type')
                .in('transaction_type', ['sale', 'sale_bouquet', 'storno'])
                .gte('created_at', dayStart)
                .order('created_at', { ascending: false });

            if (salesError) throw salesError;

            // Today's purchases
            const { data: purchaseData, error: purchaseError } = await supabase
                .from('transactions')
                .select('total_price')
                .eq('transaction_type', 'purchase')
                .gte('created_at', dayStart);

            if (purchaseError) throw purchaseError;

            const salesRows = (salesData || []) as DaySale[];
            const purchaseRows = (purchaseData || []) as DayPurchase[];

            setSales(salesRows);
            setTotalSales(salesRows.reduce((s, t) => s + Number(t.total_price), 0));
            setTotalPurchases(purchaseRows.reduce((s, t) => s + Number(t.total_price), 0));
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTodayData();
    }, [fetchTodayData]);

    // Load store settings
    useEffect(() => {
        const fetchStoreSettings = async () => {
            const { data } = await supabase
                .from('settings')
                .select('store_name, store_address')
                .eq('user_id', user?.id)
                .maybeSingle();
            if (data) setStoreSettings(data);
        };
        if (user?.id) fetchStoreSettings();
    }, [user?.id]);

    // Save sale (quick-sale or from inventory)
    const handleSaveSale = async (entry: {
        category: CategoryId;
        amount: number;
        description: string;
        inventoryId?: string;
        productId?: string;
        quantity?: number;
    }) => {
        const qty = entry.quantity || 1;
        const totalPrice = entry.amount * qty;

        // 1. Save transaction
        const { error } = await supabase.from('transactions').insert({
            user_id: user?.id,
            transaction_type: 'sale',
            product_id: entry.productId || null,
            category: entry.category,
            quantity: qty,
            unit_price: entry.amount,
            total_price: totalPrice,
            payment_method: 'cash',
            description: entry.description || null,
            notes: entry.description || null,
        });

        if (error) throw error;

        // 2. If from inventory: reduce stock
        if (entry.inventoryId) {
            const { data: currentInv } = await supabase
                .from('inventory')
                .select('quantity')
                .eq('id', entry.inventoryId)
                .single();

            if (currentInv) {
                await supabase
                    .from('inventory')
                    .update({ quantity: Math.max(0, currentInv.quantity - qty) })
                    .eq('id', entry.inventoryId);
            }
        }

        // 3. Refresh dashboard
        await fetchTodayData();

        // 4. Prepare receipt data for the last sale
        setReceiptSale({
            id: '',
            category: entry.category as CategoryId,
            total_price: totalPrice,
            description: entry.description || null,
            notes: entry.description || null,
            created_at: new Date().toISOString(),
            product_id: entry.productId || null,
            quantity: qty,
            transaction_type: 'sale',
            payment_method: 'cash',
        });
        setIsReceiptOpen(true);
    };

    // Storno (cancel a sale)
    const handleStorno = async (sale: DaySale) => {
        try {
            // 1. Create storno transaction (negative amount)
            const { error: stornoError } = await supabase.from('transactions').insert({
                user_id: user?.id,
                product_id: sale.product_id || null,
                transaction_type: 'storno',
                category: sale.category,
                quantity: sale.quantity || 1,
                unit_price: -Number(sale.total_price) / (sale.quantity || 1),
                total_price: -Number(sale.total_price),
                payment_method: 'cash',
                description: `STORNO: ${sale.description || sale.notes || 'Verkauf'}`,
                notes: `Storno von Transaktion ${sale.id}`,
            });
            if (stornoError) throw stornoError;

            // 2. If from inventory: restore stock
            if (sale.product_id) {
                const { data: currentInv } = await supabase
                    .from('inventory')
                    .select('id, quantity')
                    .eq('product_id', sale.product_id)
                    .maybeSingle();

                if (currentInv) {
                    await supabase
                        .from('inventory')
                        .update({ quantity: currentInv.quantity + (sale.quantity || 1) })
                        .eq('id', currentInv.id);
                }
            }

            // 3. Refresh dashboard
            setSelectedSale(null);
            await fetchTodayData();
        } catch (error) {
            console.error('Storno failed:', error);
            setSelectedSale(null);
        }
    };

    // Derived state
    const kassenstand = STARTING_BALANCE + totalSales - totalPurchases;

    // Group sales by category
    const groupedSales = CATEGORIES.map(cat => {
        const items = sales.filter(s => s.category === cat.id);
        const subtotal = items.reduce((s, t) => s + Number(t.total_price), 0);
        return { ...cat, items, subtotal };
    });

    // Today's date formatted
    const todayFormatted = new Date().toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    // ── Render ───────────────────────────────────────────────
    return (
        <div className="min-h-screen pb-28 relative">
            {/* Gradient Background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-primary/5 via-secondary/5 to-neutral-bg" />
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(76,175,80,0.1),transparent_50%)]" />
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_70%_80%,rgba(248,187,208,0.1),transparent_50%)]" />

            <div className="space-y-5 px-4 py-6">
                {/* ──── Kassenstand Card ──── */}
                <div className="backdrop-blur-xl bg-white/70 rounded-3xl p-6 shadow-2xl border border-white/30">
                    {/* Date */}
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                        <span>📅</span>
                        <span>{todayFormatted}</span>
                    </p>

                    {/* Balance */}
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-3 mb-1">
                        Kassenstand
                    </p>
                    {loading ? (
                        <div className="h-12 w-40 bg-gray-200 rounded-xl animate-pulse" />
                    ) : (
                        <p className={`text-4xl font-extrabold tracking-tight ${kassenstand >= STARTING_BALANCE
                            ? 'bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent'
                            : 'text-red-600'
                            }`}>
                            {formatCurrency(kassenstand)}
                        </p>
                    )}

                    {/* Breakdown */}
                    {!loading && (
                        <div className="flex items-center gap-3 mt-3 text-sm text-gray-500 flex-wrap">
                            <span className="bg-gray-100 px-3 py-1 rounded-full">
                                Start: {formatCurrency(STARTING_BALANCE)}
                            </span>
                            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">
                                + {formatCurrency(totalSales)}
                            </span>
                            {totalPurchases > 0 && (
                                <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full font-medium">
                                    − {formatCurrency(totalPurchases)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ──── Tagesliste ──── */}
                <div className="space-y-4">
                    {loading ? (
                        // Skeleton
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="backdrop-blur-xl bg-white/50 rounded-2xl p-5 shadow-lg border border-white/30">
                                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-3" />
                                <div className="h-4 w-full bg-gray-100 rounded animate-pulse mb-2" />
                                <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                            </div>
                        ))
                    ) : (
                        groupedSales.map(group => (
                            <div
                                key={group.id}
                                className="backdrop-blur-xl bg-white/50 rounded-2xl shadow-lg border border-white/30 overflow-hidden"
                            >
                                {/* Category Header */}
                                <div className="flex items-center justify-between px-5 py-3 bg-white/60 border-b border-gray-100/50">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{group.icon}</span>
                                        <h3 className="font-bold text-gray-800">{group.label}</h3>
                                    </div>
                                    {group.items.length > 0 && (
                                        <span className="text-sm font-bold text-primary">
                                            {formatCurrency(group.subtotal)}
                                        </span>
                                    )}
                                </div>

                                {/* Sales Items */}
                                <div className="px-5 py-2">
                                    {group.items.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic py-2">
                                            Keine Verkäufe
                                        </p>
                                    ) : (
                                        <ul className="divide-y divide-gray-100/70">
                                            {group.items.map(sale => {
                                                const isStorno = sale.transaction_type === 'storno';
                                                return (
                                                    <li
                                                        key={sale.id}
                                                        onClick={() => !isStorno && setSelectedSale(sale)}
                                                        className={`flex items-center justify-between py-2.5 ${isStorno
                                                            ? 'opacity-50'
                                                            : 'cursor-pointer active:bg-gray-50 rounded-lg -mx-2 px-2'
                                                            }`}
                                                    >
                                                        <span className={`text-sm ${isStorno ? 'text-red-400 line-through' : 'text-gray-700'}`}>
                                                            {sale.description || sale.notes || getCategoryLabel(sale.category)}
                                                        </span>
                                                        <span className={`text-sm font-semibold tabular-nums ${isStorno ? 'text-red-400' : 'text-gray-800'}`}>
                                                            {formatCurrency(Number(sale.total_price))}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        ))
                    )}

                    {/* Uncategorized sales (from regular /sale page, without category) */}
                    {!loading && sales.filter(s => !s.category).length > 0 && (
                        <div className="backdrop-blur-xl bg-white/50 rounded-2xl shadow-lg border border-white/30 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 bg-white/60 border-b border-gray-100/50">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📦</span>
                                    <h3 className="font-bold text-gray-800">Sonstige Verkäufe</h3>
                                </div>
                                <span className="text-sm font-bold text-primary">
                                    {formatCurrency(
                                        sales.filter(s => !s.category).reduce((sum, s) => sum + Number(s.total_price), 0)
                                    )}
                                </span>
                            </div>
                            <div className="px-5 py-2">
                                <ul className="divide-y divide-gray-100/70">
                                    {sales.filter(s => !s.category).map(sale => {
                                        const isStorno = sale.transaction_type === 'storno';
                                        return (
                                            <li
                                                key={sale.id}
                                                onClick={() => !isStorno && setSelectedSale(sale)}
                                                className={`flex items-center justify-between py-2.5 ${isStorno
                                                    ? 'opacity-50'
                                                    : 'cursor-pointer active:bg-gray-50 rounded-lg -mx-2 px-2'
                                                    }`}
                                            >
                                                <span className={`text-sm ${isStorno ? 'text-red-400 line-through' : 'text-gray-700'}`}>
                                                    {sale.description || sale.notes || 'Verkauf'}
                                                </span>
                                                <span className={`text-sm font-semibold tabular-nums ${isStorno ? 'text-red-400' : 'text-gray-800'}`}>
                                                    {formatCurrency(Number(sale.total_price))}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ──── Sticky Verkauf Button ──── */}
            <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pb-2">
                <div className="max-w-md md:max-w-7xl mx-auto">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-lg shadow-2xl hover:shadow-3xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
                    >
                        <span className="text-xl">🛒</span>
                        Verkauf erfassen
                    </button>
                </div>
            </div>

            {/* ──── Sale Entry Modal ──── */}
            <SaleEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveSale}
            />

            {/* ──── Action Sheet (Quittung / Stornieren) ──── */}
            {selectedSale && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setSelectedSale(null)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-5 space-y-3 animate-slideUp">
                        <p className="text-sm text-gray-500 text-center mb-2">
                            {selectedSale.description || selectedSale.notes || getCategoryLabel(selectedSale.category)}
                            {' — '}
                            {formatCurrency(Number(selectedSale.total_price))}
                        </p>
                        <button
                            onClick={() => {
                                setReceiptSale(selectedSale);
                                setIsReceiptOpen(true);
                                setSelectedSale(null);
                            }}
                            className="w-full py-3.5 rounded-2xl bg-gray-100 font-semibold text-gray-800 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <span>🧾</span> Quittung anzeigen
                        </button>
                        <button
                            onClick={() => handleStorno(selectedSale)}
                            className="w-full py-3.5 rounded-2xl bg-red-50 font-semibold text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <span>↩️</span> Stornieren
                        </button>
                        <button
                            onClick={() => setSelectedSale(null)}
                            className="w-full py-3 rounded-2xl font-medium text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Abbrechen
                        </button>
                    </div>
                </div>
            )}

            {/* ──── Receipt Modal ──── */}
            <ReceiptModal
                isOpen={isReceiptOpen}
                onClose={() => { setIsReceiptOpen(false); setReceiptSale(null); }}
                sale={receiptSale ? {
                    description: receiptSale.description || receiptSale.notes || getCategoryLabel(receiptSale.category),
                    total_price: Number(receiptSale.total_price),
                    quantity: receiptSale.quantity || 1,
                    category: receiptSale.category,
                    created_at: receiptSale.created_at,
                    payment_method: (receiptSale as any).payment_method || 'cash',
                } : null}
                storeSettings={storeSettings}
            />
        </div>
    );
};

export default Dashboard;