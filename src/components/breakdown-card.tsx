"use client";

import { AnalyticDisplay } from "@/components/analytic-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ReactNode, useState } from "react";

export type BreakdownItem = {
  key: string;
  label: string;
  count: number;
  icon?: ReactNode;
};

export type BreakdownTab = {
  value: string;
  label: string;
  items: BreakdownItem[];
};

const TOP_N = 5;

function BreakdownList({ items }: { items: BreakdownItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No clicks in this period
      </p>
    );
  }

  const visible = showAll ? items : items.slice(0, TOP_N);
  return (
    <div className="space-y-1">
      {visible.map((item) => (
        <AnalyticDisplay
          key={item.key}
          icon={item.icon}
          label={item.label}
          clicks={item.count}
          total={total}
        />
      ))}
      {items.length > TOP_N && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-2 rounded-md px-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {showAll ? "Show top 5" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

export function BreakdownCard({
  title,
  tabs,
}: {
  title: string;
  tabs: BreakdownTab[];
}) {
  return (
    <div className="rounded-sm border border-foreground/15 bg-card p-5">
      <Tabs defaultValue={tabs[0]?.value}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{title}</h2>
          {tabs.length > 1 && (
            <TabsList className="h-auto">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}
        </div>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            <BreakdownList items={tab.items} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
