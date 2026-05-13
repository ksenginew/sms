<script lang="ts">
	import AttendanceOverview from '$lib/components/AttendanceOverview.svelte';
	import AttendanceBreakdown from '$lib/components/AttendanceBreakdown.svelte';

	let { data } = /** @type {{ data: any }} */ ($props());

	const periodOptions = [
		{ value: "this-week", label: "This week" },
		{ value: "this-month", label: "This month" },
		{ value: "last-month", label: "Last month" },
		{ value: "this-year", label: "This year" },
		{ value: "custom", label: "Custom range" },
	];
	const attendanceStateOptions = [
		{ value: "", label: "All states" },
		{ value: "present", label: "Present" },
		{ value: "late", label: "Late" },
		{ value: "absent", label: "Absent" },
		{ value: "excused", label: "Excused" },
	];

	let selectedPeriod = $state("this-week");
	let selectedStatus = $state("");
	let selectedLimit = $state("25");

	$effect(() => {
		selectedPeriod = data.selectedPeriod;
		selectedStatus = data.statusFilter ?? "";
		selectedLimit = String(data.limit ?? 25);
	});

	function studentListUrl(nextOffset: number) {
		const params = new URLSearchParams();
		params.set("period", data.selectedPeriod);

		if (data.selectedPeriod === "custom") {
			params.set("from", data.from);
			params.set("to", data.to);
		}

		if (data.tableSearch) params.set("tableSearch", data.tableSearch);
		if (data.statusFilter) params.set("tableStatus", data.statusFilter);
		params.set("tableLimit", String(data.limit ?? 25));
		params.set("tableOffset", String(Math.max(0, nextOffset)));

		return `?${params.toString()}`;
	}

	function studentFilterResetUrl() {
		const params = new URLSearchParams();
		params.set("period", data.selectedPeriod);
		if (data.selectedPeriod === "custom") {
			params.set("from", data.from);
			params.set("to", data.to);
		}
		params.set("tableLimit", "25");
		params.set("tableOffset", "0");
		return `?${params.toString()}`;
	}

	function statusClass(status: string) {
		if (status === "present") return "text-bg-success";
		if (status === "late") return "text-bg-warning";
		if (status === "absent") return "text-bg-danger";
		return "text-bg-secondary";
	}

	function classLink(classId: string) {
		return `/dashboard/attendance/${classId}`;
	}
</script>

<div
	class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3"
>
	<h2 class="mb-0">Attendance</h2>
</div>

