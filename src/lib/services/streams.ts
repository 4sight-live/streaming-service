import type { Readable } from 'svelte/store';
import { attempt, attemptAsync } from 'ts-utils/check';
import { sse } from './sse';

export class Streamer {}

type View = {
	active: Streamer[];
	inactive: Streamer[];
	streams: Streamer[];
	type: 'single';
};

let streamInstance: MultiStream | null = null;

export class MultiStream implements Readable<View> {
	constructor() {
		if (streamInstance) {
			throw new Error('MultiStream can only be instantiated once');
		}
		streamInstance = this;
	}

	public readonly streams: Streamer[] = [];
	public active: Streamer[] = [];
	private _initialized = false;

	public addStreamer(streamer: Streamer) {}

	public setActive(...streams: Streamer[]) {
		return attempt(() => {
			if (streams.length > 1) {
				throw new Error('MultiStream can currently only have one active stream at a time');
			}
			if (streams.every((s) => this.streams.includes(s))) {
				this.active = streams;
				this.inform();
			} else {
				throw new Error('One or more streams are not part of this MultiStream');
			}
		});
	}

	private readonly subscribers = new Set<(value: View) => void>();

	public subscribe(fn: (value: View) => void): () => void {
		this.subscribers.add(fn);
		fn({
			active: this.active,
			inactive: this.streams.filter((s) => !this.active.includes(s)),
			streams: this.streams,
			type: 'single'
		});

		return () => {
			this.subscribers.delete(fn);
		};
	}

	public inform() {
		const obj: View = {
			active: this.active,
			inactive: this.streams.filter((s) => !this.active.includes(s)),
			streams: this.streams,
			type: 'single'
		};
		this.subscribers.forEach((fn) => fn(obj));
	}

	public destroy() {
		this.subscribers.clear();
		streamInstance = null;
	}

	public init() {
		return attemptAsync(async () => {
			if (this._initialized) {
				throw new Error('MultiStream is already initialized');
			}
			this._initialized = true;
			fetch('/api/stream/init', {
				method: 'POST',
				body: JSON.stringify({
					connection: sse.uuid
				})
			});
		});
	}
}
