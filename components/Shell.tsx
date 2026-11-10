"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Home, ListOrdered, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import AddTx from "./AddTx";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Movimenti", icon: ListOrdered },
  { href: "/reports", label: "Report", icon: BarChart3 },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { ready, needsLogin, login } = useStore();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  if (!ready) return <div className="p-10 text-muted">Caricamento…</div>;
  if (needsLogin)
    return (
      <div className="mx-auto max-w-sm p-6 pt-24">
        <h1 className="text-3xl font-bold mb-2">Cash Manager</h1>
        <p className="text-muted mb-6">Accedi con la tua email: ti mandiamo un link magico.</p>
        <input className="inp mb-3" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn w-full" onClick={async () => setMsg(await login(email))}>Invia link</button>
        {msg && <p className="mt-4 text-sm text-accent2">{msg}</p>}
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-32">
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl items-center">
          {tabs.flatMap(({ href, label, icon: I }, i) => {
            const link = (
              <Link key={href} href={href} className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] ${path === href ? "text-accent2" : "text-muted"}`}>
                <I size={20} />
                {label}
              </Link>
            );
            return i === 1
              ? [
                  <div key="add" className="flex flex-1 justify-center">
                    <button
                      onClick={() => setOpen(true)}
                      aria-label="Nuova transazione"
                      className="btn grid h-14 w-14 place-items-center rounded-full p-0 shadow-lg shadow-accent/40 active:scale-95"
                    >
                      <Plus size={30} strokeWidth={2.5} />
                    </button>
                  </div>,
                  link,
                ]
              : [link];
          })}
        </div>
      </nav>
      {open && <AddTx onClose={() => setOpen(false)} />}
    </div>
  );
}
