"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Panel, PanelHeader, Select } from "@/components/app/ui";
import { publicText } from "@/components/app/holder-kit";
import { useSandbox } from "@/lib/precursor/store";
import { byId, fmtRelative, shortHex } from "@/lib/precursor/engine";
import type { ChainEvent, Sandbox } from "@/lib/precursor/types";

/** The Explorer's event feed: contract events with holder names replaced by wallet addresses. */
export function EventFeed({ events, title = "Live events", showCompany = true, limit = 20 }: { events: ChainEvent[]; title?: string; showCompany?: boolean; limit?: number }) {
  const { s, now } = useSandbox();
  const [filter, setFilter] = useState("ALL");
  const [count, setCount] = useState(limit);
  const names = useMemo(() => [...new Set(events.map((e) => e.name))].sort(), [events]);
  const list = events.filter((e) => filter === "ALL" || e.name === filter).sort((a, b) => b.block - a.block);

  return (
    <Panel>
      <PanelHeader
        eyebrow="Activity"
        title={title}
        description="Events emitted by Precursor contracts, newest first."
        action={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full sm:w-52" aria-label="Filter by event">
            <option value="ALL">All events</option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        }
      />
      {list.length === 0 ? (
        <p className="text-[13.5px] text-fog">No events of this type.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {list.slice(0, count).map((e) => (
            <EventRow key={e.id} e={e} s={s} now={now} showCompany={showCompany} />
          ))}
        </ul>
      )}
      {list.length > count && (
        <button type="button" onClick={() => setCount((c) => c + 20)} className="btn btn-ghost btn-sm mt-3 w-full">
          Show {Math.min(20, list.length - count)} more
        </button>
      )}
    </Panel>
  );
}

function EventRow({ e, s, now, showCompany }: { e: ChainEvent; s: Sandbox; now: number; showCompany: boolean }) {
  const company = byId(s.companies, e.companyId);
  const cls = byId(s.classes, e.classId);
  return (
    <li className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-mono text-[12px] font-medium text-lagoon">{e.name}</span>
          {showCompany && company && (
            <Link href={`/explorer/${company.id}`} className="text-[12px] text-tide hover:text-navy">
              {company.name}
            </Link>
          )}
          {cls && <span className="font-mono text-[11px] text-fog">{cls.symbol}</span>}
        </div>
        <p className="mt-1 text-[13.5px] leading-snug text-navy">{publicText(s, e.summary)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] text-fog sm:flex-col sm:items-end sm:gap-0.5">
        <span className="readout">#{e.block.toLocaleString("en-US")}</span>
        <span title={e.tx}>{shortHex(e.tx)}</span>
        <span>{fmtRelative(e.at, now)}</span>
      </div>
    </li>
  );
}

