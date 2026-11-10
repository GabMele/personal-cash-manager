"use client";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useStore } from "@/lib/store";
import { eur } from "@/lib/fmt";
import { catColor, projectColor, tagColor } from "@/lib/colors";
import MultiSelect from "@/components/MultiSelect";
import { toEur } from "@/lib/fx";
import { DESTINATIONS, STAR_COLORS, destOf } from "@/lib/destinations";
import type { Tx } from "@/lib/types";

type Mode = "month" | "year" | "ytd" | "range" | "all";
type Dim = "category" | "subcategory" | "project" | "tag" | "payee" | "account" | "destination" | "stars";
type Kind = "uscite" | "entrate" | "totale";
const DIMS: Record<Dim, string> = { category: "Categoria", subcategory: "Sottocat.", project: "Progetto", tag: "Tag", payee: "Destinatario", account: "Conto", destination: "Destinazione", stars: "Valore ★" };
const PAL = ["#7c5cff", "#00d4aa", "#ff8a3d", "#ff5d9e", "#3da5ff", "#ffd23d", "#a0e060", "#c07cff"];
const todayIso = () => new Date().toISOString().slice(0, 10);
const lastDay = (ym: string) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).toISOString().slice(0, 10);
const shiftMonth = (ym: string, d: number) => {
  const dt = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + d, 1));
  return dt.toISOString().slice(0, 7);
};
const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const nice = (k: string) => (k.length === 7 ? `${MESI[+k.slice(5) - 1]} ${k.slice(2, 4)}` : `${+k.slice(8)}/${+k.slice(5, 7)}`);
const tip = { contentStyle: { background: "#14142a", border: "1px solid #333", borderRadius: 12 }, formatter: (v: unknown) => eur(Number(v)) };

