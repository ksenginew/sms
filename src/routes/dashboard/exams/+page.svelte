<script lang="ts">
	let { data, form } = $props();
	let selectedGrade = $state('');
	let formToSubmit: HTMLFormElement | null = $state(null);

	function formatDate(value: unknown) {
		if (!value) return "-";
		const date = value instanceof Date ? value : new Date(String(value));
		if (Number.isNaN(date.getTime())) return "-";
		return date.toLocaleDateString();
	}

	function listUrl(nextOffset: number) {
		const params = new URLSearchParams();
		if (data.search) params.set("search", data.search);
		params.set("limit", String(data.limit));
		params.set("offset", String(Math.max(0, nextOffset)));
		return `/dashboard/exams?${params.toString()}`;
	}

	function examLink(examId: number) {
		return `/dashboard/exams/${examId}`;
	}

	function getClassesForGrade(grade: string) {
		if (!grade) return [];
		return data.allClasses.filter((cls) => cls.tags && cls.tags.includes(grade));
	}

	function handleFormSubmit(event: Event) {
		event.preventDefault();
		formToSubmit = event.target as HTMLFormElement;

		import('bootstrap').then(({ Modal }) => {
			const modalEl = document.getElementById('confirmCreateExamModal');
			if (modalEl) {
				const modal = new Modal(modalEl);
				modal.show();
			}
		});
	}

	function confirmCreate() {
		if (formToSubmit) {
			formToSubmit.submit();
		}
	}
</script>

<div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3">
	<h2 class="mb-0">Exams</h2>
	{#if data.isAdmin}
		<button
			class="btn btn-primary"
			type="button"
			data-bs-toggle="modal"
			data-bs-target="#createExamModal">Create exam</button
		>
	{/if}
</div>

<form method="GET" class="row g-3 mb-4">
	<div class="col-12 col-lg-7">
		<div class="d-flex align-items-center gap-2">
			<label class="form-label mb-0 text-nowrap" for="search">Search</label>
			<input
				class="form-control"
				id="search"
				type="search"
				name="search"
				placeholder="Exam title, description, or tags"
				value={data.search}
			/>
		</div>
	</div>
	<div class="col-12 col-md-6 col-lg-2">
		<div class="d-flex align-items-center gap-2">
			<label class="form-label mb-0 text-nowrap" for="limit">Limit</label>
			<select class="form-select" id="limit" name="limit">
				<option value="10" selected={data.limit === 10}>10</option>
				<option value="20" selected={data.limit === 20}>20</option>
				<option value="50" selected={data.limit === 50}>50</option>
				<option value="100" selected={data.limit === 100}>100</option>
			</select>
		</div>
	</div>
	<input type="hidden" name="offset" value="0" />
	<div class="col-12 col-md-6 col-lg-3 d-flex align-items-center gap-2 justify-content-lg-end">
		<button class="btn btn-dark" type="submit">Apply</button>
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

{#if data.isAdmin}
	<div
		class="modal fade"
		id="createExamModal"
		tabindex="-1"
		aria-labelledby="createExamModalLabel"
		aria-hidden="true"
	>
		<div class="modal-dialog modal-lg modal-dialog-scrollable">
			<div class="modal-content">
				<form method="POST" action="?/create" onsubmit={handleFormSubmit}>
					<div class="modal-header">
						<h2 class="modal-title h5" id="createExamModalLabel">Create exam</h2>
						<button
							type="button"
							class="btn-close"
							data-bs-dismiss="modal"
							aria-label="Close"
						></button>
					</div>
					<div class="modal-body">
						{#if form?.action === 'create' && form?.message}
							<div class="alert alert-danger" role="alert">
								{form.message}
							</div>
						{/if}
						<div class="row g-3">
							<div class="col-md-6">
								<label class="form-label" for="title">Title</label>
								<input class="form-control" id="title" name="title" required />
							</div>
							<div class="col-md-6">
								<label class="form-label" for="tags">Tags</label>
								<input
									class="form-control"
									id="tags"
									name="tags"
									placeholder="math, midterm, grade-10"
								/>
							</div>
							<div class="col-12">
								<label class="form-label" for="description">Description</label>
								<textarea class="form-control" id="description" name="description" rows="4"></textarea>
							</div>
							<div class="col-12">
								<div class="form-check">
									<input class="form-check-input" id="visible" name="visible" type="checkbox" checked />
									<label class="form-check-label" for="visible">Visible</label>
								</div>
							</div>
							<div class="col-12">
								<label class="form-label" for="gradeFilter">Filter classes by grade</label>
								<select 
									class="form-select" 
									id="gradeFilter" 
									bind:value={selectedGrade}
								>
									<option value="">-- All Grades --</option>
									{#each data.grades as grade}
										<option value={grade}>{grade}</option>
									{/each}
								</select>
							</div>
							{#if selectedGrade || data.allClasses.length > 0}
								<div class="col-12">
									<h6 class="mb-3">Select classes</h6>
									<div class="row g-2">
										{#each getClassesForGrade(selectedGrade) as classItem}
											<div class="col-md-6">
												<div class="form-check">
													<input 
														class="form-check-input" 
														id="class-{classItem.id}" 
														name="selectedClasses"
														value={classItem.id}
														type="checkbox" 
													/>
													<label class="form-check-label" for="class-{classItem.id}">
														{classItem.title}
													</label>
												</div>
											</div>
										{:else}
											<div class="col-12">
												<div class="text-body-secondary small">
													{selectedGrade ? `No classes found for ${selectedGrade}` : 'Select a grade to see classes'}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
					<div class="modal-footer">
						<button class="btn btn-primary" type="submit">Create</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Confirmation Modal -->
<div
	class="modal fade"
	id="confirmCreateExamModal"
	tabindex="-1"
	aria-labelledby="confirmCreateExamModalLabel"
	aria-hidden="true"
>
	<div class="modal-dialog modal-dialog-centered">
		<div class="modal-content">
			<div class="modal-header">
				<h2 class="modal-title h6" id="confirmCreateExamModalLabel">Confirm Exam Creation</h2>
				<button
					type="button"
					class="btn-close"
					data-bs-dismiss="modal"
					aria-label="Close"
				></button>
			</div>
			<div class="modal-body">
				Are you sure you want to create this exam? This action cannot be undone.
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
				<button type="button" class="btn btn-primary" onclick={confirmCreate}>Create Exam</button>
			</div>
		</div>
	</div>
</div>
