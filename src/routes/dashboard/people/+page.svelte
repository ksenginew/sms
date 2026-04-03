<script lang="ts">
    import { onMount } from "svelte";

    let { data, form } = $props();
    const roles = ["admin", "teacher", "student"];
    let editModalEl = $state<HTMLDivElement | null>(null);
    let editModal: any = $state(null);
    let copiedId = $state("");

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
            window.location.assign("/dashboard/people");
        };

        editModalEl.addEventListener("hidden.bs.modal", onHidden, {
            once: true,
        });
    });
</script>

<div class="row g-4">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <div
                    class="d-flex justify-content-between align-items-center mb-3"
                >
                    <h2 class="h6 mb-0">People</h2>
                    <button
                        class="btn btn-primary"
                        type="button"
                        data-bs-toggle="modal"
                        data-bs-target="#createPersonModal"
                        >Create person</button
                    >
                </div>
                {#if form?.message}
                    <div class="alert alert-danger">{form.message}</div>
                {/if}
                <div class="table-responsive">
                    <table class="table table-striped align-middle mb-0">
                        <thead>
                            <tr>
                                <th scope="col">Person ID</th>
                                <th scope="col">Name</th>
                                <th scope="col">Full name</th>
                                <th scope="col">Email</th>
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
                                            onclick={() =>
                                                copyPersonId(person.id)}
                                        >
                                            {copiedId === person.id
                                                ? "Copied"
                                                : "Copy ID"}
                                        </button>
                                    </td>
                                    <td>{person.name ?? ""}</td>
                                    <td>{person.fullname ?? ""}</td>
                                    <td>{person.email ?? ""}</td>
                                    <td>{person.role}</td>
                                    <td class="text-break"
                                        >{person.userId ?? ""}</td
                                    >
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
                                                    if (
                                                        confirm(
                                                            "Delete this person?",
                                                        )
                                                    ) {
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
            </div>
        </div>
    </div>
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
                            <label class="form-label" for="email">Email</label>
                            <input
                                class="form-control"
                                id="email"
                                name="email"
                                type="email"
                            />
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
