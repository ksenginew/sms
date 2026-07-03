<script lang="ts">
	let { data, form } = $props();

	function listUrl(nextOffset: number) {
		const params = new URLSearchParams();
		if (data.search) params.set('search', data.search);
		params.set('limit', String(data.limit));
		params.set('offset', String(Math.max(0, nextOffset)));
		return `/dashboard/exams/${data.exam.id}/${data.paper.id}?${params.toString()}`;
	}

	function scoresPageUrl() {
		return `/dashboard/exams/${data.exam.id}/${data.paper.id}/scores`;
	}

	function formatDate(value: unknown) {
		if (!value) return '-';
		const date = value instanceof Date ? value : new Date(String(value));
		if (Number.isNaN(date.getTime())) return '-';
		return date.toLocaleDateString();
	}

	function formatScore(value: unknown) {
		if (value === null || value === undefined || value === '') return '-';
		const score = Number(value);
		if (!Number.isFinite(score)) return '-';
		return score % 1 === 0 ? String(score) : score.toFixed(1);
	}
</script>

<div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-3">
	<div>
		<h2 class="mb-1">{data.paper.title ?? 'Untitled paper'}</h2>
		<p class="text-body-secondary mb-0">
			{data.paper.description ?? 'No description available.'}
		</p>
	</div>
	<div class="d-flex flex-column gap-2 align-items-lg-end">
		<span class="badge text-bg-primary">{data.subject.title}</span>
		<span class="badge {data.exam.visible ? 'text-bg-success' : 'text-bg-secondary'}">
			{data.exam.visible ? 'Visible exam' : 'Hidden exam'}
		</span>
	</div>
</div>

{#if form?.message}
	<div class="alert alert-danger" role="alert">{form.message}</div>
{/if}

<div class="row g-4 mb-4">
	<div class="col-12 col-xl-8">
		<div class="card h-100">
			<div class="card-body">
				<div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
					<div>
						<h3 class="h5 mb-1">Paper details</h3>
						<div class="text-body-secondary">{data.exam.title}</div>
					</div>
					<div class="text-md-end text-body-secondary small">
						<div>Subject: {data.subject.title}</div>
						<div>Created {formatDate(data.paper.createdAt)}</div>
					</div>
				</div>

							<div class="mb-3">
								<div class="d-flex justify-content-between align-items-center mb-2">
										<div class="fw-semibold">Total average mark</div>
										<div class="h4 mb-0">{formatScore(data.insights?.averageMark ?? data.averageMark)}</div>
									</div>
									<div class="progress" style="height: 14px;">
										<div
											class="progress-bar"
											role="progressbar"
											style={`width: ${formatScore(data.insights?.averageMark ?? data.averageMark)}%`}
											aria-valuenow={data.insights?.progressPercentage ?? data.progressPercentage}
											aria-valuemin="0"
											aria-valuemax="100"
										>
											{formatScore(data.insights?.averageMark ?? data.averageMark)}%
										</div>
									</div>
								<div class="small text-body-secondary mt-2">Progress reflects the average mark out of 100.</div>
							</div>

			</div>
		</div>
	</div>

	<div class="col-12 col-xl-4">
		<div class="d-grid gap-3">
			<div class="card h-100">
				<div class="card-body">
					<h3 class="h5 mb-3">Insights</h3>
					<div class="row g-3">
						<div class="col-6">
							<div class="border rounded-3 p-3 h-100">
								<div class="text-body-secondary small">Total students</div>
								<div class="h4 mb-0">{data.insights?.totalStudents ?? data.totalStudents}</div>
							</div>
						</div>
						<div class="col-6">
							<div class="border rounded-3 p-3 h-100">
								<div class="text-body-secondary small">Sat for exam</div>
								<div class="h4 mb-0">{data.insights?.enteredMarks ?? data.enteredMarks}</div>
							</div>
						</div>
						<div class="col-6">
							<div class="border rounded-3 p-3 h-100">
								<div class="text-body-secondary small">Absent</div>
								<div class="h4 mb-0">{data.insights?.absentStudents ?? data.absentStudents}</div>
							</div>
						</div>
						<div class="col-6">
							<div class="border rounded-3 p-3 h-100">
								<div class="text-body-secondary small">Entered marks</div>
								<div class="h4 mb-0">{data.insights?.enteredMarks ?? data.enteredMarks}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			{#if data.isAdmin}
				<a class="btn btn-primary" href={scoresPageUrl()}>Enter marks</a>
			{/if}
		</div>
	</div>
</div>

<div class="mb-2">
	<form method="GET" class="row g-3 w-100">
		<div class="col-12 col-lg-8 d-flex align-items-center gap-2">
			<label class="form-label mb-0 text-nowrap" for="search">Search</label>
			<input class="form-control" id="search" type="search" name="search" value={data.search} placeholder="Name or ID number" />
		</div>
		<div class="col-6 col-lg-2">
			<div class="d-flex align-items-center gap-2">
				<label class="form-label mb-0" for="limit">Limit</label>
				<select id="limit" class="form-select" name="limit">
					<option value="10" selected={data.limit === 10}>10</option>
					<option value="20" selected={data.limit === 20}>20</option>
					<option value="50" selected={data.limit === 50}>50</option>
					<option value="100" selected={data.limit === 100}>100</option>
				</select>
			</div>
		</div>
		<input type="hidden" name="offset" value="0" />
		<div class="col-6 col-lg-2 d-flex justify-content-lg-end align-items-center">
			<button type="submit" class="btn btn-dark">Apply</button>
			<a class="btn btn-outline-secondary ms-2" href={`/dashboard/exams/${data.exam.id}/${data.paper.id}`}>Reset</a>
		</div>
	</form>
	<div class="d-flex justify-content-between align-items-center mt-2">
		<div class="text-body-secondary small">
			Showing {Math.min(data.offset + 1, data.total)}-{Math.min(data.offset + data.tableRows.length, data.total)} of {data.total}
		</div>
		<div>
			<a
				class="btn btn-sm btn-outline-secondary {data.hasPrevious ? '' : 'disabled'}"
				href={data.hasPrevious ? listUrl(data.previousOffset) : '#'}
				aria-disabled={!data.hasPrevious}
			>Previous</a>
			<a
				class="btn btn-sm btn-outline-secondary ms-2 {data.hasNext ? '' : 'disabled'}"
				href={data.hasNext ? listUrl(data.nextOffset) : '#'}
				aria-disabled={!data.hasNext}
			>Next</a>
		</div>
	</div>
</div>

<div class="table-responsive">
	<table class="table table-striped align-middle mb-0">
		<thead>
			<tr>
				<th scope="col">Name</th>
				<th scope="col">ID number</th>
				<th scope="col">Score</th>
			</tr>
		</thead>
		<tbody>
			{#each data.tableRows as row}
				<tr>
					<td>{row.name ?? ''}</td>
					<td>{row.idnumber ?? ''}</td>
					<td>{formatScore(row.score)}</td>
				</tr>
			{:else}
				<tr>
					<td colspan="3">
						<div class="alert alert-info mb-0">
							{#if data.isAdmin}
								No entered marks yet.
							{:else}
								No students found for this paper.
							{/if}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

