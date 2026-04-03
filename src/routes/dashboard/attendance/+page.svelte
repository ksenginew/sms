<script>
	let { data } = $props();

	const periodOptions = [
		{ value: "this-week", label: "This week" },
		{ value: "this-month", label: "This month" },
		{ value: "last-month", label: "Last month" },
		{ value: "this-year", label: "This year" },
		{ value: "custom", label: "Custom range" },
	];

	let selectedPeriod = $state("this-week");

	$effect(() => {
		selectedPeriod = data.selectedPeriod;
	});

	let adminSearch = $state("");
	const normalizedAdminSearch = $derived(adminSearch.trim().toLowerCase());

	const filteredAdminClasses = $derived(
		data.role !== "admin"
			? []
			: data.classes.filter((cls) => {
					if (!normalizedAdminSearch) return true;
					return (
						(cls.title ?? "")
							.toLowerCase()
							.includes(normalizedAdminSearch) ||
						(cls.description ?? "")
							.toLowerCase()
							.includes(normalizedAdminSearch) ||
						(cls.tags ?? "")
							.toLowerCase()
							.includes(normalizedAdminSearch)
					);
				}),
	);

	/** @param {string} status */
	function statusClass(status) {
		if (status === "present") return "text-bg-success";
		if (status === "late") return "text-bg-warning";
		if (status === "absent") return "text-bg-danger";
		return "text-bg-secondary";
	}

	/** @param {string} classId */
	function classLink(classId) {
		return `/dashboard/attendance/${classId}`;
	}
</script>

<div
	class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3"
>
	<h2 class="mb-0">Attendance</h2>
	<span class="badge text-bg-primary text-uppercase">{data.role}</span>
</div>

{#if data.role === "student"}
	<div class="row g-4">
		<div class="col-12">
			<div class="card">
				<div class="card-header">Attendance Filter</div>
				<div class="card-body">
					<p class="text-body-secondary mb-3">
						Select a period to review your attendance records.
					</p>
					<form class="row g-3 align-items-end" method="GET">
						<div class="col-12 col-md-4">
							<label for="period" class="form-label">Period</label
							>
							<select
								id="period"
								class="form-select"
								name="period"
								bind:value={selectedPeriod}
							>
								{#each periodOptions as period}
									<option value={period.value}
										>{period.label}</option
									>
								{/each}
							</select>
						</div>
						{#if selectedPeriod === "custom"}
							<div class="col-12 col-md-3">
								<label for="from" class="form-label">From</label
								>
								<input
									id="from"
									class="form-control"
									type="date"
									name="from"
									value={data.from}
								/>
							</div>
							<div class="col-12 col-md-3">
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
						<div class="col-12 col-md-2 d-grid">
							<button class="btn btn-primary" type="submit"
								>Apply</button
							>
						</div>
					</form>
				</div>
			</div>
		</div>

		<div class="col-12">
			<div class="row g-3">
				<div class="col-6 col-lg-3">
					<div class="card h-100 text-center">
						<div class="card-body">
							<p class="small text-body-secondary mb-2">
								Total records
							</p>
							<p class="h4 mb-0">
								{data.attendanceSummary.total}
							</p>
						</div>
					</div>
				</div>
				<div class="col-6 col-lg-3">
					<div class="card h-100 text-center">
						<div class="card-body">
							<p class="small text-body-secondary mb-2">
								Present
							</p>
							<p class="h4 text-success mb-0">
								{data.attendanceSummary.present}
							</p>
						</div>
					</div>
				</div>
				<div class="col-6 col-lg-3">
					<div class="card h-100 text-center">
						<div class="card-body">
							<p class="small text-body-secondary mb-2">Late</p>
							<p class="h4 text-warning mb-0">
								{data.attendanceSummary.late}
							</p>
						</div>
					</div>
				</div>
				<div class="col-6 col-lg-3">
					<div class="card h-100 text-center">
						<div class="card-body">
							<p class="small text-body-secondary mb-2">Absent</p>
							<p class="h4 text-danger mb-0">
								{data.attendanceSummary.absent}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="col-12">
			<div class="card">
				<div class="card-header">Attendance Records</div>
				<div class="card-body p-0">
					<div class="table-responsive">
						<table class="table table-striped align-middle mb-0">
							<thead>
								<tr>
									<th scope="col">Date</th>
									<th scope="col">Status</th>
								</tr>
							</thead>
							<tbody>
								{#if data.attendanceRows.length === 0}
									<tr>
										<td
											colspan="2"
											class="text-center text-body-secondary py-4"
											>No attendance records found for the
											selected period.</td
										>
									</tr>
								{:else}
									{#each data.attendanceRows as row}
										<tr>
											<td>{row.date}</td>
											<td
												><span
													class={`badge ${statusClass(row.status)}`}
													>{row.status}</span
												></td
											>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="d-flex justify-content-between align-items-center mb-3">
		<h3 class="h6 mb-0">Your Classes</h3>
		<span class="badge text-bg-primary">{data.classes.length} classes</span>
	</div>

	{#if data.classes.length === 0}
		<div class="alert alert-info">No classes assigned yet.</div>
	{:else}
		<div class="row g-3">
			{#each data.classes as cls}
				<div class="col-12 col-md-6 col-xl-4">
					<a
						class="card text-decoration-none h-100"
						href={classLink(cls.id)}
					>
						<div class="card-body d-flex flex-column">
							<div
								class="d-flex justify-content-between align-items-start gap-2 mb-2"
							>
								<h3 class="h6 mb-0 text-body-emphasis">
									{cls.title}
								</h3>
								<span
									class={`badge ${cls.visible ? "text-bg-success" : "text-bg-secondary"}`}
								>
									{cls.visible ? "Visible" : "Hidden"}
								</span>
							</div>
							<p class="text-body-secondary mb-3">
								{cls.description || "No description provided."}
							</p>
							<div
								class="mt-auto d-flex justify-content-between align-items-center"
							>
								<span class="small text-body-secondary"
									>{cls.memberCount} members</span
								>
								<span class="small fw-semibold text-primary"
									>Open class</span
								>
							</div>
						</div>
					</a>
				</div>
			{/each}
		</div>
	{/if}
{/if}
