import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';

const HOCHZEIT_VORLAGEN = [
    { name: 'Brautstrauß', defaultPrice: 85, defaultQty: 1 },
    { name: 'Anstecker Bräutigam', defaultPrice: 15, defaultQty: 1 },
    { name: 'Anstecker Trauzeugen', defaultPrice: 12, defaultQty: 2 },
    { name: 'Tischdekoration', defaultPrice: 25, defaultQty: 8 },
    { name: 'Kirchenschmuck / Altarschmuck', defaultPrice: 120, defaultQty: 1 },
    { name: 'Traubogen / Blumenbogen', defaultPrice: 250, defaultQty: 1 },
    { name: 'Autoschmuck', defaultPrice: 45, defaultQty: 1 },
    { name: 'Streublumen / Blütenblätter', defaultPrice: 20, defaultQty: 1 },
    { name: 'Haarschmuck Braut', defaultPrice: 35, defaultQty: 1 },
    { name: 'Blumenkinder-Körbchen', defaultPrice: 15, defaultQty: 2 },
    { name: 'Stuhlschmuck Trauung', defaultPrice: 8, defaultQty: 20 },
    { name: 'Raumdekoration / Girlanden', defaultPrice: 80, defaultQty: 1 },
    { name: 'Aufbau & Lieferung', defaultPrice: 80, defaultQty: 1 },
    { name: 'Abbau & Entsorgung', defaultPrice: 50, defaultQty: 1 },
] as const;

interface QuoteItem {
    name: string;
    quantity: number;
    unitPrice: number;
}

const Quote = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [customerName, setCustomerName] = useState('');
    const [weddingDate, setWeddingDate] = useState('');
    const [items, setItems] = useState<QuoteItem[]>([]);
    const [showTemplates, setShowTemplates] = useState(false);

    const addEmptyItem = () => {
        setItems(prev => [...prev, { name: '', quantity: 1, unitPrice: 0 }]);
        setShowTemplates(false);
    };

    const addFromTemplate = (template: typeof HOCHZEIT_VORLAGEN[number]) => {
        setItems(prev => [...prev, {
            name: template.name,
            quantity: template.defaultQty,
            unitPrice: template.defaultPrice,
        }]);
        setShowTemplates(false);
    };

    const updateItem = (index: number, updates: Partial<QuoteItem>) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
    };

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const handleShare = async () => {
        if (items.length === 0) {
            alert('Bitte mindestens eine Position hinzufügen.');
            return;
        }

        const { data: settings } = await supabase
            .from('settings')
            .select('store_name, store_address')
            .eq('user_id', user?.id)
            .maybeSingle();

        const storeName = settings?.store_name || 'Blumenwunder';
        const storeAddress = settings?.store_address || '';

        const dateFormatted = weddingDate
            ? new Date(weddingDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
            : 'Nach Absprache';

        const positionLines = items.map(item => {
            const lineTotal = item.quantity * item.unitPrice;
            if (item.quantity === 1) {
                return `${item.name}: ${formatCurrency(item.unitPrice)}`;
            }
            return `${item.name} (${item.quantity}x á ${formatCurrency(item.unitPrice)}): ${formatCurrency(lineTotal)}`;
        }).join('\n');

        const quoteText = `
${storeName}
${storeAddress}

KOSTENVORANSCHLAG — Hochzeitsfloristik

Kunde: ${customerName || '—'}
Hochzeitsdatum: ${dateFormatted}
Erstellt am: ${new Date().toLocaleDateString('de-DE')}

────────────────────────────
${positionLines}
────────────────────────────
GESAMT: ${formatCurrency(total)}

Gemäß §19 UStG wird keine Umsatzsteuer berechnet.

Dieser Kostenvoranschlag ist unverbindlich und 30 Tage gültig.
Änderungen an den Positionen sind nach Absprache möglich.

Bei Fragen stehe ich gerne zur Verfügung!

Mit freundlichen Grüßen
${storeName}
        `.trim();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Kostenvoranschlag Hochzeit — ${customerName || 'Kunde'}`,
                    text: quoteText,
                });
                return;
            } catch (e) {
                console.error("Native share failed:", e);
            }
        }

        const subject = encodeURIComponent(`Kostenvoranschlag Hochzeitsfloristik — ${storeName}`);
        const body = encodeURIComponent(quoteText);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-24">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/more')}
                    className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">💒 Kostenvoranschlag</h1>
                    <p className="text-gray-500 text-sm mt-1">Hochzeitsfloristik</p>
                </div>
            </div>

            {/* Kundeninfos */}
            <Card className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Kundenname
                    </label>
                    <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Frau Schneider"
                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Hochzeitsdatum
                    </label>
                    <input
                        type="date"
                        value={weddingDate}
                        onChange={(e) => setWeddingDate(e.target.value)}
                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                </div>
            </Card>

            {/* Positionen */}
            <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3 ml-1">── Positionen ──────────────</h2>
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={index} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                                <div>
                                    <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => updateItem(index, { name: e.target.value })}
                                        placeholder="Positionsname"
                                        className="w-full font-bold text-gray-800 placeholder-gray-300 border-b-2 border-transparent focus:border-primary outline-none transition-all pb-1"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Menge</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity || ''}
                                            onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 0 })}
                                            className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200 focus:border-primary outline-none text-center font-semibold"
                                        />
                                    </div>
                                    <div className="flex-1 relative">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Preis (€)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={item.unitPrice || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value.replace(',', '.'));
                                                updateItem(index, { unitPrice: isNaN(val) ? 0 : val });
                                            }}
                                            className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200 focus:border-primary outline-none text-right pr-6 font-semibold"
                                            placeholder="0,00"
                                        />
                                        <span className="absolute right-2 top-[26px] text-gray-400 text-sm">€</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => removeItem(index)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-8"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}

                    {/* Add Buttons */}
                    <div className="flex flex-col gap-2 mt-4 pt-2">
                        {showTemplates ? (
                            <div className="bg-white border-2 border-primary/20 p-4 rounded-2xl shadow-sm animate-fadeIn">
                                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Aus Vorlagen wählen:</h3>
                                <div className="flex flex-wrap gap-2">
                                    {HOCHZEIT_VORLAGEN.map((template, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => addFromTemplate(template)}
                                            className="text-sm bg-gray-50 hover:bg-primary/10 border border-gray-200 hover:border-primary/30 text-gray-700 font-medium px-3 py-1.5 rounded-lg transition-colors text-left"
                                        >
                                            {template.name} ({formatCurrency(template.defaultPrice)})
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowTemplates(false)}
                                    className="mt-4 w-full text-xs font-semibold text-gray-500 hover:text-gray-800"
                                >
                                    Schließen
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={addEmptyItem}
                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 font-bold transition-colors border-2 border-dashed border-gray-200 hover:border-gray-300"
                                >
                                    <PlusIcon className="h-5 w-5" /> Leere Position hinzufügen
                                </button>
                                <button
                                    onClick={() => setShowTemplates(true)}
                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-bold transition-colors"
                                >
                                    <PlusIcon className="h-5 w-5" /> Aus Vorlagen wählen
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Total Footer */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 pb-safe-area-inset-bottom max-w-md md:max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-lg font-bold text-gray-500 uppercase tracking-widest">Gesamt</span>
                    <span className="text-2xl font-black text-primary">{formatCurrency(total)}</span>
                </div>
                <button
                    onClick={handleShare}
                    className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-black hover:-translate-y-0.5 transition-all text-lg flex items-center justify-center gap-2"
                >
                    📤 Als PDF / E-Mail teilen
                </button>
            </div>
        </div>
    );
};

export default Quote;
