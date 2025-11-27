import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Settings } from 'lucide-react';

export default function BottomNav() {
    const navItems = [
        { path: '/', icon: Home, label: 'ホーム' },
        { path: '/quiz', icon: BookOpen, label: 'クイズ' },
        { path: '/settings', icon: Settings, label: '設定' },
    ];

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/95 backdrop-blur-lg border-t border-gray-800/50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="flex justify-around items-stretch h-16 max-w-screen-sm mx-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center flex-1 gap-1 transition-colors duration-200 tap-target ${isActive
                                ? 'text-blue-500'
                                : 'text-gray-500 active:text-gray-300'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    size={24}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className="transition-all duration-200"
                                />
                                <span className="text-xs font-medium leading-tight">
                                    {item.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
