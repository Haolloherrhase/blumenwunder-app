import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import MaterialModal from '../components/materials/MaterialModal';

interface Material {
    id: string;
    name: string;
    unit_price: number;
}

const Materials = () => {
    const navigate = useNavigate();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('materials')
            .select('*')
            .order('name');

        if (data) setMaterials(data);
        setLoading(false);
    };

    const handleSave = async (materialData: Partial<Material>) => {
        if (editingMaterial) {
            const { error } = await supabase
                .from('materials')
                .update(materialData)
                .eq('id', editingMaterial.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('materials')
                .insert(materialData);
            if (error) throw error;
        }
        fetchMaterials();
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Möchtest du "${name}" wirklich löschen?`)) return;

        const { error } = await supabase
            .from('materials')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Material kann nicht gelöscht werden, da es evtl. in Strauß-Vorlagen verwendet wird.');
        } else {
            fetchMaterials();
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <button onClick={() => navigate('/more')} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Material-Bibliothek</h1>
                </div>
                <Button onClick={() => { setEditingMaterial(null); setIsModalOpen(true); }} className="!rounded-full">
                    <PlusIcon className="h-5 w-5 mr-1" /> Neu
                </Button>
            </div>

            <Card>
                {loading ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Lade Materialien...</p>
                ) : materials.length === 0 ? (
                    <p className="text-gray-400 text-sm py-10 text-center italic">Keine Materialien angelegt.</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {materials.map((m) => (
                            <div key={m.id} className="py-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-800">{m.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(m.unit_price)} / Einheit
                                    </p>
                                </div>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => { setEditingMaterial(m); setIsModalOpen(true); }}
                                        className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg"
                                    >
                                        <PencilSquareIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(m.id, m.name)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-lg"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>💡 Info:</strong> Änderungen an Preisen hier wirken sich nur auf zukünftige Zusammenstellungen (Strauß-Generator & Schnell-Strauß) aus. Gespeicherte Vorlagen werden nicht automatisch aktualisiert.
                </p>
            </div>

            <MaterialModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                editingMaterial={editingMaterial}
            />
        </div>
    );
};

export default Materials;
