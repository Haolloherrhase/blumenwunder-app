import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// ── Types ───────────────────────────────────────────────────
interface ReceiptSale {
    description: string;
    total_price: number;
    quantity: number;
    category: string;
    created_at: string;
    payment_method?: string;
}

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: ReceiptSale | null;
    storeSettings: {
        store_name: string;
        store_address: string;
    };
}

// ── Helpers ─────────────────────────────────────────────────
const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }) + '  ' + d.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getCategoryLabel = (id: string) => {
    const map: Record<string, string> = {
        schnittblumen: 'Schnittblumen',
        topfpflanzen: 'Topfpflanzen',
        deko: 'Deko',
    };
    return map[id] || id;
};

// ── Component ───────────────────────────────────────────────
const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, sale, storeSettings }) => {
    if (!isOpen || !sale) return null;

    const totalPrice = Number(sale.total_price);
    const vatRate = 19;
    const netPrice = totalPrice / (1 + vatRate / 100);
    const vatAmount = totalPrice - netPrice;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm no-print"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm mx-4 bg-white rounded-3xl shadow-2xl animate-slideUp overflow-hidden flex flex-col max-h-[90vh]">
                {/* Close button — hidden in print */}
                <div className="absolute top-4 right-4 z-10 no-print">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <XMarkIcon className="h-6 w-6 text-gray-400" />
                    </button>
                </div>

                {/* Receipt content */}
                <div className="receipt-content p-8 flex-1 overflow-y-auto">
                    {/* Store Header */}
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">
                            {storeSettings.store_name || 'Blumenwunder'}
                        </h2>
                        {storeSettings.store_address && (
                            <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">
                                {storeSettings.store_address}
                            </p>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-dashed border-gray-200 my-4" />

                    {/* Date */}
                    <p className="text-sm text-gray-500 text-center">
                        {formatDateTime(sale.created_at)}
                    </p>

                    {/* Divider */}
                    <div className="border-t-2 border-dashed border-gray-200 my-4" />

                    {/* Item */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="font-semibold text-gray-800">
                                    {sale.description || getCategoryLabel(sale.category)}
                                </p>
                                {sale.quantity > 1 && (
                                    <p className="text-xs text-gray-400">
                                        {sale.quantity}x à {formatCurrency(totalPrice / sale.quantity)}
                                    </p>
                                )}
                            </div>
                            <p className="font-bold text-gray-800 tabular-nums ml-4">
                                {formatCurrency(totalPrice)}
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-dashed border-gray-200 my-4" />

                    {/* Totals */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between font-bold text-lg text-gray-800">
                            <span>Gesamt</span>
                            <span className="tabular-nums">{formatCurrency(totalPrice)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>inkl. {vatRate}% MwSt</span>
                            <span className="tabular-nums">{formatCurrency(vatAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Netto</span>
                            <span className="tabular-nums">{formatCurrency(netPrice)}</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-dashed border-gray-200 my-4" />

                    {/* Payment method */}
                    <p className="text-sm text-gray-500 text-center">
                        Zahlungsart: {sale.payment_method === 'card' ? 'Karte' : 'Bar'}
                    </p>

                    {/* Thank you */}
                    <div className="text-center mt-6">
                        <p className="text-sm text-gray-500">
                            Vielen Dank für Ihren Einkauf! 🌸
                        </p>
                    </div>
                </div>

                {/* Action Buttons — hidden in print */}
                <div className="p-5 border-t border-gray-100 flex gap-3 no-print">
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <span>🖨️</span> Drucken
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                    >
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
