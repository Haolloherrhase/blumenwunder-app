import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Material {
    id?: string;
    name: string;
    unit_price: number;
}

interface MaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (material: Partial<Material>) => Promise<void>;
    editingMaterial?: Material | null;
}

const MaterialModal: React.FC<MaterialModalProps> = ({ isOpen, onClose, onSave, editingMaterial }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingMaterial) {
            setName(editingMaterial.name);
            setPrice(editingMaterial.unit_price);
        } else {
            setName('');
            setPrice(0);
        }
    }, [editingMaterial, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({ name, unit_price: price } as any);
            onClose();
        } catch (error) {
            console.error('Error saving material:', error);
            alert('Fehler beim Speichern.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">
                        {editingMaterial ? 'Material bearbeiten' : 'Neues Material'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <Input
                        label="Name des Materials"
                        placeholder="z.B. Seidenband, Folie, Kordel"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <Input
                        label="Preis pro Einheit (€)"
                        type="number"
                        step="0.01"
                        min="0"
                        value={price || ''}
                        onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                        required
                    />

                    <div className="pt-4 flex space-x-3">
                        <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={loading}>
                            Abbrechen
                        </Button>
                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? 'Speichere...' : 'Speichern'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MaterialModal;
