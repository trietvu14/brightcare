import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Coins,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import type { TraceLog } from "@shared/schema";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const iconColors = {
    default: "text-primary",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className={`h-4 w-4 ${iconColors[variant]}`} />
      </div>
      <p className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </Card>
  );
}

export default function MonitoringPage() {
  const { data: stats, isLoading: loadingStats } = useQuery<{
    totalQueries: number;
    blockedQueries: number;
    avgResponseTime: number;
    totalTokens: number;
    avgEvaluatorScore: number;
  }>({
    queryKey: ["/api/trace-logs/stats"],
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery<TraceLog[]>({
    queryKey: ["/api/trace-logs"],
  });

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return "secondary";
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-monitoring-title">Monitoring Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track AI agent performance, guardrail compliance, and usage metrics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {loadingStats ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <StatCard
              title="Total Queries"
              value={stats?.totalQueries || 0}
              icon={BarChart3}
            />
            <StatCard
              title="Blocked"
              value={stats?.blockedQueries || 0}
              subtitle={stats?.totalQueries ? `${((stats.blockedQueries / stats.totalQueries) * 100).toFixed(1)}% of total` : "0%"}
              icon={ShieldAlert}
              variant="danger"
            />
            <StatCard
              title="Avg Response"
              value={`${stats?.avgResponseTime || 0}ms`}
              icon={Clock}
              variant={stats?.avgResponseTime && stats.avgResponseTime > 5000 ? "warning" : "success"}
            />
            <StatCard
              title="Total Tokens"
              value={(stats?.totalTokens || 0).toLocaleString()}
              icon={Coins}
            />
            <StatCard
              title="Avg Quality"
              value={`${stats?.avgEvaluatorScore || 0}/100`}
              icon={TrendingUp}
              variant={stats?.avgEvaluatorScore && stats.avgEvaluatorScore >= 70 ? "success" : "warning"}
            />
          </>
        )}
      </div>

      <Card className="p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold text-sm">Trace Logs</h2>
          <a
            href="https://platform.openai.com/logs?api=traces"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline"
            data-testid="link-openai-traces"
          >
            View on OpenAI Platform <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {loadingLogs ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No trace logs yet. Start a conversation to see activity.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Time</TableHead>
                  <TableHead>User Message</TableHead>
                  <TableHead className="w-[90px]">Model</TableHead>
                  <TableHead className="w-[80px]">Tokens</TableHead>
                  <TableHead className="w-[100px]">Response</TableHead>
                  <TableHead className="w-[100px]">Guardrail</TableHead>
                  <TableHead className="w-[80px]">Score</TableHead>
                  <TableHead className="w-[80px]">Trace</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} data-testid={`trace-log-${log.id}`}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm truncate cursor-default">
                            {log.userMessage || "N/A"}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-sm">
                          <p className="text-sm">{log.userMessage}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {log.model}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.totalTokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.responseTimeMs ? `${log.responseTimeMs}ms` : "N/A"}
                    </TableCell>
                    <TableCell>
                      {log.blocked ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <ShieldAlert className="h-4 w-4 text-red-500" />
                              <span className="text-xs text-red-600 dark:text-red-400">Blocked</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-sm">
                            <p className="text-sm">{log.blockReason}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">Passed</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.evaluatorScore !== null ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={getScoreBadge(log.evaluatorScore) as any} className="text-xs">
                              {log.evaluatorScore}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-sm">
                            <p className="text-sm">{log.evaluatorFeedback}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.traceId ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-primary font-mono cursor-default">
                              {log.traceId.slice(0, 8)}...
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs font-mono">{log.traceId}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
