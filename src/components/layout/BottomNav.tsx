
import { NavLink } from 'react-router-dom';
import {
    HomeIcon,
    PlusCircleIcon,
    CurrencyDollarIcon,
    SparklesIcon,
    ArchiveBoxIcon,
    ChartBarIcon,
    EllipsisHorizontalCircleIcon
} from '@heroicons/react/24/outline';

const BottomNav = () => {
    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Einkauf', path: '/purchase', icon: PlusCircleIcon },
        { name: 'Verkauf', path: '/sale', icon: CurrencyDollarIcon },
        { name: 'Strauß', path: '/bouquet', icon: SparklesIcon },
        { name: 'Bestand', path: '/inventory', icon: ArchiveBoxIcon },
        { name: 'Analyse', path: '/analytics', icon: ChartBarIcon },
        { name: 'Mehr', path: '/more', icon: EllipsisHorizontalCircleIcon },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe-area-inset-bottom">
            <div className="flex justify-around items-center h-16 max-w-md md:max-w-7xl mx-auto px-4 md:px-8">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
                            }`
                        }
                    >
                        <item.icon className="h-6 w-6" aria-hidden="true" />
                        <span className="text-[10px] font-medium">{item.name}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;
