export interface Health {
  status: 'ok' | 'degraded';
  checks: { api: 'up' | 'down'; postgres: 'up' | 'down'; redis: 'up' | 'down'; worker: 'up' | 'down' };
}
