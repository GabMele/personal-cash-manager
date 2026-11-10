"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { State, Table } from "./types";
import { demoState } from "./seed";
import { generateAuto } from "./tax";
import { FALLBACK, type Rates } from "./fx";
import { CATEGORIES, type Cats } from "./categories";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const CLOUD = Boolean(URL && KEY);
const LS = "pcm-state-v1";
const LS_CATS = "pcm-categories-v1";

// jsonb non conserva l'ordine delle chiavi: si salva come array [{name, subs}]
const toList = (c: Cats) => Object.entries(c).map(([name, subs]) => ({ name, subs }));
const fromList = (l: { name: string; subs: string[] }[]) => Object.fromEntries(l.map((x) => [x.name, x.subs])) as Cats;

let sb: SupabaseClient | null = null;
const client = () => (sb ??= createClient(URL!, KEY!));

interface Ctx {
  state: State; // solo conti visibili (gli «Esterni» compaiono solo se showExternal)
  all: State; // tutto, inclusi gli esterni (pagine di gestione conti)
  showExternal: boolean;
  setShowExternal: (v: boolean) => void;
  ready: boolean;
  needsLogin: boolean;
  upsert: <T extends { id: string }>(table: Table, row: T) => Promise<void>;
  remove: (table: Table, id: string) => Promise<void>;
  login: (email: string) => Promise<string>;
  logout: () => Promise<void>;
  resetDemo: () => void;
  cats: Cats; // categorie → sottocategorie, nell'ordine scelto
  saveCats: (c: Cats) => Promise<void>;
  resetCats: () => Promise<void>;
  rates: Rates;
  ratesInfo: { date: string | null; live: boolean };
  includeAssets: boolean; // patrimonio con (true) o senza beni materiali
  setIncludeAssets: (v: boolean) => void;
}
const C = createContext<Ctx>(null as never);
export const useStore = () => useContext(C);
export const useCategories = () => { const { cats, saveCats, resetCats } = useContext(C); return { cats, save: saveCats, reset: resetCats }; };

const empty: State = { accounts: [], holdings: [], txs: [] };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(empty);
  const [ready, setReady] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [cats, setCats] = useState<Cats>(CATEGORIES);
  const [includeAssets, setIncludeAssetsState] = useState(false);
  useEffect(() => {
    try { setIncludeAssetsState(localStorage.getItem("pcm-include-assets") === "1"); } catch {}
  }, []);
  const setIncludeAssets = useCallback((v: boolean) => {
    setIncludeAssetsState(v);
    try { localStorage.setItem("pcm-include-assets", v ? "1" : "0"); } catch {}
  }, []);
  const [showExternal, setShowExternalState] = useState(false);
  useEffect(() => {
    try { setShowExternalState(sessionStorage.getItem("pcm-show-external") === "1"); } catch {}
  }, []);
  const setShowExternal = useCallback((v: boolean) => {
    setShowExternalState(v);
    try { sessionStorage.setItem("pcm-show-external", v ? "1" : "0"); } catch {}
  }, []);
  const [rates, setRates] = useState<Rates>(FALLBACK);
  const [ratesInfo, setRatesInfo] = useState<{ date: string | null; live: boolean }>({ date: null, live: false });

  useEffect(() => {
    fetch("/api/rates").then((r) => r.json()).then((j) => {
      setRates(j.rates);
      setRatesInfo({ date: j.date, live: j.live });
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (CLOUD) {
      const { data } = await client().auth.getSession();
      if (!data.session) { setNeedsLogin(true); setReady(true); return; }
      setNeedsLogin(false);
      const [a, h, t] = await Promise.all(
        (["accounts", "holdings", "txs"] as Table[]).map((tb) => client().from(tb).select("*"))
      );
      setState({ accounts: a.data ?? [], holdings: h.data ?? [], txs: t.data ?? [] } as State);
      const { data: us } = await client().from("user_settings").select("categories").maybeSingle();
      if (us?.categories) setCats(fromList(us.categories));
    } else {
      try {
        const rc = localStorage.getItem(LS_CATS);
        if (rc) { const p = JSON.parse(rc); setCats(Array.isArray(p) ? fromList(p) : p); }
      } catch {}
      try {
        const raw = localStorage.getItem(LS);
        const st: State = raw ? JSON.parse(raw) : demoState();
        // migrazione: i vecchi "saldo iniziale" erano entrate normali
        st.txs = st.txs.map((t) => (t.kind === "normal" && /^(Saldo|Liquidità) iniziale$/.test(t.description) ? { ...t, kind: "opening" as const } : t));
        setState(st);
      } catch { setState(demoState()); }
    }
    setReady(true);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!CLOUD && ready) { try { localStorage.setItem(LS, JSON.stringify(state)); } catch {} }
  }, [state, ready]);

  const upsertRaw = async (table: Table, row: { id: string }) => {
    setState((s) => {
      const list = s[table] as { id: string }[];
      const i = list.findIndex((x) => x.id === row.id);
      const next = i >= 0 ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
      return { ...s, [table]: next } as State;
    });
    if (CLOUD) await client().from(table).upsert(row);
  };

  const saveCats = async (c: Cats) => {
    setCats(c);
    if (CLOUD) await client().from("user_settings").upsert({ categories: toList(c) });
    else { try { localStorage.setItem(LS_CATS, JSON.stringify(toList(c))); } catch {} }
  };
  const resetCats = async () => {
    setCats(CATEGORIES);
    if (CLOUD) await client().from("user_settings").upsert({ categories: toList(CATEGORIES) });
    else { try { localStorage.removeItem(LS_CATS); } catch {} }
  };

  // Genera interessi mensili / bollo trimestrale mancanti (in attesa di conferma o automatici)
  useEffect(() => {
    if (!ready || needsLogin || state.accounts.length === 0) return;
    const add = generateAuto(state);
    if (add.length) add.forEach((t) => upsertRaw("txs", t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.accounts.length]);

  const visible = useMemo<State>(() => {
    if (showExternal) return state;
    const hidden = new Set(state.accounts.filter((a) => a.external).map((a) => a.id));
    if (hidden.size === 0) return state;
    return {
      accounts: state.accounts.filter((a) => !hidden.has(a.id)),
      holdings: state.holdings.filter((h) => !hidden.has(h.account_id)),
      txs: state.txs.filter((t) => !hidden.has(t.account_id)),
    };
  }, [state, showExternal]);

  const value = useMemo<Ctx>(() => ({
    state: visible, all: state, showExternal, setShowExternal, ready, needsLogin, rates, ratesInfo, includeAssets, setIncludeAssets, cats, saveCats, resetCats,
    upsert: upsertRaw as Ctx["upsert"],
    remove: async (table, id) => {
      // un giroconto ha due gambe collegate: si eliminano insieme
      const ids = new Set([id]);
      if (table === "txs") {
        const tid = state.txs.find((t) => t.id === id)?.transfer_id;
        if (tid) state.txs.filter((t) => t.transfer_id === tid).forEach((t) => ids.add(t.id));
      }
      setState((s) => ({ ...s, [table]: (s[table] as { id: string }[]).filter((x) => !ids.has(x.id)) }) as State);
      if (CLOUD) await client().from(table).delete().in("id", [...ids]);
    },
    login: async (email) => {
      const { error } = await client().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
      return error ? error.message : "Controlla la tua email: link di accesso inviato.";
    },
    logout: async () => { await client().auth.signOut(); setState(empty); setNeedsLogin(true); },
    resetDemo: () => setState(demoState()),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state, visible, showExternal, setShowExternal, ready, needsLogin, rates, ratesInfo, includeAssets, setIncludeAssets, cats]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
