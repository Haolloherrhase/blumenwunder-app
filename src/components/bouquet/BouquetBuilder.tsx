import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { MinusIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Product {
    id: string;
    name: string;
    unit_purchase_price: number;
}

interface Material {
    id: string;
    name: string;
    unit_price: number;
}

interface Ingredient {
    id: string; // product_id or material_id
    name: string;
    type: 'product' | 'material';
    quantity: number;
    unitPrice: number;
}

interface BouquetBuilderProps {
    templateId?: string;
    onSave: () => void;
    onCancel: () => void;
}

const LABOR_PERCENTAGE = 0.10; // 10% Arbeitszuschlag

const BouquetBuilder: React.FC<BouquetBuilderProps> = ({ templateId, onSave, onCancel }) => {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [finalPrice, setFinalPrice] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<'products' | 'materials'>('products');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
        if (templateId) {
            loadTemplate();
        }
    }, [templateId]);

    const fetchData = async () => {
        // Fetch products with inventory
        const { data: productsData } = await supabase
            .from('inventory')
            .select(`
                products (
                    id,
                    name
                ),
                unit_purchase_price
            `);

        if (productsData) {
            const prods = productsData
                .filter(item => item.products)
                .map(item => ({
                    id: item.products.id,
                    name: item.products.name,
                    unit_purchase_price: item.unit_purchase_price || 0
                }));
            setProducts(prods);
        }

        // Fetch materials
        const { data: materialsData } = await supabase
            .from('materials')
            .select('id, name, unit_price');

        if (materialsData) {
            setMaterials(materialsData);
        }
    };

    const loadTemplate = async () => {
        if (!templateId) return;

        const { data: template } = await supabase
            .from('bouquet_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (template) {
            setName(template.name);
            setDescription(template.description || '');
            setFinalPrice(template.base_price);
        }

        const { data: items } = await supabase
            .from('bouquet_template_items')
            .select('*')
            .eq('template_id', templateId);

        if (items) {
            const loadedIngredients: Ingredient[] = [];

            for (const item of items) {
                if (item.product_id) {
                    const product = products.find(p => p.id === item.product_id);
                    if (product) {
                        loadedIngredients.push({
                            id: product.id,
                            name: product.name,
                            type: 'product',
                            quantity: item.quantity,
                            unitPrice: product.unit_purchase_price
                        });
                    }
                } else if (item.material_id) {
                    const material = materials.find(m => m.id === item.material_id);
                    if (material) {
                        loadedIngredients.push({
                            id: material.id,
                            name: material.name,
                            type: 'material',
                            quantity: item.quantity,
                            unitPrice: material.unit_price
                        });
                    }
                }
            }
            setIngredients(loadedIngredients);
        }
    };

    const addIngredient = (item: Product | Material, type: 'product' | 'material') => {
        const existing = ingredients.find(ing => ing.id === item.id && ing.type === type);
        if (existing) {
            setIngredients(ingredients.map(ing =>
                ing.id === item.id && ing.type === type
                    ? { ...ing, quantity: ing.quantity + 1 }
                    : ing
            ));
        } else {
            setIngredients([...ingredients, {
                id: item.id,
                name: item.name,
                type,
                quantity: 1,
                unitPrice: type === 'product' ? (item as Product).unit_purchase_price : (item as Material).unit_price
            }]);
        }
    };

    const updateQuantity = (id: string, type: 'product' | 'material', delta: number) => {
        setIngredients(ingredients.map(ing =>
            ing.id === id && ing.type === type
                ? { ...ing, quantity: Math.max(1, ing.quantity + delta) }
                : ing
        ));
    };

    const removeIngredient = (id: string, type: 'product' | 'material') => {
        setIngredients(ingredients.filter(ing => !(ing.id === id && ing.type === type)));
    };

    // Price Calculation
    const calculatePrices = () => {
        const productsCost = ingredients
            .filter(ing => ing.type === 'product')
            .reduce((sum, ing) => sum + (ing.unitPrice * ing.quantity), 0);

        const materialsCost = ingredients
            .filter(ing => ing.type === 'material')
            .reduce((sum, ing) => sum + (ing.unitPrice * ing.quantity), 0);

        const subtotal = productsCost + materialsCost;
        const laborCost = subtotal * LABOR_PERCENTAGE;
        const suggestedPrice = subtotal + laborCost;

        return {
            productsCost,
            materialsCost,
            subtotal,
            laborCost,
            suggestedPrice
        };
    };

    const prices = calculatePrices();

    // Auto-set final price to suggested price when ingredients change
    useEffect(() => {
        if (ingredients.length > 0 && finalPrice === 0) {
            setFinalPrice(parseFloat(prices.suggestedPrice.toFixed(2)));
        }
    }, [ingredients]);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Bitte gib einen Namen ein!');
            return;
        }

        if (ingredients.length === 0) {
            alert('Bitte füge mindestens eine Zutat hinzu!');
            return;
        }

        if (finalPrice <= 0) {
            alert('Bitte gib einen Verkaufspreis ein!');
            return;
        }

        setLoading(true);

        try {
            let bouquetId = templateId;

            if (templateId) {
                // Update existing template
                await supabase
                    .from('bouquet_templates')
                    .update({
                        name,
                        description,
                        base_price: finalPrice
                    })
                    .eq('id', templateId);

                // Delete old items
                await supabase
                    .from('bouquet_template_items')
                    .delete()
                    .eq('template_id', templateId);
            } else {
                // Create new template
                const { data, error } = await supabase
                    .from('bouquet_templates')
                    .insert({
                        name,
                        description,
                        base_price: finalPrice,
                        created_by: user?.id
                    })
                    .select()
                    .single();

                if (error) throw error;
                bouquetId = data.id;
            }

            // Insert items
            const items = ingredients.map(ing => ({
                template_id: bouquetId,
                product_id: ing.type === 'product' ? ing.id : null,
                material_id: ing.type === 'material' ? ing.id : null,
                quantity: ing.quantity
            }));

            await supabase
                .from('bouquet_template_items')
                .insert(items);

            alert('Strauß erfolgreich gespeichert!');
            onSave();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Fehler beim Speichern!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Ingredient Selection */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Zutaten auswählen</h3>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`px-4 py-2 font-medium ${activeTab === 'products'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Blumen
                    </button>
                    <button
                        onClick={() => setActiveTab('materials')}
                        className={`px-4 py-2 font-medium ${activeTab === 'materials'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Materialien
                    </button>
                </div>

                {/* Product/Material List */}
                <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                    {activeTab === 'products' && products.map(product => (
                        <button
                            key={product.id}
                            onClick={() => addIngredient(product, 'product')}
                            className="p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-sm transition-all text-left"
                        >
                            <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(product.unit_purchase_price)}
                            </p>
                        </button>
                    ))}

                    {activeTab === 'materials' && materials.map(material => (
                        <button
                            key={material.id}
                            onClick={() => addIngredient(material, 'material')}
                            className="p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-sm transition-all text-left"
                        >
                            <p className="font-medium text-gray-800 text-sm">{material.name}</p>
                            <p className="text-xs text-gray-500">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(material.unit_price)}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right: Current Bouquet */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Aktueller Strauß</h3>

                {/* Name & Description */}
                <div className="space-y-3">
                    <Input
                        type="text"
                        placeholder="Strauß-Name (z.B. Rosenstrauß Deluxe)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                        type="text"
                        placeholder="Beschreibung (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* Ingredients List */}
                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Zutaten:</p>
                    {ingredients.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Noch keine Zutaten hinzugefügt</p>
                    ) : (
                        ingredients.map((ing, idx) => (
                            <div key={`${ing.id}-${ing.type}-${idx}`} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{ing.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(ing.unitPrice)} × {ing.quantity}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => updateQuantity(ing.id, ing.type, -1)}
                                        className="p-1 rounded hover:bg-gray-200"
                                    >
                                        <MinusIcon className="h-4 w-4 text-gray-600" />
                                    </button>
                                    <span className="text-sm font-medium w-6 text-center">{ing.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(ing.id, ing.type, 1)}
                                        className="p-1 rounded hover:bg-gray-200"
                                    >
                                        <PlusIcon className="h-4 w-4 text-gray-600" />
                                    </button>
                                    <button
                                        onClick={() => removeIngredient(ing.id, ing.type)}
                                        className="p-1 rounded hover:bg-red-100"
                                    >
                                        <XMarkIcon className="h-4 w-4 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Price Calculation */}
                {ingredients.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-blue-900">Kalkulation</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-gray-700">
                                <span>Blumen:</span>
                                <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(prices.productsCost)}</span>
                            </div>
                            <div className="flex justify-between text-gray-700">
                                <span>Material:</span>
                                <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(prices.materialsCost)}</span>
                            </div>
                            <div className="flex justify-between text-gray-700 border-t border-blue-300 pt-1">
                                <span>Zwischensumme:</span>
                                <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(prices.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-gray-700">
                                <span>Arbeitszuschlag (10%):</span>
                                <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(prices.laborCost)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-blue-900 border-t border-blue-300 pt-1">
                                <span>Empfohlener Preis:</span>
                                <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(prices.suggestedPrice)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Final Price Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Verkaufspreis *
                    </label>
                    <Input
                        type="number"
                        step="0.01"
                        value={finalPrice || ''}
                        onChange={(e) => setFinalPrice(parseFloat(e.target.value) || 0)}
                        placeholder="z.B. 45.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Empfohlen: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(prices.suggestedPrice)}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                    <Button onClick={handleSave} fullWidth disabled={loading}>
                        {loading ? 'Speichere...' : 'Strauß speichern'}
                    </Button>
                    <Button onClick={onCancel} variant="secondary" fullWidth>
                        Abbrechen
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default BouquetBuilder;
