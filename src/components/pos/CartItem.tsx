import React from 'react';
import { PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline';


interface CartItemProps {
    name: string;
    quantity: number;
    price: number;
    onUpdateQuantity: (newQty: number) => void;
    onUpdatePrice: (newPrice: number) => void;
    onRemove: () => void;
}

const CartItem: React.FC<CartItemProps> = ({
    name,
    quantity,
    price,
    onUpdateQuantity,
    onUpdatePrice,
    onRemove
}) => {
    return (
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-200 shadow-sm animate-fade-in-up">
            <div className="flex-1">
                <h4 className="font-medium text-gray-800 text-sm truncate">{name}</h4>
                <div className="flex items-center space-x-2 mt-1">
                    <button
                        onClick={() => onUpdateQuantity(Math.max(1, quantity - 1))}
                        className="p-1 text-gray-400 hover:text-gray-600 border rounded"
                    >
                        <MinusIcon className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{quantity}</span>
                    <button
                        onClick={() => onUpdateQuantity(quantity + 1)}
                        className="p-1 text-primary hover:text-primary-dark border border-primary/20 rounded bg-primary/5"
                    >
                        <PlusIcon className="h-3 w-3" />
                    </button>
                </div>
            </div>

            <div className="flex items-center space-x-3">
                <div className="w-20">
                    {/* Custom minimal input for price */}
                    <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => onUpdatePrice(parseFloat(e.target.value) || 0)}
                        className="w-full text-right text-sm font-medium p-1 border rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>
                <button onClick={onRemove} className="text-gray-300 hover:text-red-500">
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default CartItem;
