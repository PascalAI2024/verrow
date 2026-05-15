import { SpacetimeClientConfig,getSpacetimeConfig } from './config';
import {
SpacetimeCollectionState,
SpacetimeLiveQuery,
SpacetimeTableName,
} from './models';

// Experimental JSON gateway adapter. This does not speak the SpacetimeDB v2.2
// client protocol directly; keep it behind VITE_ENABLE_SPACETIME_JSON_GATEWAY.
// The canonical SpacetimeDB path is SpacetimeProvider plus generated bindings.
export type SpacetimeConnectionStatus =
  | 'disabled'
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface SpacetimeSubscriptionOptions<T> extends SpacetimeLiveQuery {
  transform?: (row: unknown) => T;
  getRowId?: (row: T) => string;
  sort?: (left: T, right: T) => number;
}

export interface SpacetimeClientState {
  status: SpacetimeConnectionStatus;
  error: Error | null;
  connectedAt: string | null;
}

type Unsubscribe = () => void;
type StatusListener = (state: SpacetimeClientState) => void;
type CollectionListener<T> = (state: SpacetimeCollectionState<T>) => void;

interface WireMessage {
  type?: string;
  table?: SpacetimeTableName;
  requestId?: string;
  rows?: unknown[];
  row?: unknown;
  id?: string;
  error?: string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

interface InternalSubscription<T> extends SpacetimeSubscriptionOptions<T> {
  requestId: string;
  listeners: Set<CollectionListener<T>>;
  rows: T[];
  isLoading: boolean;
  error: Error | null;
  lastUpdatedAt: string | null;
}

const defaultRowId = <T>(row: T): string => {
  const candidate = row as Record<string, unknown>;
  return String(candidate.id ?? candidate.fileId ?? candidate.jobId ?? candidate.timestamp ?? '');
};

const defaultTransform = <T>(row: unknown): T => row as T;

const cloneRows = <T>(subscription: InternalSubscription<T>): T[] => {
  const rows = [...subscription.rows];
  return subscription.sort ? rows.sort(subscription.sort) : rows;
};

export class SpacetimeLiveClient {
  private readonly config: SpacetimeClientConfig;
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectDelayMs: number;
  private nextRequestId = 1;
  private state: SpacetimeClientState;
  private statusListeners = new Set<StatusListener>();
  private subscriptions = new Map<string, InternalSubscription<unknown>>();

