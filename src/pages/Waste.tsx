import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ArrowLeftIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface InventoryItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_purchase_price: number;
    products: {
        name: string;
    };
}

const Waste = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // States
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form States
    const [selectedId, setSelectedId] = useState('');
    const [type, setType] = useState<'waste' | 'personal' | 'gift' | 'discount'>('waste');
    const [quantity, setQuantity] = useState<number>(0);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('inventory')
            .select(`
                id,
                product_id,
                quantity,
                unit_purchase_price,
                products (name)
            `)
            .gt('quantity', 0)
            .order('last_updated', { ascending: false });

        if (data) setInventory(data as any);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedId || quantity <= 0) {
            alert('Bitte wähle einen Artikel und eine Menge aus.');
            return;
        }

        const item = inventory.find(i => i.id === selectedId);
        if (!item || item.quantity < quantity) {
            alert('Nicht genügend Bestand vorhanden!');
            return;
        }

        setSubmitting(true);

        try {
            // 1. Transaction loggen
            const { error: transError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user?.id,
                    product_id: item.product_id,
                    transaction_type: type,
                    quantity: quantity,
                    unit_price: item.unit_purchase_price,
                    total_price: item.unit_purchase_price * quantity,
                    notes: notes.trim() || undefined
                });

            if (transError) throw transError;

            // 2. Bestand anpassen
            const { error: invError } = await supabase
                .from('inventory')
                .update({
                    quantity: item.quantity - quantity,
                    last_updated: new Date().toISOString()
                })
                .eq('id', item.id);

            if (invError) throw invError;

            alert('Abgang erfolgreich gebucht!');
            navigate('/more');

        } catch (error) {
            console.error('Error logging waste:', error);
            alert('Fehler beim Speichern.');
        } finally {
            setSubmitting(false);
        }
    };

    const typeLabels = {
        waste: 'Schwund / Verdorben',
        personal: 'Eigennutz',
        gift: 'Geschenk',
        discount: 'Rabattiert (Abgang)'
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center space-x-3">
                <button onClick={() => navigate('/more')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Schwund & Abgang</h1>
            </div>

            <Card>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Item Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Artikel wählen *</label>
                        <select
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            required
                            disabled={loading}
                        >
                            <option value="">-- Artikel wählen --</option>
                            {inventory.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.products.name} ({item.quantity} Stk. vorrätig)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grund des Abgangs *</label>
                        <div className="grid grid-cols-1 gap-2">
                            {(Object.keys(typeLabels) as Array<keyof typeof typeLabels>).map((key) => (
                                <label
                                    key={key}
                                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${type === key ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="waste_type"
                                        value={key}
                                        checked={type === key}
                                        onChange={() => setType(key)}
                                        className="sr-only"
                                    />
                                    <span className={`text-sm font-medium ${type === key ? 'text-primary' : 'text-gray-700'}`}>
                                        {typeLabels[key]}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Menge *"
                            type="number"
                            min="1"
                            value={quantity || ''}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            placeholder="Anzahl"
                            required
                        />
                        <div className="flex items-end pb-2">
                            <p className="text-xs text-gray-500 italic flex items-center">
                                <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                                Wird direkt vom Bestand abgezogen.
                            </p>
                        </div>
                    </div>

                    {/* Notes */}
                    <Input
                        label="Notizen (optional)"
                        placeholder="z.B. Tulpen verwelkt, Geschenk für ..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />

                    <div className="pt-4">
                        <Button type="submit" fullWidth disabled={submitting || loading}>
                            {submitting ? 'Buchung läuft...' : 'Abgang buchen'}
                        </Button>
                    </div>
                </form>
            </Card>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Hinweis für die Buchhaltung:</strong> Alle hier erfassten Abgänge werden im nächsten CSV-Export für den Steuerberater separat ausgewiesen. Das hilft dabei, Differenzen im Warenbestand zu klären.
                </p>
            </div>
        </div>
    );
};

export default Waste;
