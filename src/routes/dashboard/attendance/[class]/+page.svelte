<script lang="ts">
	let { data } = $props();

	function badgeClass(status: string) {
		if (status === 'present') return 'text-bg-success';
		if (status === 'late') return 'text-bg-warning';
		if (status === 'absent') return 'text-bg-danger';
		if (status === 'excused') return 'text-bg-info';
		return 'text-bg-secondary';
	}
</script>

<svelte:head>
	<title>{data.classInfo.title} | Attendance</title>
</svelte:head>

<section class="vstack gap-4">
	<div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
		<div>
			<h1 class="h4 mb-1">{data.classInfo.title}</h1>
			<p class="text-body-secondary mb-0">Class session overview and attendance sheet.</p>
		</div>
		<a
			class={`btn ${data.todayAlreadyMarked ? 'btn-secondary disabled' : 'btn-primary'}`}
			href={data.todayAlreadyMarked ? undefined : `/dashboard/attendance/${data.classInfo.id}/${data.today}`}
			aria-disabled={data.todayAlreadyMarked}
			tabindex={data.todayAlreadyMarked ? -1 : undefined}
		>
			Mark today attendance
		</a>
	</div>

	<div class="card">
		<div class="card-body">
			<div class="row g-3 align-items-stretch">
				<div class="col-12 col-lg-8">
					<div class="h-100 p-3 border rounded-3 bg-body-tertiary">
						<p class="small text-uppercase text-body-secondary mb-2">Class description</p>
						<h2 class="h5 mb-3">{data.classInfo.title}</h2>
						<p class="mb-3">{data.classInfo.description || 'No class description has been added yet.'}</p>
						<div class="row g-2">
							<div class="col-12 col-md-4">
								<div class="border rounded-3 bg-white p-3 h-100">
									<p class="small text-body-secondary mb-1">Class teacher</p>
									<p class="fw-semibold mb-0">{data.teacher ? data.teacher.fullname || data.teacher.name : 'Unassigned'}</p>
								</div>
							</div>
							<div class="col-12 col-md-4">
								<div class="border rounded-3 bg-white p-3 h-100">
									<p class="small text-body-secondary mb-1">Students</p>
									<p class="fw-semibold mb-0">{data.students.length}</p>
								</div>
							</div>
							<div class="col-12 col-md-4">
								<div class="border rounded-3 bg-white p-3 h-100">
									<p class="small text-body-secondary mb-1">Visibility</p>
									<p class="fw-semibold mb-0">{data.classInfo.visible ? 'Visible' : 'Hidden'}</p>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="col-12 col-lg-4">
					<div class="h-100 border rounded-3 bg-white p-3">
						<p class="small text-uppercase text-body-secondary mb-2">Quick note</p>
						<p class="mb-0 text-body-secondary">
							The edit buttons on the attendance sheet will later open the nested session route.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="card">
		<div class="card-body">
			<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
				<h2 class="h6 mb-0">Attendance Sheet</h2>
				<span class="badge text-bg-primary">{data.attendanceColumns.length} marked dates</span>
			</div>

			<div class="table-responsive">
				<table class="table table-bordered align-middle text-center mb-0">
					<thead class="table-light">
						<tr>
							<th class="text-nowrap position-sticky start-0 bg-light z-3 text-start">
								Student name
							</th>
							{#each data.attendanceColumns as column}
								<th class="text-nowrap align-top">
									<div class="d-flex flex-column gap-2">
										<span>{column.label}</span>
										<a class="btn btn-sm btn-outline-primary" href={column.href}>Edit</a>
									</div>
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#if data.sheetRows.length === 0}
							<tr>
								<td colspan={data.attendanceColumns.length + 1} class="text-body-secondary py-4">
									No student attendance records are available yet.
								</td>
							</tr>
						{:else}
							{#each data.sheetRows as row}
								<tr>
									<td class="position-sticky start-0 bg-body z-2 border-end text-start text-nowrap fw-semibold">
										{row.fullname || row.name}
									</td>
									{#each row.attendance as item}
										<td class="text-nowrap">
											{#if item.status}
												<span class={`badge ${badgeClass(item.status)}`}>{item.status}</span>
											{:else}
												<span class="text-body-secondary">-</span>
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</section>