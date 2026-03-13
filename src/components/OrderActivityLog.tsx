import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LogEntry {
    id: string;
    timestamp: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    updated_by: string | null;
    user_name: string;
}

interface Props {
    orderId: string;
    module: string | string[];
    refreshKey?: any;
}

export default function OrderActivityLog({ orderId, module, refreshKey }: Props) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);

            // Step 1: Fetch activity logs WITHOUT any join (the FK relationship is not in the schema cache)
            let query = (supabase.from("order_activity_log" as any) as any)
                .select("id, timestamp, field_name, old_value, new_value, updated_by, module, order_id")
                .eq("order_id", orderId);

            if (Array.isArray(module)) {
                query = query.in("module", module);
            } else {
                query = query.eq("module", module);
            }

            const { data: activityData, error: actErr } = await query.order("timestamp", { ascending: false });
            if (actErr) console.error("OrderActivityLog fetch error:", actErr);

            // Step 2: Collect unique user IDs and look them up from profiles separately
            const userIds = [...new Set(
                (activityData || [])
                    .map((l: any) => l.updated_by)
                    .filter(Boolean)
            )] as string[];

            const userNameMap: Record<string, string> = {};
            if (userIds.length > 0) {
                const { data: profileData } = await (supabase.from("profiles" as any) as any)
                    .select("user_id, name")
                    .in("user_id", userIds);  // updated_by stores the auth user_id, match against profiles.user_id

                (profileData || []).forEach((p: any) => {
                    if (p.user_id && p.name) userNameMap[p.user_id] = p.name;
                });
            }

            // Step 3: Map to final shape
            let allLogs: LogEntry[] = (activityData || []).map((log: any) => ({
                id: log.id,
                timestamp: log.timestamp,
                field_name: log.field_name,
                old_value: log.old_value,
                new_value: log.new_value,
                updated_by: log.updated_by,
                user_name: log.updated_by ? (userNameMap[log.updated_by] || "Unknown User") : "System",
            }));

            // Step 4: For "Sales" module also include the audit_log table entries
            if (module === "Sales") {
                const { data: auditData } = await (supabase.from("audit_log" as any) as any)
                    .select("id, created_at, field, old_value, new_value, user_id")
                    .eq("entity_id", orderId)
                    .eq("entity_type", "orders")
                    .order("created_at", { ascending: false });

                if (auditData && auditData.length > 0) {
                    // Collect user IDs from audit logs too
                    const auditUserIds = [...new Set(
                        auditData.map((a: any) => a.user_id).filter(Boolean)
                    )] as string[];

                    const auditUserNameMap: Record<string, string> = { ...userNameMap };
                    const newIds = auditUserIds.filter(uid => !auditUserNameMap[uid]);
                    if (newIds.length > 0) {
                        const { data: auditProfiles } = await (supabase.from("profiles" as any) as any)
                            .select("id, name")
                            .in("id", newIds);
                        (auditProfiles || []).forEach((p: any) => {
                            if (p.id && p.name) auditUserNameMap[p.id] = p.name;
                        });
                    }

                    const mappedAudit: LogEntry[] = auditData.map((a: any) => ({
                        id: a.id,
                        timestamp: a.created_at,
                        field_name: a.field || "unknown",
                        old_value: a.old_value,
                        new_value: a.new_value,
                        updated_by: a.user_id,
                        user_name: a.user_id ? (auditUserNameMap[a.user_id] || "Unknown User") : "System",
                    }));

                    allLogs = [...allLogs, ...mappedAudit].sort((a, b) =>
                        new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
                    );
                }
            }

            setLogs(allLogs);
            setLoading(false);
        };

        fetchLogs();
    }, [orderId, module, refreshKey]);

    if (loading) return <div className="p-4 text-center text-sm text-muted-foreground">Loading history...</div>;

    return (
        <Card className="mt-6">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {Array.isArray(module) ? "Materials" : module} Activity History
                </CardTitle>
            </CardHeader>
            <CardContent>
                {logs.length === 0 ? (
                    <div className="py-8 text-center border rounded-md bg-muted/20">
                        <p className="text-sm text-muted-foreground italic">No activity recorded for this module yet.</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[180px]">Date & Time</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Field</TableHead>
                                    <TableHead>Change</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-xs">
                                            {log.timestamp
                                                ? format(new Date(log.timestamp), "dd MMM yyyy, HH:mm")
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">
                                            {log.user_name}
                                        </TableCell>
                                        <TableCell className="text-xs uppercase font-semibold">
                                            {log.field_name.replace(/_/g, " ")}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground line-through">{log.old_value || "—"}</span>
                                                <span className="text-muted-foreground">→</span>
                                                <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-0 h-5">
                                                    {log.new_value || "—"}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
