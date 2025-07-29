import { attempt, attemptAsync } from 'ts-utils/check';
import { sse, Connection } from './sse';
import { Redis } from './redis';

export namespace StreamSubscriptionService {
	export class StreamKeyListener {
		public static listeners = new Map<string, StreamKeyListener>();
		private _initialized = false;
		constructor(public readonly key: string) {
			if (StreamKeyListener.listeners.has(key)) {
				throw new Error(`Listener for key ${key} already exists`);
			}
			StreamKeyListener.listeners.set(key, this);
		}

		init() {
			return attemptAsync(async () => {
				if (this._initialized) return;
				this._initialized = true;
				const sub = Redis.getSub().unwrap();
				await sub.subscribe('stream:' + this.key, (data) => {
					this.emit(data);
				});
			});
		}

		emit(data: string) {
			return attempt(() => {
				const subscribers = SubscriptionManager.getSubscribers(this.key);
				if (subscribers.isErr()) {
					throw new Error(`Error getting subscribers for key ${this.key}: ${subscribers.error}`);
				}
				subscribers.value.forEach((subscriber) => {
					subscriber.emit(this.key, data);
				});
			});
		}

		destroy() {
			return attemptAsync(async () => {
				if (!StreamKeyListener.listeners.has(this.key)) {
					throw new Error(`No listener found for key ${this.key}`);
				}

				StreamKeyListener.listeners.delete(this.key);

				// Double check there are no active managers before unsubscribing
				const managers = SubscriptionManager.getSubscribers(this.key).unwrap();
				if (managers.length > 0) return;

				const sub = Redis.getSub().unwrap();
				await sub.unsubscribe('stream:' + this.key);
			});
		}
	}

	export const createStreamKeyListener = (key: string) => {
		return attempt(() => {
			const existing = StreamKeyListener.listeners.get(key);
			if (existing) return existing;
			return new StreamKeyListener(key);
		});
	};

	export class SubscriptionManager {
		public static readonly managers = new Map<string, SubscriptionManager>();
		public static getSubscribers(streamKey: string) {
			return attempt(() => {
				const managers = Array.from(SubscriptionManager.managers.values());
				return managers.filter((m) => m.isSubscribed(streamKey));
			});
		}

		constructor(public readonly connection: Connection) {
			if (SubscriptionManager.managers.has(connection.uuid)) {
				throw new Error(`SubscriptionManager for connection ${connection.uuid} already exists`);
			}
			SubscriptionManager.managers.set(connection.uuid, this);
		}

		public init() {
			this.connection.once('close', () => {
				this.destroy();
			});
		}

		private readonly subscriptions = new Set<string>();

		public subscribe(streamKey: string) {
			return attempt(() => {
				this.subscriptions.add(streamKey);
				const listener = createStreamKeyListener(streamKey).unwrap();
				listener.init();
			});
		}

		public unsubscribe(streamKey: string) {
			return attempt(() => {
				this.subscriptions.delete(streamKey);

				if (this.subscriptions.size === 0) {
					this.destroy();
				}

				const listener = StreamKeyListener.listeners.get(streamKey);
				if (listener) {
					const managers = SubscriptionManager.getSubscribers(streamKey).unwrap();
					if (managers.length === 0) {
						listener.destroy();
					}
				}
			});
		}

		public isSubscribed(streamKey: string) {
			return this.subscriptions.has(streamKey);
		}

		emit(streamKey: string, event: string) {
			return this.connection.send('stream-data', {
				streamKey,
				event
			});
		}

		destroy() {
			this.subscriptions.clear();
			SubscriptionManager.managers.delete(this.connection.uuid);
		}
	}

	export const createSubscriptionManager = (connection: Connection) => {
		return attempt(() => {
			if (!connection.connected) throw new Error('Connection is not active');
			const existing = SubscriptionManager.managers.get(connection.uuid);
			if (existing) return existing;
			return new SubscriptionManager(connection);
		});
	};
}
