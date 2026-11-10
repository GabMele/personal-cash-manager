"use client";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutList, Rows3, Settings } from "lucide-react";
import { CLOUD, useStore } from "@/lib/store";
import { cashBalance, holdingsValue } from "@/lib/tax";
import { dshort, eur } from "@/lib/fmt";
import { money, toEur } from "@/lib/fx";
import { assetsEur } from "@/lib/destinations";
import Accounts from "@/components/Accounts";
import AssetsToggle from "@/components/AssetsToggle";
import type { Tx } from "@/lib/types";

export default function Home() {
  const { state, upsert, remove, rates, includeAssets, logout } = useStore();
  const [compact, setCompact] = useState(true);
  useEffect(() => { try { if (localStorage.getItem("homeView") === "comoda") setCompact(false); } catch {} }, []);
  const setCompactP = (v: boolean) => { setCompact(v); try { localStorage.setItem("homeView", v ? "compatta" : "comoda"); } catch {} };
  const accOf = (id: string) => state.accounts.find((a) => a.id === id);
  const eurOf = (t: Tx) => toEur(t.amount, accOf(t.account_id)?.currency, rates);
  const mon = (t: Tx) => money(t.amount, accOf(t.account_id)?.currency);
  const cash = state.accounts.reduce((s, a) => s + toEur(cashBalance(state.txs, a.id), a.currency, rates), 0);
  const inv = state.accounts.reduce((s, a) => s + toEur(holdingsValue(state.holdings, a.id), a.currency, rates), 0);

  // Andamento YTD: patrimonio oggi vs 31/12 dell'anno scorso. I saldi iniziali contano sempre nella base
  // (un conto aperto a marzo non è un "guadagno"); i titoli restano al valore attuale (non c'è storico prezzi).
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const confirmed = state.txs.filter((t) => t.status === "confirmed");
  const openings = confirmed.filter((t) => t.kind === "opening").reduce((s, t) => s + eurOf(t), 0);
  const netAt = (d: string) =>
    openings + confirmed.filter((t) => t.kind !== "opening" && t.date <= d).reduce((s, t) => s + eurOf(t), 0) + inv +
    (includeAssets ? assetsEur(state, rates, d) : 0);
  const base = netAt(`${year - 1}-12-31`);
  const ytd = netAt(today) - base;
  const ytdPct = base > 0 ? (ytd / base) * 100 : null;
  const spark = Array.from({ length: new Date().getMonth() + 1 }, (_, i) => {
    const end = new Date(Date.UTC(year, i + 1, 0)).toISOString().slice(0, 10);
    return { v: Math.round(netAt(end > today ? today : end)) };
  });
  const up = ytd >= 0;
  const beni = assetsEur(state, rates);
  const pending = state.txs.filter((t) => t.status === "pending");
  const month = new Date().toISOString().slice(0, 7);
  const m = state.txs.filter((t) => t.status === "confirmed" && t.date.startsWith(month) && t.kind === "normal");
  const inc = m.filter((t) => t.amount > 0).reduce((s, t) => s + eurOf(t), 0);
  const exp = m.filter((t) => t.amount < 0).reduce((s, t) => s + eurOf(t), 0);

  const total = cash + inv + (includeAssets ? beni : 0);
  const recent = state.txs.filter((t) => t.status === "confirmed").sort((a, b) => b.date.localeCompare(a.date));

  // Vista compatta: la pagina non scrolla. «Da confermare» è chiuso (anteprima) e si apre a richiesta;
  // «Ultimi movimenti» occupa l'altezza residua con scroll interno: 10 subito, poi altri a blocchi (lazy) fino a esaurirli.
  const [pendOpen, setPendOpen] = useState(false);
  const [shownN, setShownN] = useState(10);
  const [listH, setListH] = useState(120);
  const [more, setMore] = useState(false); // c'è altro sotto da scorrere
  const movRef = useRef<HTMLDivElement>(null);
  const check = () => {
    const el = movRef.current;
    if (!el) return;
    setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) setShownN((n) => (n < recent.length ? n + 20 : n));
  };
  useEffect(() => {
    const calc = () => {
      const el = movRef.current;
      if (!el) return;
      setListH(Math.max(78, window.innerHeight - el.getBoundingClientRect().top - 104)); // barra in basso + margine
      check();
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(document.body);
    window.addEventListener("resize", calc);
    return () => { ro.disconnect(); window.removeEventListener("resize", calc); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, pendOpen, pending.length, shownN, recent.length]);

  const toggle = (
    <button aria-label="Cambia vista" title={compact ? "Vista comoda" : "Vista compatta"} onClick={() => setCompactP(!compact)} className="rounded-full bg-tint p-1.5 text-muted hover:text-fg">
      {compact ? <Rows3 size={16} /> : <LayoutList size={16} />}
    </button>
  );

  if (compact) {
    return (
      <div className="-mb-12 space-y-3">
        <div className="card px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-muted">Patrimonio{!includeAssets && beni > 0 ? ` · esclusi beni ${eur(beni)}` : ""}</p>
              <p className="num text-2xl font-bold leading-tight">{eur(total)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {toggle}
              <Link href="/settings" aria-label="Impostazioni" className="rounded-full bg-tint p-1.5 text-muted hover:text-fg"><Settings size={16} /></Link>
            </div>
          </div>
          <div className="num mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            <span className="text-muted">Liquidi <b className="font-semibold text-fg">{eur(cash)}</b></span>
            <span className={up ? "text-accent2" : "text-bad"}>{up ? "▲" : "▼"} {eur(Math.abs(ytd))}{ytdPct !== null && ` ${ytdPct >= 0 ? "+" : ""}${ytdPct.toFixed(1)}%`} <span className="text-muted">YTD</span></span>
            <span className="text-accent2">+{eur(inc)}</span>
            <span className="text-bad">{eur(exp)}</span>
            <span className="text-muted">mese</span>
          </div>
        </div>

        <Accounts compact />

        {pending.length > 0 && (
          <section className="card px-3 py-2" style={{ background: "linear-gradient(135deg, rgba(255,170,60,0.20), rgba(255,93,115,0.12))" }}>
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-1.5" aria-expanded={pendOpen} onClick={() => setPendOpen(!pendOpen)}>
                <ChevronDown size={14} className={`text-muted transition-transform ${pendOpen ? "rotate-180" : ""}`} />
                <h2 className="text-sm font-semibold">Da confermare ({pending.length})</h2>
              </button>
              {pendOpen && <button className="text-xs text-accent2" onClick={() => pending.forEach((t) => upsert("txs", { ...t, status: "confirmed" }))}>Conferma tutti</button>}
            </div>
            {pendOpen ? (
              <ul className="mt-1 divide-y divide-line">
                {pending.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{t.description}</p>
                      <p className="text-xs text-muted">{accOf(t.account_id)?.name} · {dshort(t.date)}</p>
                    </div>
                    <span className={`num text-sm ${t.amount < 0 ? "text-bad" : "text-accent2"}`}>{mon(t)}</span>
                    <button className="rounded-lg bg-accent2/20 px-2 py-1 text-xs text-accent2" onClick={() => upsert("txs", { ...t, status: "confirmed" })}>OK</button>
                    <button className="rounded-lg bg-tint2 px-2 py-1 text-xs" onClick={() => remove("txs", t.id)}>✕</button>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-0.5">
                {pending.slice(0, 3).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="min-w-0 truncate">{t.description}</span>
                    <span className={`num shrink-0 ${t.amount < 0 ? "text-bad" : "text-accent2"}`}>{mon(t)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="card relative px-3 py-2" style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.22), rgba(0,212,170,0.12))" }}>
          <h2 className="text-sm font-semibold">Ultimi movimenti</h2>
          <div ref={movRef} onScroll={check} style={{ height: listH }} className="mt-0.5 divide-y divide-line overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recent.slice(0, shownN).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 py-1.5">
                <p className="min-w-0 truncate text-xs">{t.description} <span className="text-muted">· {dshort(t.date)}</span></p>
                <span className={`num text-xs font-medium ${t.amount < 0 ? "text-bad" : "text-accent2"}`}>{mon(t)}</span>
              </div>
            ))}
          </div>
          {more && (
            <button
              aria-label="Scorri giù"
              onClick={() => movRef.current?.scrollBy({ top: movRef.current.clientHeight * 0.8, behavior: "smooth" })}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/50 p-1 text-muted backdrop-blur hover:text-fg"
            >
              <ChevronDown size={16} />
            </button>
          )}
        </section>
        {CLOUD && <button className="text-[11px] text-muted" onClick={logout}>Esci</button>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted">Patrimonio totale</p>
          <div className="flex items-center gap-2">
            <AssetsToggle />{toggle}
            <Link href="/settings" aria-label="Impostazioni" className="rounded-full bg-tint p-1.5 text-muted hover:text-fg"><Settings size={16} /></Link>
          </div>
        </div>
        <p className="num text-3xl font-bold">{eur(total)}</p>
        {beni > 0 && (
          <p className="num mt-0.5 text-xs text-muted">
            {includeAssets ? `di cui beni materiali ${eur(beni)}` : `esclusi beni materiali ${eur(beni)}`}
          </p>
        )}
        <div className="mt-2 flex items-end justify-between gap-6 text-sm">
          <div><p className="text-muted">Liquidi</p><p className="num font-semibold">{eur(cash)}</p></div>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-muted">Andamento YTD {year}</p>
            <p className={`num font-semibold ${up ? "text-accent2" : "text-bad"}`}>
              {up ? "▲" : "▼"} {eur(Math.abs(ytd))}{ytdPct !== null && ` · ${ytdPct >= 0 ? "+" : ""}${ytdPct.toFixed(1)}%`}
            </p>
            <div className="ml-auto mt-1 h-10 w-28">
              <ResponsiveContainer>
                <AreaChart data={spark}>
                  <defs><linearGradient id="ytd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={up ? "#00d4aa" : "#ff5d73"} stopOpacity={0.5} /><stop offset="1" stopColor={up ? "#00d4aa" : "#ff5d73"} stopOpacity={0} /></linearGradient></defs>
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <Area type="monotone" dataKey="v" stroke={up ? "#00d4aa" : "#ff5d73"} strokeWidth={2} fill="url(#ytd)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="card px-3 py-2"><p className="text-[11px] text-muted">Entrate mese</p><p className="num text-base font-semibold text-accent2">{eur(inc)}</p></div>
        <div className="card px-3 py-2"><p className="text-[11px] text-muted">Uscite mese</p><p className="num text-base font-semibold text-bad">{eur(exp)}</p></div>
      </div>

      <Accounts />

      {pending.length > 0 && (
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Da confermare ({pending.length})</h2>
            <button className="text-sm text-accent2" onClick={() => pending.forEach((t) => upsert("txs", { ...t, status: "confirmed" }))}>Conferma tutti</button>
          </div>
          <ul className="divide-y divide-line">
            {pending.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{t.description}</p>
                  <p className="text-xs text-muted">{state.accounts.find((a) => a.id === t.account_id)?.name} · {dshort(t.date)}</p>
                </div>
                <span className={`num text-sm ${t.amount < 0 ? "text-bad" : "text-accent2"}`}>{mon(t)}</span>
                <button className="rounded-lg bg-accent2/20 px-2 py-1 text-xs text-accent2" onClick={() => upsert("txs", { ...t, status: "confirmed" })}>OK</button>
                <button className="rounded-lg bg-tint2 px-2 py-1 text-xs" onClick={() => remove("txs", t.id)}>✕</button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Interessi mensili (netti 26%) e bollo trimestrale: conferma qui, oppure attiva «automatico» sul conto.</p>
        </section>
      )}

      <section>
        <h2 className="mb-1.5 text-sm font-semibold">Ultimi movimenti</h2>
        <div className="card divide-y divide-line">
          {state.txs.filter((t) => t.status === "confirmed").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
              <div className="min-w-0"><p className="truncate text-sm">{t.description}</p><p className="text-xs text-muted">{t.category} · {dshort(t.date)}</p></div>
              <span className={`num text-sm font-medium ${t.amount < 0 ? "text-bad" : "text-accent2"}`}>{mon(t)}</span>
            </div>
          ))}
        </div>
      </section>
      {CLOUD && <button className="text-xs text-muted" onClick={logout}>Esci</button>}
    </div>
  );
}
