<!-- <script lang="ts">
	let { data } = $props();

	function formatDate(value: unknown) {
		if (!value) return '-';

		const date = value instanceof Date ? value : new Date(String(value));
		if (Number.isNaN(date.getTime())) return '-';

		return date.toLocaleString();
	}
</script>

<div class="row g-3">
	<div class="col-12">
		<div class="card">
			<div class="card-body">
				<h2 class="h6 mb-3">Profile</h2>
				<div class="table-responsive">
					<table class="table mb-0">
						<tbody>
							<tr>
								<th scope="row">Person ID</th>
								<td class="text-break">{data.person?.id ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Role</th>
								<td>{data.person?.role ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Name</th>
								<td>{data.person?.name ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Full name</th>
								<td>{data.person?.fullname ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Email</th>
								<td>{data.person?.email ?? data.user?.email ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Auth User ID</th>
								<td class="text-break">{data.user?.id ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Linked User ID</th>
								<td class="text-break">{data.person?.userId ?? '-'}</td>
							</tr>
							<tr>
								<th scope="row">Created</th>
								<td>{formatDate(data.person?.createdAt)}</td>
							</tr>
							<tr>
								<th scope="row">Updated</th>
								<td>{formatDate(data.person?.updatedAt)}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div> -->

<script lang="ts">
    let { data } = $props();

    function formatDate(value: unknown) {
        if (!value) return '-';
        const date = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function getInitials(name: string | null | undefined) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
</script>

<div class="container py-4">

    <!-- Avatar + Name -->
    <div class="text-center mb-4">
        <div class="rounded-circle bg-primary d-inline-flex align-items-center
            justify-content-center text-white fw-bold mb-3"
            style="width:80px;height:80px;font-size:1.8rem">
            {getInitials(data.person?.name)}
        </div>
        <h1 class="fs-4 fw-bold mb-0">{data.person?.name ?? '-'}</h1>
        {#if data.person?.fullname}
            <p class="text-muted small mb-0">{data.person.fullname}</p>
        {/if}
        {#if data.person?.role}
            <span class="badge bg-primary mt-2">{data.person.role}</span>
        {/if}
    </div>

    <!-- Contact info -->
    <div class="card mb-3">
        <div class="card-body">
            <h2 class="fs-6 fw-semibold text-muted text-uppercase mb-3"
                style="letter-spacing:0.08em;font-size:0.72rem!important">
                Contact
            </h2>
            <div class="d-flex align-items-center gap-3 py-2 border-bottom">
                <span class="text-muted" style="width:20px">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"/>
                    </svg>
                </span>
                <div>
                    <div class="small text-muted">Email</div>
                    <div class="fw-medium">{data.person?.email ?? data.user?.email ?? '-'}</div>
                </div>
            </div>
            <div class="d-flex align-items-center gap-3 py-2">
                <span class="text-muted" style="width:20px">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                    </svg>
                </span>
                <div>
                    <div class="small text-muted">Role</div>
                    <div class="fw-medium text-capitalize">{data.person?.role ?? '-'}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Account info -->
    <div class="card mb-3">
        <div class="card-body">
            <h2 class="fs-6 fw-semibold text-muted text-uppercase mb-3"
                style="letter-spacing:0.08em;font-size:0.72rem!important">
                Account
            </h2>
            <div class="py-2 border-bottom">
                <div class="small text-muted mb-1">Person ID</div>
                <div class="fw-medium text-break small font-monospace">{data.person?.id ?? '-'}</div>
            </div>
            <div class="py-2 border-bottom">
                <div class="small text-muted mb-1">Auth User ID</div>
                <div class="fw-medium text-break small font-monospace">{data.user?.id ?? '-'}</div>
            </div>
            <div class="py-2 border-bottom">
                <div class="small text-muted mb-1">Linked User ID</div>
                <div class="fw-medium text-break small font-monospace">{data.person?.userId ?? '-'}</div>
            </div>
            <div class="py-2 border-bottom">
                <div class="small text-muted mb-1">Member since</div>
                <div class="fw-medium">{formatDate(data.person?.createdAt)}</div>
            </div>
            <div class="py-2">
                <div class="small text-muted mb-1">Last updated</div>
                <div class="fw-medium">{formatDate(data.person?.updatedAt)}</div>
            </div>
        </div>
    </div>

    <!-- Classes -->
    {#if data.classesPreview && data.classesPreview.length > 0}
        <div class="card mb-3">
            <div class="card-body">
                <h2 class="fs-6 fw-semibold text-muted text-uppercase mb-3"
                    style="letter-spacing:0.08em;font-size:0.72rem!important">
                    My Classes
                </h2>
                <div class="row row-cols-2 g-2">
                    {#each data.classesPreview as cls}
                        <div class="col">
                            <a href={`/dashboard/class/${cls.id}`} class="text-decoration-none">
                                <div class="card text-center py-3 h-100">
                                    <div class="fw-bold">{cls.title}</div>
                                </div>
                            </a>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

</div>
