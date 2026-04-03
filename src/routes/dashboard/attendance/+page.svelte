<script>
	let { data } = $props();

	const periodOptions = [
		{ value: 'this-week', label: 'This week' },
		{ value: 'this-month', label: 'This month' },
		{ value: 'last-month', label: 'Last month' },
		{ value: 'this-year', label: 'This year' },
		{ value: 'custom', label: 'Custom range' }
	];

	let selectedPeriod = $state('this-week');

	$effect(() => {
		selectedPeriod = data.selectedPeriod;
	});

	let adminSearch = $state('');
	const normalizedAdminSearch = $derived(adminSearch.trim().toLowerCase());

	const filteredAdminClasses = $derived(
		data.role !== 'admin'
			? []
			: data.classes.filter((cls) => {
					if (!normalizedAdminSearch) return true;
					return (
						(cls.title ?? '').toLowerCase().includes(normalizedAdminSearch) ||
						(cls.description ?? '').toLowerCase().includes(normalizedAdminSearch) ||
						(cls.tags ?? '').toLowerCase().includes(normalizedAdminSearch)
					);
				})
	);

	/** @param {string} status */
	function statusClass(status) {
		if (status === 'present') return 'text-bg-success';
		if (status === 'late') return 'text-bg-warning';
		if (status === 'absent') return 'text-bg-danger';
		return 'text-bg-secondary';
	}
</script>

