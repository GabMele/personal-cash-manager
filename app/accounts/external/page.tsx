"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import AccountManager from "@/components/AccountManager";
import { useStore } from "@/lib/store";

// Il PIN nasconde i conti dall'uso quotidiano, non li protegge: i dati restano nel browser / database.
const PIN = "1199";
const KEY = "pcm-ext-unlocked";

export default function ExternalPage() {
  const { showExternal, setShowExternal } = useStore();
  const [ok, setOk] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  useEffect(() => { try { setOk(sessionStorage.getItem(KEY) === "1"); } catch {} }, []);

  const submit = (v: string) => {
    if (v.length < 4) return;
    if (v === PIN) { setOk(true); try { sessionStorage.setItem(KEY, "1"); } catch {} }
    else { setErr(true); setPin(""); }
  };

  return (
    <div className="space-y-3">
      <Link href="/accounts" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ChevronLeft size={16} /> Conti</Link>
      {!ok ? (
        <div className="card mx-auto mt-10 max-w-xs space-y-3 p-5 text-center">
          <p className="font-semibold">Esterni</p>
          <input
            className="inp num text-center text-2xl tracking-[0.5em]" type="password" inputMode="numeric" autoComplete="off" maxLength={4}
            autoFocus placeholder="••••" value={pin} aria-label="PIN a 4 cifre"
            onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); setPin(v); setErr(false); submit(v); }}
          />
          {err && <p className="text-sm text-bad">PIN errato</p>}
        </div>
      ) : (
        <>
          <label className="card flex items-center justify-between px-3 py-2.5 text-sm">
            <span>Visualizza <span className="text-xs text-muted">(mostra questi conti e i loro movimenti nell&apos;app)</span></span>
            <input type="checkbox" checked={showExternal} onChange={(e) => setShowExternal(e.target.checked)} className="h-5 w-5" />
          </label>
          <AccountManager external />
        </>
      )}
    </div>
  );
}
