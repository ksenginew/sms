<script lang="ts">
	import type { PageData } from './$types';

	let { data, form } = $props();

	const STATUSES = ['present', 'late', 'absent', 'excused'] as const;

	let rowStates = $state<Record<string, typeof STATUSES[number]>>({});

	const initialStates = $derived.by(() => {
		return Object.fromEntries(
			data.sheetRows.map((row) => [row.personId, row.status as typeof STATUSES[number]])
		);
	});

	$effect(() => {
		Object.assign(rowStates, initialStates);
	});

	function markAllPresent() {
		for (const row of data.sheetRows) {
			rowStates[row.personId] = 'present';
		}
	}

	function getStatusBadgeClass(status: string, selectedStatus: string): string {
		if (status === selectedStatus) {
			return 'btn btn-sm btn-primary';
		}
		return 'btn btn-sm btn-outline-secondary';
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'present':
				return 'success';
			case 'late':
				return 'warning';
			case 'absent':
				return 'danger';
			case 'excused':
				return 'info';
			default:
				return 'secondary';
		}
	}
</script>

{#if form?.message}
	<div class="alert alert-danger alert-dismissible fade show" role="alert">
		{form.message}
		<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
	</div>
{/if}

<div class="card mb-4">
	<div class="card-header bg-light">
		<h5 class="mb-0">Mark Attendance</h5>
	</div>
	<div class="card-body">
		<div class="row mb-4">
			<div class="col-md-6">
				<p class="mb-2">
					<strong>Class:</strong>
					<span class="text-muted">{data.classInfo.title}</span>
				</p>
				{#if data.teacher}
					<p class="mb-2">
						<strong>Teacher:</strong>
						<span class="text-muted">{data.teacher.name}</span>
					</p>
				{/if}
			</div>
			<div class="col-md-6">
				<p class="mb-2">
					<strong>Date:</strong>
					<span class="text-muted">{data.dateLabel}</span>
				</p>
				<p class="mb-0">
					<strong>Record Status:</strong>
					<span class="badge {data.isNewRecord ? 'bg-info' : 'bg-success'}">
						{data.isNewRecord ? 'New' : 'Existing'}
					</span>
				</p>
			</div>
		</div>

		<div class="mb-3">
			<button
				type="button"
				class="btn btn-outline-primary me-2"
				onclick={markAllPresent}
			>
				Mark All Present
			</button>
		</div>

		<form method="POST" class="table-responsive">
			<table class="table table-hover">
				<thead class="table-light">
					<tr>
						<th style="width: 35%;">Student Name</th>
						<th class="text-center">Present</th>
						<th class="text-center">Late</th>
						<th class="text-center">Absent</th>
						<th class="text-center">Excused</th>
					</tr>
				</thead>
				<tbody>
					{#each data.sheetRows as row (row.personId)}
						<tr>
							<td>
								<strong>{row.name}</strong>
								{#if row.fullname && row.fullname !== row.name}
									<br />
									<small class="text-muted">{row.fullname}</small>
								{/if}
							</td>
							{#each STATUSES as status}
								<td class="text-center">
									<button
										type="button"
										class={getStatusBadgeClass(status, rowStates[row.personId])}
										onclick={() => {
											rowStates[row.personId] = status;
										}}
									>
										{status.charAt(0).toUpperCase() + status.slice(1)}
									</button>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>

			<input
				type="hidden"
				name="studentIds"
				value={JSON.stringify(data.sheetRows.map((r) => r.personId))}
			/>
			<input type="hidden" name="statuses" value={JSON.stringify(rowStates)} />

			<div class="d-flex gap-2 justify-content-end mt-4">
				<a href="/dashboard/attendance/{data.classInfo.id}" class="btn btn-secondary">
					Cancel
				</a>
				<button type="submit" class="btn btn-success">Submit Attendance</button>
			</div>
		</form>
	</div>
</div>