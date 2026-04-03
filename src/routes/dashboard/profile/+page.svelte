<script lang="ts">
	let { data } = $props();

	function formatDate(value: unknown) {
		if (!value) return '-';

		const date = value instanceof Date ? value : new Date(String(value));
		if (Number.isNaN(date.getTime())) return '-';

		return date.toLocaleString();
	}
</script>

<div class="row g-3">
	<div class="col-12">
		<div class="card">
			<div class="card-body">
				<h2 class="h6 mb-3">Profile</h2>
				<div class="table-responsive">
					<table class="table mb-0">
						<tbody>
							<tr>
								<th scope="row">Person ID</th>
								<td class="text-break">{data.person?.id ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Role</th>
								<td>{data.person?.role ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Name</th>
								<td>{data.person?.name ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Full name</th>
								<td>{data.person?.fullname ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Email</th>
								<td>{data.person?.email ?? data.user?.email ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Auth User ID</th>
								<td class="text-break">{data.user?.id ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Linked User ID</th>
								<td class="text-break">{data.person?.userId ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Created</th>
								<td>{formatDate(data.person?.createdAt)}</td>
							</tr>
							<tr>
								<th scope="row">Updated</th>
								<td>{formatDate(data.person?.updatedAt)}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
