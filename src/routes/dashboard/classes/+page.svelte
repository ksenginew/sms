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
        if (data.showHidden) params.set("showHidden", "1");
        const query = params.toString();
        return `/dashboard/classes/${classId}${query ? `?${query}` : ""}`;
    }
</script>

<div
    class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3"
>
    <h2 class="mb-1">Classes</h2>
    {#if data.person?.role === "admin"}
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
    <div class="col-12 col-md-6 col-lg-2 d-flex align-items-center">
        <div class="form-check">
            <input
                class="form-check-input"
                id="showHidden"
                type="checkbox"
                name="showHidden"
                value="1"
                checked={data.showHidden}
            />
            <label class="form-check-label" for="showHidden">Show hidden</label>
        </div>
    </div>
    <div class="col-12 col-md-6 col-lg-2 d-flex align-items-end gap-2">
        <button class="btn btn-dark w-100" type="submit">Apply</button>
        <a class="btn btn-outline-secondary" href="/dashboard/classes">Reset</a>
    </div>
</form>

{#if form?.message}
    <div class="alert alert-danger mb-3">{form.message}</div>
{/if}

<div class="row g-3 mb-4">
    {#each data.classesList as classItem}
        <div class="col-md-6 col-xl-4">
            <div class="card h-100">
                <div class="card-body d-flex flex-column">
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
                    <div class="mt-auto">
                        <a
                            href={classLink(classItem.id)}
                            class="btn btn-outline-primary btn-sm w-100"
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

{#if data.person?.role === "admin"}
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
