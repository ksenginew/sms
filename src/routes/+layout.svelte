<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import "bootstrap/dist/css/bootstrap.min.css";
    import { onMount } from 'svelte';
	let { children } = $props();

	onMount(() => {
		// @ts-ignore
		import('bootstrap/dist/js/bootstrap.bundle.min.js');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div>
	{@render children?.()}
</div>