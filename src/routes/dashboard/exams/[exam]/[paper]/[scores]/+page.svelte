<script lang="ts">
	let { data, form } = $props();

	type ScoreRow = {
		clientId: string;
		indexNumber: string;
		mark: string;
		error?: string;
	};

	function createRow(): ScoreRow {
		return {
			clientId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			indexNumber: '',
			mark: ''
		};
	}

	const initialRows = $derived.by(() => data.initialRows ?? [createRow()]);
	let rows = $state<ScoreRow[]>([createRow()]);
	let message = $state('');
	let submitting = $state(false);
	let hydrated = $state(false);

	$effect(() => {
		if (!hydrated) {
			rows = initialRows;
			hydrated = true;
		}

		if (form?.rows) {
			rows = form.rows.map((row: ScoreRow) => ({
				clientId: row.clientId,
				indexNumber: row.indexNumber,
				mark: row.mark,
				error: row.error
			}));
		}
		message = form?.message ?? '';
		if (!form?.rows && rows.length === 0) {
			rows = initialRows;
		}
	});

	function formatDate(value: unknown) {
		if (!value) return '-';
		const date = value instanceof Date ? value : new Date(String(value));
		if (Number.isNaN(date.getTime())) return '-';
		return date.toLocaleDateString();
	}

	function addRow() {
		rows = [...rows, createRow()];
	}

	function deleteRow(clientId: string) {
		const next = rows.filter((row) => row.clientId !== clientId);
		rows = next.length > 0 ? next : [createRow()];
	}

	function setAbsent(clientId: string) {
		rows = rows.map((row) => (row.clientId === clientId ? { ...row, mark: 'AB', error: undefined } : row));
	}

	function updateRow(clientId: string, field: 'indexNumber' | 'mark', value: string) {
		rows = rows.map((row) => (row.clientId === clientId ? { ...row, [field]: value, error: undefined } : row));
	}

</script>

<svelte:head>
	<title>{data.paper.title ?? 'Paper'} | Enter marks</title>
</svelte:head>

<div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-3">
	<div>
		<h2 class="mb-1">{data.paper.title ?? 'Untitled paper'}</h2>
		<p class="text-body-secondary mb-0">
			{data.exam.title} · {data.subject.title}
		</p>
	</div>
	<a class="btn btn-outline-secondary" href={`/dashboard/exams/${data.exam.id}/${data.paper.id}`}>
		Back to paper
	</a>
</div>

<div class="card mb-4">
	<div class="card-body">
		<div class="row g-3">
			<div class="col-12 col-md-4">
				<div class="text-body-secondary small mb-1">Paper</div>
				<div class="fw-semibold">{data.paper.title ?? 'Untitled paper'}</div>
			</div>
			<div class="col-12 col-md-4">
				<div class="text-body-secondary small mb-1">Exam</div>
				<div class="fw-semibold">{data.exam.title}</div>
			</div>
			<div class="col-12 col-md-4">
				<div class="text-body-secondary small mb-1">Subject</div>
				<div class="fw-semibold">{data.subject.title}</div>
			</div>
		</div>
		<div class="small text-body-secondary mt-3">
			Enter a student index number and a whole-number mark, or press AB to mark the row absent.
		</div>
	</div>
</div>

{#if message}
	<div class="alert alert-info" role="alert">{message}</div>
{/if}

<div class="card">
	<div class="card-body">
		<form method="POST" action="?/save">
			{#each rows as row}
				<input type="hidden" name="clientId" value={row.clientId} />
				<input type="hidden" name="indexNumber" value={row.indexNumber} />
				<input type="hidden" name="mark" value={row.mark} />
			{/each}
			<div class="table-responsive">
				<table class="table align-middle mb-0">
					<thead class="table-light">
						<tr>
							<th scope="col" style="width: 88px;">Delete</th>
							<th scope="col" style="width: 72px;">#</th>
							<th scope="col">Index number</th>
							<th scope="col">Marks</th>
							<th scope="col" style="width: 120px;">AB</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row, index (row.clientId)}
							<tr>
								<td>
									<button class="btn btn-sm btn-outline-danger" type="button" onclick={() => deleteRow(row.clientId)}>
										Delete
									</button>
								</td>
								<td class="fw-semibold">{index + 1}</td>
								<td>
									<input
										class="form-control"
										type="text"
										name="indexNumber"
										placeholder="Index number"
										value={row.indexNumber}
										oninput={(event) => updateRow(row.clientId, 'indexNumber', (event.currentTarget as HTMLInputElement).value)}
									/>
								</td>
								<td>
									<input
										class="form-control"
										type="text"
										name="mark"
										placeholder="Marks"
										value={row.mark}
										oninput={(event) => updateRow(row.clientId, 'mark', (event.currentTarget as HTMLInputElement).value)}
									/>
								</td>
								<td>
									<button class="btn btn-outline-secondary btn-sm" type="button" onclick={() => setAbsent(row.clientId)}>
										AB
									</button>
								</td>
							</tr>
							{#if row.error}
								<tr>
									<td colspan="5" class="pt-0">
										<div class="small text-danger">{row.error}</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>

			<div class="d-flex flex-column flex-sm-row justify-content-between gap-2 mt-4">
				<button class="btn btn-outline-primary" type="button" onclick={addRow}>New entry</button>
				<button class="btn btn-primary" type="submit" disabled={submitting}>
					{submitting ? 'Submitting...' : 'Submit marks'}
				</button>
			</div>
		</form>
	</div>
</div>
