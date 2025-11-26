export interface PingDataPoint {
  id: number;
  time: string;
  ms: number;
}

export interface ServerNode {
  id: string;
  name: string;
  url: string;
  region: string;
}

export enum PingState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED'
}

export interface PingStats {
  current: number;
  min: number;
  max: number;
  avg: number;
  jitter: number;
  packetLoss: number;
  totalPings: number;
  failedPings: number;
}
