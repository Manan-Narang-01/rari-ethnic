import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { History } from "lucide-react";
import { LogEntry } from "@/components/admin/events/LogEntry";

export const AdminCampaignLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/campaigns/logs")
      .then((r) => setLogs(r.data))
      .catch(() => toast.error("Failed to load event logs"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="label-caps">Events</p>
        <h1 className="font-display text-4xl mt-1">Event logs</h1>
        <p className="text-sm text-[#6E7B85] mt-1">
          Every create, update, and delete across all events — including deleted ones.
        </p>
      </div>

      {loading ? (
        <div className="text-[#6E7B85]">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-[#6E7B85] border border-dashed border-[#8B9A9F]/40 rounded-sm">
          <History size={28} className="mx-auto text-[#8B9A9F] mb-3" />
          No activity logged yet.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <LogEntry key={log.id} log={log} showCampaignName />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCampaignLogs;
