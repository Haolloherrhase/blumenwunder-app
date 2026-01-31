import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import InventoryItemCard from '../components/inventory/InventoryItemCard';
import AddProductModal from '../components/inventory/AddProductModal';
import { PlusIcon } from '@heroicons/react/24/outline';

type Tab = 'products' | 'materials';

interface ProductItem {
    id: string; // This is the inventory ID
    product_id: string; // The product definition ID
    quantity: number;
    unit_purchase_price: number;
    products: {
        name: string;
        categories: {
            name: string;
        }
    }
}

const Inventory = () => {
    const [activeTab, setActiveTab] = useState<Tab>('products');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Data
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Products with Inventory
            // We select from 'inventory' and join 'products' and 'categories'
            const { data: invData, error: invError } = await supabase
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
                .order('quantity', { ascending: true }); // Low stock first

            if (invError) throw invError;
            setProducts(invData as any || []);

            // 2. Fetch Materials
            const { data: matData, error: matError } = await supabase
                .from('materials')
                .select('*')
                .order('name');

            if (matError) throw matError;
            setMaterials(matData || []);

        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const updateQuantity = async (inventoryId: string, newQuantity: number) => {
        // Optimistic update
        setProducts(prev => prev.map(item =>
            item.id === inventoryId ? { ...item, quantity: newQuantity } : item
        ));

        try {
            const { error } = await supabase
                .from('inventory')
                .update({ quantity: newQuantity })
                .eq('id', inventoryId);

            if (error) throw error;
        } catch (error) {
            console.error('Failed to update quantity:', error);
            // Revert on error would be ideal here, but skipping for simplicity in V1
            fetchData();
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Bestand</h1>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <PlusIcon className="h-5 w-5 mr-1" />
                    Neu
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'products' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Blumen & Pflanzen
                </button>
                <button
                    onClick={() => setActiveTab('materials')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'materials' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Materialien
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-400">Lade Inventar...</div>
                ) : activeTab === 'products' ? (
                    products.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            Noch keine Produkte angelegt.<br />
                            Klicke auf "Neu" um zu starten.
                        </div>
                    ) : (
                        products.map(item => (
                            <InventoryItemCard
                                key={item.id}
                                id={item.id}
                                name={item.products?.name || 'Unbekannt'}
                                quantity={item.quantity}
                                unitPrice={item.unit_purchase_price}
                                categoryName={item.products?.categories?.name} // Note: select keys match structure
                                onUpdateQuantity={(q) => updateQuantity(item.id, q)}
                            />
                        ))
                    )
                ) : (
                    materials.map(mat => (
                        <div key={mat.id} className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-gray-900">{mat.name}</h3>
                                <p className="text-sm text-gray-500">
                                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(mat.unit_price)}
                                </p>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Material</span>
                        </div>
                    ))
                )}
            </div>

            <AddProductModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                type={activeTab === 'products' ? 'product' : 'material'}
                onSuccess={fetchData}
            />
        </div>
    );
};

export default Inventory;