{#if data.role === 'student'}
	<section class="vstack gap-3">
		<div class="card border-0 bg-light-subtle">
			<div class="card-body">
				<h2 class="h6 mb-3">Attendance Overview</h2>
				<p class="small text-body-secondary mb-3 d-block">Select a period to filter your attendance records.</p>
				<form class="row g-2 align-items-end" method="GET">
					<div class="col-md-4">
						<label for="period" class="form-label">Period</label>
						<select 
							id="period" 
							class="form-select" 
							name="period"
							bind:value={selectedPeriod}
						>
							{#each periodOptions as period}
								<option value={period.value}>
									{period.label}
								</option>
							{/each}
						</select>
					</div>
					{#if selectedPeriod === 'custom'}
						<div class="col-md-3">
							<label for="from" class="form-label">From</label>
							<input
								id="from"
								class="form-control"
								type="date"
								name="from"
								value={data.from}
							/>
						</div>
						<div class="col-md-3">
							<label for="to" class="form-label">To</label>
							<input
								id="to"
								class="form-control"
								type="date"
								name="to"
								value={data.to}
							/>
						</div>
					{/if}
					<div class="col-md-2 d-grid">
						<button class="btn btn-primary" type="submit">Apply</button>
					</div>
				</form>
			</div>
		</div>

		<div class="row g-3">
			<div class="col-12 col-lg-4">
				<div class="card h-100">
					<div class="card-body">
						<div class="d-flex flex-column gap-3">
							<div>
							<p class="small text-body-secondary mb-1">Total records</p>
							<p class="h6 fw-semibold text-secondary mb-0">{data.attendanceSummary.total}</p>
							</div>
							<div>
								<p class="small text-body-secondary mb-2">Overall Attendance</p>
							<p class="display-2 fw-bold text-primary mb-2">
									{data.attendanceSummary.total > 0 
										? Math.round((data.attendanceSummary.present / data.attendanceSummary.total) * 100) 
										: 0}%
								</p>
								<div class="progress" role="progressbar" style="height: 8px;">
									<div 
										class="progress-bar bg-success" 
										style="width: {data.attendanceSummary.total > 0 ? Math.round((data.attendanceSummary.present / data.attendanceSummary.total) * 100) : 0}%"
									></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="col-12 col-lg-8">
				<h3 class="h6 mb-3">Attendance Details</h3>
				<div class="row g-2">
					<div class="col-6 col-lg-3">
						<div class="card border text-center h-100">
							<div class="card-body">
								<p class="small text-body-secondary mb-2">Present</p>
								<p class="h4 text-success fw-bold mb-0">{data.attendanceSummary.present}</p>
							</div>
						</div>
					</div>
					<div class="col-6 col-lg-3">
						<div class="card border text-center h-100">
							<div class="card-body">
								<p class="small text-body-secondary mb-2">Late</p>
								<p class="h4 text-warning fw-bold mb-0">{data.attendanceSummary.late}</p>
							</div>
						</div>
					</div>
					<div class="col-6 col-lg-3">
						<div class="card border text-center h-100">
							<div class="card-body">
								<p class="small text-body-secondary mb-2">Absent</p>
								<p class="h4 text-danger fw-bold mb-0">{data.attendanceSummary.absent}</p>
							</div>
						</div>
					</div>
					<div class="col-6 col-lg-3">
						<div class="card border text-center h-100">
							<div class="card-body">
								<p class="small text-body-secondary mb-2">Excused</p>
								<p class="h4 text-info fw-bold mb-0">{data.attendanceSummary.excused}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body p-0">
				<div class="table-responsive">
					<table class="table table-striped mb-0 align-middle">
						<thead>
							<tr>
								<th scope="col">Date</th>
								<th scope="col">Status</th>
							</tr>
						</thead>
						<tbody>
							{#if data.attendanceRows.length === 0}
								<tr>
									<td colspan="2" class="text-center text-body-secondary py-4">
										No attendance records found for the selected period.
									</td>
								</tr>
							{:else}
								{#each data.attendanceRows as row}
									<tr>
										<td>{row.date}</td>
										<td>
											<span class={`badge ${statusClass(row.status)}`}>
												{row.status}
											</span>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</section>
{:else if data.role === 'teacher'}
	<section class="vstack gap-3">
		<div class="d-flex justify-content-between align-items-center">
			<h2 class="h6 mb-0">Your Appointed Classes</h2>
			<span class="badge text-bg-primary">{data.classes.length} classes</span>
		</div>

		<div class="row g-3">
			{#if data.classes.length === 0}
				<div class="col-12">
					<div class="alert alert-info mb-0">No classes assigned yet.</div>
				</div>
			{:else}
				{#each data.classes as cls}
					<div class="col-12 col-md-6 col-xl-4">
						<a class="card text-decoration-none h-100 class-card" href={`/dashboard/attendance/${cls.id}`}>
							<div class="card-body d-flex flex-column gap-2">
								<div class="d-flex justify-content-between align-items-start gap-2">
									<h3 class="h6 mb-0 text-body-emphasis">{cls.title}</h3>
									<span class={`badge ${cls.visible ? 'text-bg-success' : 'text-bg-secondary'}`}>
										{cls.visible ? 'Visible' : 'Hidden'}
									</span>
								</div>
								<p class="small text-body-secondary mb-0 class-description">
									{cls.description || 'No description provided.'}
								</p>
								<div class="mt-auto d-flex justify-content-between align-items-center pt-2">
									<span class="small text-body-secondary">{cls.memberCount} members</span>
									<span class="small fw-semibold text-primary">Open class</span>
								</div>
							</div>
						</a>
					</div>
				{/each}
			{/if}
		</div>
	</section>
{:else if data.role === 'admin'}
	<section class="vstack gap-3">
		<div class="card border-0 bg-light-subtle">
			<div class="card-body">
				<h2 class="h6 mb-3">Search Classes</h2>
				<div class="input-group">
					<span class="input-group-text">Search</span>
					<input
						class="form-control"
						type="search"
						placeholder="Type title, description or tags"
						bind:value={adminSearch}
					/>
				</div>
				<p class="small text-body-secondary mt-2 mb-0">
					Results update instantly as you type.
				</p>
			</div>
		</div>

		<div class="d-flex justify-content-between align-items-center">
			<h2 class="h6 mb-0">All Classes</h2>
			<span class="badge text-bg-primary">{filteredAdminClasses.length} shown</span>
		</div>

		<div class="row g-3">
			{#if filteredAdminClasses.length === 0}
				<div class="col-12">
					<div class="alert alert-warning mb-0">No classes matched your search.</div>
				</div>
			{:else}
				{#each filteredAdminClasses as cls}
					<div class="col-12 col-md-6 col-xl-4">
						<a class="card text-decoration-none h-100 class-card" href={`/dashboard/attendance/${cls.id}`}>
							<div class="card-body d-flex flex-column gap-2">
								<div class="d-flex justify-content-between align-items-start gap-2">
									<h3 class="h6 mb-0 text-body-emphasis">{cls.title}</h3>
									<span class={`badge ${cls.visible ? 'text-bg-success' : 'text-bg-secondary'}`}>
										{cls.visible ? 'Visible' : 'Hidden'}
									</span>
								</div>
								<p class="small text-body-secondary mb-0 class-description">
									{cls.description || 'No description provided.'}
								</p>
								<div class="mt-auto d-flex justify-content-between align-items-center pt-2">
									<span class="small text-body-secondary">{cls.memberCount} members</span>
									<span class="small fw-semibold text-primary">Open class</span>
								</div>
							</div>
						</a>
					</div>
				{/each}
			{/if}
		</div>
	</section>
{/if}

<style>
	.class-card {
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.class-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 0.75rem 1.25rem rgba(0, 0, 0, 0.15);
	}

	.class-description {
		min-height: 3rem;
	}
</style>
