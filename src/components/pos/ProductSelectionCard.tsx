import React from 'react';

interface ProductSelectionCardProps {
    name: string;
    stock: number;
    category: string;
    onClick: () => void;
}

const ProductSelectionCard: React.FC<ProductSelectionCardProps> = ({ name, stock, category, onClick }) => {
    return (
        <button
            onClick={onClick}
            disabled={stock <= 0}
            className={`
                flex flex-col justify-between p-3 rounded-xl border text-left transition-all h-24
                ${stock > 0
                    ? 'bg-white border-neutral-200 hover:border-primary hover:shadow-md active:scale-95'
                    : 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'}
            `}
        >
            <span className="font-semibold text-sm text-gray-800 line-clamp-2">{name}</span>

            <div className="flex justify-between items-end w-full">
                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {category}
                </span>
                <span className={`text-xs font-medium ${stock < 10 ? 'text-red-500' : 'text-gray-600'}`}>
                    {stock} Stk.
                </span>
            </div>
        </button>
    );
};

export default ProductSelectionCard;
