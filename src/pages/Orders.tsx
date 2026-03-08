import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PlusIcon, XMarkIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export interface Order {
    id: string;
    customer_name: string;
    customer_phone: string;
    description: string;
    total_price: number;
    pickup_date: string;
    pickup_time: string;
    status: 'offen' | 'fertig' | 'abgeholt' | 'storniert';
    notes: string;
}

const Orders = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_phone: '',
        description: '',
        pickup_date: '',
        pickup_time: '',
        total_price: '',
        notes: '',
        status: 'offen' as Order['status'],
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) fetchOrders();
    }, [user, showArchived]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            let query = supabase.from('orders').select('*');

            if (!showArchived) {
                query = query.in('status', ['offen', 'fertig'])
                    .gte('pickup_date', new Date().toISOString().split('T')[0]);
            }

            const { data, error } = await query.order('pickup_date', { ascending: true });

            if (error) throw error;
            setOrders((data as unknown as Order[]) || []);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveOrder = async () => {
        if (!formData.customer_name || !formData.description || !formData.pickup_date || !formData.total_price) {
            alert('Bitte alle Pflichtfelder (*) ausfüllen.');
            return;
        }

        setSaving(true);
        try {
            const orderPayload = {
                user_id: user?.id,
                customer_name: formData.customer_name,
                customer_phone: formData.customer_phone,
                description: formData.description,
                pickup_date: formData.pickup_date,
                pickup_time: formData.pickup_time,
                total_price: parseFloat(formData.total_price.replace(',', '.')),
                status: formData.status,
                notes: formData.notes,
            };

            if (editingOrder) {
                const { error } = await supabase
                    .from('orders')
                    .update({ ...orderPayload, updated_at: new Date().toISOString() })
                    .eq('id', editingOrder.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('orders').insert(orderPayload);
                if (error) throw error;
            }

            await fetchOrders();
            closeModal();
        } catch (error) {
            console.error('Error saving order:', error);
            alert('Fehler beim Speichern der Bestellung.');
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            fetchOrders();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const openModal = (order?: Order) => {
        if (order) {
            setEditingOrder(order);
            setFormData({
                customer_name: order.customer_name,
                customer_phone: order.customer_phone || '',
                description: order.description,
                pickup_date: order.pickup_date,
                pickup_time: order.pickup_time || '',
                total_price: order.total_price.toString(),
                notes: order.notes || '',
                status: order.status,
            });
        } else {
            setEditingOrder(null);
            setFormData({
                customer_name: '',
                customer_phone: '',
                description: '',
                pickup_date: new Date().toISOString().split('T')[0],
                pickup_time: '',
                total_price: '',
                notes: '',
                status: 'offen' as Order['status'],
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingOrder(null);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'offen': return 'bg-yellow-100 text-yellow-800';
            case 'fertig': return 'bg-green-100 text-green-800';
            case 'abgeholt': return 'bg-gray-100 text-gray-800';
            case 'storniert': return 'bg-red-100 text-red-800 line-through';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Format relative date (Heute, Morgen, Datum)
    const getDayLabel = (dateStr: string) => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const d = new Date(dateStr);
        const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'long' };

        if (d.toDateString() === today.toDateString()) {
            return `Heute (${d.toLocaleDateString('de-DE', options)})`;
        } else if (d.toDateString() === tomorrow.toDateString()) {
            return `Morgen (${d.toLocaleDateString('de-DE', options)})`;
        } else {
            return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' });
        }
    };

    // Group orders by date
    const groupedOrders = orders.reduce((groups, order) => {
        const date = order.pickup_date;
        if (!groups[date]) groups[date] = [];
        groups[date].push(order);
        return groups;
    }, {} as Record<string, Order[]>);

    return (
        <div className="space-y-6 animate-fadeIn pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">📋 Vorbestellungen</h1>
                    <p className="text-gray-500 text-sm mt-1">Kommende Blumenaufträge im Blick</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30"
                >
                    <PlusIcon className="h-5 w-5" />
                    <span className="font-semibold text-sm hidden sm:inline">Neue Bestellung</span>
                </button>
            </div>

            {/* Filter */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="text-sm font-medium text-gray-500 hover:text-primary transition-colors"
                >
                    {showArchived ? 'Nur offene anzeigen' : 'Erledigte / Alle anzeigen'}
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500">Lade Bestellungen...</div>
            ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-gray-100">
                    <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Keine Vorbestellungen</h3>
                    <p className="mt-1 text-sm text-gray-500">Es stehen aktuell keine Bestellungen an.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.keys(groupedOrders).map(date => (
                        <div key={date} className="space-y-3">
                            <h2 className="font-bold text-gray-700 flex items-center gap-2">
                                <span className="w-8 h-px bg-gray-300"></span>
                                {getDayLabel(date)}
                                <span className="flex-1 h-px bg-gray-300"></span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {groupedOrders[date].map(order => (
                                    <div
                                        key={order.id}
                                        onClick={() => openModal(order)}
                                        className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all ${order.status === 'abgeholt' || order.status === 'storniert' ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-3 h-3 rounded-full ${order.status === 'offen' ? 'bg-yellow-400' : order.status === 'fertig' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                <h3 className={`font-bold text-gray-800 ${order.status === 'storniert' ? 'line-through' : ''}`}>
                                                    {order.customer_name}
                                                </h3>
                                            </div>
                                            {order.pickup_time && (
                                                <span className="text-sm font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                                                    {order.pickup_time} Uhr
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-gray-600 mb-3">{order.description}</p>

                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <span className="text-lg font-black text-gray-800 block">
                                                    {formatCurrency(order.total_price)}
                                                </span>
                                                {order.customer_phone && (
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        📞 {order.customer_phone}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Quick Actions if not archived */}
                                            {(order.status === 'offen' || order.status === 'fertig') && (
                                                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                    {order.status === 'offen' && (
                                                        <button
                                                            onClick={() => updateStatus(order.id, 'fertig')}
                                                            className="text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            Fertig
                                                        </button>
                                                    )}
                                                    {order.status === 'fertig' && (
                                                        <button
                                                            onClick={() => updateStatus(order.id, 'abgeholt')}
                                                            className="text-xs font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            Abgeholt
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl animate-scaleIn overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingOrder ? 'Bestellung bearbeiten' : 'Neue Bestellung'}
                            </h2>
                            <button onClick={closeModal} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 overflow-y-auto space-y-4">
                            {/* Customer Status Select for Edits */}
                            {editingOrder && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className={`w-full p-3 rounded-xl border-2 font-bold outline-none ${getStatusColor(formData.status)} border-transparent`}
                                    >
                                        <option value="offen">🟡 Offen</option>
                                        <option value="fertig">🟢 Fertig</option>
                                        <option value="abgeholt">✅ Abgeholt</option>
                                        <option value="storniert">🔴 Storniert</option>
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Kundenname *</label>
                                    <input
                                        type="text"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none"
                                        placeholder="Nachname"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Telefonnummer</label>
                                    <input
                                        type="tel"
                                        value={formData.customer_phone}
                                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none"
                                        placeholder="0176..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Was wird bestellt? *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none min-h-[80px]"
                                    placeholder="20x rote Rosen mit Schleife..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Abholdatum *</label>
                                    <input
                                        type="date"
                                        value={formData.pickup_date}
                                        onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Uhrzeit (optional)</label>
                                    <input
                                        type="time"
                                        value={formData.pickup_time}
                                        onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
                                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Vereinbarter Preis (€) *</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={formData.total_price}
                                    onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
                                    className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none"
                                    placeholder="45,00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Interne Notizen</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none min-h-[60px]"
                                    placeholder="..."
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                            <button onClick={closeModal} className="flex-1 py-3 font-semibold text-gray-600 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50">
                                Abbrechen
                            </button>
                            <button onClick={handleSaveOrder} disabled={saving} className="flex-1 py-3 font-bold text-white bg-primary rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/30 disabled:opacity-50">
                                {saving ? "Speichert..." : "Speichern"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
