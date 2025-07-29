<script lang="ts">
	import Card from '$lib/components/bootstrap/Card.svelte';
	import { PUBLIC_APP_NAME } from '$env/static/public';
</script>

<svelte:head>
	<title>{PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="container mt-5">
	<div class="row">
		<div class="col">
			<mux-player
				playback-id="EcHgOK9coz5K4rjSwOkoE7Y7O01201YMIC200RI6lNxnhs"
				metadata-video-title="Test VOD"
				metadata-viewer-user-id="user-id-007"
			></mux-player>
		</div>
	</div>
</div>
