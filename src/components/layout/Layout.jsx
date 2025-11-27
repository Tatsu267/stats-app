import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout() {
    return (
        <div className="flex h-screen w-full bg-[#0f172a] text-white overflow-hidden">
            {/* Desktop Sidebar - hidden on mobile */}
            <div className="hidden md:block h-full">
                <Sidebar />
            </div>

            <main className="flex-1 overflow-auto relative w-full">
                {/* Add padding bottom for mobile nav */}
                <div className="max-w-7xl mx-auto px-4 w-full pb-24 md:pb-8 pt-6">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Nav - hidden on desktop */}
            <BottomNav />
        </div>
    );
}
