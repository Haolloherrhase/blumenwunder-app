import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import ProductSelectionCard from '../components/pos/ProductSelectionCard';
import CartItem from '../components/pos/CartItem';
import { ArchiveBoxXMarkIcon } from '@heroicons/react/24/outline';

interface InventoryProduct {
    id: string; // Inventory ID
    product_id: string;
    quantity: number;
    products: {
        name: string;
        categories: {
            name: string;
        }
    }
}

interface CartEntry {
    inventoryId: string;
    productId: string;
    name: string;
    quantity: number;
    price: number; // Unit price for this sale
}

const Sale = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [cart, setCart] = useState<CartEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Fetch Inventory
    const fetchInventory = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('inventory')
            .select(`
                id,
                quantity,
                product_id,
                products (
                    name,
                    categories (name)
                )
            `)
            .gt('quantity', 0) // Only show items in stock
            .order('quantity', { ascending: false });

        if (data) {
            setProducts(data as any);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    // Cart Actions
    const addToCart = (item: InventoryProduct) => {
        setCart(prev => {
            const existing = prev.find(p => p.inventoryId === item.id);
            if (existing) {
                return prev.map(p =>
                    p.inventoryId === item.id ? { ...p, quantity: p.quantity + 1 } : p
                );
            }
            return [...prev, {
                inventoryId: item.id,
                productId: item.product_id,
                name: item.products.name,
                quantity: 1,
                price: 2.50 // Default dummy price, user should edit
            }];
        });
    };

    const updateCartItem = (inventoryId: string, updates: Partial<CartEntry>) => {
        setCart(prev => prev.map(item =>
            item.inventoryId === inventoryId ? { ...item, ...updates } : item
        ));
    };

    const removeFromCart = (inventoryId: string) => {
        setCart(prev => prev.filter(item => item.inventoryId !== inventoryId));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Checkout
    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setProcessing(true);

        try {
            // 1. Create Transactions
            const transactions = cart.map(item => ({
                user_id: user?.id,
                product_id: item.productId,
                transaction_type: 'sale',
                quantity: item.quantity,
                unit_price: item.price,
                total_price: item.price * item.quantity,
                payment_method: 'cash' // Default for now
            }));

            const { error: transError } = await supabase
                .from('transactions')
                .insert(transactions);

            if (transError) throw transError;

            // 2. Update Inventory (Decrement)
            // Note: In a real app we'd use an RPC for atomicity, but loop is fine for MVP
            for (const item of cart) {
                // Determine current stock from basic fetch or just decrement safely
                // We'll use the 'rpc' approach if possible, but standard update is easier here
                // We fetch current qty first to be safe, or relies on database constraints

                // Simple decrementer:
                // Fetch current first to avoid negative?
                // We trust the UI for now for speed.

                // Let's call rpc if we had one, otherwise:
                // RPC is cleaner: create a decrement function in SQL.
                // For now: read-modify-write (optimistic locking not implemented)
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

            // Success
            alert(`Verkauf erfolgreich! Gesamt: ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cartTotal)}`);
            setCart([]);
            fetchInventory(); // Refresh stock

        } catch (error) {
            console.error('Checkout failed:', error);
            alert('Fehler beim Verkauf. Bitte prüfen.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <h1 className="text-2xl font-bold text-gray-800 mb-4 shrink-0">Verkauf</h1>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4">
                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto pr-2">
                    <h2 className="text-sm font-semibold text-gray-500 mb-2 sticky top-0 bg-neutral-bg py-1 z-10">
                        Verfügbare Artikel
                    </h2>
                    {loading ? (
                        <p className="text-gray-400 text-sm">Lade Produkte...</p>
                    ) : products.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                            <ArchiveBoxXMarkIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">Lager ist leer.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                            {products.map(item => (
                                <ProductSelectionCard
                                    key={item.id}
                                    name={item.products.name}
                                    category={item.products.categories.name}
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
                            cart.map(item => (
                                <CartItem
                                    key={item.inventoryId}
                                    name={item.name}
                                    quantity={item.quantity}
                                    price={item.price}
                                    onUpdateQuantity={(q) => updateCartItem(item.inventoryId, { quantity: q })}
                                    onUpdatePrice={(p) => updateCartItem(item.inventoryId, { price: p })}
                                    onRemove={() => removeFromCart(item.inventoryId)}
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
        </div>
    );
};

export default Sale;
