<script lang="ts">
    let { data, form } = $props();

    function formatDate(value: unknown) {
        if (!value) return "-";
        const date = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(date.getTime())) return "-";
        return date.toLocaleDateString();
    }

    function classLink(classId: string) {
        const params = new URLSearchParams();
        if (data.search) params.set("search", data.search);
        params.set("limit", String(data.limit));
        params.set("offset", String(data.offset));
        const query = params.toString();
        return `/dashboard/classes/${classId}${query ? `?${query}` : ""}`;
    }

    function listUrl(nextOffset: number) {
        const params = new URLSearchParams();
        if (data.search) params.set("search", data.search);
        params.set("limit", String(data.limit));
        params.set("offset", String(Math.max(0, nextOffset)));
        return `/dashboard/classes?${params.toString()}`;
    }
</script>

<div
    class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3"
>
    <h2 class="mb-1">Classes</h2>
    {#if data.isAdmin}
        <button
            class="btn btn-primary"
            type="button"
            data-bs-toggle="modal"
            data-bs-target="#createClassModal">Create class</button
        >
    {/if}
</div>

<form method="GET" class="row g-3 mb-4">
    <div class="col-12 col-lg-8">
        <label class="visually-hidden" for="search">Search</label>
        <div class="input-group">
            <input
                class="form-control"
                id="search"
                type="search"
                name="search"
                placeholder="Search by class title or description"
                value={data.search}
            />
            <button class="btn btn-outline-secondary" type="submit">Find</button
            >
        </div>
    </div>
    <div class="col-12 col-md-6 col-lg-2">
        <label class="form-label" for="limit">Limit</label>
        <select class="form-select" id="limit" name="limit">
            <option value="10" selected={data.limit === 10}>10</option>
            <option value="20" selected={data.limit === 20}>20</option>
            <option value="50" selected={data.limit === 50}>50</option>
            <option value="100" selected={data.limit === 100}>100</option>
        </select>
    </div>
    <input type="hidden" name="offset" value="0" />
    <div class="col-12 col-md-6 col-lg-2 d-flex align-items-end gap-2">
        <button class="btn btn-dark w-100" type="submit">Apply</button>
        <a class="btn btn-outline-secondary" href="/dashboard/classes">Reset</a>
    </div>
</form>

<div class="d-flex justify-content-between align-items-center mb-2">
    <div class="text-body-secondary">
        Showing {Math.min(data.offset + 1, data.total)}-{Math.min(data.offset + data.classesList.length, data.total)} of {data.total}
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

{#if form?.message}
    <div class="alert alert-danger mb-3">{form.message}</div>
{/if}

<div class="row g-3 mb-4">
    {#each data.classesList as classItem}
        <div class="col-md-6 col-xl-4">
            <div class="card h-100">
                <div class="card-body d-flex flex-column position-relative">
                    <div
                        class="d-flex justify-content-between align-items-start mb-2 gap-2"
                    >
                        <h3 class="h6 mb-0 text-truncate">{classItem.title}</h3>
                        <span
                            class="badge {classItem.visible
                                ? 'text-bg-success'
                                : 'text-bg-secondary'}"
                            >{classItem.visible ? "Visible" : "Hidden"}</span
                        >
                    </div>
                    <p class="text-body-secondary mb-3">
                        {classItem.description ?? "No description"}
                    </p>
                    <div class="small text-body-secondary mb-3">
                        Updated {formatDate(classItem.updatedAt)}
                    </div>
                    <div class="mt-auto d-flex justify-content-end">
                        <a
                            href={classLink(classItem.id)}
                            class="stretched-link text-decoration-none small fw-semibold"
                            >Open class</a
                        >
                    </div>
                </div>
            </div>
        </div>
    {:else}
        <div class="col-12">
            <div class="alert alert-info mb-0">No classes found.</div>
        </div>
    {/each}
</div>

{#if data.isAdmin}
    <div
        class="modal fade"
        id="createClassModal"
        tabindex="-1"
        aria-labelledby="createClassModalLabel"
        aria-hidden="true"
    >
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
                <form method="POST" action="?/create">
                    <div class="modal-header">
                        <h2 class="modal-title h5" id="createClassModalLabel">
                            Create class
                        </h2>
                        <button
                            type="button"
                            class="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        ></button>
                    </div>
                    <div class="modal-body">
                        {#if form?.action === "create" && form?.message}
                            <div class="alert alert-danger">{form.message}</div>
                        {/if}
                        <div class="row g-3">
                            <div class="col-md-5">
                                <label class="form-label" for="title"
                                    >Title</label
                                >
                                <input
                                    class="form-control"
                                    id="title"
                                    name="title"
                                    required
                                />
                            </div>
                            <div class="col-md-5">
                                <label class="form-label" for="description"
                                    >Description</label
                                >
                                <input
                                    class="form-control"
                                    id="description"
                                    name="description"
                                />
                            </div>
                            <div class="col-md-2 d-flex align-items-end">
                                <div class="form-check mb-2">
                                    <input
                                        class="form-check-input"
                                        id="visible"
                                        name="visible"
                                        type="checkbox"
                                        checked
                                    />
                                    <label
                                        class="form-check-label"
                                        for="visible">Visible</label
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" type="submit"
                            >Create</button
                        >
                    </div>
                </form>
            </div>
        </div>
    </div>
{/if}
