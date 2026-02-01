import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { PlusIcon, MinusIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface Product {
    id: string;
    inventoryId: string;
    name: string;
    stock: number;
    price: number;
}

interface Material {
    id: string;
    name: string;
    price: number;
}

interface Ingredient {
    inventoryId?: string;
    productId?: string;
    materialId?: string;
    name: string;
    type: 'product' | 'material';
    quantity: number;
    unitPrice: number;
}

interface QuickBouquetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (bouquet: { name: string, price: number, ingredients: Ingredient[] }) => void;
}

const QuickBouquetModal: React.FC<QuickBouquetModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>([]);
    const [bouquetName, setBouquetName] = useState('Individueller Strauß');
    const [finalPrice, setFinalPrice] = useState<number>(0);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        // Fetch products with inventory
        const { data: invData } = await supabase
            .from('inventory')
            .select(`
                id,
                quantity,
                unit_purchase_price,
                products!inner (id, name, is_bouquet)
            `)
            .eq('products.is_bouquet', false)
            .gt('quantity', 0);

        if (invData) {
            setProducts(invData.map((item: any) => ({
                id: item.products.id,
                inventoryId: item.id,
                name: item.products.name,
                stock: item.quantity,
                price: item.unit_purchase_price
            })));
        }

        // Fetch materials
        const { data: matData } = await supabase
            .from('materials')
            .select('id, name, unit_price');

        if (matData) {
            setMaterials(matData.map((m: any) => ({
                id: m.id,
                name: m.name,
                price: m.unit_price
            })));
        }
    };

    const addProduct = (p: Product) => {
        const existing = selectedIngredients.find(i => i.inventoryId === p.inventoryId);
        if (existing) {
            updateQuantity(p.inventoryId, 1);
        } else {
            setSelectedIngredients([...selectedIngredients, {
                inventoryId: p.inventoryId,
                productId: p.id,
                name: p.name,
                type: 'product',
                quantity: 1,
                unitPrice: p.price
            }]);
        }
    };

    const addMaterial = (m: Material) => {
        const existing = selectedIngredients.find(i => i.materialId === m.id);
        if (existing) {
            updateMaterialQuantity(m.id, 1);
        } else {
            setSelectedIngredients([...selectedIngredients, {
                materialId: m.id,
                name: m.name,
                type: 'material',
                quantity: 1,
                unitPrice: m.price
            }]);
        }
    };

    const updateQuantity = (id: string, delta: number) => {
        setSelectedIngredients(prev => prev.map(i => {
            if (i.inventoryId === id) {
                return { ...i, quantity: Math.max(1, i.quantity + delta) };
            }
            return i;
        }));
    };

    const updateMaterialQuantity = (id: string, delta: number) => {
        setSelectedIngredients(prev => prev.map(i => {
            if (i.materialId === id) {
                return { ...i, quantity: Math.max(1, i.quantity + delta) };
            }
            return i;
        }));
    };

    const removeIngredient = (id: string, isMaterial: boolean) => {
        setSelectedIngredients(prev => prev.filter(i => isMaterial ? i.materialId !== id : i.inventoryId !== id));
    };

    const totalEK = selectedIngredients.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);

    // Auto-suggest price (EK + 30% overhead + 100% margin as a base)
    useEffect(() => {
        if (totalEK > 0 && finalPrice === 0) {
            setFinalPrice(Math.ceil(totalEK * 2.5)); // Simple florist rule of thumb
        }
    }, [totalEK]);

    const handleConfirm = () => {
        if (selectedIngredients.length === 0) return;
        onAdd({
            name: bouquetName,
            price: finalPrice,
            ingredients: selectedIngredients
        });
        // Reset states
        setSelectedIngredients([]);
        setFinalPrice(0);
        onClose();
    };

    if (!isOpen) return null;

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-2">
                        <SparklesIcon className="h-6 w-6 text-primary" />
                        <h2 className="text-xl font-bold text-gray-800">Schnell-Strauß erstellen</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <XMarkIcon className="h-7 w-7" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* Selection Side */}
                    <div className="flex-1 p-6 border-r border-gray-100 flex flex-col space-y-4 overflow-hidden">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Blumen suchen..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <div className="absolute left-3 top-3.5 text-gray-400">🔍</div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Schnittblumen</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {filteredProducts.map(p => (
                                        <button
                                            key={p.inventoryId}
                                            onClick={() => addProduct(p)}
                                            className="p-3 bg-white border border-gray-100 rounded-2xl hover:border-primary hover:shadow-md transition-all text-left group"
                                        >
                                            <p className="font-semibold text-gray-800 text-sm group-hover:text-primary transition-colors">{p.name}</p>
                                            <p className="text-[10px] text-gray-500 mt-1">Bestand: {p.stock}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Materialien</h3>
                                <div className="flex flex-wrap gap-2">
                                    {materials.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => addMaterial(m)}
                                            className="px-4 py-2 bg-pink-50 text-pink-700 rounded-full text-xs font-semibold hover:bg-pink-100 transition-colors border border-pink-100"
                                        >
                                            {m.name} (+{m.price.toFixed(2)}€)
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Side */}
                    <div className="w-full lg:w-80 bg-gray-50 p-6 flex flex-col overflow-hidden">
                        <Input
                            label="Bezeichnung"
                            value={bouquetName}
                            onChange={(e) => setBouquetName(e.target.value)}
                            className="bg-white"
                        />

                        <div className="flex-1 mt-6 overflow-y-auto space-y-2 pr-1">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Zusammensetzung</h3>
                            {selectedIngredients.length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-10">Noch nichts ausgewählt</p>
                            ) : (
                                selectedIngredients.map((ing, idx) => (
                                    <div key={idx} className="flex flex-col bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start">
                                            <span className="text-sm font-medium text-gray-800 leading-tight">{ing.name}</span>
                                            <button
                                                onClick={() => removeIngredient(ing.type === 'product' ? ing.inventoryId! : ing.materialId!, ing.type === 'material')}
                                                className="text-gray-300 hover:text-red-500"
                                            >
                                                <XMarkIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => ing.type === 'product' ? updateQuantity(ing.inventoryId!, -1) : updateMaterialQuantity(ing.materialId!, -1)} className="p-1 rounded-full hover:bg-gray-100"><MinusIcon className="h-3 w-3" /></button>
                                                <span className="text-xs font-bold w-4 text-center">{ing.quantity}</span>
                                                <button onClick={() => ing.type === 'product' ? updateQuantity(ing.inventoryId!, 1) : updateMaterialQuantity(ing.materialId!, 1)} className="p-1 rounded-full hover:bg-gray-100"><PlusIcon className="h-3 w-3" /></button>
                                            </div>
                                            <span className="text-xs text-gray-500">{(ing.unitPrice * ing.quantity).toFixed(2)}€</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pt-6 mt-4 border-t border-gray-200">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>EK Gesamt:</span>
                                <span>{totalEK.toFixed(2)}€</span>
                            </div>
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-sm font-bold text-gray-800">VK Preis:</span>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        className="w-20 text-right font-bold text-lg text-primary bg-white border border-gray-200 rounded-lg p-1"
                                        value={finalPrice || ''}
                                        onChange={(e) => setFinalPrice(parseFloat(e.target.value) || 0)}
                                    />
                                    <span className="text-lg font-bold text-primary">€</span>
                                </div>
                            </div>
                            <Button fullWidth onClick={handleConfirm} disabled={selectedIngredients.length === 0}>
                                In den Warenkorb
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickBouquetModal;
