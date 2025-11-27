import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BarChart2, History } from 'lucide-react';

export default function BottomNav() {
    const navItems = [
        { path: '/', icon: Home, label: 'ホーム' },
        { path: '/analysis', icon: BarChart2, label: '分析' },
        { path: '/review', icon: History, label: '復習' },
    ];

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/90 backdrop-blur-xl border-t border-white/10"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="flex justify-around items-stretch h-16 max-w-screen-sm mx-auto px-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center flex-1 gap-1 transition-all duration-200 tap-target rounded-lg ${isActive
                                ? 'text-blue-400 bg-blue-500/5'
                                : 'text-gray-500 hover:text-gray-300'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    size={22}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={`transition-all duration-200 ${isActive ? 'scale-110' : ''}`}
                                />
                                <span className="text-[10px] font-medium leading-tight">
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