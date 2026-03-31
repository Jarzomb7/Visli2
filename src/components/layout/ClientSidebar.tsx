"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation, LanguageSwitch } from "@/components/LanguageProvider";

const navItems = [
  { key: "dashboard", href: "/client/dashboard", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> },
  { key: "subscriptions", href: "/client/subscriptions", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg> },
  { key: "licenses", href: "/client/licenses", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg> },
  { key: "billing", href: "/client/billing", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
];

export default function ClientSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => href === "/client/dashboard" ? pathname === "/client/dashboard" : pathname.startsWith(href);

  const content = (
    <>
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] shadow-lg shadow-green-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-white">VISLI</h1>
            <p className="text-[11px] font-medium tracking-wider text-white/30 uppercase">Client Panel</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
              isActive(item.href) ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
            }`}>
            <span className={isActive(item.href) ? "text-emerald-400" : "text-white/30 group-hover:text-white/50"}>{item.icon}</span>
            {t(item.key)}
            {isActive(item.href) && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          </Link>
        ))}
      </nav>
      <div className="p-4 space-y-3 border-t border-white/[0.05]">
        <div className="flex justify-center"><LanguageSwitch /></div>
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/30 hover:bg-white/[0.04] hover:text-white/60 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
          {t("sign_out")}
        </button>
      </div>
    </>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08] lg:hidden">
        <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
      </button>
      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.05] bg-[#060d2b]/95 backdrop-blur-xl transition-transform duration-300 lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>{content}</aside>
      <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 border-r border-white/[0.05] bg-[#060d2b]/80 backdrop-blur-xl">{content}</aside>
    </>
  );
}
