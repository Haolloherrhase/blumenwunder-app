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
        vat_rate: number;
        categories: { name: string } | null;
    };
}

interface SaleEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: {
        category: CategoryId;
        amount: number;
        description: string;
        inventoryId?: string;
        productId?: string;
        quantity?: number;
    }) => Promise<void>;
}

type TabMode = 'inventory' | 'free';

// ── Component ───────────────────────────────────────────────
const SaleEntryModal: React.FC<SaleEntryModalProps> = ({ isOpen, onClose, onSave }) => {
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
                            vat_rate,
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

    // ── Save: Aus Bestand ───────────────────────────────────
    const handleSaveInventory = async () => {
        if (!selectedItem) return;

        const qty = parseInt(invQuantity) || 1;
        const price = parseFloat(invPrice.replace(',', '.'));

        if (!price || price <= 0) {
            setError('Bitte gültigen Preis eingeben');
            return;
        }
        if (qty <= 0 || qty > selectedItem.quantity) {
            setError(`Menge muss zwischen 1 und ${selectedItem.quantity} liegen`);
            return;
        }

        setSaving(true);
        setError('');

        try {
            const categoryName = selectedItem.products?.categories?.name;
            const categoryId = mapCategoryToId(categoryName);

            await onSave({
                category: categoryId,
                amount: price,
                description: selectedItem.products?.name || 'Produkt',
                inventoryId: selectedItem.id,
                productId: selectedItem.product_id,
                quantity: qty,
            });
            onClose();
        } catch (e) {
            console.error('Save failed:', e);
            setError('Fehler beim Speichern. Bitte erneut versuchen.');
        } finally {
            setSaving(false);
        }
    };

    // ── Save: Freiverkauf ───────────────────────────────────
    const handleSaveFree = async () => {
        const parsedAmount = parseFloat(freeAmount.replace(',', '.'));
        if (!parsedAmount || parsedAmount <= 0) {
            setError('Bitte gültigen Betrag eingeben');
            return;
        }

        setSaving(true);
        setError('');

        try {
            await onSave({
                category: freeCategory,
                amount: parsedAmount,
                description: freeDescription.trim(),
            });
            onClose();
        } catch (e) {
            console.error('Save failed:', e);
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
            <div className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slideUp overflow-hidden max-h-[90vh] flex flex-col">
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
                            {/* Search */}
                            <div className="relative">
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

                            {/* Product list or selected product */}
                            {selectedItem ? (
                                /* ── Selected Product Detail ── */
                                <div className="space-y-4">
                                    <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-bold text-gray-800">
                                                {selectedItem.products?.name}
                                            </h4>
                                            <button
                                                onClick={() => setSelectedItem(null)}
                                                className="text-xs text-primary font-semibold hover:underline"
                                            >
                                                Ändern
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {selectedItem.products?.categories?.name || 'Ohne Kategorie'} · {selectedItem.quantity} verfügbar
                                        </p>
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-2">
                                            Menge <span className="text-gray-400 font-normal">(max. {selectedItem.quantity})</span>
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setInvQuantity(String(Math.max(1, (parseInt(invQuantity) || 1) - 1)))}
                                                className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-bold text-gray-600 transition-colors flex items-center justify-center"
                                            >
                                                −
                                            </button>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={invQuantity}
                                                onChange={(e) => setInvQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                                                className="flex-1 text-2xl font-bold text-center py-3 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            />
                                            <button
                                                onClick={() => setInvQuantity(String(Math.min(selectedItem.quantity, (parseInt(invQuantity) || 0) + 1)))}
                                                className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-bold text-gray-600 transition-colors flex items-center justify-center"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Price */}
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
                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveInventory()}
                                                className="w-full text-2xl font-bold text-center py-3 px-6 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-gray-50 focus:bg-white"
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-300">€</span>
                                        </div>
                                        {/* Total line */}
                                        {(() => {
                                            const qty = parseInt(invQuantity) || 0;
                                            const price = parseFloat(invPrice.replace(',', '.')) || 0;
                                            const total = qty * price;
                                            return total > 0 ? (
                                                <p className="text-sm text-gray-500 mt-2 text-center">
                                                    Gesamt: <span className="font-bold text-gray-800">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(total)}</span>
                                                </p>
                                            ) : null;
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                /* ── Product List ── */
                                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                    {loadingInventory ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 animate-pulse">
                                                <div className="h-4 w-32 bg-gray-200 rounded" />
                                                <div className="h-4 w-12 bg-gray-200 rounded" />
                                            </div>
                                        ))
                                    ) : filteredItems.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <p className="text-3xl mb-2">📭</p>
                                            <p className="text-sm font-medium">
                                                {searchQuery ? 'Kein Produkt gefunden' : 'Kein Bestand vorhanden'}
                                            </p>
                                            <p className="text-xs mt-1">
                                                {searchQuery ? 'Versuche einen anderen Suchbegriff' : 'Nutze "Freiverkauf" stattdessen'}
                                            </p>
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
                                                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.unit_purchase_price)} /St.
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        /* ═══════ TAB: FREIVERKAUF ═══════ */
                        <>
                            {/* Category Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">
                                    Kategorie
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setFreeCategory(cat.id)}
                                            className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-200 ${freeCategory === cat.id
                                                    ? 'border-primary bg-primary/10 shadow-md scale-[1.02]'
                                                    : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <span className="text-2xl mb-1">{cat.icon}</span>
                                            <span className={`text-xs font-semibold ${freeCategory === cat.id ? 'text-primary' : 'text-gray-600'
                                                }`}>
                                                {cat.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">
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
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveFree()}
                                        className="w-full text-3xl font-bold text-center py-4 px-6 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-gray-50 focus:bg-white"
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-300">€</span>
                                </div>
                            </div>

                            {/* Description Input */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">
                                    Notiz <span className="text-gray-400 font-normal">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="z.B. 3x Rosen"
                                    value={freeDescription}
                                    onChange={(e) => setFreeDescription(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveFree()}
                                    className="w-full py-3 px-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-700"
                                />
                            </div>
                        </>
                    )}

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
                    )}
                </div>

                {/* Save Button — fixed at bottom */}
                <div className="p-5 border-t border-gray-100 shrink-0">
                    <button
                        onClick={activeTab === 'inventory' ? handleSaveInventory : handleSaveFree}
                        disabled={
                            saving ||
                            (activeTab === 'inventory' && !selectedItem) ||
                            (activeTab === 'free' && !freeAmount)
                        }
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Speichern...
                            </span>
                        ) : activeTab === 'inventory' ? (
                            selectedItem ? 'Verkauf speichern' : 'Produkt auswählen'
                        ) : (
                            'Verkauf speichern'
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
