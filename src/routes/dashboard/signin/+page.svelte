<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';

	let email = $state('');
	let password = $state('');
	let rememberMe = $state(true);
	let loading = $state(false);
	let message = $state('');
	let messageTone = $state<'danger' | 'success'>('danger');

	async function handleSignIn(event: SubmitEvent) {
		event.preventDefault();
		message = '';
		loading = true;

		try {
			const response = await authClient.signIn.email({
				email: email.trim(),
				password,
				rememberMe,
				callbackURL: '/dashboard'
			});

			if (response.error) {
				messageTone = 'danger';
				message = response.error.message ?? 'Unable to sign in.';
				return;
			}

			messageTone = 'success';
			message = 'Signed in successfully. Redirecting...';
			await goto('/dashboard');
		} catch (error) {
			messageTone = 'danger';
			message = error instanceof Error ? error.message : 'Unable to sign in.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Eduscend LMS | Sign in</title>
</svelte:head>

<div class="min-vh-100 d-flex align-items-center py-5 bg-body-tertiary">
	<div class="container">
		<div class="row justify-content-center">
			<div class="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
				<div class="card border-0 shadow-lg rounded-4">
					<div class="card-body p-4 p-md-4">
						<div class="text-center mb-4">
							<p class="text-uppercase text-secondary small fw-semibold mb-2">Eduscend LMS</p>
							<h1 class="h4 fw-bold mb-2">Welcome back</h1>
                            <p class="text-body-secondary small mb-0">Sign in to your account to continue</p>
						</div>

						{#if message}
							<div class={`alert alert-${messageTone} mb-4 py-2`} role="alert">{message}</div>
						{/if}

						<form class="vstack gap-3" onsubmit={handleSignIn}>
							<div>
								<label class="form-label small fw-semibold" for="signin-email">Email</label>
								<input
									id="signin-email"
									class="form-control form-control-sm"
									type="email"
									placeholder="name@school.lk"
									autocomplete="email"
									bind:value={email}
									required
								/>
							</div>

							<div>
								<label class="form-label small fw-semibold" for="signin-password">Password</label>
								<input
									id="signin-password"
									class="form-control form-control-sm"
									type="password"
									placeholder="Enter your password"
									autocomplete="current-password"
									bind:value={password}
									required
								/>
							</div>

							<div class="form-check">
								<input
									id="signin-remember"
									class="form-check-input"
									type="checkbox"
									bind:checked={rememberMe}
								/>
								<label class="form-check-label small" for="signin-remember">Keep me signed in</label>
							</div>

							<button class="btn btn-primary btn-sm w-100" type="submit" disabled={loading}>
								{loading ? 'Signing in...' : 'Sign in'}
							</button>
						</form>

						<p class="text-center text-body-secondary small mt-4 mb-0">
							Need an account?
							<a class="fw-semibold text-decoration-none" href="/dashboard/signup">Create one</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>