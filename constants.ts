import { ServerNode } from './types';

export const SERVERS: ServerNode[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    url: 'https://1.1.1.1/cdn-cgi/trace',
    region: 'Global'
  },
  {
    id: 'google',
    name: 'Google',
    url: 'https://clients3.google.com/generate_204',
    region: 'Global'
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    url: 'https://www.microsoft.com',
    region: 'Global'
  },
  {
    id: 'example',
    name: 'Example',
    url: 'https://example.com',
    region: 'US East'
  }
];

export const PING_INTERVAL_MS = 2000; // Increased to 2s to reduce congestion
export const GRAPH_HISTORY_LENGTH = 30; // Number of points to keep in graph