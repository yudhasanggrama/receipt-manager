"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, PieChart as PieIcon, LogOut } from "lucide-react";

interface SidebarProps {
  handleLogout: () => void;
}

export default function Sidebar({ handleLogout }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/receipts', icon: Receipt, label: 'Receipts' },
  ];

  return (
    <aside className="fixed left-0 top-0 hidden h-full w-60 border-r border-slate-200 bg-white/80 backdrop-blur-md lg:block z-30">
      <div className="p-6">
        {/* LOGO */}
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md">
            <Receipt size={18} />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase text-slate-900">
            MySpendly
          </span>
        </div>

        {/* NAVIGATION */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm font-bold"
                    : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 font-medium"
                }`}
              >
                <item.icon size={18} /> 
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* LOGOUT BUTTON */}
      <div className="absolute bottom-6 left-6 right-6">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-red-600 transition-all group"
        >
          <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
          Logout
        </button>
      </div>
    </aside>
  );
}