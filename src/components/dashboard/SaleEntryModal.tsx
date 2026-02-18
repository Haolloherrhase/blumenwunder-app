import { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const CATEGORIES = [
    { id: 'schnittblumen', label: 'Schnittblumen', icon: '✂️' },
    { id: 'topfpflanzen', label: 'Topfpflanzen', icon: '🪴' },
    { id: 'deko', label: 'Deko', icon: '🎀' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

interface SaleEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: { category: CategoryId; amount: number; description: string }) => Promise<void>;
}

const SaleEntryModal: React.FC<SaleEntryModalProps> = ({ isOpen, onClose, onSave }) => {
    const [category, setCategory] = useState<CategoryId>('schnittblumen');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const amountRef = useRef<HTMLInputElement>(null);

    // Focus amount field when modal opens
    useEffect(() => {
        if (isOpen) {
            setCategory('schnittblumen');
            setAmount('');
            setDescription('');
            setError('');
            setTimeout(() => amountRef.current?.focus(), 150);
        }
    }, [isOpen]);

    const handleSave = async () => {
        const parsedAmount = parseFloat(amount.replace(',', '.'));
        if (!parsedAmount || parsedAmount <= 0) {
            setError('Bitte gültigen Betrag eingeben');
            return;
        }

        setSaving(true);
        setError('');

        try {
            await onSave({
                category,
                amount: parsedAmount,
                description: description.trim(),
            });
            onClose();
        } catch (e) {
            console.error('Save failed:', e);
            setError('Fehler beim Speichern. Bitte erneut versuchen.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slideUp overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">🛒 Verkauf erfassen</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <XMarkIcon className="h-6 w-6 text-gray-400" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Category Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-2">
                            Kategorie
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-200 ${
                                        category === cat.id
                                            ? 'border-primary bg-primary/10 shadow-md scale-[1.02]'
                                            : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="text-2xl mb-1">{cat.icon}</span>
                                    <span className={`text-xs font-semibold ${
                                        category === cat.id ? 'text-primary' : 'text-gray-600'
                                    }`}>
                                        {cat.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-2">
                            Betrag (€)
                        </label>
                        <div className="relative">
                            <input
                                ref={amountRef}
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                className="w-full text-3xl font-bold text-center py-4 px-6 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-gray-50 focus:bg-white"
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-300">
                                €
                            </span>
                        </div>
                    </div>

                    {/* Description Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-2">
                            Notiz <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="z.B. 3x Rosen"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            className="w-full py-3 px-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-700"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
                    )}

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving || !amount}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Speichern...
                            </span>
                        ) : 'Verkauf speichern'}
                    </button>
                </div>

                {/* Safe area padding for mobile */}
                <div className="h-safe-area-inset-bottom" />
            </div>
        </div>
    );
};

export default SaleEntryModal;
