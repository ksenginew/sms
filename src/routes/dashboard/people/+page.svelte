<script lang="ts">
    import { onMount } from "svelte";
    import { Html5QrcodeScanner } from "html5-qrcode";

    let { data, form } = $props();
    const roles = ["admin", "teacher", "student"];
    const scannerConfig = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
    };
    let createModalEl = $state<HTMLDivElement | null>(null);
    let editModalEl = $state<HTMLDivElement | null>(null);
    let qrScannerModalEl = $state<HTMLDivElement | null>(null);
    let createUserIdInput = $state<HTMLInputElement | null>(null);
    let editUserIdInput = $state<HTMLInputElement | null>(null);
    let editModal: any = $state(null);
    let qrScannerModal: any = $state(null);
    let qrScanner: Html5QrcodeScanner | null = null;
    let activeUserIdInput = $state<HTMLInputElement | null>(null);
    let activeUserIdLabel = $state("user ID");
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

    function setUserIdInput(input: HTMLInputElement | null, value: string) {
        if (!input) return;

        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function openQrScanner(input: HTMLInputElement | null, label: string) {
        activeUserIdInput = input;
        activeUserIdLabel = label;
        qrScannerModal?.show();
    }

    async function stopScanner(
        scanner: Html5QrcodeScanner | null,
        setScanner: (scanner: Html5QrcodeScanner | null) => void,
    ) {
        if (!scanner) return;

        try {
            await scanner.clear();
        } finally {
            setScanner(null);
        }
    }

    onMount(async () => {
        const cleanup: Array<() => void> = [];

        if (qrScannerModalEl) {
            const onScannerShown = () => {
                if (!activeUserIdInput) return;

                const reader = document.getElementById("qr-scanner-reader");
                if (!reader || reader.childElementCount) return;

                const scanner = new Html5QrcodeScanner("qr-scanner-reader", scannerConfig, false);
                qrScanner = scanner;

                scanner.render(
                    async (decodedText) => {
                        setUserIdInput(activeUserIdInput, decodedText);

                        try {
                            await scanner.clear();
                        } finally {
                            qrScanner = null;
                            qrScannerModal?.hide();
                        }
                    },
                    () => {
                        // Keep scanning until a QR code is decoded.
                    },
                );
            };

            const onScannerHidden = async () => {
                await stopScanner(qrScanner, (scanner) => {
                    qrScanner = scanner;
                });
                activeUserIdInput = null;
            };

            qrScannerModalEl.addEventListener("shown.bs.modal", onScannerShown);
            qrScannerModalEl.addEventListener("hidden.bs.modal", onScannerHidden);
            cleanup.push(() => {
                qrScannerModalEl?.removeEventListener("shown.bs.modal", onScannerShown);
                qrScannerModalEl?.removeEventListener("hidden.bs.modal", onScannerHidden);
            });

            // @ts-ignore
            const { default: Modal } = await import("bootstrap/js/dist/modal");
            qrScannerModal = new Modal(qrScannerModalEl);
        }

        if (editModalEl) {
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

            cleanup.push(() => {
                editModalEl?.removeEventListener("hidden.bs.modal", onHidden);
            });
        }
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

<form method="GET" class="row g-3 mb-4">
    <div class="col-12 col-lg-7">
        <div class="d-flex align-items-center gap-2">
            <label class="form-label mb-0 text-nowrap" for="search">Search</label>
            <input
                class="form-control"
                id="search"
                type="search"
                name="search"
                placeholder="Name, email, ID number, phone, role"
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
                <th scope="col">Email</th>
                <th scope="col">Index</th>
                <th scope="col">Phone</th>
                <th scope="col">Mobile</th>
                <th scope="col">Address</th>
                <th scope="col">Role</th>
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
                    <td>{person.email ?? ""}</td>
                    <td>{person.idnumber ?? ""}</td>
                    <td>{person.phone ?? ""}</td>
                    <td>{person.mobilePhone ?? ""}</td>
                    <td>{person.address ?? ""}</td>
                    <td>{person.role}</td>
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
    bind:this={createModalEl}
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
                            <div class="d-flex flex-column gap-2">
                                <input
                                    class="form-control"
                                    id="userId"
                                    name="userId"
                                    bind:this={createUserIdInput}
                                />
                                <button
                                    class="btn btn-sm btn-outline-primary align-self-start"
                                    type="button"
                                    onclick={() => openQrScanner(createUserIdInput, "create person user ID")}
                                >
                                    Scan QR code
                                </button>
                            </div>
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
                            <div class="d-flex flex-column gap-2">
                                <input
                                    class="form-control"
                                    id="edit-userId"
                                    name="userId"
                                    value={data.editingPerson?.userId ?? ""}
                                    bind:this={editUserIdInput}
                                />
                                <button
                                    class="btn btn-sm btn-outline-primary align-self-start"
                                    type="button"
                                    onclick={() => openQrScanner(editUserIdInput, "edit person user ID")}
                                >
                                    Scan QR code
                                </button>
                            </div>
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

<div
    class="modal fade"
    id="qrScannerModal"
    tabindex="-1"
    aria-labelledby="qrScannerModalLabel"
    aria-hidden="true"
    bind:this={qrScannerModalEl}
>
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h2 class="modal-title h5 mb-0" id="qrScannerModalLabel">
                        Scan QR code
                    </h2>
                    <div class="text-body-secondary small">
                        Result will fill the {activeUserIdLabel} field.
                    </div>
                </div>
                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                ></button>
            </div>
            <div class="modal-body">
                <div
                    id="qr-scanner-reader"
                    class="mx-auto w-100 border rounded-3 bg-body-tertiary p-2"
                ></div>
            </div>
        </div>
    </div>
</div>
