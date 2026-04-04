<script>
	let { data } = $props();

	/** @param {unknown} value */
	function formatDate(value) {
		if (!value) return "-";
		const date = value instanceof Date ? value : new Date(String(value));
		if (Number.isNaN(date.getTime())) return "-";
		return date.toLocaleDateString();
	}

	/** @param {number} nextOffset */
	function listUrl(nextOffset) {
		const params = new URLSearchParams();
		if (data.search) params.set("search", data.search);
		params.set("limit", String(data.limit));
		params.set("offset", String(Math.max(0, nextOffset)));
		return `/dashboard/exams?${params.toString()}`;
	}

	/** @param {number} examId */
	function examLink(examId) {
		return `/dashboard/exams/${examId}`;
	}
</script>

<div class="d-flex justify-content-between align-items-center mb-3">
	<h2 class="mb-0">Exams</h2>
</div>

<form method="GET" class="row g-3 mb-4">
	<div class="col-12 col-lg-8">
		<label class="visually-hidden" for="search">Search exams</label>
		<div class="input-group">
			<input
				class="form-control"
				id="search"
				type="search"
				name="search"
				placeholder="Search by exam title, description, or tags"
				value={data.search}
			/>
			<button class="btn btn-outline-secondary" type="submit">Find</button>
		</div>
	</div>
	<div class="col-12 col-md-6 col-lg-2">
		<label class="form-label" for="limit">Limit</label>
		<select class="form-select" id="limit" name="limit">
			<option value="10" selected={data.limit === 10}>10</option>
			<option value="20" selected={data.limit === 20}>20</option>
			<option value="50" selected={data.limit === 50}>50</option>
			<option value="100" selected={data.limit === 100}>100</option>
		</select>
	</div>
	<input type="hidden" name="offset" value="0" />
	<div class="col-12 col-md-6 col-lg-2 d-flex align-items-end gap-2">
		<button class="btn btn-dark w-100" type="submit">Apply</button>
		<a class="btn btn-outline-secondary" href="/dashboard/exams">Reset</a>
	</div>
</form>

<div class="d-flex justify-content-between align-items-center mb-2">
	<div class="text-body-secondary">
		Showing {Math.min(data.offset + 1, data.total)}-{Math.min(data.offset + data.examsList.length, data.total)} of {data.total}
	</div>
	<div class="d-flex gap-2">
		<a
			class="btn btn-sm btn-outline-secondary {data.hasPrevious ? '' : 'disabled'}"
			href={data.hasPrevious ? listUrl(data.previousOffset) : '#'}
			aria-disabled={!data.hasPrevious}
		>Previous</a>
		<a
			class="btn btn-sm btn-outline-secondary {data.hasNext ? '' : 'disabled'}"
			href={data.hasNext ? listUrl(data.nextOffset) : '#'}
			aria-disabled={!data.hasNext}
		>Next</a>
	</div>
</div>

<div class="row g-3 mb-4">
	{#each data.examsList as exam}
		<div class="col-md-6 col-xl-4">
			<div class="card h-100">
				<div class="card-body d-flex flex-column position-relative">
					<div class="d-flex justify-content-between align-items-start gap-2 mb-2">
						<h3 class="h6 mb-0 text-truncate">{exam.title}</h3>
						<span class="badge {exam.visible ? 'text-bg-success' : 'text-bg-secondary'}">
							{exam.visible ? "Visible" : "Hidden"}
						</span>
					</div>
					<p class="text-body-secondary mb-3">{exam.description ?? "No description"}</p>
					<div class="small text-body-secondary">Created {formatDate(exam.createdAt)}</div>
					<div class="mt-auto d-flex justify-content-end">
						<a href={examLink(exam.id)} class="stretched-link text-decoration-none small fw-semibold">Open exam</a>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="col-12">
			<div class="alert alert-info mb-0">No exams found.</div>
		</div>
	{/each}
</div>
