import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, History, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: BookOpen, label: 'Quiz', path: '/quiz' },
    { icon: History, label: 'Review', path: '/review' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
    return (
        <aside className="hidden md:flex w-64 bg-gray-900 text-white h-screen flex-shrink-0 flex-col border-r border-gray-800">
            <div className="p-6">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    StatsGrade1
                </h1>
                <p className="text-xs text-gray-400 mt-1">Mastery App</p>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px]",
                                isActive
                                    ? "bg-blue-600/20 text-blue-400"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            )
                        }
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <div className="text-xs text-gray-500 text-center">
                    &copy; 2025 StatsGrade1
                </div>
            </div>
        </aside>
    );
}
