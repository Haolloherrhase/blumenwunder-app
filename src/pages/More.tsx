import { useState, useEffect } from 'react';
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

    // Settings state
    const [storeName, setStoreName] = useState('Blumenwunder');
    const [storeAddress, setStoreAddress] = useState('');
    const [startingBalance, setStartingBalance] = useState('200');
    const [savingSettings, setSavingSettings] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);

    // Load current settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;
                if (data) {
                    setStoreName(data.store_name);
                    setStoreAddress(data.store_address);
                    setStartingBalance(String(data.starting_balance));
                }
            } catch (err) {
                console.error('Error loading settings:', err);
            } finally {
                setLoadingSettings(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('settings')
                .upsert({
                    user_id: user.id,
                    store_name: storeName,
                    store_address: storeAddress,
                    starting_balance: Number(startingBalance),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;
            alert('Einstellungen gespeichert! 🎉');
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Fehler beim Speichern.');
        } finally {
            setSavingSettings(false);
        }
    };

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
                'MwSt-Satz (%)',
                'MwSt-Betrag (€)',
                'Netto (€)',
                'Zahlungsart'
            ];

            const rows = transactions.map(t => {
                const vatRate = t.vat_rate || (t.transaction_type === 'sale_bouquet' ? 7 : 19);
                const vatAmount = t.vat_amount || 0;
                const netPrice = t.total_price - vatAmount;

                return [
                    new Date(t.created_at).toLocaleDateString('de-DE'),
                    t.products?.name || 'Unbekannt',
                    t.products?.categories?.name || '-',
                    t.transaction_type,
                    t.quantity,
                    t.unit_price.toFixed(2),
                    t.total_price.toFixed(2),
                    vatRate,
                    vatAmount.toFixed(2),
                    netPrice.toFixed(2),
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

            {/* Account / Laden-Einstellungen */}
            <Card title="👤 Laden-Einstellungen">
                {loadingSettings ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-10 bg-gray-100 rounded-lg w-full" />
                        <div className="h-24 bg-gray-100 rounded-lg w-full" />
                        <div className="h-10 bg-gray-100 rounded-lg w-full" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ladenname
                            </label>
                            <input
                                type="text"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="z.B. Blumenwunder"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Adresse (für Quittung)
                            </label>
                            <textarea
                                value={storeAddress}
                                onChange={(e) => setStoreAddress(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="Musterstraße 1&#10;12345 Berlin"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Startguthaben Kasse (€)
                            </label>
                            <input
                                type="number"
                                value={startingBalance}
                                onChange={(e) => setStartingBalance(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        <Button
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            fullWidth
                        >
                            {savingSettings ? 'Speichere...' : 'Einstellungen speichern'}
                        </Button>
                    </div>
                )}
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
