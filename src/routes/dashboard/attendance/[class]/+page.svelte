<script lang="ts">
	let { data } = $props();

	function badgeClass(status: string) {
		if (status === "present") return "text-bg-success";
		if (status === "late") return "text-bg-warning";
		if (status === "absent") return "text-bg-danger";
		if (status === "excused") return "text-bg-info";
		return "text-bg-secondary";
	}
	const now = new Date();
	const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const yearMonthDate = `${yearMonth}-${String(now.getDate()).padStart(2, "0")}`;
</script>

<svelte:head>
	<title>{data.classInfo.title} | Attendance</title>
</svelte:head>

<section class="vstack gap-4">
	<div
		class="d-flex flex-wrap justify-content-between align-items-center gap-3"
	>
		<div>
			<h1 class="h4 mb-1">{data.classInfo.title}</h1>
			<p class="text-body-secondary mb-0">
				Attendance sheet for {data.selectedMonth}.
			</p>
		</div>
		<a
			class="btn btn-primary"
			href={`/dashboard/attendance/${data.classInfo.id}/edit`}
		>
			Mark attendance
		</a>
	</div>

	<div class="card">
		<div class="card-body">
			<p class="mb-3">
				{data.classInfo.description ||
					"No class description has been added yet."}
			</p>
			<div class="row g-2">
				<div class="col-12 col-md-4">
					<div class="border rounded-3 bg-body-tertiary p-3 h-100">
						<p class="small text-body-secondary mb-1">Teachers</p>
						{#if data.teachers.length > 0}
							<ul class="list-unstyled mb-0">
								{#each data.teachers as teacher}
									<li>{teacher.name}</li>
								{/each}
							</ul>
						{:else}
							<p class="fw-semibold mb-0">No teachers assigned</p>
						{/if}
					</div>
				</div>
				<div class="col-12 col-md-4">
					<div class="border rounded-3 bg-body-tertiary p-3 h-100">
						<p class="small text-body-secondary mb-1">Students</p>
						<p class="fw-semibold mb-0">{data.students.length}</p>
					</div>
				</div>
				<div class="col-12 col-md-4">
					<div class="border rounded-3 bg-body-tertiary p-3 h-100">
						<p class="small text-body-secondary mb-1">Visibility</p>
						<p class="fw-semibold mb-0">
							{data.classInfo.visible ? "Visible" : "Hidden"}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="card">
		<div class="card-body">
			<div
				class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"
			>
				<h2 class="h6 mb-0">Attendance Sheet</h2>
				<span class="badge text-bg-primary"
					>{data.sessions.length} dates in {data.selectedMonth}</span
				>
			</div>

			<div class="row g-2 align-items-end mb-3">
				<div class="col-12 col-md-4 col-lg-3">
					<label class="form-label" for="month">Year-Month</label>
					<form method="GET" class="d-flex gap-2">
						<input
							id="month"
							name="month"
							type="month"
							class="form-control"
							value={data.selectedMonth}
						/>
						<button class="btn btn-primary" type="submit">Go</button
						>
					</form>
				</div>
				<div class="col-12 col-md-8 col-lg-4 d-flex gap-2">
					<a
						class="btn btn-outline-secondary"
						href={`?month=${data.previousMonth}`}>Back</a
					>
					<a
						class="btn btn-outline-secondary"
						href={`?month=${data.nextMonth}`}>Forward</a
					>
				</div>
			</div>

			<div class="table-responsive">
				<table
					class="table table-bordered align-middle text-center mb-0"
				>
					<thead class="table-light">
						<tr>
							<th class="text-nowrap">#</th>
							<th
								class="text-nowrap position-sticky start-0 bg-light z-3 text-start"
							>
								Student name
							</th>
							{#each data.sessions as column}
								<th class="text-nowrap align-top">
									<div class="d-flex flex-column gap-2">
										<span>{column.date}</span>
										<a
											class="btn btn-sm btn-outline-primary"
											href={`${data.classInfo.id}/edit?date=${column.date}`}>Edit</a
										>
									</div>
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#if Object.keys(data.attendance).length === 0}
							<tr>
								<td
									colspan={data.sessions.length + 2}
									class="text-body-secondary py-4"
								>
									No student attendance records are available
									yet.
								</td>
							</tr>
						{:else}
							{#each data.students as row, index}
								<tr>
									<td class="text-nowrap">{index + 1}</td>
									<td
										class="position-sticky start-0 bg-body z-2 border-end text-start text-nowrap fw-semibold"
									>{row.name}</td>
									{#each data.sessions as col}
										{@const status = data.attendance[row.id]?.[col.id]}
										<td class="text-nowrap">
											{#if status}
												<span
													class={`badge ${badgeClass(status)}`}
													>{status}</span
												>
											{:else}
												<span
													class="text-body-secondary"
													>-</span
												>
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
