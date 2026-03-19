import { AnimatePresence, motion } from "motion/react";
import Card from "../common/Card";
import type { Activity } from "../../types";

interface ActivityListProps {
  activities: Activity[];
}

export default function ActivityList({ activities }: ActivityListProps) {
  return (
    <Card
      title={
        <div className="flex items-end justify-between gap-4">
          <h3 className="font-display text-2xl font-bold text-white">활동 기록</h3>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary shadow-sm">
            최근 이벤트
          </span>
        </div>
      }
    >
      {activities.length === 0 ? (
        <div className="flex items-center justify-center rounded-[22px] border border-white/6 bg-white/[0.02] px-4 py-10 text-sm font-bold text-text-secondary">
          활동 내역은 read-model 구축 이후 제공됩니다.
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] hover:overflow-y-auto overflow-y-hidden subtle-scroll pr-2">
        <AnimatePresence initial={false}>
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              layout
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: index * 0.04 }}
              className="overflow-hidden border-b border-border bg-transparent px-2 py-3 last:border-b-0"
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs text-text-secondary">{activity.type}</p>
                  <p className="mt-1 text-sm text-text-primary">{activity.description}</p>
                </div>
                <div className="text-left lg:text-right">
                  {activity.amount ? (
                    <p className="font-mono text-sm text-text-primary">{activity.amount}</p>
                  ) : null}
                  {activity.jackAmount != null ? (
                    <p className={`font-mono text-sm ${activity.jackAmount >= 0 ? "text-accent-gold" : "text-text-secondary"}`}>
                      {activity.jackAmount >= 0 ? "+" : ""}{(activity.jackAmount / 1e8).toLocaleString("ko-KR")} JACK
                    </p>
                  ) : null}
                  {activity.potAmount != null ? (
                    <p className={`font-mono text-sm ${activity.potAmount >= 0 ? "text-info" : "text-text-secondary"}`}>
                      {activity.potAmount >= 0 ? "+" : ""}{(activity.potAmount / 1e8).toLocaleString("ko-KR")} POT
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-text-secondary">{activity.createdAt}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
