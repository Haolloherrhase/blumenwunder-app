import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Category {
    id: string;
    name: string;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await supabase.from('categories').select('*');
            if (data) setCategories(data);
        };

        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create Product
            const { data: productData, error: productError } = await supabase
                .from('products')
                .insert({
                    name,
                    category_id: categoryId,
                    avg_shelf_life_days: 7,
                    vat_rate: 0
                })
                .select()
                .single();

            if (productError) throw productError;

            // 2. Create Inventory Entry (initially 0)
            const { error: inventoryError } = await supabase
                .from('inventory')
                .insert({
                    product_id: productData.id,
                    quantity: 0,
                    unit_purchase_price: Number(unitPrice) || 0
                });

            if (inventoryError) throw inventoryError;

            onSuccess();
            onClose();
            setName('');
            setCategoryId('');
            setUnitPrice('');
        } catch (error) {
            console.error('Error adding item:', error);
            alert('Fehler beim Hinzufügen. Bitte erneut versuchen.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">
                        Neues Produkt
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <Input
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={'z.B. Rote Rose oder Seidenband Rot'}
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kategorie
                        </label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                        >
                            <option value="">Bitte wählen...</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Einkaufspreis (pro Stück)"
                        type="number"
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        placeholder="0.00"
                        required
                    />

                    <div className="pt-2">
                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? 'Speichere...' : 'Hinzufügen'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProductModal;
