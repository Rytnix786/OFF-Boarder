import "server-only";

const DEBUG_PERF = process.env.NODE_ENV === "development";

interface TimingEntry {
  name: string;
  start: number;
  end?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export class ServerTiming {
  private entries: TimingEntry[] = [];
  private startTime: number;

  constructor() {
    this.startTime = performance.now();
  }

  start(name: string): () => void {
    const entry: TimingEntry = { name, start: performance.now() };
    this.entries.push(entry);
    
    return () => {
      entry.end = performance.now();
      entry.duration = entry.end - entry.start;
    };
  }

  async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    const entry: TimingEntry = { name, start: performance.now(), metadata };
    this.entries.push(entry);
    
    try {
      const result = await fn();
      entry.end = performance.now();
      entry.duration = entry.end - entry.start;
      return result;
    } catch (error) {
      entry.end = performance.now();
      entry.duration = entry.end - entry.start;
      entry.metadata = { ...entry.metadata, error: true };
      throw error;
    }
  }

  getTimings(): TimingEntry[] {
    return this.entries;
  }

  getTotalTime(): number {
    return performance.now() - this.startTime;
  }

  getSlowestOperation(): TimingEntry | null {
    if (this.entries.length === 0) return null;
    return this.entries.reduce((slowest, current) => 
      (current.duration || 0) > (slowest.duration || 0) ? current : slowest
    );
  }

  getServerTimingHeader(): string {
    return this.entries
      .filter(e => e.duration !== undefined)
      .map(e => `${e.name.replace(/[^a-zA-Z0-9_-]/g, '_')};dur=${e.duration!.toFixed(1)}`)
      .join(', ');
  }

  log(routeName: string): void {
    if (!DEBUG_PERF) return;
    
    const totalTime = this.getTotalTime();
    const slowest = this.getSlowestOperation();
    
    console.log(`\n[PERF] ${routeName}`);
    console.log(`  Total: ${totalTime.toFixed(1)}ms`);
    
    if (slowest) {
      console.log(`  Slowest: ${slowest.name} (${slowest.duration?.toFixed(1)}ms)`);
    }
    
    const sorted = [...this.entries]
      .filter(e => e.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
    
    sorted.slice(0, 5).forEach(e => {
      const pct = ((e.duration || 0) / totalTime * 100).toFixed(0);
      console.log(`    - ${e.name}: ${e.duration?.toFixed(1)}ms (${pct}%)`);
    });
  }

  toJSON(): {
    totalTime: number;
    entries: TimingEntry[];
    slowest: TimingEntry | null;
  } {
    return {
      totalTime: this.getTotalTime(),
      entries: this.entries,
      slowest: this.getSlowestOperation(),
    };
  }
}

export function createTiming(): ServerTiming {
  return new ServerTiming();
}

export const routeTimings = new Map<string, { 
  avgTime: number; 
  count: number; 
  lastTimings: TimingEntry[][];
  slowestOps: Map<string, { count: number; totalTime: number }>;
}>();

export function recordRouteTiming(route: string, timing: ServerTiming): void {
  const existing = routeTimings.get(route);
  const timings = timing.getTimings();
  const totalTime = timing.getTotalTime();
  
  if (existing) {
    existing.avgTime = (existing.avgTime * existing.count + totalTime) / (existing.count + 1);
    existing.count++;
    existing.lastTimings.push(timings);
    if (existing.lastTimings.length > 10) {
      existing.lastTimings.shift();
    }
    
    timings.forEach(t => {
      if (t.duration) {
        const opStats = existing.slowestOps.get(t.name) || { count: 0, totalTime: 0 };
        opStats.count++;
        opStats.totalTime += t.duration;
        existing.slowestOps.set(t.name, opStats);
      }
    });
  } else {
    const slowestOps = new Map<string, { count: number; totalTime: number }>();
    timings.forEach(t => {
      if (t.duration) {
        slowestOps.set(t.name, { count: 1, totalTime: t.duration });
      }
    });
    
    routeTimings.set(route, {
      avgTime: totalTime,
      count: 1,
      lastTimings: [timings],
      slowestOps,
    });
  }
}

export function getPerformanceReport(): {
  routes: {
    route: string;
    avgTime: number;
    count: number;
    slowestOps: { name: string; avgTime: number; count: number }[];
  }[];
  overallSlowest: { route: string; avgTime: number }[];
} {
  const routes = Array.from(routeTimings.entries()).map(([route, data]) => ({
    route,
    avgTime: data.avgTime,
    count: data.count,
    slowestOps: Array.from(data.slowestOps.entries())
      .map(([name, stats]) => ({
        name,
        avgTime: stats.totalTime / stats.count,
        count: stats.count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5),
  }));
  
  const overallSlowest = routes
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 10)
    .map(r => ({ route: r.route, avgTime: r.avgTime }));
  
  return { routes, overallSlowest };
}
