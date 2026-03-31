"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { GROUPS } from "@/lib/keywords";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: "🎯" },
  { href: "/topics", label: "탑 토픽", icon: "🔥" },
  ...GROUPS.map((g) => ({ href: `/monitor?group=${g.id}`, label: g.name, icon: g.emoji })),
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = saved === "dark" || (!saved && prefersDark);
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("?")[0]);
  };

  return (
    <>
      {/* 모바일 헤더 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-600 dark:text-gray-300 text-xl">
          {collapsed ? "✕" : "☰"}
        </button>
        <span className="font-bold text-gray-900 dark:text-white text-sm">푸름님, 좋은 아침이에요:)</span>
        <button onClick={toggleTheme} className="text-lg">{isDark ? "☀️" : "🌙"}</button>
      </div>

      {/* 사이드바 */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-40
        w-56 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700
        flex flex-col transition-transform duration-200
        lg:translate-x-0
        ${collapsed ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* 로고 */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-800">
          <h1 className="text-base font-bold text-gray-900 dark:text-white">푸름님, 좋은 아침이에요:)</h1>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">온라인 모니터링 시스템</p>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">메뉴</div>
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setCollapsed(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <div className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-3 mt-4 mb-2">아티스트</div>
          {NAV_ITEMS.slice(2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setCollapsed(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href) && typeof window !== "undefined" && window.location.search.includes(item.href.split("?")[1])
                  ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 하단 */}
        <div className="p-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-base">{isDark ? "☀️" : "🌙"}</span>
            {isDark ? "Day 모드" : "Night 모드"}
          </button>
        </div>
      </aside>

      {/* 모바일 오버레이 */}
      {collapsed && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/30" onClick={() => setCollapsed(false)} />
      )}
    </>
  );
}
