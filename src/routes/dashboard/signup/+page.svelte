<script lang="ts">
	let { form } = $props();
	let showPassword = $state(false);
</script>

<svelte:head>
	<title>Eduscend LMS | Sign up</title>
</svelte:head>

<div class="min-vh-100 d-flex align-items-center py-5 bg-body-tertiary">
	<div class="container">
		<div class="row justify-content-center">
			<div class="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
				<div class="card border-0 shadow-lg rounded-4">
					<div class="card-body p-4 p-md-4">
						<div class="text-center mb-4">
							<p class="text-uppercase text-secondary small fw-semibold mb-2">Eduscend LMS</p>
							<h1 class="h4 fw-bold mb-2">Create your account</h1>
							<p class="text-body-secondary small mb-0"></p>
						</div>

						{#if form?.message}
							<div class="alert alert-danger mb-4 py-2" role="alert">
								{form.message}
							</div>
						{/if}

						<form class="vstack gap-3" method="POST" action="?/signup">
							<div>
								<label class="form-label small fw-semibold" for="fullName">Full name</label>
								<input id="fullName" name="fullName" class="form-control form-control-sm" type="text" autocomplete="name" placeholder="Your name" required />
							</div>

							<div>
								<label class="form-label small fw-semibold" for="email">Email</label>
								<input id="email" name="email" class="form-control form-control-sm" type="email" autocomplete="email" placeholder="name@school.lk" required />
							</div>

							<div>
								<label class="form-label small fw-semibold" for="password">Password</label>
								<div class="input-group input-group-sm">
									<input id="password" name="password" class="form-control" type={showPassword ? 'text' : 'password'} autocomplete="new-password" placeholder="Create a password" required />
									<button class="btn btn-outline-secondary" type="button" onclick={() => (showPassword = !showPassword)}>
										{showPassword ? 'Hide' : 'Show'}
									</button>
								</div>
							</div>

							<div>
								<label class="form-label small fw-semibold" for="confirmPassword">Confirm password</label>
								<input id="confirmPassword" name="confirmPassword" class="form-control form-control-sm" type={showPassword ? 'text' : 'password'} autocomplete="new-password" placeholder="Repeat your password" required />
							</div>

							<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-1">
								<div class="text-body-secondary small">Already have an account?</div>
								<a class="link-primary fw-semibold text-decoration-none small" href="/dashboard/signin">Sign in</a>
							</div>

							<button class="btn btn-primary btn-sm w-100 mt-1" type="submit">Create account</button>
						</form>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
