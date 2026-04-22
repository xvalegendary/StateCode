import Link from "next/link";
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
  executionMetrics,
  executionNotes,
  executionQueue,
  quickActions,
  workerPools
} from "../data/operations";

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
          {executionMetrics.map((metric, index) => (
            <Card key={metric.id} className="border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline">KPI {index + 1}</Badge>
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
                    Latest submissions across languages with current testcase progress.
                  </CardDescription>
                </div>
                <Badge variant="outline">last sync 12s ago</Badge>
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
                  {executionQueue.map((item) => (
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
              <span>queue pressure within target</span>
              <span>3 jobs currently executing</span>
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
                {workerPools.map((pool, index) => (
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
                    {index < workerPools.length - 1 ? <Separator /> : null}
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
                {executionNotes.map((note) => (
                  <Badge key={note} variant="outline">{note}</Badge>
                ))}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
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
