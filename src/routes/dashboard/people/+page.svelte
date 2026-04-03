<script lang="ts">
    import { onMount } from "svelte";

    let { data, form } = $props();
    const roles = ["admin", "teacher", "student"];
    let editModalEl = $state<HTMLDivElement | null>(null);
    let editModal: any = $state(null);
    let copiedId = $state("");

    function listUrl(nextOffset: number) {
        const params = new URLSearchParams();
        if (data.search) params.set("search", data.search);
        params.set("limit", String(data.limit));
        params.set("offset", String(Math.max(0, nextOffset)));
        return `/dashboard/people?${params.toString()}`;
    }

    async function copyPersonId(id: string) {
        await navigator.clipboard.writeText(id);
        copiedId = id;
    }

    onMount(async () => {
        if (!editModalEl) return;

        // @ts-ignore
        const { default: Modal } = await import("bootstrap/js/dist/modal");
        editModal = new Modal(editModalEl);
        if (data.editingPerson) {
            editModal.show();
        }

        const onHidden = () => {
            window.location.assign(listUrl(data.offset));
        };

        editModalEl.addEventListener("hidden.bs.modal", onHidden, {
            once: true,
        });
    });
</script>

<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>People</h2>
    <button
        class="btn btn-primary"
        type="button"
        data-bs-toggle="modal"
        data-bs-target="#createPersonModal">Create person</button
    >
</div>

<form method="GET" class="row g-3 mb-3">
    <div class="col-12 col-md-6 col-lg-7">
        <label class="form-label" for="search">Search</label>
        <input
            class="form-control"
            id="search"
            name="search"
            placeholder="Name, email, ID number, phone, role"
            value={data.search}
        />
    </div>
    <div class="col-12 col-md-3 col-lg-2">
        <label class="form-label" for="limit">Limit</label>
        <select class="form-select" id="limit" name="limit">
            <option value="10" selected={data.limit === 10}>10</option>
            <option value="20" selected={data.limit === 20}>20</option>
            <option value="50" selected={data.limit === 50}>50</option>
            <option value="100" selected={data.limit === 100}>100</option>
        </select>
    </div>
    <input type="hidden" name="offset" value="0" />
    <div class="col-12 col-md-3 col-lg-3 d-flex align-items-end gap-2">
        <button class="btn btn-dark" type="submit">Apply</button>
        <a class="btn btn-outline-secondary" href="/dashboard/people">Reset</a>
    </div>
</form>

