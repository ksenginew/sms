<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';

	let email = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let message = $state('');
	let messageTone = $state('danger');
	let resetToken = $derived(page.url.searchParams.get('token'));
	let resetError = $derived(page.url.searchParams.get('error'));

	async function requestReset(event: SubmitEvent) {
		event.preventDefault();
		message = '';
		loading = true;

		try {
			const response = await authClient.requestPasswordReset({
				email: email.trim(),
				redirectTo: `${window.location.origin}/auth/reset-password`
			});

			if (response.error) {
				messageTone = 'danger';
				message = response.error.message ?? 'Unable to request a password reset.';
				return;
			}

			messageTone = 'success';
			message = 'If the email exists, a reset link has been sent.';
		} catch (error) {
			messageTone = 'danger';
			message = error instanceof Error ? error.message : 'Unable to request a password reset.';
		} finally {
			loading = false;
		}
	}

	async function completeReset(event: SubmitEvent) {
		event.preventDefault();
		message = '';

		if (newPassword !== confirmPassword) {
			messageTone = 'danger';
			message = 'Passwords do not match.';
			return;
		}

		loading = true;

		try {
			const response = await authClient.resetPassword({
				token: resetToken ?? '',
				newPassword
			});

			if (response.error) {
				messageTone = 'danger';
				message = response.error.message ?? 'Unable to reset your password.';
				return;
			}

			messageTone = 'success';
			message = 'Password updated successfully. Redirecting to sign in...';
			await goto('/auth/signin');
		} catch (error) {
			messageTone = 'danger';
			message = error instanceof Error ? error.message : 'Unable to reset your password.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Eduscend LMS | Reset password</title>
</svelte:head>

<div class="min-vh-100 d-flex align-items-center py-5 bg-body-tertiary">
	<div class="container">
		<div class="row justify-content-center">
			<div class="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
				<div class="card border-0 shadow-lg rounded-4">
					<div class="card-body p-4 p-md-4">
						<div class="text-center mb-4">
							<p class="text-uppercase text-secondary small fw-semibold mb-2">Eduscend LMS</p>
							<h1 class="h4 fw-bold mb-2">{resetToken ? 'Set a new password' : 'Reset your password'}</h1>
							<p class="text-body-secondary small mb-0">
								{resetToken
									? 'Choose a new password for your account.'
									: 'Enter your email address and we will send a reset link.'}
							</p>
						</div>

						{#if resetError}
							<div class="alert alert-danger mb-4 py-2" role="alert">The reset link is invalid or expired.</div>
						{/if}

						{#if message}
							<div class={`alert alert-${messageTone} mb-4 py-2`} role="alert">{message}</div>
						{/if}

						{#if resetToken}
							<form class="vstack gap-3" onsubmit={completeReset}>
								<div>
									<label class="form-label small fw-semibold" for="new-password">New password</label>
									<input id="new-password" class="form-control form-control-sm" type="password" autocomplete="new-password" bind:value={newPassword} required />
								</div>

								<div>
									<label class="form-label small fw-semibold" for="confirm-password">Confirm new password</label>
									<input id="confirm-password" class="form-control form-control-sm" type="password" autocomplete="new-password" bind:value={confirmPassword} required />
								</div>

								<button class="btn btn-primary btn-sm w-100 mt-1" type="submit" disabled={loading}>
									{loading ? 'Updating password...' : 'Update password'}
								</button>
							</form>
						{:else}
							<form class="vstack gap-3" onsubmit={requestReset}>
								<div>
									<label class="form-label small fw-semibold" for="reset-email">Email</label>
									<input id="reset-email" class="form-control form-control-sm" type="email" autocomplete="email" placeholder="name@school.lk" bind:value={email} required />
								</div>

								<button class="btn btn-primary btn-sm w-100 mt-1" type="submit" disabled={loading}>
									{loading ? 'Sending reset link...' : 'Send reset link'}
								</button>
							</form>
						{/if}

						<p class="text-center text-body-secondary small mt-4 mb-0">
							<a class="fw-semibold text-decoration-none" href="/auth/signin">Back to sign in</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>