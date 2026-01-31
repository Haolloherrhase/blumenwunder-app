import { useState } from 'react';
import BouquetList from '../components/bouquet/BouquetList';
import BouquetBuilder from '../components/bouquet/BouquetBuilder';

const Bouquet = () => {
    const [mode, setMode] = useState<'list' | 'builder'>('list');
    const [editingId, setEditingId] = useState<string | undefined>(undefined);

    const handleNew = () => {
        setEditingId(undefined);
        setMode('builder');
    };

    const handleEdit = (id: string) => {
        setEditingId(id);
        setMode('builder');
    };

    const handleSave = () => {
        setMode('list');
        setEditingId(undefined);
    };

    const handleCancel = () => {
        setMode('list');
        setEditingId(undefined);
    };

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-gray-800">Strauß-Konfigurator</h1>

            {mode === 'list' ? (
                <BouquetList onEdit={handleEdit} onNew={handleNew} />
            ) : (
                <BouquetBuilder
                    templateId={editingId}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
};

export default Bouquet;

