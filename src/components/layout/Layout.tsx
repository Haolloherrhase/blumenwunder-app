import React from 'react';
import Header from './Header';
import BottomNav from './BottomNav';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-neutral-bg">
            <Header />

            {/* Main content area with padding for fixed header and footer */}
            <main className="pt-20 pb-24 px-4 md:px-8 max-w-md md:max-w-7xl mx-auto">
                {children}
            </main>

            <BottomNav />
        </div>
    );
};

export default Layout;
