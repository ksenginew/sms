<script lang="ts">
	let { data, form } = $props();
	let searchInput = $state('');
	let createModalForm = $state<HTMLFormElement | null>(null);
	let editModalForm = $state<HTMLFormElement | null>(null);
	let deleteForm = $state<HTMLFormElement | null>(null);
	let selectedSubject = $state<any>(null);

	$effect(() => {
		searchInput = data.search;
	});

	function handleSearch(event: Event) {
		const form = event.currentTarget as HTMLFormElement;
		const formData = new FormData(form);
		const params = new URLSearchParams();
		if (searchInput) params.set('search', searchInput);
		params.set('limit', String(data.limit));
		params.set('offset', '0');
		window.location.href = `/dashboard/exams/subjects?${params.toString()}`;
	}

	function handleCreateClick() {
		// @ts-ignore
		import('bootstrap/dist/js/bootstrap.bundle.min.js').then(({ Modal }: any) => {
			const modalEl = document.getElementById('createSubjectModal');
			if (modalEl) {
				const modal = new Modal(modalEl);
				modal.show();
			}
		});
	}

	function handleEditClick(subject: any) {
		selectedSubject = { ...subject };
		// @ts-ignore
		import('bootstrap/dist/js/bootstrap.bundle.min.js').then(({ Modal }: any) => {
			const modalEl = document.getElementById('editSubjectModal');
			if (modalEl) {
				const modal = new Modal(modalEl);
				modal.show();
			}
		});
	}

	function handleDeleteClick(subject: any) {
		selectedSubject = subject;
		// @ts-ignore
		import('bootstrap/dist/js/bootstrap.bundle.min.js').then(({ Modal }: any) => {
			const modalEl = document.getElementById('deleteSubjectModal');
			if (modalEl) {
				const modal = new Modal(modalEl);
				modal.show();
			}
		});
	}

	function confirmDelete() {
		if (deleteForm) {
			deleteForm.submit();
		}
	}

	function listUrl(nextOffset: number) {
		const params = new URLSearchParams();
		if (data.search) params.set('search', data.search);
		params.set('limit', String(data.limit));
		params.set('offset', String(Math.max(0, nextOffset)));
		return `/dashboard/exams/subjects?${params.toString()}`;
	}
</script>

<div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3">
	<h2 class="mb-0">Subjects</h2>
	<button
		class="btn btn-primary"
		type="button"
		onclick={handleCreateClick}>Create subject</button
	>
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
				placeholder="Subject title"
				bind:value={searchInput}
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
		<button class="btn btn-dark" type="button" onclick={handleSearch}>Apply</button>
		<a class="btn btn-outline-secondary" href="/dashboard/exams/subjects">Reset</a>
	</div>
</form>

<div class="d-flex justify-content-between align-items-center mb-2">
	<div class="text-body-secondary">
		Showing {Math.min(data.offset + 1, data.total)}-{Math.min(data.offset + data.subjectsList.length, data.total)} of {data.total}
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

<div class="table-responsive">
	<table class="table table-hover">
		<thead>
			<tr>
				<th>Title</th>
				<th>Description</th>
				<th style="width: 150px;">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.subjectsList as subject}
				<tr>
					<td class="fw-semibold">{subject.title}</td>
					<td class="text-body-secondary">{subject.description ?? '-'}</td>
					<td>
						<button
							class="btn btn-sm btn-outline-primary me-2"
							type="button"
							onclick={() => handleEditClick(subject)}>Edit</button>
						<button
							class="btn btn-sm btn-outline-danger"
							type="button"
							onclick={() => handleDeleteClick(subject)}>Delete</button>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="3" class="text-center text-body-secondary py-4">No subjects found.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<!-- Create Subject Modal -->
<div
	class="modal fade"
	id="createSubjectModal"
	tabindex="-1"
	aria-labelledby="createSubjectModalLabel"
	aria-hidden="true"
>
	<div class="modal-dialog">
		<div class="modal-content">
			<form method="POST" action="?/create">
				<div class="modal-header">
					<h2 class="modal-title h5" id="createSubjectModalLabel">Create subject</h2>
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
						<div class="col-12">
							<label class="form-label" for="create-title">Title *</label>
							<input
								class="form-control"
								id="create-title"
								name="title"
								placeholder="e.g., Mathematics"
								required
							/>
						</div>
						<div class="col-12">
							<label class="form-label" for="create-description">Description</label>
							<textarea
								class="form-control"
								id="create-description"
								name="description"
								rows="3"
								placeholder="Add subject details..."
							></textarea>
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
					<button type="submit" class="btn btn-primary">Create Subject</button>
				</div>
			</form>
		</div>
	</div>
</div>

<!-- Edit Subject Modal -->
<div
	class="modal fade"
	id="editSubjectModal"
	tabindex="-1"
	aria-labelledby="editSubjectModalLabel"
	aria-hidden="true"
>
	<div class="modal-dialog">
		<div class="modal-content">
			<form method="POST" action="?/edit">
				<div class="modal-header">
					<h2 class="modal-title h5" id="editSubjectModalLabel">Edit subject</h2>
					<button
						type="button"
						class="btn-close"
						data-bs-dismiss="modal"
						aria-label="Close"
					></button>
				</div>
				<div class="modal-body">
					{#if form?.action === 'edit' && form?.message}
						<div class="alert alert-danger" role="alert">
							{form.message}
						</div>
					{/if}
					{#if selectedSubject}
						<input type="hidden" name="id" value={selectedSubject.id} />
						<div class="row g-3">
							<div class="col-12">
								<label class="form-label" for="edit-title">Title *</label>
								<input
									class="form-control"
									id="edit-title"
									name="title"
									value={selectedSubject.title}
									required
								/>
							</div>
							<div class="col-12">
								<label class="form-label" for="edit-description">Description</label>
								<textarea
									class="form-control"
									id="edit-description"
									name="description"
									rows="3">{selectedSubject.description ?? ''}</textarea>
							</div>
						</div>
					{/if}
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
					<button type="submit" class="btn btn-primary">Update Subject</button>
				</div>
			</form>
		</div>
	</div>
</div>

<!-- Delete Subject Modal -->
<div
	class="modal fade"
	id="deleteSubjectModal"
	tabindex="-1"
	aria-labelledby="deleteSubjectModalLabel"
	aria-hidden="true"
>
	<div class="modal-dialog modal-dialog-centered">
		<div class="modal-content">
			<div class="modal-header">
				<h2 class="modal-title h6" id="deleteSubjectModalLabel">Confirm Deletion</h2>
				<button
					type="button"
					class="btn-close"
					data-bs-dismiss="modal"
					aria-label="Close"
				></button>
			</div>
			<div class="modal-body">
				{#if selectedSubject}
					<p>Are you sure you want to delete <strong>{selectedSubject.title}</strong>?</p>
					<p class="text-danger small mb-0">This action cannot be undone.</p>
				{/if}
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
				<form method="POST" action="?/delete" bind:this={deleteForm} class="d-inline">
					{#if selectedSubject}
						<input type="hidden" name="id" value={selectedSubject.id} />
					{/if}
					<button type="button" class="btn btn-danger" onclick={confirmDelete}>Delete Subject</button>
				</form>
			</div>
		</div>
	</div>
</div>
