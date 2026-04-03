<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';

	let loading = $state(false);
	let message = $state('');

	async function handleSignOut(event: SubmitEvent) {
		event.preventDefault();
		message = '';
		loading = true;

		try {
			const response = await authClient.signOut();

			if (response.error) {
				message = response.error.message ?? 'Unable to sign out.';
				return;
			}

			await goto('/dashboard/signin');
		} catch (error) {
			message = error instanceof Error ? error.message : 'Unable to sign out.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Eduscend LMS | Sign out</title>
</svelte:head>

<div class="min-vh-100 d-flex align-items-center py-5 bg-body-tertiary">
	<div class="container">
		<div class="row justify-content-center">
			<div class="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
				<div class="card border-0 shadow-lg rounded-4">
					<div class="card-body p-4">
						<div class="text-center mb-4">
							<p class="text-uppercase text-secondary small fw-semibold mb-2">Eduscend LMS</p>
							<h1 class="h5 fw-bold mb-2">Sign out</h1>
							<p class="text-body-secondary small mb-0">
								Are you sure you want to sign out of your account?
							</p>
						</div>

						{#if message}
							<div class="alert alert-danger py-2" role="alert">{message}</div>
						{/if}

						<form class="d-grid gap-2" onsubmit={handleSignOut}>
							<button class="btn btn-danger" type="submit" disabled={loading}>
								{loading ? 'Signing out...' : 'Sign out'}
							</button>
							<a class="btn btn-outline-secondary" href="/dashboard">Cancel</a>
						</form>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
