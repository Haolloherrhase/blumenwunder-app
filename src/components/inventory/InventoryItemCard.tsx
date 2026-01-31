import React from 'react';
import { PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline';

import Card from '../ui/Card';

interface InventoryItemCardProps {
    id: string;
    name: string;
    quantity: number;
    unitPrice?: number; // Einkaufsreis
    categoryName?: string;
    onUpdateQuantity: (newQuantity: number) => void;
    onDelete?: () => void;
    isMaterial?: boolean;
}

const InventoryItemCard: React.FC<InventoryItemCardProps> = ({
    name,
    quantity,
    unitPrice,
    categoryName,
    onUpdateQuantity,
    onDelete,
    isMaterial
}) => {
    return (
        <Card className="bg-white p-4">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-semibold text-gray-900">{name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                        {categoryName && <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{categoryName}</span>}
                        {unitPrice !== undefined && <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(unitPrice)}</span>}
                    </div>
                </div>
                {onDelete && (
                    <button onClick={onDelete} className="text-gray-400 hover:text-red-500">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="flex items-center justify-between bg-neutral-bg rounded-lg p-2">
                <span className={`text-sm font-medium ${quantity < 10 ? 'text-red-600' : 'text-gray-600'}`}>
                    {quantity} {isMaterial ? 'Stk.' : 'Stiele'}
                </span>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => onUpdateQuantity(Math.max(0, quantity - 1))}
                        className="p-1 rounded-full hover:bg-white hover:shadow-sm text-gray-600 transition-all"
                    >
                        <MinusIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => onUpdateQuantity(quantity + 1)}
                        className="p-1 rounded-full hover:bg-white hover:shadow-sm text-primary transition-all"
                    >
                        <PlusIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </Card>
    );
};

export default InventoryItemCard;
