import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface Product {
    id: string;
    name: string;
}

interface PurchaseFormProps {
    onSuccess?: () => void;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({ onSuccess }) => {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState<number>(0);
    const [unitPrice, setUnitPrice] = useState<number>(0);
    const [supplier, setSupplier] = useState('');

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('products')
                .select('id, name')
                .order('name');

            if (data) {
                setProducts(data);
            }
            setLoading(false);
        };
        fetchProducts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedProductId || quantity <= 0 || unitPrice <= 0) {
            alert('Bitte alle Pflichtfelder ausfüllen!');
            return;
        }

        setSubmitting(true);

        try {
            // 1. Create purchase transaction
            const { error: transError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user?.id,
                    product_id: selectedProductId,
                    transaction_type: 'purchase',
                    quantity: quantity,
                    unit_price: unitPrice,
                    total_price: quantity * unitPrice,
                    payment_method: supplier || 'Lieferant unbekannt'
                });

            if (transError) throw transError;

            // 2. Update or create inventory entry
            // First, check if inventory entry exists
            const { data: existingInv } = await supabase
                .from('inventory')
                .select('id, quantity')
                .eq('product_id', selectedProductId)
                .single();

            if (existingInv) {
                // Update existing inventory
                await supabase
                    .from('inventory')
                    .update({
                        quantity: existingInv.quantity + quantity,
                        unit_purchase_price: unitPrice
                    })
                    .eq('id', existingInv.id);
            } else {
                // Create new inventory entry
                await supabase
                    .from('inventory')
                    .insert({
                        product_id: selectedProductId,
                        quantity: quantity,
                        unit_purchase_price: unitPrice
                    });
            }

            // Success
            alert(`Wareneingang erfolgreich gebucht!\n${quantity} Stück zu ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(unitPrice)}`);

            // Reset form
            setSelectedProductId('');
            setQuantity(0);
            setUnitPrice(0);
            setSupplier('');

            if (onSuccess) onSuccess();

        } catch (error) {
            console.error('Purchase failed:', error);
            alert('Fehler beim Buchen des Wareneingangs.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Produkt *
                </label>
                <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loading}
                    required
                >
                    <option value="">-- Produkt wählen --</option>
                    {products.map(product => (
                        <option key={product.id} value={product.id}>
                            {product.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Quantity */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menge *
                </label>
                <Input
                    type="number"
                    value={quantity || ''}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    placeholder="z.B. 50"
                    min="1"
                    required
                />
            </div>

            {/* Unit Price */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Einkaufspreis (pro Stück) *
                </label>
                <Input
                    type="number"
                    step="0.01"
                    value={unitPrice || ''}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    placeholder="z.B. 1.20"
                    min="0.01"
                    required
                />
            </div>

            {/* Supplier (optional) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lieferant (optional)
                </label>
                <Input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="z.B. Blumengroßhandel Müller"
                />
            </div>

            {/* Total Preview */}
            {quantity > 0 && unitPrice > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Gesamtbetrag:</p>
                    <p className="text-xl font-bold text-primary">
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(quantity * unitPrice)}
                    </p>
                </div>
            )}

            {/* Submit Button */}
            <Button
                type="submit"
                fullWidth
                disabled={submitting || loading}
            >
                {submitting ? 'Buche...' : 'Wareneingang buchen'}
            </Button>
        </form>
    );
};

export default PurchaseForm;