{#if data.role === "student"}
	<div class="row g-4">
		<div class="col-12">
			<div class="card shadow-sm rounded-3">
				<div class="card-body">
					<p class="text-body-secondary mb-3">
						Select a period to review your attendance records.
					</p>
					<form class="row g-3" method="GET">
						<div class="col-12 col-lg-5">
							<div class="d-flex align-items-center gap-2">
								<label for="period" class="form-label mb-0 text-nowrap">Period</label>
								<select
									id="period"
									class="form-select rounded-2 border"
									name="period"
									bind:value={selectedPeriod}
								>
									{#each periodOptions as period}
										<option value={period.value}>{period.label}</option>
									{/each}
								</select>
							</div>
						</div>
						{#if selectedPeriod === "custom"}
							<div class="col-12 col-md-6 col-lg-3">
								<div class="d-flex align-items-center gap-2">
									<label for="from" class="form-label mb-0 text-nowrap">From</label>
									<input
										id="from"
										class="form-control rounded-2 border"
										type="date"
										name="from"
										value={data.from}
									/>
								</div>
							</div>
							<div class="col-12 col-md-6 col-lg-2">
								<div class="d-flex align-items-center gap-2">
									<label for="to" class="form-label mb-0 text-nowrap">To</label>
									<input
										id="to"
										class="form-control rounded-2 border"
										type="date"
										name="to"
										value={data.to}
									/>
								</div>
							</div>
						{/if}
						<div class="col-12 col-lg-2 d-flex justify-content-lg-end">
							<button class="btn btn-primary rounded-2" type="submit"
								>Apply</button
							>
						</div>
					</form>
				</div>
			</div>
		</div>

		<div class="col-12">
			<div class="row g-4">
				<div class="col-12 col-lg-6">
			<div class="card shadow-sm rounded-3 border h-100">
				<div class="card-header border-bottom fw-600">
							<small class="text-uppercase text-body-secondary">Overall Attendance Percentage</small>
						</div>
						<div class="card-body d-flex justify-content-center align-items-center" style="min-height: 220px;">
							<AttendanceOverview attendanceRows={data.attendanceRows} />
						</div>
					</div>
				</div>
				<div class="col-12 col-lg-6">
			<div class="card shadow-sm rounded-3 border h-100">
				<div class="card-header border-bottom fw-600">
							<small class="text-uppercase text-body-secondary">Attendance State Distribution</small>
						</div>
						<div class="card-body d-flex justify-content-center align-items-center" style="min-height: 220px;">
							<AttendanceBreakdown attendanceRows={data.attendanceRows} />
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="col-12">
			<div class="card shadow-sm rounded-3 border">
				<div class="card-header border-bottom">Attendance Records</div>
				<div class="card-body border-bottom">
					<form method="GET" class="row g-2 align-items-end" data-sveltekit-noscroll>
						<input type="hidden" name="period" value={data.selectedPeriod} />
						<input type="hidden" name="from" value={data.from} />
						<input type="hidden" name="to" value={data.to} />
						<div class="col-12 col-lg-5">
							<div class="d-flex align-items-center gap-2">
								<label class="form-label mb-0 text-nowrap" for="recordSearch"
									>Search</label
								>
								<input
									id="recordSearch"
									class="form-control"
									type="search"
									name="tableSearch"
									placeholder="Date or state"
									value={data.tableSearch}
								/>
							</div>
						</div>
						<div class="col-12 col-md-6 col-lg-3">
							<div class="d-flex align-items-center gap-2">
								<label class="form-label mb-0 text-nowrap" for="recordStatus"
									>State</label
								>
								<select
									id="recordStatus"
									class="form-select"
									name="tableStatus"
									bind:value={selectedStatus}
								>
									{#each attendanceStateOptions as option}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>
							</div>
						</div>
						<div class="col-12 col-md-6 col-lg-2">
							<div class="d-flex align-items-center gap-2">
								<label class="form-label mb-0 text-nowrap" for="recordLimit"
									>Limit</label
								>
								<select
									id="recordLimit"
									class="form-select"
									name="tableLimit"
									bind:value={selectedLimit}
								>
									{#each data.limitOptions as option}
										<option value={option}>{option}</option>
									{/each}
								</select>
							</div>
						</div>
						<input type="hidden" name="tableOffset" value="0" />
						<div class="col-12 col-lg-2 d-flex gap-2 justify-content-lg-end">
							<button class="btn btn-dark" type="submit">Apply</button>
							<a class="btn btn-outline-secondary" href={studentFilterResetUrl()} data-sveltekit-noscroll>Reset</a>
						</div>
					</form>
				</div>
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
								{#if data.tableRows.length === 0}
									<tr>
										<td
											colspan="2"
											class="text-center text-body-secondary py-4"
											>No attendance records found for the
											selected period.</td
										>
									</tr>
								{:else}
									{#each data.tableRows as row}
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
					<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top">
						<div class="text-body-secondary">
							Showing {data.totalRows === 0 ? 0 : data.offset + 1}-{Math.min(data.offset + data.tableRows.length, data.totalRows)} of {data.totalRows}
						</div>
						<div class="d-flex gap-2">
							<a
								class={`btn btn-sm btn-outline-secondary ${data.hasPrevious ? "" : "disabled"}`}
								href={data.hasPrevious ? studentListUrl(data.previousOffset) : "#"}
								aria-disabled={!data.hasPrevious}
								data-sveltekit-noscroll
							>
								Previous
							</a>
							<a
								class={`btn btn-sm btn-outline-secondary ${data.hasNext ? "" : "disabled"}`}
								href={data.hasNext ? studentListUrl(data.nextOffset) : "#"}
								aria-disabled={!data.hasNext}
								data-sveltekit-noscroll
							>
								Next
							</a>
						</div>
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

	<form method="GET" class="row g-3 mb-4">
		<div class="col-12 col-lg-8">
			<div class="d-flex align-items-center gap-2">
				<label class="form-label mb-0 text-nowrap" for="searchClasses">Search</label>
				<input
					id="searchClasses"
					class="form-control"
					type="search"
					name="search"
					placeholder="Search by class title, description, or tags"
					value={data.search}
				/>
			</div>
		</div>
		<div class="col-12 col-lg-4 d-flex align-items-center gap-2 justify-content-lg-end">
			<button class="btn btn-dark" type="submit">Apply</button>
			<a class="btn btn-outline-secondary" href="/dashboard/attendance">Reset</a>
		</div>
	</form>

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
