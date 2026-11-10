import { MAIN_CURRENCIES, OTHER_CURRENCIES } from "@/lib/fx";

/** EUR e USD in alto, separatore, poi le altre valute in ordine alfabetico. */
export default function CurrencySelect({ value, onChange, className = "inp" }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {MAIN_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
      <option disabled>──────────</option>
      {OTHER_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
    </select>
  );
}
