<script lang="ts">
	let { data } = $props();

	function formatDate(value: unknown) {
		if (!value) return '-';
		const date = value instanceof Date ? value : new Date(String(value));
		if (Number.isNaN(date.getTime())) return '-';
		return date.toLocaleDateString();
	}
</script>

<div class="d-flex justify-content-between align-items-center mb-3">
	<div>
		<h2 class="mb-1">{data.exam.title}</h2>
		<p class="text-body-secondary mb-0">{data.exam.description ?? 'No description available.'}</p>
	</div>
	<span class="badge {data.exam.visible ? 'text-bg-success' : 'text-bg-secondary'}">
		{data.exam.visible ? 'Visible' : 'Hidden'}
	</span>
</div>

<div class="d-flex justify-content-between align-items-center mb-3">
	<h3 class="h5 mb-0">Papers</h3>
	<span class="badge text-bg-primary">{data.papers.length} total</span>
</div>

<div class="row g-3">
	{#each data.papers as paper}
		<div class="col-12 col-md-6 col-xl-4">
			<div class="card h-100">
				<div class="card-body d-flex flex-column position-relative">
					<div class="d-flex justify-content-between align-items-start gap-2 mb-2">
						<h4 class="h6 mb-0 text-truncate">{paper.title ?? 'Untitled paper'}</h4>
						<span class="badge text-bg-light border">{paper.subjectTitle ?? paper.subjectId}</span>
					</div>
					<p class="text-body-secondary mb-3">{paper.description ?? 'No description'}</p>
					<div class="small text-body-secondary">Created {formatDate(paper.createdAt)}</div>
					<div class="mt-auto d-flex justify-content-end">
						<a class="stretched-link text-decoration-none small fw-semibold" href="/dashboard/exams/papers">
							Open paper
						</a>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="col-12">
			<div class="alert alert-info mb-0">No papers found for this exam.</div>
		</div>
	{/each}
</div>
