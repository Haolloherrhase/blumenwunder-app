import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface BouquetTemplate {
    id: string;
    name: string;
    description: string | null;
    base_price: number;
    ingredient_count?: number;
}

interface BouquetListProps {
    onEdit: (id: string) => void;
    onNew: () => void;
}

const BouquetList: React.FC<BouquetListProps> = ({ onEdit, onNew }) => {
    const [templates, setTemplates] = useState<BouquetTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('bouquet_templates')
            .select(`
                id,
                name,
                description,
                base_price,
                bouquet_template_items (count)
            `)
            .order('created_at', { ascending: false });

        if (data) {
            const templatesWithCount = data.map(t => ({
                ...t,
                ingredient_count: t.bouquet_template_items?.[0]?.count || 0
            }));
            setTemplates(templatesWithCount);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Möchtest du "${name}" wirklich löschen?`)) return;

        const { error } = await supabase
            .from('bouquet_templates')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchTemplates();
        } else {
            alert('Fehler beim Löschen!');
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-gray-500">Lade Sträuße...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Meine Sträuße</h2>
                <Button onClick={onNew}>+ Neuer Strauß</Button>
            </div>

            {templates.length === 0 ? (
                <Card>
                    <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">Noch keine Sträuße erstellt.</p>
                        <Button onClick={onNew}>Ersten Strauß erstellen</Button>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(template => (
                        <Card key={template.id} className="hover:shadow-lg transition-shadow">
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                        {template.description && (
                                            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                                        )}
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => onEdit(template.id)}
                                            className="text-gray-400 hover:text-primary"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id, template.name)}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">
                                        {template.ingredient_count} Zutaten
                                    </span>
                                    <span className="text-lg font-bold text-primary">
                                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(template.base_price)}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BouquetList;
