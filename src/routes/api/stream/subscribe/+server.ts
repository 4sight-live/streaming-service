import { json } from '@sveltejs/kit';
import { sse } from '$lib/server/services/sse';
import { z } from 'zod';
import { StreamSubscriptionService } from '$lib/server/services/streams';

export const POST = async (event) => {
	const body = await event.request.json();
	const parsed = z
		.object({
			connection: z.string(),
			streamKey: z.string()
		})
		.safeParse(body);
	if (!parsed.success) {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const connection = sse.getConnection(parsed.data.connection);
	if (!connection) {
		return json({ error: 'Connection not found' }, { status: 404 });
	}

	const res = StreamSubscriptionService.createSubscriptionManager(connection);

	if (res.isErr()) {
		return json({ error: res.error }, { status: 500 });
	}

	res.value.subscribe(parsed.data.streamKey);

	return json({
		message: 'Subscription manager created successfully'
	});
};
