import { text } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct/back-end';
import { Account } from './account';
import { attempt } from 'ts-utils/check';
import { uuid } from '../utils/uuid';
import terminal from '../utils/terminal';

export namespace Streaming {
	export const StreamKeys = new Struct({
		name: 'stream_keys',
		structure: {
			accountId: text('account_id').notNull(),
			streamKey: text('stream_key').notNull()
		}
	});

	export const generateStreamKey = (account: Account.AccountData) => {
		return attempt(() => {
			return `${account.data.username}-${uuid()}`;
		});
	};

	Account.Account.on('create', async (a) => {
		const streamKey = generateStreamKey(a);
		if (streamKey.isErr()) {
			return terminal.error('Error generating stream key', streamKey.error);
		}
		await StreamKeys.new({
			accountId: a.id,
			streamKey: streamKey.value
		});
	});
}

export const _streamKeys = Streaming.StreamKeys.table;
