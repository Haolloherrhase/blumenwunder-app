import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import ProductSelectionCard from '../components/pos/ProductSelectionCard';
import CartItem from '../components/pos/CartItem';
import { ArchiveBoxXMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import QuickBouquetModal from '../components/pos/QuickBouquetModal';

// ... (remaining imports for interface etc)

interface InventoryProduct {
    id?: string; // Optional because templates don't have an inventory entry yet
    product_id?: string;
    quantity: number;
    unit_price?: number; // Selling price
    isTemplate?: boolean;
    ingredients?: Array<{
        product_id?: string;
        material_id?: string;
        quantity: number;
        name: string;
        type: 'product' | 'material';
    }>;
    products?: {
        name: string;
        is_bouquet: boolean;
        categories?: {
            name: string;
        }
    };
    name?: string; // Fallback for templates
}

interface CartEntry {
    inventoryId?: string;
    productId?: string;
    templateId?: string; // NEW
    name: string;
    quantity: number;
    price: number;
    isBouquet: boolean;
    isQuickBouquet?: boolean;
    isTemplate?: boolean; // NEW
    ingredients?: Array<{
        inventoryId?: string;
        productId?: string;
        materialId?: string;
        name: string;
        type: 'product' | 'material';
        quantity: number;
    }>;
}

const Sale = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'single' | 'bouquet'>('single');
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [bouquets, setBouquets] = useState<InventoryProduct[]>([]);
    const [cart, setCart] = useState<CartEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isQuickBouquetModalOpen, setIsQuickBouquetModalOpen] = useState(false);

    // Fetch Inventory & Templates
    const fetchInventory = async () => {
        setLoading(true);

        try {
            // 1. Regular products
            const { data: regularData } = await supabase
                .from('inventory')
                .select(`
                    id,
                    quantity,
                    product_id,
                    products (
                        name,
                        is_bouquet,
                        categories (name)
                    )
                `)
                .eq('products.is_bouquet', false)
                .gt('quantity', 0)
                .order('quantity', { ascending: false });

            // 2. Produced Bouquets in Stock
            const { data: bouquetInvData } = await supabase
                .from('inventory')
                .select(`
                    id,
                    quantity,
                    product_id,
                    products (
                        name,
                        is_bouquet,
                        categories (name)
                    )
                `)
                .eq('products.is_bouquet', true)
                .gt('quantity', 0)
                .order('quantity', { ascending: false });

            // 3. Bouquet Templates
            const { data: templateData } = await supabase
                .from('bouquet_templates')
                .select(`
                    id,
                    name,
                    base_price,
                    items:bouquet_template_items (
                        product_id,
                        material_id,
                        quantity,
                        products (name),
                        materials (name)
                    )
                `);

            if (regularData) setProducts(regularData as any);

            // Combine produced bouquets and templates
            const combinedBouquets: InventoryProduct[] = [];

            // Add produced bouquets first, matching price with templates if possible
            if (bouquetInvData) {
                const bouquetStock = (bouquetInvData as any).map((b: any) => {
                    const matchedTemplate = templateData?.find(t => t.name === b.products.name);
                    return {
                        ...b,
                        unit_price: matchedTemplate ? Number(matchedTemplate.base_price) : 15.00
                    };
                });
                combinedBouquets.push(...bouquetStock);
            }

            // Add templates
            if (templateData) {
                combinedBouquets.push(...templateData.map(t => ({
                    id: t.id,
                    name: t.name,
                    quantity: 99, // Unlimited virtual stock
                    unit_price: Number(t.base_price),
                    isTemplate: true,
                    ingredients: t.items.map((i: any) => ({
                        product_id: i.product_id,
                        material_id: i.material_id,
                        quantity: i.quantity,
                        name: i.products?.name || i.materials?.name || 'Zutat',
                        type: (i.product_id ? 'product' : 'material') as 'product' | 'material'
                    })),
                    products: { name: t.name, is_bouquet: true }
                })));
            }

            setBouquets(combinedBouquets);

        } catch (err) {
            console.error('Error fetching inventory:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    // Cart Actions
    const addToCart = (item: InventoryProduct) => {
        setCart(prev => {
            const existing = prev.find(p => (item.isTemplate ? p.templateId === item.id : p.inventoryId === item.id));

            if (existing) {
                return prev.map(p =>
                    (item.isTemplate ? p.templateId === item.id : p.inventoryId === item.id)
                        ? { ...p, quantity: p.quantity + 1 }
                        : p
                );
            }

            return [...prev, {
                inventoryId: item.isTemplate ? undefined : item.id,
                templateId: item.isTemplate ? item.id : undefined,
                productId: item.isTemplate ? undefined : item.product_id,
                name: item.isTemplate ? item.name! : item.products!.name,
                quantity: 1,
                price: item.unit_price || 5.00,
                isBouquet: true,
                isTemplate: item.isTemplate,
                ingredients: item.isTemplate ? (item.ingredients as any) : undefined
            }];
        });
    };

    const addQuickBouquetToCart = (bouquet: { name: string, price: number, ingredients: any[] }) => {
        setCart(prev => [...prev, {
            name: bouquet.name,
            quantity: 1,
            price: bouquet.price,
            isBouquet: true,
            isQuickBouquet: true,
            ingredients: bouquet.ingredients
        }]);
    };

    const updateCartItem = (id: string | undefined, index: number, updates: Partial<CartEntry>) => {
        setCart(prev => prev.map((item, i) =>
            (id && (item.inventoryId === id || item.templateId === id)) || (!id && i === index) ? { ...item, ...updates } : item
        ));
    };

    const removeFromCart = (id: string | undefined, index: number) => {
        setCart(prev => prev.filter((item, i) => id ? (item.inventoryId !== id && item.templateId !== id) : i !== index));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Checkout
    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setProcessing(true);

        try {
            // Flatten quick bouquets to ingredients + handles bundles
            for (const item of cart) {
                if ((item.isQuickBouquet || item.isTemplate) && item.ingredients) {
                    // 1. Transaction log for the whole bouquet (Sale)
                    const { error: btError } = await supabase
                        .from('transactions')
                        .insert({
                            user_id: user?.id,
                            transaction_type: 'sale_bouquet',
                            quantity: item.quantity,
                            unit_price: item.price,
                            total_price: item.price * item.quantity,
                            payment_method: 'cash',
                            notes: `${item.isTemplate ? 'Vorlage' : 'Schnell-Strauß'}: ${item.name}`
                        });

                    if (btError) throw btError;

                    // 2. Deduct each product ingredient and log usage
                    for (const ing of item.ingredients) {
                        if (ing.type === 'product') {
                            // Find relevant inventory entry for this product
                            const { data: currentInv } = await supabase
                                .from('inventory')
                                .select('id, quantity')
                                .eq('product_id', ing.productId || (ing as any).product_id)
                                .maybeSingle();

                            if (currentInv) {
                                await supabase
                                    .from('inventory')
                                    .update({ quantity: Math.max(0, currentInv.quantity - (ing.quantity * item.quantity)) })
                                    .eq('id', currentInv.id);

                                await supabase.from('transactions').insert({
                                    user_id: user?.id,
                                    product_id: ing.productId || (ing as any).product_id,
                                    transaction_type: 'usage',
                                    quantity: ing.quantity * item.quantity,
                                    unit_price: 0,
                                    total_price: 0,
                                    notes: `Bestandteil von ${item.name}`
                                });
                            }
                        }
                    }
                } else if (item.inventoryId) {
                    // Regular item sale or produced bouquet sale
                    await supabase.from('transactions').insert({
                        user_id: user?.id,
                        product_id: item.productId,
                        transaction_type: 'sale',
                        quantity: item.quantity,
                        unit_price: item.price,
                        total_price: item.price * item.quantity,
                        payment_method: 'cash'
                    });

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

            alert(`Verkauf erfolgreich! Gesamt: ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cartTotal)}`);
            setCart([]);
            fetchInventory();

        } catch (error) {
            console.error('Checkout failed:', error);
            alert('Fehler beim Verkauf. Bitte prüfen.');
        } finally {
            setProcessing(false);
        }
    };

    const displayProducts = activeTab === 'single' ? products : bouquets;

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <h1 className="text-2xl font-bold text-gray-800 mb-4 shrink-0">Verkauf</h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 shrink-0">
                <button
                    onClick={() => setActiveTab('single')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'single'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Einzelverkauf
                </button>
                <button
                    onClick={() => setActiveTab('bouquet')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'bouquet'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    💐 Vorbereitete Sträuße
                </button>
                <div className="flex-1" />
                <button
                    onClick={() => setIsQuickBouquetModalOpen(true)}
                    className="px-4 py-2 rounded-lg font-bold bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors flex items-center border border-pink-100"
                >
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Schnell-Strauß
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4">
                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto pr-2">
                    <h2 className="text-sm font-semibold text-gray-500 mb-2 sticky top-0 bg-neutral-bg py-1 z-10">
                        {activeTab === 'single' ? 'Verfügbare Artikel' : 'Vorbereitete Sträuße'}
                    </h2>
                    {loading ? (
                        <p className="text-gray-400 text-sm">Lade Produkte...</p>
                    ) : displayProducts.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                            <ArchiveBoxXMarkIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">
                                {activeTab === 'single' ? 'Lager ist leer.' : 'Keine vorbereiteten Sträuße vorhanden.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                            {displayProducts.map(item => (
                                <ProductSelectionCard
                                    key={item.isTemplate ? `temp-${item.id}` : item.id}
                                    name={item.isTemplate ? item.name! : item.products!.name}
                                    category={item.isTemplate ? 'Vorlage' : (item.products?.categories?.name || 'Strauß')}
                                    stock={item.quantity}
                                    onClick={() => addToCart(item)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart */}
                <div className="w-full md:w-1/3 bg-white border-l border-neutral-200 pl-0 md:pl-4 flex flex-col shadow-xl md:shadow-none rounded-t-2xl md:rounded-none z-20 pb-safe-area-inset-bottom">
                    <div className="p-4 border-b border-gray-100 shrink-0">
                        <h2 className="font-semibold text-gray-800">Warenkorb ({cart.length})</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center italic mt-10">Warenkorb leer</p>
                        ) : (
                            cart.map((item, idx) => (
                                <CartItem
                                    key={item.inventoryId || `quick-${idx}`}
                                    name={item.name}
                                    quantity={item.quantity}
                                    price={item.price}
                                    onUpdateQuantity={(q) => updateCartItem(item.inventoryId, idx, { quantity: q })}
                                    onUpdatePrice={(p) => updateCartItem(item.inventoryId, idx, { price: p })}
                                    onRemove={() => removeFromCart(item.inventoryId, idx)}
                                />
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-600">Gesamt</span>
                            <span className="text-2xl font-bold text-primary">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cartTotal)}
                            </span>
                        </div>
                        <Button
                            fullWidth
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || processing}
                        >
                            {processing ? 'Buche...' : 'Betrag kassieren'}
                        </Button>
                    </div>
                </div>
            </div>

            <QuickBouquetModal
                isOpen={isQuickBouquetModalOpen}
                onClose={() => setIsQuickBouquetModalOpen(false)}
                onAdd={addQuickBouquetToCart}
            />
        </div>
    );
};

export default Sale;