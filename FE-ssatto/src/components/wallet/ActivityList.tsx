import { AnimatePresence, motion } from "motion/react";
import Card from "../common/Card";
import type { Activity } from "../../types";

interface ActivityListProps {
  activities: Activity[];
}

export default function ActivityList({ activities }: ActivityListProps) {
  return (
    <Card
      eyebrow="활동 내역"
      title={
        <div className="flex items-end justify-between gap-4">
          <h3 className="font-display text-2xl font-bold text-white">활동 기록</h3>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary shadow-sm">
            최근 이벤트
          </span>
        </div>
      }
    >
      <div className="space-y-3">
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
                    <p className="font-mono text-sm text-accent-gold">{activity.amount}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-text-secondary">{activity.createdAt}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
}
