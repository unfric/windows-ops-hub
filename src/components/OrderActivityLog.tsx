import { useEffect, useState } from "react";
import { api } from "@/services/api";
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
            try {
                const data = await api.logs.fetch(
                    module === "Sales" ? "audit" : "activity",
                    { order_id: orderId, module: module as string }
                );
                setLogs(data || []);
            } catch (error: any) {
                console.error("OrderActivityLog fetch error:", error);
            } finally {
                setLoading(false);
            }
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
