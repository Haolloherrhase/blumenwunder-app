import React from 'react';
import Card from '../components/ui/Card';

const Dashboard = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white">
                    <p className="text-sm text-gray-500">Umsatz Heute</p>
                    <p className="text-2xl font-bold text-gray-900">0,00 €</p>
                </Card>
                <Card className="bg-white">
                    <p className="text-sm text-gray-500">Verkäufe</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                </Card>
            </div>

            <Card title="Top Seller">
                <p className="text-gray-500 text-sm text-center py-4">Keine Daten verfügbar</p>
            </Card>
        </div>
    );
};

export default Dashboard;