{#if form?.message}
    <div class="alert alert-danger" role="alert">{form.message}</div>
{/if}

<div class="d-flex justify-content-between align-items-center mb-2">
    <div class="text-body-secondary">
        Showing {Math.min(data.offset + 1, data.total)}-{Math.min(data.offset + data.people.length, data.total)} of {data.total}
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
    <table class="table table-striped align-middle mb-0">
        <thead>
            <tr>
                <th scope="col">Person ID</th>
                <th scope="col">Name</th>
                <th scope="col">First name</th>
                <th scope="col">Last name</th>
                <th scope="col">Full name</th>
                <th scope="col">Email</th>
                <th scope="col">ID number</th>
                <th scope="col">Phone</th>
                <th scope="col">Mobile</th>
                <th scope="col">Address</th>
                <th scope="col">Role</th>
                <th scope="col">User ID</th>
                <th scope="col">Actions</th>
            </tr>
        </thead>
        <tbody>
            {#each data.people as person}
                <tr>
                    <td>
                        <button
                            class="btn btn-sm btn-outline-secondary"
                            type="button"
                            onclick={() => copyPersonId(person.id)}
                        >
                            {copiedId === person.id ? "Copied" : "Copy ID"}
                        </button>
                    </td>
                    <td>{person.name ?? ""}</td>
                    <td>{person.firstName ?? ""}</td>
                    <td>{person.lastName ?? ""}</td>
                    <td>{person.fullname ?? ""}</td>
                    <td>{person.email ?? ""}</td>
                    <td>{person.idnumber ?? ""}</td>
                    <td>{person.phone ?? ""}</td>
                    <td>{person.mobilePhone ?? ""}</td>
                    <td>{person.address ?? ""}</td>
                    <td>{person.role}</td>
                    <td class="text-break">{person.userId ?? ""}</td>
                    <td>
                        <div class="d-flex gap-2">
                            <a
                                class="btn btn-sm btn-outline-secondary"
                                href={`/dashboard/people?edit=${person.id}`}
                                onclick={() => {
                                    data.editingPerson = person;
                                    editModal?.show();
                                }}>Edit</a
                            >
                            <form
                                method="POST"
                                action="?/delete"
                                onsubmit={(event) => {
                                    event.preventDefault();
                                    if (confirm("Delete this person?")) {
                                        event.currentTarget.submit();
                                    }
                                }}
                            >
                                <input
                                    type="hidden"
                                    name="id"
                                    value={person.id}
                                />
                                <button
                                    class="btn btn-sm btn-outline-danger"
                                    type="submit">Delete</button
                                >
                            </form>
                        </div>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<div
    class="modal fade"
    id="createPersonModal"
    tabindex="-1"
    aria-labelledby="createPersonModalLabel"
    aria-hidden="true"
>
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <form method="POST" action="?/create">
                <div class="modal-header">
                    <h2 class="modal-title h5" id="createPersonModalLabel">
                        Create person
                    </h2>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body">
                    {#if form?.message}
                        <div class="alert alert-danger" role="alert">
                            {form.message}
                        </div>
                    {/if}
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label" for="name">Name</label>
                            <input class="form-control" id="name" name="name" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="fullname"
                                >Full name</label
                            >
                            <input
                                class="form-control"
                                id="fullname"
                                name="fullname"
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="firstName"
                                >First name</label
                            >
                            <input
                                class="form-control"
                                id="firstName"
                                name="firstName"
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="lastName"
                                >Last name</label
                            >
                            <input
                                class="form-control"
                                id="lastName"
                                name="lastName"
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="email">Email</label>
                            <input
                                class="form-control"
                                id="email"
                                name="email"
                                type="email"
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="idnumber"
                                >ID number</label
                            >
                            <input
                                class="form-control"
                                id="idnumber"
                                name="idnumber"
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="phone">Phone</label>
                            <input class="form-control" id="phone" name="phone" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="mobilePhone"
                                >Mobile phone</label
                            >
                            <input
                                class="form-control"
                                id="mobilePhone"
                                name="mobilePhone"
                            />
                        </div>
                        <div class="col-md-8">
                            <label class="form-label" for="address">Address</label>
                            <input class="form-control" id="address" name="address" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="role">Role</label>
                            <select
                                class="form-select"
                                id="role"
                                name="role"
                                required
                            >
                                <option value="">Choose</option>
                                {#each roles as role}
                                    <option value={role}>{role}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="col-md-8">
                            <label class="form-label" for="userId"
                                >User ID</label
                            >
                            <input
                                class="form-control"
                                id="userId"
                                name="userId"
                            />
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" type="submit">Create</button
                    >
                </div>
            </form>
        </div>
    </div>
</div>

<div
    class="modal fade"
    id="editPersonModal"
    tabindex="-1"
    aria-labelledby="editPersonModalLabel"
    aria-hidden="true"
    bind:this={editModalEl}
>
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <form method="POST" action="?/update">
                <input type="hidden" name="id" value={data.editingPerson?.id} />
                <div class="modal-header">
                    <h2 class="modal-title h5" id="editPersonModalLabel">
                        Edit person
                    </h2>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body">
                    {#if form?.message}
                        <div class="alert alert-danger" role="alert">
                            {form.message}
                        </div>
                    {/if}
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label" for="edit-name"
                                >Name</label
                            >
                            <input
                                class="form-control"
                                id="edit-name"
                                name="name"
                                value={data.editingPerson?.name ?? ""}
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="edit-fullname"
                                >Full name</label
                            >
                            <input
                                class="form-control"
                                id="edit-fullname"
                                name="fullname"
                                value={data.editingPerson?.fullname ?? ""}
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="edit-firstName"
                                >First name</label
                            >
                            <input
                                class="form-control"
                                id="edit-firstName"
                                name="firstName"
                                value={data.editingPerson?.firstName ?? ""}
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="edit-lastName"
                                >Last name</label
                            >
                            <input
                                class="form-control"
                                id="edit-lastName"
                                name="lastName"
                                value={data.editingPerson?.lastName ?? ""}
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="edit-email"
                                >Email</label
                            >
                            <input
                                class="form-control"
                                id="edit-email"
                                name="email"
                                type="email"
                                value={data.editingPerson?.email ?? ""}
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="edit-idnumber"
                                >ID number</label
                            >
                            <input
                                class="form-control"
                                id="edit-idnumber"
                                name="idnumber"
                                value={data.editingPerson?.idnumber ?? ""}
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="edit-phone"
                                >Phone</label
                            >
                            <input
                                class="form-control"
                                id="edit-phone"
                                name="phone"
                                value={data.editingPerson?.phone ?? ""}
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="edit-mobilePhone"
                                >Mobile phone</label
                            >
                            <input
                                class="form-control"
                                id="edit-mobilePhone"
                                name="mobilePhone"
                                value={data.editingPerson?.mobilePhone ?? ""}
                            />
                        </div>
                        <div class="col-md-8">
                            <label class="form-label" for="edit-address"
                                >Address</label
                            >
                            <input
                                class="form-control"
                                id="edit-address"
                                name="address"
                                value={data.editingPerson?.address ?? ""}
                            />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label" for="edit-role"
                                >Role</label
                            >
                            <select
                                class="form-select"
                                id="edit-role"
                                name="role"
                                required
                            >
                                {#each roles as role}
                                    <option
                                        value={role}
                                        selected={data.editingPerson?.role ===
                                            role}>{role}</option
                                    >
                                {/each}
                            </select>
                        </div>
                        <div class="col-md-8">
                            <label class="form-label" for="edit-userId"
                                >User ID</label
                            >
                            <input
                                class="form-control"
                                id="edit-userId"
                                name="userId"
                                value={data.editingPerson?.userId ?? ""}
                            />
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-warning" type="submit">Update</button
                    >
                </div>
            </form>
        </div>
    </div>
</div>
