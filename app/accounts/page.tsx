"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import AccountManager from "@/components/AccountManager";

export default function AccountsPage() {
  return (
    <div className="space-y-3">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ChevronLeft size={16} /> Home</Link>
      <AccountManager />
      <Link href="/accounts/external" className="card flex items-center gap-2 px-3 py-2.5 text-sm">
        <Lock size={15} className="text-muted" /><span className="flex-1">Esterni</span><ChevronRight size={16} className="text-muted" />
      </Link>
    </div>
  );
}