  constructor(config: SpacetimeClientConfig = getSpacetimeConfig()) {
    this.config = {
      ...config,
      enabled: config.jsonGatewayEnabled,
    };
    this.reconnectDelayMs = config.reconnectInitialDelayMs;
    this.state = {
      status: this.config.enabled ? 'idle' : 'disabled',
      error: null,
      connectedAt: null,
    };
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  getState(): SpacetimeClientState {
    return this.state;
  }

  onStatusChange(listener: StatusListener): Unsubscribe {
    this.statusListeners.add(listener);
    listener(this.state);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  connect(): void {
    if (!this.config.enabled) {
      this.setState({ status: 'disabled', error: null, connectedAt: null });
      return;
    }

    if (
      this.socket
      && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    if (typeof WebSocket === 'undefined') {
      this.setState({
        status: 'error',
        error: new Error('WebSocket is not available in this runtime.'),
        connectedAt: null,
      });
      return;
    }

    this.clearReconnectTimer();
    this.setState({
      status: this.state.status === 'disconnected' ? 'reconnecting' : 'connecting',
      error: null,
      connectedAt: null,
    });

    try {
      const socket = new WebSocket(this.buildUrl());
      this.socket = socket;

      socket.addEventListener('open', () => {
        this.reconnectDelayMs = this.config.reconnectInitialDelayMs;
        this.setState({
          status: 'connected',
          error: null,
          connectedAt: new Date().toISOString(),
        });
        this.resubscribeAll();
      });

      socket.addEventListener('message', (event) => this.handleMessage(event.data));

      socket.addEventListener('error', () => {
        this.setState({
          status: 'error',
          error: new Error('SpacetimeDB live connection failed.'),
          connectedAt: this.state.connectedAt,
        });
      });

      socket.addEventListener('close', () => {
        this.socket = null;
        this.setState({
          status: 'disconnected',
          error: this.state.error,
          connectedAt: null,
        });
        this.scheduleReconnect();
      });
    } catch (error) {
      this.setState({
        status: 'error',
        error: error instanceof Error ? error : new Error('Failed to open SpacetimeDB connection.'),
        connectedAt: null,
      });
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.clearReconnectTimer();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setState({
      status: this.config.enabled ? 'disconnected' : 'disabled',
      error: null,
      connectedAt: null,
    });
  }

  subscribe<T>(options: SpacetimeSubscriptionOptions<T>, listener: CollectionListener<T>): Unsubscribe {
    const requestId = `${this.nextRequestId++}`;
    const subscription: InternalSubscription<T> = {
      ...options,
      requestId,
      transform: options.transform || defaultTransform,
      getRowId: options.getRowId || defaultRowId,
      listeners: new Set([listener]),
      rows: [],
      isLoading: this.config.enabled,
      error: null,
      lastUpdatedAt: null,
    };

    this.subscriptions.set(requestId, subscription as InternalSubscription<unknown>);
    this.emitCollection(subscription);

    if (this.config.enabled) {
      this.connect();
      this.sendSubscribe(subscription);
    }

    return () => {
      this.subscriptions.delete(requestId);
      this.send({
        type: 'unsubscribe',
        requestId,
        table: options.table,
      });
    };
  }

  refresh(requestId?: string): void {
    if (requestId) {
      const subscription = this.subscriptions.get(requestId);
      if (subscription) this.sendSubscribe(subscription);
      return;
    }

    this.subscriptions.forEach((subscription) => this.sendSubscribe(subscription));
  }

  callReducer(name: string, args: Record<string, unknown> = {}): void {
    this.send({
      type: 'call_reducer',
      reducer: name,
      args,
      database: this.config.database,
      module: this.config.moduleName,
    });
  }

  private buildUrl(): string {
    const url = new URL(this.config.host);
    url.searchParams.set('db', this.config.database);
    if (this.config.moduleName) {
      url.searchParams.set('module', this.config.moduleName);
    }
    if (this.config.authToken) {
      url.searchParams.set('token', this.config.authToken);
    }
    return url.toString();
  }

  private setState(nextState: SpacetimeClientState): void {
    this.state = nextState;
    this.statusListeners.forEach((listener) => listener(this.state));
  }

  private send(message: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  private sendSubscribe(subscription: InternalSubscription<unknown>): void {
    subscription.isLoading = true;
    this.emitCollection(subscription);
    this.send({
      type: 'subscribe',
      requestId: subscription.requestId,
      table: subscription.table,
      filters: subscription.filters,
      limit: subscription.limit,
      orderBy: subscription.orderBy,
      orderDirection: subscription.orderDirection,
      database: this.config.database,
      module: this.config.moduleName,
    });
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach((subscription) => this.sendSubscribe(subscription));
  }

  private handleMessage(rawMessage: unknown): void {
    const message = this.parseMessage(rawMessage);
    if (!message) return;

    if (message.type === 'error') {
      this.applyError(message);
      return;
    }

    this.matchingSubscriptions(message).forEach((subscription) => {
      this.applyRows(subscription, message);
      this.emitCollection(subscription);
    });
  }

  private parseMessage(rawMessage: unknown): WireMessage | null {
    if (typeof rawMessage !== 'string') return null;

    try {
      return JSON.parse(rawMessage) as WireMessage;
    } catch (error) {
      this.setState({
        status: 'error',
        error: error instanceof Error ? error : new Error('Failed to parse SpacetimeDB message.'),
        connectedAt: this.state.connectedAt,
      });
      return null;
    }
  }

  private matchingSubscriptions(message: WireMessage): InternalSubscription<unknown>[] {
    if (message.requestId && this.subscriptions.has(message.requestId)) {
      return [this.subscriptions.get(message.requestId)!];
    }

    if (!message.table) return [];
    return [...this.subscriptions.values()].filter((subscription) => subscription.table === message.table);
  }

  private applyError(message: WireMessage): void {
    const error = new Error(message.error || 'SpacetimeDB live query failed.');
    const subscriptions = this.matchingSubscriptions(message);

    if (subscriptions.length === 0) {
      this.setState({
        status: 'error',
        error,
        connectedAt: this.state.connectedAt,
      });
      return;
    }

    subscriptions.forEach((subscription) => {
      subscription.error = error;
      subscription.isLoading = false;
      this.emitCollection(subscription);
    });
  }

  private applyRows(subscription: InternalSubscription<unknown>, message: WireMessage): void {
    const transform = subscription.transform || defaultTransform;
    const getRowId = subscription.getRowId || defaultRowId;
    const type = message.type || 'snapshot';

    if (type === 'snapshot' || type === 'subscription_applied') {
      subscription.rows = (message.rows || []).map((row) => transform(row));
    } else if (type === 'delete' || type === 'row_deleted') {
      const id = message.id || (message.row ? getRowId(transform(message.row)) : '');
      subscription.rows = subscription.rows.filter((row) => getRowId(row) !== id);
    } else if (message.row) {
      const row = transform(message.row);
      const id = getRowId(row);
      const existingIndex = subscription.rows.findIndex((existingRow) => getRowId(existingRow) === id);

      if (existingIndex >= 0) {
        subscription.rows = subscription.rows.map((existingRow, index) => (index === existingIndex ? row : existingRow));
      } else {
        subscription.rows = [row, ...subscription.rows];
      }
    }

    subscription.isLoading = false;
    subscription.error = null;
    subscription.lastUpdatedAt = new Date().toISOString();
  }

  private emitCollection<T>(subscription: InternalSubscription<T>): void {
    const state: SpacetimeCollectionState<T> = {
      data: cloneRows(subscription),
      isLoading: subscription.isLoading,
      error: subscription.error,
      lastUpdatedAt: subscription.lastUpdatedAt,
    };

    subscription.listeners.forEach((listener) => listener(state));
  }

  private scheduleReconnect(): void {
    if (!this.config.enabled || !this.config.reconnect || this.reconnectTimer) return;

    const delay = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, this.config.reconnectMaxDelayMs);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
