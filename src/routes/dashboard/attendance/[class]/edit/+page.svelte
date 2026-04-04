<script lang="ts">
	let { data, form } = $props();

	const STATUSES = ['present', 'late', 'absent', 'excused'] as const;

	let rowStates = $state<Record<string, (typeof STATUSES)[number]>>({});

	const initialStates = $derived.by(() =>
		Object.fromEntries(
			data.sheetRows.map((row) => [row.personId, row.status as (typeof STATUSES)[number]])
		)
	);

	$effect(() => {
		rowStates = { ...initialStates };
	});

	function markAll(status: (typeof STATUSES)[number]) {
		for (const row of data.sheetRows) {
			rowStates[row.personId] = status;
		}
	}

	function statusLabel(status: (typeof STATUSES)[number]) {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}

	function statusClass(status: (typeof STATUSES)[number]) {
		if (status === 'present') return 'btn-outline-success';
		if (status === 'late') return 'btn-outline-warning';
		if (status === 'absent') return 'btn-outline-danger';
		return 'btn-outline-info';
	}
</script>

<svelte:head>
	<title>{data.classInfo.title} | Attendance</title>
</svelte:head>

{#if form?.message}
	<div class="alert alert-danger alert-dismissible fade show" role="alert">
		{form.message}
		<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
	</div>
{/if}

<div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3">
	<div>
		<h1 class="h4 mb-1">{data.classInfo.title}</h1>
		<p class="text-body-secondary mb-0">Attendance for {data.dateLabel}</p>
	</div>
	<a class="btn btn-outline-secondary" href={`/dashboard/attendance/${data.classInfo.id}`}>
		Back to overview
	</a>
</div>

<div class="card mb-4">
	<div class="card-body">
		<form method="GET" class="row g-3 align-items-end">
			<div class="col-12 col-md-4 col-lg-3">
				<label class="form-label" for="date">Date</label>
				<input id="date" class="form-control" type="date" name="date" value={data.selectedDate} />
			</div>
			<div class="col-12 col-md-8 col-lg-9 d-flex gap-2">
				<button class="btn btn-primary" type="submit">Load date</button>
				<a class="btn btn-outline-secondary" href={`/dashboard/attendance/${data.classInfo.id}/edit`}>Today</a>
			</div>
		</form>
	</div>
</div>

<div class="card mb-4">
	<div class="card-body">
		<div class="row g-3">
			<div class="col-12 col-md-4">
				<p class="small text-body-secondary mb-1">Class</p>
				<p class="fw-semibold mb-0">{data.classInfo.title}</p>
			</div>
			<div class="col-12 col-md-4">
				<p class="small text-body-secondary mb-1">Teacher</p>
				<p class="fw-semibold mb-0">{data.teacher ? data.teacher.name : 'Unassigned'}</p>
			</div>
			<div class="col-12 col-md-4">
				<p class="small text-body-secondary mb-1">Session</p>
				<span class="badge {data.hasSession ? 'text-bg-success' : 'text-bg-secondary'}">
					{data.hasSession ? 'Saved' : 'New'}
				</span>
			</div>
		</div>
	</div>
</div>

<div class="card">
	<div class="card-body">
		<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
			<h2 class="h6 mb-0">Students</h2>
			<div class="btn-group" role="group" aria-label="Bulk attendance actions">
				<button type="button" class="btn btn-outline-success" onclick={() => markAll('present')}>All present</button>
				<button type="button" class="btn btn-outline-warning" onclick={() => markAll('late')}>All late</button>
				<button type="button" class="btn btn-outline-danger" onclick={() => markAll('absent')}>All absent</button>
			</div>
		</div>

		<form method="POST">
			<input type="hidden" name="date" value={data.selectedDate} />
			<input type="hidden" name="studentIds" value={JSON.stringify(data.sheetRows.map((row) => row.personId))} />
			<input type="hidden" name="statuses" value={JSON.stringify(rowStates)} />

			<div class="table-responsive">
				<table class="table align-middle mb-0">
					<thead class="table-light">
						<tr>
							<th scope="col">Student</th>
							<th scope="col" class="text-end">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each data.sheetRows as row (row.personId)}
							<tr>
								<td>
									<div class="fw-semibold">{row.name}</div>
								</td>
								<td class="text-end">
									<div class="btn-group" role="group" aria-label={`Attendance status for ${row.name}`}>
										{#each STATUSES as status}
											<input
												class="btn-check"
												type="radio"
												name={`status-${row.personId}`}
												id={`${row.personId}-${status}`}
												autocomplete="off"
												checked={rowStates[row.personId] === status}
												onchange={() => {
													rowStates[row.personId] = status;
												}}
											/>
											<label class={`btn ${statusClass(status)} ${rowStates[row.personId] === status ? 'active' : ''}`} for={`${row.personId}-${status}`}>
												{statusLabel(status)}
											</label>
										{/each}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="d-flex justify-content-end gap-2 mt-4">
				<button type="submit" class="btn btn-success">Save attendance</button>
			</div>
		</form>
	</div>
</div>