export default function Reports() {
  const { state, rates } = useStore();
  const now = todayIso();
  const [mode, setMode] = useState<Mode>("month");
  const [ym, setYm] = useState(now.slice(0, 7));
  const [year, setYear] = useState(+now.slice(0, 4));
  const [rf, setRf] = useState(now.slice(0, 8) + "01");
  const [rt, setRt] = useState(now);
  const [dim, setDim] = useState<Dim>("category");
  const [kind, setKind] = useState<Kind>("uscite");
  const [zoom, setZoom] = useState(1);
  const [shape, setShape] = useState<"area" | "line">("area");
  const [fAcc, setFAcc] = useState<string[]>([]);
  const [fCat, setFCat] = useState<string[]>([]);
  const [fTag, setFTag] = useState<string[]>([]);
  const [fProj, setFProj] = useState<string[]>([]);
  const [fPayee, setFPayee] = useState<string[]>([]);

  // tutti gli importi dei report sono convertiti in EUR ai cambi correnti
  const confirmed = useMemo(
    () => state.txs.filter((t) => t.status === "confirmed").map((t) => ({
      ...t, amount: toEur(t.amount, state.accounts.find((a) => a.id === t.account_id)?.currency, rates),
    })),
    [state.txs, state.accounts, rates]
  );
  const accName = (id: string) => state.accounts.find((a) => a.id === id)?.name ?? "?";
  const accColor = (id: string) => state.accounts.find((a) => a.id === id)?.color ?? "#9a9ab5";

  const [from, to] = useMemo(() => {
    if (mode === "month") return [ym + "-01", lastDay(ym)];
    if (mode === "year") return [`${year}-01-01`, `${year}-12-31`];
    if (mode === "ytd") return [`${now.slice(0, 4)}-01-01`, now];
    if (mode === "range") return [rf, rt];
    const min = confirmed.reduce((m, t) => (t.date < m ? t.date : m), now);
    return [min, now];
  }, [mode, ym, year, rf, rt, confirmed, now]);

  const pass = (t: Tx) =>
    (!fAcc.length || fAcc.includes(t.account_id)) &&
    (!fCat.length || fCat.includes(t.category)) &&
    (!fProj.length || fProj.includes(t.project)) &&
    (!fPayee.length || fPayee.includes(t.payee ?? "")) &&
    (!fTag.length || t.tags.some((x) => fTag.includes(x)));

  const filtered = useMemo(() => confirmed.filter(pass), [confirmed, fAcc, fCat, fProj, fPayee, fTag]); // eslint-disable-line react-hooks/exhaustive-deps
  const inPeriod = useMemo(() => filtered.filter((t) => t.date >= from && t.date <= to), [filtered, from, to]);

  const days = (new Date(to).getTime() - new Date(from).getTime()) / 864e5;
  const monthly = days > 62;
  const bucketOf = (d: string) => (monthly ? d.slice(0, 7) : d);

  const buckets = useMemo(() => {
    const keys: string[] = [];
    const cur = new Date(from + "T00:00:00Z");
    const end = new Date(to + "T00:00:00Z");
    while (cur <= end) {
      const k = bucketOf(cur.toISOString().slice(0, 10));
      if (keys[keys.length - 1] !== k) keys.push(k);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return keys;
  }, [from, to, monthly]); // eslint-disable-line react-hooks/exhaustive-deps

  const flow = useMemo(() => {
    const opening = filtered.filter((t) => t.date < from).reduce((s, t) => s + t.amount, 0);
    let run = opening;
    return buckets.map((k) => {
      const ts = inPeriod.filter((t) => bucketOf(t.date) === k);
      const real = ts.filter((t) => t.kind !== "transfer" && t.kind !== "opening"); // giroconti e saldi iniziali non sono entrate/uscite
      const entrate = real.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const uscite = -real.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
      run += ts.reduce((s, t) => s + t.amount, 0);
      return { k, label: nice(k), entrate: r(entrate), uscite: r(uscite), netto: r(entrate - uscite), saldo: r(run) };
    });
  }, [buckets, inPeriod, filtered, from]); // eslint-disable-line react-hooks/exhaustive-deps

  const keyOf = (t: Tx): string[] => {
    switch (dim) {
      case "tag": return t.tags.length ? t.tags : ["(senza tag)"];
      case "account": return [accName(t.account_id)];
      case "payee": return [t.payee || "(nessuno)"];
      case "project": return [t.project || "(nessuno)"];
      case "destination": return [destOf(t.destination)?.label ?? "(nessuna)"];
      case "stars": return [t.stars ? `${t.stars} ★` : "non valutato"];
      default: return [t[dim] || "(nessuno)"];
    }
  };
  const col = (name: string, i: number) =>
    dim === "destination" ? DESTINATIONS.find((d) => d.label === name)?.color ?? "#9a9ab5" :
    dim === "stars" ? STAR_COLORS[parseInt(name) || 0] :
    dim === "category" ? catColor(name) : dim === "project" ? projectColor(name) : dim === "tag" ? tagColor(name) :
    dim === "account" ? accColor(state.accounts.find((a) => a.name === name)?.id ?? "") : PAL[i % PAL.length];

  const side = inPeriod.filter((t) => t.kind !== "transfer" && t.kind !== "opening" && (kind === "uscite" ? t.amount < 0 : kind === "entrate" ? t.amount > 0 : true));
  const sgn = (t: Tx) => (kind === "totale" ? t.amount : Math.abs(t.amount));
  const groups = useMemo(() => {
    const m = new Map<string, { value: number; inc: number; out: number }>();
    for (const t of side) keyOf(t).forEach((k) => {
      const g = m.get(k) ?? { value: 0, inc: 0, out: 0 };
      g.value += sgn(t);
      if (t.amount > 0) g.inc += t.amount; else g.out -= t.amount;
      m.set(k, g);
    });
    return [...m].map(([name, g]) => ({ name, value: r(g.value), inc: r(g.inc), out: r(g.out), abs: kind === "totale" ? r(g.inc + g.out) : Math.abs(r(g.value)) })).sort((a, b) => b.abs - a.abs);
  }, [side, dim, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const maxFlow = Math.max(1, ...groups.map((g) => Math.max(g.inc, g.out)));
  const total = groups.reduce((s, g) => s + g.value, 0);
  const totalAbs = groups.reduce((s, g) => s + g.abs, 0) || 1;
  const top = groups.slice(0, 5).map((g) => g.name);

  const series = useMemo(() => buckets.map((k) => {
    const row: Record<string, number | string> = { label: nice(k) };
    top.forEach((n) => (row[n] = 0));
    for (const t of side.filter((x) => bucketOf(x.date) === k))
      keyOf(t).forEach((n) => { if (top.includes(n)) row[n] = r((row[n] as number) + sgn(t)); });
    return row;
  }), [buckets, side, groups, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const sum = (f: (t: Tx) => boolean) => inPeriod.filter(f).reduce((s, t) => s + t.amount, 0);
  const income = sum((t) => t.amount > 0 && t.kind === "normal");
  const expense = sum((t) => t.amount < 0 && t.kind === "normal");
  const interest = sum((t) => t.kind === "interest");
  const bollo = sum((t) => t.kind === "bollo");

  const rated = inPeriod.filter((t) => t.amount < 0 && t.kind === "normal" && t.stars > 0);
  const ratedSum = rated.reduce((s, t) => s - t.amount, 0);
  const goodSum = rated.filter((t) => t.stars >= 4).reduce((s, t) => s - t.amount, 0);
  const uniq = (f: (t: Tx) => string[]) => [...new Set(confirmed.flatMap(f).filter(Boolean))].sort().map((v) => ({ value: v, label: v }));
  const exportCsv = () => {
    const rows = [["data", "conto", "importo_eur", "descrizione", "destinatario", "categoria", "sottocategoria", "tag", "progetto"],
      ...inPeriod.map((t) => [t.date, accName(t.account_id), t.amount.toFixed(2).replace(".", ","), t.description, t.payee ?? "", t.category, t.subcategory, t.tags.join("|"), t.project])];
    const csv = rows.map((x) => x.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = `report_${from}_${to}.csv`;
    a.click();
  };

  const monthLines = monthly ? null : buckets.filter((k) => k.endsWith("-01")).map((k) => <ReferenceLine key={k} x={nice(k)} stroke="rgba(255,255,255,.28)" strokeDasharray="3 3" />);
  const Trend = shape === "area" ? AreaChart : LineChart;
  const years = [...new Set([+now.slice(0, 4), ...confirmed.map((t) => +t.date.slice(0, 4))])].sort((a, b) => b - a);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Report</h1>
        <button className="btn-ghost flex items-center gap-2 text-sm" onClick={exportCsv}><Download size={15} /> CSV</button>
      </div>

      {/* Periodo */}
      <div className="card relative z-20 space-y-3 p-3">
        <div className="grid grid-cols-5 gap-1 rounded-xl bg-tint p-1 text-sm sm:max-w-md">
          {(["month", "year", "ytd", "range", "all"] as const).map((p) => (
            <button key={p} onClick={() => setMode(p)} className={`rounded-lg py-1.5 ${mode === p ? "bg-accent" : "text-muted"}`}>
              {{ month: "Mese", year: "Anno", ytd: "YTD", range: "Periodo", all: "Tutto" }[p]}
            </button>
          ))}
        </div>
        {mode === "month" && (
          <div className="flex items-center gap-2">
            <button className="btn-ghost !p-2" onClick={() => setYm(shiftMonth(ym, -1))} aria-label="Mese precedente"><ChevronLeft size={18} /></button>
            <input className="inp !w-auto text-center" type="month" value={ym} onChange={(e) => e.target.value && setYm(e.target.value)} />
            <button className="btn-ghost !p-2" onClick={() => setYm(shiftMonth(ym, 1))} aria-label="Mese successivo"><ChevronRight size={18} /></button>
          </div>
        )}
        {mode === "year" && (
          <div className="flex items-center gap-2">
            <button className="btn-ghost !p-2" onClick={() => setYear(year - 1)} aria-label="Anno precedente"><ChevronLeft size={18} /></button>
            <select className="inp !w-auto text-center" value={year} onChange={(e) => setYear(+e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</select>
            <button className="btn-ghost !p-2" onClick={() => setYear(year + 1)} aria-label="Anno successivo"><ChevronRight size={18} /></button>
          </div>
        )}
        {mode === "range" && (
          <div className="flex gap-2">
            <label><span className="lbl">Dal</span><input className="inp !w-auto" type="date" value={rf} onChange={(e) => setRf(e.target.value)} /></label>
            <label><span className="lbl">Al</span><input className="inp !w-auto" type="date" value={rt} onChange={(e) => setRt(e.target.value)} /></label>
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          {[["Ultimi 30 gg", 30], ["Ultimi 90 gg", 90], ["Ultimi 12 mesi", 365]].map(([l, n]) => (
            <button key={l} className="rounded-full border border-line px-3 py-1 text-muted" onClick={() => {
              setMode("range"); setRt(now); setRf(new Date(Date.now() - Number(n) * 864e5).toISOString().slice(0, 10));
            }}>{l}</button>
          ))}
        </div>

        {/* Filtri */}
        <div className="grid grid-cols-5 gap-1.5 pt-1.5">
          <MultiSelect compact label="Conto" selected={fAcc} onChange={setFAcc} options={state.accounts.map((a) => ({ value: a.id, label: a.name, color: a.color }))} />
          <MultiSelect compact label="Categoria" selected={fCat} onChange={setFCat} options={uniq((t) => [t.category]).map((o) => ({ ...o, color: catColor(o.value) }))} />
          <MultiSelect compact label="Tag" selected={fTag} onChange={setFTag} options={uniq((t) => t.tags).map((o) => ({ ...o, color: tagColor(o.value) }))} />
          <MultiSelect compact right label="Progetto" selected={fProj} onChange={setFProj} options={uniq((t) => [t.project]).map((o) => ({ ...o, color: projectColor(o.value) }))} />
          <MultiSelect compact right label="Destinatario" selected={fPayee} onChange={setFPayee} options={uniq((t) => [t.payee ?? ""])} />
        </div>
        <p className="text-xs text-muted">{from} → {to} · {inPeriod.length} movimenti</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Entrate" v={eur(income)} cls="text-accent2" />
        <Kpi label="Uscite" v={eur(expense)} cls="text-bad" />
        <Kpi label="Risparmio" v={eur(income + expense)} cls={income + expense >= 0 ? "text-accent2" : "text-bad"} sub={income > 0 ? `${Math.round(((income + expense) / income) * 100)}% delle entrate` : undefined} />
        <Kpi label="Interessi netti" v={eur(interest)} cls="text-accent2" />
        <Kpi label="Bollo" v={eur(bollo)} cls="text-bad" />
        <Kpi label="Ben spesi (4–5 ★)" v={ratedSum > 0 ? `${Math.round((goodSum / ratedSum) * 100)}%` : "—"} style={{ color: STAR_COLORS[5] }} sub={`${rated.length} spese valutate`} />
      </div>

      {/* Andamenti */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Andamenti</h2>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-tint p-1 text-xs">
          {(["area", "line"] as const).map((s) => <button key={s} onClick={() => setShape(s)} className={`rounded-lg px-3 py-1.5 ${shape === s ? "bg-accent" : "text-muted"}`}>{s === "area" ? "Area" : "Linea"}</button>)}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
      <ChartCard title="Saldo cumulato">
        <ResponsiveContainer>
          <Trend data={flow}>
            <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00d4aa" stopOpacity={0.5} /><stop offset="1" stopColor="#00d4aa" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" stroke="#9a9ab5" fontSize={11} minTickGap={24} /><YAxis stroke="#9a9ab5" fontSize={11} width={44} />
            <Tooltip {...tip} />{monthLines}
            {shape === "area" ? <Area type="monotone" dataKey="saldo" stroke="#00d4aa" strokeWidth={2.5} fill="url(#gs)" /> : <Line type="monotone" dataKey="saldo" stroke="#00d4aa" strokeWidth={2.5} dot={false} />}
          </Trend>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={`Entrate · uscite · netto (${monthly ? "per mese" : "per giorno"})`}>
        <ResponsiveContainer>
          <Trend data={flow}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" stroke="#9a9ab5" fontSize={11} minTickGap={24} /><YAxis stroke="#9a9ab5" fontSize={11} width={44} />
            <Tooltip {...tip} />{monthLines}
            <ReferenceLine y={0} stroke="rgba(255,255,255,.25)" />
            {shape === "area" ? <>
              <Area type="monotone" dataKey="entrate" stroke="#00d4aa" strokeWidth={2} fill="#00d4aa" fillOpacity={0.12} />
              <Area type="monotone" dataKey="uscite" stroke="#ff5d73" strokeWidth={2} fill="#ff5d73" fillOpacity={0.12} />
              <Area type="monotone" dataKey="netto" stroke="#ffffff" strokeWidth={2} strokeDasharray="4 3" fill="none" />
            </> : <>
              <Line type="monotone" dataKey="entrate" stroke="#00d4aa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="uscite" stroke="#ff5d73" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="netto" stroke="#ffffff" strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </>}
          </Trend>
        </ResponsiveContainer>
      </ChartCard>
      </div>

      {/* Ripartizione */}
      <div className="grid gap-3 lg:grid-cols-2">
      <div className="card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs text-muted"><b className="text-sm text-fg">Ripartizione</b> · {kind === "totale" ? "saldo" : "totale"} <span className={kind === "totale" ? (total < 0 ? "text-bad" : "text-accent2") : ""}>{eur(total)}</span></p>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-tint p-1 text-xs">
            {(["uscite", "entrate", "totale"] as const).map((k) => <button key={k} onClick={() => setKind(k)} className={`rounded-lg px-2.5 py-1 capitalize ${kind === k ? (k === "uscite" ? "bg-bad/80" : k === "entrate" ? "bg-accent2/80 text-black" : "bg-accent") : "text-muted"}`}>{k}</button>)}
          </div>
        </div>
        {kind === "totale" && (
          <div className="mb-2 flex items-center gap-1 text-[11px] text-muted">
            Zoom {[1, 2, 5, 10, 25].map((z) => <button key={z} onClick={() => setZoom(z)} className={`rounded-full border px-2 py-0.5 ${zoom === z ? "border-accent2 text-accent2" : "border-line"}`}>{z}×</button>)}
          </div>
        )}
        <div className="flex gap-3">
          <div className="flex shrink-0 flex-col gap-1">
            {(Object.keys(DIMS) as Dim[]).map((d) => (
              <button key={d} onClick={() => setDim(d)} className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-left text-xs ${dim === d ? "border-accent2 text-accent2" : "border-line text-muted"}`}>{DIMS[d]}</button>
            ))}
          </div>
          <div className="min-w-0 flex-1">
        {groups.length && kind === "totale" ? (
          <ul className="space-y-2 text-xs">
            {groups.slice(0, 10).map((g) => (
              <li key={g.name}>
                <div className="flex items-center justify-between">
                  <span className="truncate">{g.name}</span>
                  <span className={`num font-semibold ${g.value < 0 ? "text-bad" : "text-accent2"}`}>{eur(g.value)}</span>
                </div>
                {([["inc", "#00d4aa"], ["out", "#ff5d73"]] as const).map(([f, c]) => (
                  <div key={f} className="mt-0.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tint2"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (g[f] / maxFlow) * zoom * 100)}%`, background: c }} /></div>
                    <span className="num w-20 shrink-0 text-right text-[10px] text-muted">{g[f] ? eur(g[f]) : "—"}</span>
                  </div>
                ))}
              </li>
            ))}
            {groups.length > 10 && <li className="text-muted">+ altri {groups.length - 10}</li>}
          </ul>
        ) : groups.length ? (
          <div className="flex flex-col items-center gap-2 xl:flex-row">
            <div className="h-32 w-32 shrink-0">
              <ResponsiveContainer><PieChart><Pie data={groups} dataKey="abs" innerRadius={34} outerRadius={60} stroke="none">
                {groups.map((g, i) => <Cell key={g.name} fill={col(g.name, i)} />)}</Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer>
            </div>
            <ul className="w-full space-y-1.5 text-xs">
              {groups.slice(0, 8).map((g, i) => (
                <li key={g.name}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ background: col(g.name, i) }} />{g.name}</span>
                    <span className={`num ${kind === "totale" ? (g.value < 0 ? "text-bad" : "text-accent2") : ""}`}>{eur(g.value)} <span className="text-xs text-muted">{Math.round((g.abs / totalAbs) * 100)}%</span></span>
                  </div>
                  <div className="mt-0.5 h-1 rounded-full bg-tint2"><div className="h-full rounded-full" style={{ width: `${(g.abs / totalAbs) * 100}%`, background: col(g.name, i) }} /></div>
                </li>
              ))}
              {groups.length > 8 && <li className="text-muted">+ altri {groups.length - 8} · {eur(groups.slice(8).reduce((s, g) => s + g.value, 0))}</li>}
            </ul>
          </div>
        ) : <p className="text-sm text-muted">Nessun dato nel periodo.</p>}
          </div>
        </div>
      </div>

      {groups.length > 0 && (
        <ChartCard title={`Andamento top ${top.length} · ${DIMS[dim].toLowerCase()}`}>
          <ResponsiveContainer>
            <Trend data={series}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" stroke="#9a9ab5" fontSize={11} minTickGap={24} /><YAxis stroke="#9a9ab5" fontSize={11} width={44} />
              <Tooltip {...tip} />{monthLines}
              {top.map((n, i) => shape === "area"
                ? <Area key={n} type="monotone" dataKey={n} stackId="1" stroke={col(n, i)} fill={col(n, i)} fillOpacity={0.35} />
                : <Line key={n} type="monotone" dataKey={n} stroke={col(n, i)} strokeWidth={2} dot={false} />)}
            </Trend>
          </ResponsiveContainer>
        </ChartCard>
      )}
      </div>
    </div>
  );
}

const r = (n: number) => Math.round(n * 100) / 100;
function Kpi({ label, v, cls = "", sub, style }: { label: string; v: string; cls?: string; sub?: string; style?: React.CSSProperties }) {
  return (
    <div className="card px-3 py-2">
      <p className="truncate text-[11px] text-muted">{label}</p>
      <p className={`num text-base font-semibold leading-tight ${cls}`} style={style}>{v}</p>
      {sub && <p className="truncate text-[10px] text-muted">{sub}</p>}
    </div>
  );
}
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-3">
      <p className="mb-1 text-xs text-muted">{title}</p>
      <div className="h-40">{children}</div>
    </div>
  );
}
