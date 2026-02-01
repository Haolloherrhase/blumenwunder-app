import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { ArchiveBoxIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Ingredient {
    product_id: string | null;
    material_id: string | null;
    quantity: number;
    name: string;
    currentStock?: number;
}

interface ProduceBouquetModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: {
        id: string;
        name: string;
        base_price: number;
    };
    onSuccess: () => void;
}

const ProduceBouquetModal: React.FC<ProduceBouquetModalProps> = ({ isOpen, onClose, template, onSuccess }) => {
    const [quantity, setQuantity] = useState(1);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchIngredients();
        }
    }, [isOpen]);

    const fetchIngredients = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch template items
            const { data: items, error: itemsError } = await supabase
                .from('bouquet_template_items')
                .select(`
                    product_id,
                    material_id,
                    quantity,
                    products (name),
                    materials (name)
                `)
                .eq('template_id', template.id);

            if (itemsError) throw itemsError;

            // 2. Map and fetch current stock for products
            const mappedIngredients = await Promise.all((items || []).map(async (item: any) => {
                let currentStock = undefined;
                let name = item.products?.name || item.materials?.name || 'Unbekannt';

                if (item.product_id) {
                    const { data: inv } = await supabase
                        .from('inventory')
                        .select('quantity')
                        .eq('product_id', item.product_id)
                        .maybeSingle();
                    currentStock = inv?.quantity || 0;
                }

                return {
                    product_id: item.product_id,
                    material_id: item.material_id,
                    quantity: item.quantity,
                    name,
                    currentStock
                };
            }));

            setIngredients(mappedIngredients);
        } catch (err) {
            console.error(err);
            setError('Fehler beim Laden der Zutaten.');
        } finally {
            setLoading(false);
        }
    };

    const canProduce = ingredients.every(ing =>
        !ing.product_id || (ing.currentStock !== undefined && ing.currentStock >= ing.quantity * quantity)
    );

    const handleProduce = async () => {
        if (!canProduce || processing) return;
        setProcessing(true);
        setError(null);

        try {
            // 1. Deduct ingredients from inventory
            for (const ing of ingredients) {
                if (ing.product_id) {
                    const totalNeeded = ing.quantity * quantity;
                    const { data: currentInv } = await supabase
                        .from('inventory')
                        .select('id, quantity')
                        .eq('product_id', ing.product_id)
                        .single();

                    if (currentInv) {
                        const { error: updateErr } = await supabase
                            .from('inventory')
                            .update({ quantity: currentInv.quantity - totalNeeded })
                            .eq('id', currentInv.id);

                        if (updateErr) throw updateErr;

                        // Log consumption transaction
                        await supabase.from('transactions').insert({
                            product_id: ing.product_id,
                            transaction_type: 'usage',
                            quantity: totalNeeded,
                            unit_price: 0,
                            total_price: 0,
                            notes: `Verbrauch für Produktion: ${template.name} (x${quantity})`
                        });
                    }
                }
            }

            // 2. Add finished bouquet to inventory
            // First: Ensure product exists for this template name (as a bouquet)
            const { data: existingProduct, error: prodSearchErr } = await supabase
                .from('products')
                .select('id')
                .eq('name', template.name)
                .eq('is_bouquet', true)
                .maybeSingle();

            if (prodSearchErr) throw prodSearchErr;

            let bouquetProductId = existingProduct?.id;

            if (!bouquetProductId) {
                // Get general "Bouquets" category if it exists, or just use null
                const { data: cat } = await supabase.from('categories').select('id').ilike('name', 'Sträuße').maybeSingle();

                const { data: newProd, error: createProdErr } = await supabase
                    .from('products')
                    .insert({
                        name: template.name,
                        is_bouquet: true,
                        category_id: cat?.id
                    })
                    .select()
                    .single();

                if (createProdErr) throw createProdErr;
                bouquetProductId = newProd.id;
            }

            // Update/Create Inventory for the finished bouquet
            const { data: invEntry } = await supabase
                .from('inventory')
                .select('id, quantity')
                .eq('product_id', bouquetProductId)
                .maybeSingle();

            if (invEntry) {
                await supabase
                    .from('inventory')
                    .update({
                        quantity: invEntry.quantity + quantity,
                        unit_purchase_price: 0 // Costs are tracked via items
                    })
                    .eq('id', invEntry.id);
            } else {
                await supabase
                    .from('inventory')
                    .insert({
                        product_id: bouquetProductId,
                        quantity,
                        unit_purchase_price: 0
                    });
            }

            // Log production transaction
            await supabase.from('transactions').insert({
                product_id: bouquetProductId,
                transaction_type: 'production',
                quantity: quantity,
                unit_price: template.base_price,
                total_price: template.base_price * quantity,
                notes: `Produziert aus Template: ${template.name}`
            });

            alert(`${quantity}x ${template.name} erfolgreich produziert!`);
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError('Fehler bei der Produktion. Bitte Bestand prüfen.');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Sträuße produzieren</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
                        <p className="text-sm text-primary-dark font-medium">Vorlage: {template.name}</p>
                        <p className="text-xs text-primary-dark/70 mt-1">Verkaufspreis: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(template.base_price)}</p>
                    </div>

                    <Input
                        label="Anzahl der Sträuße"
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    />

                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Bedarf & Bestand:</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {loading ? (
                                <p className="text-sm text-gray-400">Lade Bestandsdaten...</p>
                            ) : ingredients.map((ing, idx) => {
                                const needed = ing.quantity * quantity;
                                const isShort = ing.product_id && ing.currentStock !== undefined && ing.currentStock < needed;

                                return (
                                    <div key={idx} className={`flex justify-between items-center text-sm p-2 rounded-lg ${isShort ? 'bg-red-50' : 'bg-gray-50'}`}>
                                        <div className="flex items-center space-x-2">
                                            {ing.product_id ? <ArchiveBoxIcon className="h-4 w-4 text-gray-400" /> : <div className="w-4" />}
                                            <span className={isShort ? 'text-red-700 font-medium' : 'text-gray-700'}>{ing.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900">{needed} benötigt</p>
                                            {ing.product_id && (
                                                <p className={`text-[10px] ${isShort ? 'text-red-600' : 'text-gray-500'}`}>
                                                    Bestand: {ing.currentStock}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start space-x-2">
                            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {!canProduce && !loading && (
                        <p className="text-xs text-red-500 text-center">Nicht genügend Bestand für die gewählte Menge.</p>
                    )}
                </div>

                <div className="p-6 bg-gray-50 flex space-x-3">
                    <Button
                        fullWidth
                        onClick={handleProduce}
                        disabled={!canProduce || processing || loading}
                    >
                        {processing ? 'Produziere...' : `${quantity}x fertigstellen`}
                    </Button>
                    <Button variant="secondary" onClick={onClose} disabled={processing}>
                        Abbrechen
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ProduceBouquetModal;
