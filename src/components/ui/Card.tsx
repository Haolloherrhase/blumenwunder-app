import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
    return (
        <div className={`bg-neutral-card rounded-xl shadow-sm border border-neutral-200 p-4 ${className}`}>
            {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
            {children}
        </div>
    );
};

export default Card;
