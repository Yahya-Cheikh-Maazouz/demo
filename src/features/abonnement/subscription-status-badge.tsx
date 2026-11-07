import { Badge } from "@/components/ui/badge";
import type { SubscriptionStatus } from "@/lib/types";
import { SUBSCRIPTION_STATUS_META } from "./status-meta";

export function SubscriptionStatusBadge({ status, className }: { status: SubscriptionStatus; className?: string }) {
  const meta = SUBSCRIPTION_STATUS_META[status];
  return (
    <Badge tone={meta.tone} icon={meta.icon} className={className}>
      {meta.label}
    </Badge>
  );
}
