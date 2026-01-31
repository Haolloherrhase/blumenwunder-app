import { UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
    const { signOut } = useAuth();

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-10">
            <div className="flex justify-between items-center h-full px-4 max-w-md mx-auto">
                <div className="flex items-center space-x-2">
                    {/* Logo Placeholder - Could be an image later */}
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                        B
                    </div>
                    <span className="text-lg font-bold text-gray-800">Blumenwunder</span>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 text-gray-600">
                        <UserCircleIcon className="h-8 w-8 text-secondary-dark" />
                    </div>
                    <button
                        onClick={signOut}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Logout"
                    >
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
