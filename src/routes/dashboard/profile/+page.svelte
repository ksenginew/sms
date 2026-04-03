<script lang="ts">
	let { data, form } = $props();

	function providerLabel(providerId: string | null | undefined) {
		if (!providerId) return "Unknown";
		return providerId.charAt(0).toUpperCase() + providerId.slice(1);
	}

	function formatDate(value: unknown) {
		if (!value) return "-";
		const date = value instanceof Date ? value : new Date(String(value));
		if (Number.isNaN(date.getTime())) return "-";
		return date.toLocaleDateString();
	}

</script>

<div class="d-flex justify-content-between align-items-center mb-3">
	<h2 class="mb-0">Profile</h2>
</div>

{#if form?.message}
	<div class="alert {form?.success ? 'alert-success' : 'alert-danger'}" role="alert">
		{form.message}
	</div>
{/if}

<div class="row g-4">
	<div class="col-12 col-lg-4">
		<div class="card h-100">
			<div class="card-header">Account Overview</div>
			<div class="card-body text-center">
				<img
					src={
						data.person?.image ??
						data.user?.image ??
						"https://placehold.co/160x160?text=User"
					}
					alt="Profile"
					class="rounded-circle img-thumbnail mb-3 d-inline-block"
					width="160"
					height="160"
				/>
				<h3 class="h5">{data.person?.name ?? data.user?.name ?? "No name set"}</h3>
				<p class="text-body-secondary">
					{data.person?.email ?? data.user?.email ?? "No email set"}
				</p>
				<hr />
				<dl class="row mb-0 text-start">
					<dt class="col-5">User ID</dt>
					<dd class="col-7 text-break">{data.user?.id}</dd>
					<dt class="col-5">Joined</dt>
					<dd class="col-7">{formatDate(data.user?.createdAt)}</dd>
					<dt class="col-5">Linked</dt>
					<dd class="col-7">{data.accounts?.length ?? 0} providers</dd>
				</dl>
			</div>
		</div>
	</div>

	<div class="col-12 col-lg-8">
		<div class="card">
			<div class="card-header">Update Profile</div>
			<div class="card-body">
				<form method="POST" action="?/updateProfile">
					<div class="row g-3">
						<div class="col-md-6">
							<label class="form-label" for="name">Name</label>
							<input
								id="name"
								name="name"
								class="form-control"
								value={data.person?.name ?? data.user?.name ?? ""}
								required
							/>
						</div>

						<div class="col-md-6">
							<label class="form-label" for="email">Email</label>
							<input
								id="email"
								name="email"
								type="email"
								class="form-control"
								value={data.person?.email ?? data.user?.email ?? ""}
								required
							/>
						</div>

						<div class="col-12">
							<button type="submit" class="btn btn-primary">
								Save changes
							</button>
						</div>
					</div>
				</form>

				<hr />

				<form method="POST" action="?/uploadImage" enctype="multipart/form-data">
					<div class="row g-3">
						<div class="col-12">
							<label class="form-label" for="image">Profile image</label>
							<input
								id="image"
								name="image"
								type="file"
								class="form-control"
								accept="image/png,image/jpeg,image/gif"
								required
							/>
						</div>
						<div class="col-12">
							<button type="submit" class="btn btn-outline-primary">
								Upload image
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>

	<div class="col-12">
		<div class="card">
			<div class="card-header">Linked Providers</div>
			<div class="card-body">
				{#if data.accounts?.length}
					<div class="table-responsive">
						<table class="table align-middle mb-0">
							<thead>
								<tr>
									<th scope="col">Provider</th>
									<th scope="col">Provider Account ID</th>
									<th scope="col">Created</th>
								</tr>
							</thead>
							<tbody>
								{#each data.accounts as linked}
									<tr>
										<td>
											<span class="badge text-bg-light border">
												{providerLabel(linked.providerId)}
											</span>
										</td>
										<td class="text-break">
											{linked.accountId || "-"}
										</td>
										<td>{formatDate(linked.createdAt)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="alert alert-info mb-0" role="alert">
						No linked providers found.
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
