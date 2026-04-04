<script lang="ts">
	import { goto } from "$app/navigation";
	import { authClient } from "$lib/auth-client";

	let name = $state("");
	let email = $state("");
	let password = $state("");
	let confirmPassword = $state("");
	let showPassword = $state(false);
	let loading = $state(false);
	let message = $state("");
	let messageTone = $state<"danger" | "success">("danger");

	async function handleSignUp(event: SubmitEvent) {
		event.preventDefault();
		message = "";

		if (password !== confirmPassword) {
			messageTone = "danger";
			message = "Passwords do not match.";
			return;
		}

		loading = true;

		try {
			const response = await authClient.signUp.email({
				name: name.trim(),
				email: email.trim(),
				password,
				callbackURL: "/dashboard",
			});

			if (response.error) {
				messageTone = "danger";
				message =
					response.error.message ?? "Unable to create your account.";
				return;
			}

			messageTone = "success";
			message = "Account created successfully. Redirecting...";
			await goto("/dashboard");
		} catch (error) {
			messageTone = "danger";
			message =
				error instanceof Error
					? error.message
					: "Unable to create your account.";
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Eduscend | Sign up</title>
</svelte:head>

<div class="min-vh-100 d-flex align-items-center py-5 bg-body-tertiary">
	<div class="container">
		<div class="row justify-content-center">
			<div class="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
				<div class="card border-0 shadow-lg rounded-4">
					<div class="card-body p-4 p-md-4">
						<div class="text-center mb-4">
							<p
								class="text-uppercase text-secondary small fw-semibold mb-2"
							>
								Eduscend
							</p>
							<h1 class="h4 fw-bold mb-2">Create your account</h1>
							<p class="text-body-secondary small mb-0"></p>
						</div>

						{#if message}
							<div
								class={`alert alert-${messageTone} mb-4 py-2`}
								role="alert"
							>
								{message}
							</div>
						{/if}

						<form class="vstack gap-3" onsubmit={handleSignUp}>
							<div>
								<label
									class="form-label small fw-semibold"
									for="name">Name</label
								>
								<input
									id="name"
									class="form-control form-control-sm"
									type="text"
									autocomplete="name"
									placeholder="Your name"
									bind:value={name}
									required
								/>
							</div>

							<div>
								<label
									class="form-label small fw-semibold"
									for="email">Email</label
								>
								<input
									id="email"
									class="form-control form-control-sm"
									type="email"
									autocomplete="email"
									placeholder="name@school.lk"
									bind:value={email}
									required
								/>
							</div>

							<div>
								<label
									class="form-label small fw-semibold"
									for="password">Password</label
								>
								<div class="input-group input-group-sm">
									<input
										id="password"
										class="form-control"
										type={showPassword
											? "text"
											: "password"}
										autocomplete="new-password"
										placeholder="Create a password"
										bind:value={password}
										required
									/>
									<button
										class="btn btn-outline-secondary"
										type="button"
										onclick={() =>
											(showPassword = !showPassword)}
									>
										{showPassword ? "Hide" : "Show"}
									</button>
								</div>
							</div>

							<div>
								<label
									class="form-label small fw-semibold"
									for="confirmPassword"
									>Confirm password</label
								>
								<input
									id="confirmPassword"
									class="form-control form-control-sm"
									type={showPassword ? "text" : "password"}
									autocomplete="new-password"
									placeholder="Repeat your password"
									bind:value={confirmPassword}
									required
								/>
							</div>

							<div
								class="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-1"
							>
								<div class="text-body-secondary small">
									Already have an account?
								</div>
								<a
									class="link-primary fw-semibold text-decoration-none small"
									href="/auth/signin">Sign in</a
								>
							</div>

							<button
								class="btn btn-primary btn-sm w-100 mt-1"
								type="submit"
								disabled={loading}
							>
								{loading
									? "Creating account..."
									: "Create account"}
							</button>
						</form>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
