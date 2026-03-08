import { useState } from 'react';
import jsPDF from 'jspdf';
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

    const generateTextVersion = (storeName: string, storeAddress: string): string => {
        const dateFormatted = weddingDate
            ? new Date(weddingDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
            : 'Nach Absprache';

        const positionLines = items.map(item => {
            const lineTotal = item.quantity * item.unitPrice;
            if (item.quantity === 1) {
                return `${item.name}: ${formatCurrency(item.unitPrice)}`;
            }
            return `${item.name} (${item.quantity}x à ${formatCurrency(item.unitPrice)}): ${formatCurrency(lineTotal)}`;
        }).join('\n');

        return `
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

Mit freundlichen Grüßen
${storeName}
        `.trim();
    };

    const generatePDF = (storeName: string, storeAddress: string): jsPDF => {
        const doc = new jsPDF('p', 'mm', 'a4'); // Portrait, Millimeter, A4
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        let y = margin; // aktuelle Y-Position

        // ── Header: Ladenname & Adresse ──
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(storeName, margin, y);
        y += 8;

        if (storeAddress) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            // Adresse kann mehrzeilig sein
            const addressLines = storeAddress.split('\n');
            addressLines.forEach(line => {
                doc.text(line.trim(), margin, y);
                y += 5;
            });
        }

        // ── Trennlinie ──
        y += 5;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // ── Titel ──
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Kostenvoranschlag — Hochzeitsfloristik', margin, y);
        y += 10;

        // ── Kundendaten ──
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (customerName) {
            doc.text(`Kunde: ${customerName}`, margin, y);
            y += 6;
        }
        if (weddingDate) {
            const dateFormatted = new Date(weddingDate).toLocaleDateString('de-DE', {
                day: '2-digit', month: 'long', year: 'numeric'
            });
            doc.text(`Hochzeitsdatum: ${dateFormatted}`, margin, y);
            y += 6;
        }
        doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, margin, y);
        y += 12;

        // ── Tabelle: Positionen ──
        // Tabellenkopf
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 4, contentWidth, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Position', margin + 2, y);
        doc.text('Menge', margin + 95, y, { align: 'center' });
        doc.text('Einzelpreis', margin + 120, y, { align: 'center' });
        doc.text('Gesamt', pageWidth - margin - 2, y, { align: 'right' });
        y += 8;

        // Tabellenzeilen
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        items.forEach(item => {
            const lineTotal = item.quantity * item.unitPrice;

            // Prüfe ob neue Seite nötig
            if (y > 260) {
                doc.addPage();
                y = margin;
            }

            doc.text(item.name, margin + 2, y);
            doc.text(String(item.quantity), margin + 95, y, { align: 'center' });
            doc.text(formatCurrency(item.unitPrice), margin + 120, y, { align: 'center' });
            doc.text(formatCurrency(lineTotal), pageWidth - margin - 2, y, { align: 'right' });

            // Trennlinie
            y += 2;
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.2);
            doc.line(margin, y, pageWidth - margin, y);
            y += 6;
        });

        // ── Gesamtpreis ──
        y += 4;
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.5);
        doc.line(margin + 100, y, pageWidth - margin, y);
        y += 8;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Gesamt:', margin + 100, y);
        doc.text(formatCurrency(total), pageWidth - margin - 2, y, { align: 'right' });
        y += 14;

        // ── Kleinunternehmer-Hinweis ──
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Gemäß §19 UStG wird keine Umsatzsteuer berechnet.', margin, y);
        y += 10;

        // ── Fußtext ──
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Dieser Kostenvoranschlag ist unverbindlich und 30 Tage gültig.', margin, y);
        y += 5;
        doc.text('Änderungen an den Positionen sind nach Absprache möglich.', margin, y);
        y += 8;
        doc.text('Bei Fragen stehe ich gerne zur Verfügung!', margin, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Mit freundlichen Grüßen — ${storeName}`, margin, y);

        return doc;
    };

    const handleShare = async () => {
        if (items.length === 0) {
            alert('Bitte mindestens eine Position hinzufügen.');
            return;
        }

        // Lade Laden-Infos
        const { data: settings } = await supabase
            .from('settings')
            .select('store_name, store_address')
            .eq('user_id', user?.id)
            .maybeSingle();

        const storeName = settings?.store_name || 'Blumenwunder';
        const storeAddress = settings?.store_address || '';

        try {
            // PDF generieren
            const doc = generatePDF(storeName, storeAddress);
            const pdfBlob = doc.output('blob');
            const fileName = `Kostenvoranschlag_${customerName || 'Hochzeit'}_${new Date().toISOString().split('T')[0]}.pdf`;

            // Versuch 1: Native Share mit PDF-Datei (Handy)
            if (navigator.share && navigator.canShare) {
                const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
                const shareData = { files: [file], title: `Kostenvoranschlag — ${customerName || 'Hochzeit'}` };

                if (navigator.canShare(shareData)) {
                    try {
                        await navigator.share(shareData);
                        return;
                    } catch (e) {
                        // User hat abgebrochen — weiter zum Fallback
                    }
                }
            }

            // Versuch 2: PDF herunterladen
            doc.save(fileName);

        } catch (e) {
            console.error('PDF generation failed, falling back to text:', e);

            // Fallback: Text per E-Mail
            const quoteText = generateTextVersion(storeName, storeAddress);
            const subject = encodeURIComponent(`Kostenvoranschlag Hochzeitsfloristik — ${storeName}`);
            const body = encodeURIComponent(quoteText);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }
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
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    📤 PDF erstellen & teilen
                </button>
            </div>
        </div>
    );
};

export default Quote;
