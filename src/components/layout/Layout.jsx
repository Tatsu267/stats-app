import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout() {
    // ▼▼▼ 追加: ページ遷移検知のためのフック ▼▼▼
    const { pathname } = useLocation();
    const mainRef = useRef(null);

    // ▼▼▼ 追加: パス（ページ）が変わるたびにメインエリアをスクロールトップする ▼▼▼
    useEffect(() => {
        if (mainRef.current) {
            // behavior: 'instant' で即座に移動（アニメーションなし）
            // アニメーションさせたい場合は 'smooth' に変更してください
            mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [pathname]);

    return (
        <div className="flex h-screen w-full bg-[#0f172a] text-white overflow-hidden">
            {/* Desktop Sidebar - hidden on mobile */}
            <div className="hidden md:block h-full">
                <Sidebar />
            </div>

            {/* ▼▼▼ 修正: ref属性を追加し、DOM要素を参照できるようにする ▼▼▼ */}
            <main ref={mainRef} className="flex-1 overflow-auto relative w-full">
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