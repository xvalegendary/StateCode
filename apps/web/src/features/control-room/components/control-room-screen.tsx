"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Binary, Clock3, Cpu, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  fetchOperations,
  OperationsSnapshot
} from "@/features/platform/lib/platform-api";

const emptyOperations: OperationsSnapshot = {
  synced_at: "",
  metrics: [
    {
      id: "accepted-latency",
      label: "median runtime on accepted submissions",
      value: "n/a",
      delta: "0 accepted in API memory",
      progress: 0
    },
    {
      id: "sandbox-capacity",
      label: "workers available across sandbox pool",
      value: "0",
      delta: "0 running / 0 configured",
      progress: 0
    },
    {
      id: "execution-reliability",
      label: "successful executions in the last 24 hours",
      value: "0%",
      delta: "0 accepted / 0 total",
      progress: 0
    }
  ],
  queue: [],
  worker_pools: [],
  notes: ["API operations endpoint is not connected"],
  quick_actions: []
};

function getStatusVariant(status: string): "secondary" | "default" | "outline" {
  if (status === "Accepted") {
    return "default";
  }

  if (status === "Running") {
    return "secondary";
  }

  return "outline";
}

export function ControlRoomScreen() {
  const [operations, setOperations] = useState<OperationsSnapshot>(emptyOperations);

  useEffect(() => {
    fetchOperations()
      .then(setOperations)
      .catch(() => setOperations(emptyOperations));
  }, []);

  const syncLabel = operations.synced_at
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(new Date(operations.synced_at))
    : "not synced";

  return (
    <main className="min-h-screen px-6 py-10 md:px-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-8">
        <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">StateCode</Badge>
              <Badge>Control room</Badge>
            </div>
            <div className="space-y-2">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
                Submission command surface for rankings, queues, and stable verdict flow.
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                StateCode starts with operations, not marketing. The first screen shows live judge
                pressure, worker utilization, and fast actions for contest infrastructure.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/solve">
                Open live queue
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/leaderboard">Review leaderboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {operations.metrics.map((metric, index) => (
            <Card key={metric.id} className="border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline">KPL {index + 1}</Badge>
                  {index === 0 ? (
                    <Clock3 className="size-4 text-muted-foreground" />
                  ) : index === 1 ? (
                    <Cpu className="size-4 text-muted-foreground" />
                  ) : (
                    <ShieldCheck className="size-4 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="text-3xl">{metric.value}</CardTitle>
                <CardDescription>{metric.label}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={metric.progress} className="h-1.5" />
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {metric.delta}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <Card className="border bg-card">
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Active submission queue</CardTitle>
                  <CardDescription>
                    Latest submissions recorded by the API gateway in this process.
                  </CardDescription>
                </div>
                <Badge variant="outline">sync {syncLabel}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submission</TableHead>
                    <TableHead>Problem</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>Runtime</TableHead>
                    <TableHead>Memory</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.queue.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No submissions recorded yet. Run code from a workspace to populate this
                        queue.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {operations.queue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {item.id}
                      </TableCell>
                      <TableCell className="font-medium">{item.problem}</TableCell>
                      <TableCell>{item.language}</TableCell>
                      <TableCell>{item.tests}</TableCell>
                      <TableCell>{item.runtime}</TableCell>
                      <TableCell>{item.memory}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>{operations.queue.length} submissions visible</span>
              <span>{operations.notes.at(-1) ?? "0 submissions currently executing"}</span>
            </CardFooter>
          </Card>

          <div className="grid gap-6">
            <Card className="border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Worker pools</CardTitle>
                    <CardDescription>
                      Capacity view across sandbox groups.
                    </CardDescription>
                  </div>
                  <Binary className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {operations.worker_pools.length === 0 ? (
                  <div className="border p-4 text-sm text-muted-foreground">
                    Worker pool data is unavailable until the API is running.
                  </div>
                ) : null}
                {operations.worker_pools.map((pool, index) => (
                  <div key={pool.name} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{pool.name}</div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {pool.active}
                        </div>
                      </div>
                      <Badge variant="outline">{pool.utilization}%</Badge>
                    </div>
                    <Progress value={pool.utilization} className="h-1.5" />
                    {index < operations.worker_pools.length - 1 ? <Separator /> : null}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Operator notes</CardTitle>
                <CardDescription>Short signals that matter during active review.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {operations.notes.map((note) => (
                  <Badge key={note} variant="outline">{note}</Badge>
                ))}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                {operations.quick_actions.map((action) => (
                  <Button key={action} variant="ghost">
                    {action}
                  </Button>
                ))}
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
