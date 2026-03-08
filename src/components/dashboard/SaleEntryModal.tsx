import { useState, useRef, useEffect, useMemo } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

// ── Categories ──────────────────────────────────────────────
const CATEGORIES = [
    { id: 'schnittblumen', label: 'Schnittblumen', icon: '✂️' },
    { id: 'topfpflanzen', label: 'Topfpflanzen', icon: '🪴' },
    { id: 'deko', label: 'Deko', icon: '🎀' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

// ── Category Mapping ────────────────────────────────────────
const mapCategoryToId = (dbCategoryName: string | undefined): CategoryId => {
    if (!dbCategoryName) return 'schnittblumen';
    const name = dbCategoryName.toLowerCase();
    if (name.includes('topf') || name.includes('pflanze')) return 'topfpflanzen';
    if (name.includes('deko') || name.includes('vase') || name.includes('kerze')) return 'deko';
    return 'schnittblumen';
};

// ── Types ───────────────────────────────────────────────────
interface InventoryItem {
    id: string;
    quantity: number;
    unit_purchase_price: number;
    product_id: string;
    products: {
        name: string;
        categories: { name: string } | null;
    };
}

interface SaleEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaleComplete: () => Promise<void>;
    userId: string;
}

type TabMode = 'inventory' | 'free';

export interface CartItem {
    inventoryId?: string;
    productId?: string;
    purchasePrice?: number;
    category?: CategoryId;
    name: string;
    quantity: number;
    price: number;
    isFromInventory: boolean;
}

// ── Component ───────────────────────────────────────────────
const SaleEntryModal: React.FC<SaleEntryModalProps> = ({ isOpen, onClose, onSaleComplete, userId }) => {
    // Shared state
    const [activeTab, setActiveTab] = useState<TabMode>('inventory');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // "Aus Bestand" state
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [invQuantity, setInvQuantity] = useState('1');
    const [invPrice, setInvPrice] = useState('');

    // "Freiverkauf" state
    const [freeCategory, setFreeCategory] = useState<CategoryId>('schnittblumen');
    const [freeAmount, setFreeAmount] = useState('');
    const [freeDescription, setFreeDescription] = useState('');
    const freeAmountRef = useRef<HTMLInputElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);

    // ── Load inventory when modal opens ─────────────────────
    useEffect(() => {
        if (!isOpen) return;

        // Reset state
        setActiveTab('inventory');
        setError('');
        setSaving(false);
        setSearchQuery('');
        setSelectedItem(null);
        setInvQuantity('1');
        setInvPrice('');
        setFreeCategory('schnittblumen');
        setFreeAmount('');
        setFreeDescription('');
        setCart([]);

        const fetchInventory = async () => {
            setLoadingInventory(true);
            try {
                const { data, error: fetchErr } = await supabase
                    .from('inventory')
                    .select(`
                        id,
                        quantity,
                        unit_purchase_price,
                        product_id,
                        products (
                            name,
                            categories (name)
                        )
                    `)
                    .gt('quantity', 0)
                    .order('quantity', { ascending: false });

                if (fetchErr) throw fetchErr;
                setInventoryItems((data as unknown as InventoryItem[]) || []);
            } catch (err) {
                console.error('Error loading inventory:', err);
                setInventoryItems([]);
            } finally {
                setLoadingInventory(false);
            }
        };

        fetchInventory();
        setTimeout(() => searchRef.current?.focus(), 200);
    }, [isOpen]);

    // Focus amount field when switching to Freiverkauf tab
    useEffect(() => {
        if (activeTab === 'free') {
            setTimeout(() => freeAmountRef.current?.focus(), 150);
        } else {
            setTimeout(() => searchRef.current?.focus(), 150);
        }
    }, [activeTab]);

    // ── Filtered inventory ──────────────────────────────────
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return inventoryItems;
        const q = searchQuery.toLowerCase();
        return inventoryItems.filter(item =>
            item.products?.name?.toLowerCase().includes(q) ||
            item.products?.categories?.name?.toLowerCase().includes(q)
        );
    }, [inventoryItems, searchQuery]);

    // ── Select product from inventory ───────────────────────
    const handleSelectProduct = (item: InventoryItem) => {
        setSelectedItem(item);
        setInvQuantity('1');
        setInvPrice(item.unit_purchase_price?.toString() || '');
        setError('');
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

    // ── Cart Operations ─────────────────────────────────────
    const addToCartInventory = () => {
        if (!selectedItem) return;

        const qty = parseInt(invQuantity) || 1;
        const price = parseFloat(invPrice.replace(',', '.'));

        if (!price || price <= 0) {
            setError('Bitte gültigen Preis eingeben');
            return;
        }

        const currentInCart = cart.find(p => p.inventoryId === selectedItem.id)?.quantity || 0;

        if (qty <= 0 || (qty + currentInCart) > selectedItem.quantity) {
            setError(`Maximal ${selectedItem.quantity} Stück auf Lager (bereits ${currentInCart} im Warenkorb).`);
            return;
        }

        setError('');

        setCart(prev => {
            const existing = prev.find(p => p.inventoryId === selectedItem.id);
            if (existing) {
                return prev.map(p =>
                    p.inventoryId === selectedItem.id
                        ? { ...p, quantity: p.quantity + qty }
                        : p
                );
            }
            return [...prev, {
                inventoryId: selectedItem.id,
                productId: selectedItem.product_id,
                purchasePrice: selectedItem.unit_purchase_price,
                name: selectedItem.products?.name || 'Produkt',
                quantity: qty,
                price: price,
                isFromInventory: true,
            }];
        });

        // Reset Selection
        setSelectedItem(null);
        setSearchQuery('');
        setInvQuantity('1');
        setInvPrice('');
    };

    const addToCartFree = () => {
        const parsedAmount = parseFloat(freeAmount.replace(',', '.'));
        if (!parsedAmount || parsedAmount <= 0) {
            setError('Bitte gültigen Betrag eingeben');
            return;
        }

        setError('');

        setCart(prev => [...prev, {
            category: freeCategory,
            name: freeDescription.trim() || CATEGORIES.find(c => c.id === freeCategory)?.label || 'Freiverkauf',
            quantity: 1,
            price: parsedAmount,
            isFromInventory: false,
        }]);

        // Reset
        setFreeAmount('');
        setFreeDescription('');
        setTimeout(() => freeAmountRef.current?.focus(), 150);
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, newQty: number) => {
        if (newQty <= 0) return removeFromCart(index);

        const item = cart[index];
        if (item.isFromInventory && item.inventoryId) {
            const invItem = inventoryItems.find(i => i.id === item.inventoryId);
            if (invItem && newQty > invItem.quantity) {
                setError(`Maximal ${invItem.quantity} auf Lager.`);
                return;
            }
        }

        setCart(prev => prev.map((it, i) => i === index ? { ...it, quantity: newQty } : it));
        setError('');
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // ── Checkout ────────────────────────────────────────────
    const handleCheckout = async () => {
        if (cart.length === 0) return;

        setSaving(true);
        setError('');

        try {
            for (const item of cart) {
                const totalPrice = item.price * item.quantity;
                let finalCategory: CategoryId = 'schnittblumen';

                if (item.isFromInventory && item.inventoryId) {
                    const invItem = inventoryItems.find(i => i.id === item.inventoryId);
                    finalCategory = mapCategoryToId(invItem?.products.categories?.name);
                } else if (item.category) {
                    finalCategory = item.category;
                }

                // 1. Save transaction
                await supabase.from('transactions').insert({
                    user_id: userId,
                    transaction_type: 'sale',
                    product_id: item.productId || null,
                    category: finalCategory,
                    quantity: item.quantity,
                    unit_price: item.price,
                    total_price: totalPrice,
                    purchase_price: item.purchasePrice || null,
                    payment_method: 'cash',
                    description: item.name,
                    notes: item.name,
                });

                // 2. Reduce inventory
                if (item.inventoryId) {
                    const { data: currentInv } = await supabase
                        .from('inventory')
                        .select('quantity')
                        .eq('id', item.inventoryId)
                        .single();

                    if (currentInv) {
                        await supabase
                            .from('inventory')
                            .update({ quantity: Math.max(0, currentInv.quantity - item.quantity) })
                            .eq('id', item.inventoryId);
                    }
                }
            }

            setCart([]);
            await onSaleComplete();
            onClose();
        } catch (e) {
            console.error('Checkout failed:', e);
            setError('Fehler beim Speichern. Bitte erneut versuchen.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    // ── Render ──────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slideUp overflow-hidden max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">🛒 Verkauf erfassen</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <XMarkIcon className="h-6 w-6 text-gray-400" />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-2 mx-5 mt-3 bg-gray-100 rounded-2xl shrink-0">
                    <button
                        onClick={() => { setActiveTab('inventory'); setError(''); }}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${activeTab === 'inventory'
                                ? 'bg-white text-primary shadow-md'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📦 Aus Bestand
                    </button>
                    <button
                        onClick={() => { setActiveTab('free'); setError(''); }}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${activeTab === 'free'
                                ? 'bg-white text-primary shadow-md'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        ✏️ Freiverkauf
                    </button>
                </div>

                {/* Tab Content — scrollable */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {activeTab === 'inventory' ? (
                        /* ═══════ TAB: AUS BESTAND ═══════ */
                        <>
                            {/* Product list or selected product */}
                            {selectedItem ? (
                                /* ── Selected Product Detail ── */
                                <div className="space-y-4">
                                    <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-gray-800">
                                                {selectedItem.products?.name}
                                            </h4>
                                            <p className="text-sm text-gray-500">
                                                {selectedItem.products?.categories?.name || 'Ohne Kategorie'} · {selectedItem.quantity} auf Lager
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedItem(null)}
                                            className="text-xs text-primary font-semibold hover:underline"
                                        >
                                            Abbrechen
                                        </button>
                                    </div>

                                    {/* Quantity & Price Row */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-600 mb-2">
                                                Menge <span className="text-gray-400 font-normal">(max. {selectedItem.quantity})</span>
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setInvQuantity(String(Math.max(1, (parseInt(invQuantity) || 1) - 1)))}
                                                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-lg font-bold text-gray-600 transition-colors flex items-center justify-center shrink-0"
                                                >
                                                    −
                                                </button>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={invQuantity}
                                                    onChange={(e) => setInvQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                                                    className="flex-1 min-w-0 text-lg font-bold text-center py-2 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                />
                                                <button
                                                    onClick={() => setInvQuantity(String(Math.min(selectedItem.quantity, (parseInt(invQuantity) || 0) + 1)))}
                                                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-lg font-bold text-gray-600 transition-colors flex items-center justify-center shrink-0"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-600 mb-2">
                                                Einzelpreis (€)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder="0,00"
                                                    value={invPrice}
                                                    onChange={(e) => setInvPrice(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && addToCartInventory()}
                                                    className="w-full text-lg font-bold text-center py-2 pr-6 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-gray-50 focus:bg-white"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-300">€</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={addToCartInventory}
                                        className="w-full py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-bold transition-all border border-transparent hover:border-primary/30"
                                    >
                                        In den Warenkorb
                                    </button>
                                </div>
                            ) : (
                                /* ── Product List ── */
                                <div>
                                    {/* Search */}
                                    <div className="relative mb-4">
                                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            ref={searchRef}
                                            type="text"
                                            placeholder="Produkt suchen..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-700"
                                        />
                                    </div>

                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {loadingInventory ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 animate-pulse">
                                                    <div className="h-4 w-32 bg-gray-200 rounded" />
                                                    <div className="h-4 w-12 bg-gray-200 rounded" />
                                                </div>
                                            ))
                                        ) : filteredItems.length === 0 ? (
                                            <div className="text-center py-4 text-gray-400">
                                                <p className="text-sm">Kein Bestand gefunden</p>
                                            </div>
                                        ) : (
                                            filteredItems.map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleSelectProduct(item)}
                                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all text-left group"
                                                >
                                                    <div>
                                                        <p className="font-semibold text-gray-800 group-hover:text-primary transition-colors">
                                                            {item.products?.name}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {item.products?.categories?.name || 'Ohne Kategorie'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-3">
                                                        <p className="text-sm font-bold text-gray-600 tabular-nums">
                                                            {item.quantity}x
                                                        </p>
                                                        <p className="text-xs text-gray-400 tabular-nums">
                                                            {formatCurrency(item.unit_purchase_price)} /St.
                                                        </p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* ═══════ TAB: FREIVERKAUF ═══════ */
                        <>
                            {/* Category Selection */}
                            <div>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setFreeCategory(cat.id)}
                                            className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all duration-200 ${freeCategory === cat.id
                                                ? 'border-primary bg-primary/10 shadow-sm'
                                                : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <span className="text-xl mb-1">{cat.icon}</span>
                                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${freeCategory === cat.id ? 'text-primary' : 'text-gray-600'
                                                }`}>
                                                {cat.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-[1fr_2fr] gap-4">
                                {/* Description Input */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Notiz <span className="font-normal">(opt.)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="z.B. Rosen"
                                        value={freeDescription}
                                        onChange={(e) => setFreeDescription(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addToCartFree()}
                                        className="w-full py-2 px-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-700 text-sm"
                                    />
                                </div>
                                {/* Amount Input */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Betrag (€)
                                    </label>
                                    <div className="relative">
                                        <input
                                            ref={freeAmountRef}
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0,00"
                                            value={freeAmount}
                                            onChange={(e) => setFreeAmount(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addToCartFree()}
                                            className="w-full text-xl font-bold text-center py-2 px-6 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-gray-50 focus:bg-white"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-300">€</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={addToCartFree}
                                className="w-full py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-bold transition-all border border-transparent hover:border-primary/30"
                            >
                                In den Warenkorb
                            </button>
                        </>
                    )}

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
                    )}

                    {/* ──── WARENKORB ──── */}
                    {cart.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-600 mb-2">
                                Warenkorb <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{cart.length}</span>
                            </h3>
                            <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {cart.map((item, i) => (
                                    <li key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.isFromInventory
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {item.isFromInventory ? 'Bestand' : 'Frei'}
                                                </span>
                                                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <button onClick={() => updateQuantity(i, item.quantity - 1)}
                                                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 text-sm font-bold shadow-sm hover:bg-gray-100"
                                                >−</button>
                                                <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(i, item.quantity + 1)}
                                                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 text-sm font-bold shadow-sm hover:bg-gray-100"
                                                >+</button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 gap-1.5">
                                            <button onClick={() => removeFromCart(i)}
                                                className="text-gray-400 hover:text-red-500 text-xs transition-colors p-1"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                            <span className="text-sm font-bold text-gray-800 tabular-nums">
                                                {formatCurrency(item.price * item.quantity)}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                                <span className="font-semibold text-gray-700">Gesamtbetrag</span>
                                <span className="text-2xl font-black text-primary tabular-nums">
                                    {formatCurrency(cartTotal)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Checkout Button — fixed at bottom */}
                <div className="p-5 border-t border-gray-100 shrink-0">
                    <button
                        onClick={handleCheckout}
                        disabled={saving || cart.length === 0}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Speichern...
                            </span>
                        ) : (
                            cart.length > 0 ? `Alles verkaufen (${formatCurrency(cartTotal)})` : 'Warenkorb ist leer'
                        )}
                    </button>
                </div>

                {/* Safe area padding for mobile */}
                <div className="h-safe-area-inset-bottom" />
            </div>
        </div>
    );
};

export default SaleEntryModal;
