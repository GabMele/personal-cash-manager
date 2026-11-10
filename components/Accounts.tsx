"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import Spark from "@/components/Spark";
import { balanceSeries, monthPoints } from "@/lib/trend";
import { useStore } from "@/lib/store";
import { cashBalance, holdingsValue } from "@/lib/tax";
import { money, toEur } from "@/lib/fx";

const RANGE = 6; // mesi mostrati negli sparkline

/** Home: solo i conti «in evidenza»; tutti gli altri sommati in una riga «Altri». Gestione completa in /accounts. */
export default function Accounts({ compact = false }: { compact?: boolean }) {
  const { state, rates } = useStore();
  const router = useRouter();
  const pts = useMemo(() => monthPoints(RANGE), []);
  const shown = state.accounts.filter((a) => a.featured !== false);
  const others = state.accounts.filter((a) => a.featured === false);
  const othersEur = others.reduce((s, a) => s + toEur(cashBalance(state.txs, a.id) + holdingsValue(state.holdings, a.id), a.currency, rates), 0);

  return (
    <section className="card space-y-1.5 px-2.5 py-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Conti</h2>
        <Link href="/accounts" aria-label="Gestisci conti" className="rounded-full bg-tint p-1.5 text-muted hover:text-fg"><Settings size={16} /></Link>
      </div>

      {shown.map((a) => {
        const bal = cashBalance(state.txs, a.id);
        const hv = holdingsValue(state.holdings, a.id);
        const cu = a.currency ?? "EUR";
        const m = (v: number) => money(v, cu);
        const go = () => router.push(`/transactions?account=${a.id}`);
        const ser = compact ? [] : balanceSeries(state, rates, pts, a.id);
        return (
          <div
            key={a.id} role="link" tabIndex={0} aria-label={`Apri movimenti di ${a.name}`}
            onClick={go} onKeyDown={(e) => e.key === "Enter" && go()}
            className={`card flex cursor-pointer items-center gap-2 overflow-hidden outline-none ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}
            style={{ background: `linear-gradient(135deg, ${a.color}4d 0%, ${a.color2 ?? a.color}40 100%)`, borderColor: `${a.color}45` }}
          >
            <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">
              {a.name}<span className="ml-1.5 text-[10px] font-normal capitalize text-muted">{a.kind}{cu !== "EUR" && ` · ${cu}`}</span>
            </p>
            {!compact && <div className="h-6 w-10 shrink-0"><Spark color={a.color} fmt={m} data={pts.map((p, i) => ({ label: p.label, v: ser[i] }))} /></div>}
            <div className="text-right">
              <p className="num text-sm font-semibold leading-tight">{m(bal)}</p>
              {(cu !== "EUR" || hv > 0) && (
                <p className="num text-[10px] leading-tight text-muted">
                  {cu !== "EUR" && `≈ ${money(toEur(bal, cu, rates), "EUR")}`}{cu !== "EUR" && hv > 0 && " · "}{hv > 0 && `+ ${m(hv)} titoli`}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {others.length > 0 && (
        <Link href="/accounts" className={`card flex items-center justify-between ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
          <p className="text-sm text-muted">Altri <span className="text-[10px]">({others.length})</span></p>
          <p className="num text-sm font-semibold">{money(othersEur, "EUR")}</p>
        </Link>
      )}
      {state.accounts.length === 0 && <p className="text-sm text-muted">Nessun conto. Aggiungine uno con la rotella.</p>}
    </section>
  );
}
