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

    // Form State
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState<number>(0);
    const [unitPrice, setUnitPrice] = useState<number>(0);
    const [supplierName, setSupplierName] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true); // Hier wird loading jetzt benutzt!
        const { data } = await supabase
            .from('products')
            .select('id, name')
            .order('name');
        if (data) setProducts(data);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if ((isNewProduct ? !newProductName : !selectedProductId) || quantity <= 0 || unitPrice <= 0) {
            alert('Bitte alle Felder ausfüllen!');
            return;
        }

        setSubmitting(true);

        try {
            let productId = selectedProductId;

            if (isNewProduct) {
                const trimmedName = newProductName.trim();
                const { data: existing } = await supabase
                    .from('products')
                    .select('id')
                    .ilike('name', trimmedName)
                    .maybeSingle();

                if (existing) {
                    productId = existing.id;
                } else {
                    const { data: newProd, error: pErr } = await supabase
                        .from('products')
                        .insert({ name: trimmedName })
                        .select()
                        .single();
                    if (pErr) throw pErr;
                    productId = newProd.id;
                }
            }

            // Transaktion buchen
            const { error: tErr } = await supabase
                .from('transactions')
                .insert({
                    user_id: user?.id,
                    product_id: productId,
                    transaction_type: 'purchase',
                    quantity: quantity,
                    unit_price: unitPrice,
                    total_price: quantity * unitPrice,
                    notes: `Lieferant: ${supplierName}`,
                    payment_method: 'Rechnung'
                });
            if (tErr) throw tErr;

            // Inventar-Logik passend zu deinem SQL-Schema
            const { data: inv } = await supabase
                .from('inventory')
                .select('id, quantity')
                .eq('product_id', productId)
                .maybeSingle();

            if (inv) {
                await supabase
                    .from('inventory')
                    .update({
                        quantity: inv.quantity + quantity,
                        unit_purchase_price: unitPrice,
                        last_updated: new Date().toISOString()
                    })
                    .eq('id', inv.id);
            } else {
                await supabase
                    .from('inventory')
                    .insert({
                        product_id: productId,
                        quantity: quantity,
                        unit_purchase_price: unitPrice,
                        last_updated: new Date().toISOString()
                    });
            }

            alert('Wareneingang erfolgreich gebucht!');

            setIsNewProduct(false);
            setNewProductName('');
            setSelectedProductId('');
            setQuantity(0);
            setUnitPrice(0);
            setSupplierName('');
            fetchProducts();
            if (onSuccess) onSuccess();

        } catch (err) {
            console.error(err);
            alert('Fehler beim Speichern.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Blume/Ware *</label>
                    <button type="button" onClick={() => setIsNewProduct(!isNewProduct)} className="text-xs text-blue-600 underline">
                        {isNewProduct ? "Aus Liste wählen" : "+ Neue Ware"}
                    </button>
                </div>
                {isNewProduct ? (
                    <Input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Name der neuen Ware..." />
                ) : (
                    <select
                        value={selectedProductId}
                        onChange={e => setSelectedProductId(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                        disabled={loading} // Benutzung von loading
                    >
                        <option value="">{loading ? 'Lade Produkte...' : '-- Wählen --'}</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-gray-700">Menge</label>
                    <Input type="number" value={quantity || ''} onChange={e => setQuantity(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700">Preis/Stk</label>
                    <Input type="number" step="0.01" value={unitPrice || ''} onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)} />
                </div>
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700">Lieferant</label>
                <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="z.B. Holland-Blumen" />
            </div>

            <Button type="submit" fullWidth disabled={submitting || loading}>
                {submitting ? 'Lädt...' : 'Wareneingang buchen'}
            </Button>
        </form>
    );
};

export default PurchaseForm;
