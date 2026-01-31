import React from 'react';
import Card from '../components/ui/Card';

const More = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Mehr</h1>
            <Card title="Einstellungen">
                <p className="text-gray-500 py-2">Account</p>
                <p className="text-gray-500 py-2">Export</p>
                <p className="text-gray-500 py-2">Material-Bibliothek</p>
            </Card>
        </div>
    );
};

export default More;
