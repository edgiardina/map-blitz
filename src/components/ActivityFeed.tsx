import { TournamentWithCoords } from "@/lib/matchplay";
import { useEffect, useState } from "react";

interface ActivityFeedProps {
  tournaments: TournamentWithCoords[];
}

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  type: "active" | "upcoming";
}

export function ActivityFeed({ tournaments }: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const feed: ActivityItem[] = tournaments.slice(0, 5).map((t) => ({
      id: `${t.tournamentId}-${Date.now()}`,
      text: `${t.status === "started" ? "🎯" : "📅"} ${t.name}`,
      time: new Date(t.startUtc).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      type: t.status === "started" ? "active" : "upcoming",
    }));
    setItems(feed);
  }, [tournaments]);

  return (
    <div className="border-t border-border p-3">
      <div className="text-[9px] font-display tracking-[0.2em] text-muted-foreground mb-2">
        RECENT ACTIVITY
      </div>
      <div className="space-y-1.5 max-h-28 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between animate-fade-in">
            <span className="text-[10px] text-foreground/80 truncate flex-1 mr-2">
              {item.text}
            </span>
            <span className="text-[9px] text-muted-foreground whitespace-nowrap">
              {item.time}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-[10px] text-muted-foreground">No activity yet</div>
        )}
      </div>
    </div>
  );
}
