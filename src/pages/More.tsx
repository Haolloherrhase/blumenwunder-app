import { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const More = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [exporting, setExporting] = useState(false);

    const handleExportCSV = async () => {
        if (!startDate || !endDate) {
            alert('Bitte wähle einen Zeitraum aus.');
            return;
        }

        setExporting(true);

        try {
            // Fetch transactions
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    products (name, categories (name))
                `)
                .gte('created_at', startDate)
                .lte('created_at', endDate + 'T23:59:59')
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (!transactions || transactions.length === 0) {
                alert('Keine Transaktionen im gewählten Zeitraum gefunden.');
                setExporting(false);
                return;
            }

            // Build CSV
            const headers = [
                'Datum',
                'Artikel',
                'Kategorie',
                'Typ',
                'Menge',
                'Einzelpreis (€)',
                'Gesamt (Brutto €)',
                'Zahlungsart'
            ];

            const rows = transactions.map(t => {
                return [
                    new Date(t.created_at).toLocaleDateString('de-DE'),
                    t.products?.name || 'Unbekannt',
                    t.products?.categories?.name || '-',
                    t.transaction_type,
                    t.quantity,
                    t.unit_price.toFixed(2),
                    t.total_price.toFixed(2),
                    t.payment_method || '-'
                ];
            });

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `blumenwunder_export_${startDate}_${endDate}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert(`${transactions.length} Transaktionen exportiert!`);

        } catch (error) {
            console.error('Export error:', error);
            alert('Fehler beim Export. Bitte versuche es erneut.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Mehr</h1>

            {/* Dashboard Actions / Shortcuts */}
            <div className="grid grid-cols-1 gap-4">
                <div onClick={() => navigate('/waste')} className="cursor-pointer">
                    <Card className="hover:bg-gray-50 transition-colors border-l-4 border-l-red-400">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-gray-900">Schwund & Abgang</h3>
                                <p className="text-sm text-gray-500">Müll, Geschenke oder Eigenverbrauch buchen</p>
                            </div>
                            <span className="text-gray-400">&rarr;</span>
                        </div>
                    </Card>
                </div>
            </div>

            {/* CSV Export */}
            <Card title="📊 CSV-Export">
                <p className="text-gray-500 py-2 mb-4">Exportiere alle Transaktionen für deinen Steuerberater.</p>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Von
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bis
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleExportCSV}
                        disabled={!startDate || !endDate || exporting}
                        fullWidth
                    >
                        <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                        {exporting ? 'Exportiere...' : 'CSV herunterladen'}
                    </Button>
                </div>
            </Card>

            {/* Account */}
            <Card title="👤 Account">
                <p className="text-gray-500 py-2">Accountverwaltung (Coming Soon)</p>
            </Card>

            {/* Material-Bibliothek */}
            <div onClick={() => navigate('/materials')} className="cursor-pointer">
                <Card className="hover:bg-gray-50 transition-colors border-l-4 border-l-primary">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-gray-900">📦 Material-Bibliothek</h3>
                            <p className="text-sm text-gray-500">Kordel, Folie und Zubehör verwalten</p>
                        </div>
                        <span className="text-gray-400">&rarr;</span>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default More;
