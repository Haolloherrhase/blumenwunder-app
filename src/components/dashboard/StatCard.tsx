import React from 'react';
import Card from '../ui/Card';

interface StatCardProps {
    title: string;
    value: string;
    icon?: React.ReactNode;
    color?: 'primary' | 'secondary' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'neutral' }) => {
    return (
        <Card className="bg-white flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                {icon && <div className="text-gray-400">{icon}</div>}
            </div>
            <p className={`text-2xl font-bold ${color === 'primary' ? 'text-primary' : 'text-gray-900'}`}>
                {value}
            </p>
        </Card>
    );
};

export default StatCard;
