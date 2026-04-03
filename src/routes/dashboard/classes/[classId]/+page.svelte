<script lang="ts">
	let { data, form } = $props();
</script>

<div class="d-flex justify-content-between align-items-start gap-3 mb-3">
	<div>
		<h2 class="h4 mb-1">{data.classItem.title}</h2>
		<p class="text-body-secondary mb-0">{data.classItem.description ?? 'No description'}</p>
	</div>
	<div class="d-flex gap-2">
		<a class="btn btn-sm btn-outline-secondary" href={data.backLink}>Back</a>
		{#if data.isAdmin}
			<form method="POST" action="?/delete" onsubmit={(event) => {
				event.preventDefault();
				if (confirm('Delete this class?')) event.currentTarget.submit();
			}}>
				<button class="btn btn-sm btn-outline-danger" type="submit">Delete</button>
			</form>
			<button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="modal" data-bs-target="#editClassModal">Edit</button>
		{/if}
		{#if data.canManageMembers}
			<button class="btn btn-sm btn-primary" type="button" data-bs-toggle="modal" data-bs-target="#addMemberModal">Add member</button>
		{/if}
	</div>
</div>

<div class="small text-body-secondary mb-3">{data.classItem.visible ? 'Visible' : 'Hidden'}</div>

{#if form?.message}
	<div class="alert alert-danger">{form.message}</div>
{/if}

<h3 class="h6 mb-3">Members</h3>
<div class="table-responsive">
	<table class="table mb-0">
		<thead>
			<tr>
				<th>Name</th>
				<th>Email</th>
				<th>Role</th>
				{#if data.canManageMembers}
					<th>Action</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each data.members as member}
				<tr>
					<td>{member.fullname || member.name || '-'}</td>
					<td>{member.email || '-'}</td>
					<td>{member.role}</td>
					{#if data.canManageMembers}
						<td>
							<form method="POST" action="?/removeMember">
								<input type="hidden" name="personId" value={member.id} />
								<button class="btn btn-sm btn-outline-danger" type="submit">Remove</button>
							</form>
						</td>
					{/if}
				</tr>
			{:else}
				<tr>
					<td colspan={data.canManageMembers ? 4 : 3} class="text-body-secondary">No members in this class yet.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if data.isAdmin}
	<div class="modal fade" id="editClassModal" tabindex="-1" aria-labelledby="editClassModalLabel" aria-hidden="true">
		<div class="modal-dialog modal-lg modal-dialog-scrollable">
			<div class="modal-content">
				<form method="POST" action="?/update">
					<div class="modal-header">
						<h2 class="modal-title h5" id="editClassModalLabel">Edit class</h2>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						{#if form?.action === 'update' && form?.message}
							<div class="alert alert-danger">{form.message}</div>
						{/if}
						<div class="row g-3">
							<div class="col-md-5">
								<label class="form-label" for="edit-title">Title</label>
								<input class="form-control" id="edit-title" name="title" value={data.classItem.title} required />
							</div>
							<div class="col-md-5">
								<label class="form-label" for="edit-description">Description</label>
								<input class="form-control" id="edit-description" name="description" value={data.classItem.description ?? ''} />
							</div>
							<div class="col-md-2 d-flex align-items-end">
								<div class="form-check mb-2">
									<input class="form-check-input" id="edit-visible" name="visible" type="checkbox" checked={data.classItem.visible} />
									<label class="form-check-label" for="edit-visible">Visible</label>
								</div>
							</div>
						</div>
					</div>
					<div class="modal-footer d-flex justify-content-between">
						<button class="btn btn-warning" type="submit">Update</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

{#if data.canManageMembers}
	<div class="modal fade" id="addMemberModal" tabindex="-1" aria-labelledby="addMemberModalLabel" aria-hidden="true">
		<div class="modal-dialog modal-lg modal-dialog-scrollable">
			<div class="modal-content">
				<form method="POST" action="?/addMember">
					<div class="modal-header">
						<h2 class="modal-title h5" id="addMemberModalLabel">Add member</h2>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						{#if form?.action === 'addMember' && form?.message}
							<div class="alert alert-danger">{form.message}</div>
						{/if}
						<label class="form-label" for="personId">Person ID</label>
						<input class="form-control" id="personId" name="personId" placeholder="Enter person UUID" required />
					</div>
					<div class="modal-footer">
						<button class="btn btn-primary" type="submit">Add</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
