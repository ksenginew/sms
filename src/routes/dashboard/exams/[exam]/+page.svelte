<script lang="ts">
  let { data, form } = $props();

  function getClassesForGrade(grade: string) {
    if (!grade) return [];
    return data.allClasses.filter(
      (cls: any) => cls.tags && cls.tags.includes(grade),
    );
  }

  function getInitialSelectedGrade() {
    for (const classId of data.selectedClassIds) {
      const classItem = data.allClasses.find((cls: any) => cls.id === classId);
      const grade = classItem?.tags?.find((tag: string) =>
        tag.startsWith("grade-"),
      );
      if (grade) return grade;
    }

    return (
      data.exam.tags?.find((tag: string) => tag.startsWith("grade-")) ?? ""
    );
  }

  function getInitialSelectedClassIds(grade: string) {
    return [...data.selectedClassIds];
  }

  const initialSelectedGrade = getInitialSelectedGrade();
  let selectedGrade = $state(initialSelectedGrade);
  let selectedClassIds = $state<string[]>(
    getInitialSelectedClassIds(initialSelectedGrade),
  );
  let editFormToSubmit = $state<HTMLFormElement | null>(null);
  let deleteFormToSubmit = $state<HTMLFormElement | null>(null);
  let createPaperFormToSubmit = $state<HTMLFormElement | null>(null);

  function formatDate(value: unknown) {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  }

  function handleGradeChange(event: Event) {
    selectedGrade = (event.currentTarget as HTMLSelectElement).value;
  }

  function handleEditSubmit(event: Event) {
    event.preventDefault();
    editFormToSubmit = event.target as HTMLFormElement;

    // @ts-ignore
    import("bootstrap/dist/js/bootstrap.bundle.min.js").then(
      ({ Modal }: any) => {
        const modalEl = document.getElementById("confirmEditExamModal");
        if (modalEl) {
          const modal = new Modal(modalEl);
          modal.show();
        }
      },
    );
  }

  function confirmEdit() {
    if (editFormToSubmit) {
      editFormToSubmit.submit();
    }
  }

  function handleDeleteClick() {
    // @ts-ignore
    import("bootstrap/dist/js/bootstrap.bundle.min.js").then(
      ({ Modal }: any) => {
        const modalEl = document.getElementById("confirmDeleteExamModal");
        if (modalEl) {
          const modal = new Modal(modalEl);
          modal.show();
        }
      },
    );
  }

  function confirmDelete() {
    if (deleteFormToSubmit) {
      deleteFormToSubmit.submit();
    }
  }

  function handleCreatePaperClick() {
    // @ts-ignore
    import("bootstrap/dist/js/bootstrap.bundle.min.js").then(
      ({ Modal }: any) => {
        const modalEl = document.getElementById("createPaperModal");
        if (modalEl) {
          const modal = new Modal(modalEl);
          modal.show();
        }
      },
    );
  }

  function handleCreatePaperSubmit(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    form.submit();
  }
</script>

<div
  class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-3"
>
  <div>
    <h2 class="mb-1">{data.exam.title}</h2>
    <p class="text-body-secondary mb-0">
      {data.exam.description ?? "No description available."}
    </p>
  </div>
  <div class="d-flex gap-2 align-items-start">
    <span
      class="badge {data.exam.visible
        ? 'text-bg-success'
        : 'text-bg-secondary'}"
    >
      {data.exam.visible ? "Visible" : "Hidden"}
    </span>
    {#if data.isAdmin}
      <button
        class="btn btn-sm btn-outline-primary"
        type="button"
        data-bs-toggle="modal"
        data-bs-target="#editExamModal">Edit</button
      >
      <button
        class="btn btn-sm btn-outline-danger"
        type="button"
        onclick={handleDeleteClick}>Delete</button
      >
    {/if}
  </div>
</div>

<div class="d-flex justify-content-between align-items-center mb-3">
  <h3 class="h5 mb-0">Papers</h3>
  <span class="badge text-bg-primary">{data.papers.length} total</span>
</div>

<div class="row g-3">
  {#if data.isAdmin}
    <div class="col-12 col-md-6 col-xl-4">
      <div class="card h-100">
        <div class="card-body d-flex flex-column position-relative">
          <button
            class="btn btn-link d-flex flex-column align-items-center justify-content-center h-100"
            style="cursor: pointer; min-height: 200px; text-decoration: none;"
            type="button"
            onclick={handleCreatePaperClick}
          >
            <div class="text-center">
              <div class="mb-2" style="font-size: 2rem;">+</div>
              <div class="text-body-secondary small">Add new paper</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  {/if}
  {#each data.papers as paper}
    <div class="col-12 col-md-6 col-xl-4">
      <div class="card h-100">
        <div class="card-body d-flex flex-column position-relative">
          <div
            class="d-flex justify-content-between align-items-start gap-2 mb-2"
          >
            <h4 class="h6 mb-0 text-truncate">
              {paper.title ?? "Untitled paper"}
            </h4>
            <span class="badge text-bg-light border"
              >{paper.subjectTitle ?? paper.subjectId}</span
            >
          </div>
          <p class="text-body-secondary mb-3">
            {paper.description ?? "No description"}
          </p>
          <div class="small text-body-secondary">
            Created {formatDate(paper.createdAt)}
          </div>
          <div class="mt-auto d-flex justify-content-end">
            <a
              class="stretched-link text-decoration-none small fw-semibold"
              href="/dashboard/exams/papers"
            >
              Open paper
            </a>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="col-12">
      <div class="alert alert-info mb-0">No papers found for this exam.</div>
    </div>
  {/each}
</div>

<!-- Edit Exam Modal -->
{#if data.isAdmin}
  <div
    class="modal fade"
    id="editExamModal"
    tabindex="-1"
    aria-labelledby="editExamModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <form method="POST" action="?/edit" onsubmit={handleEditSubmit}>
          <div class="modal-header">
            <h2 class="modal-title h5" id="editExamModalLabel">Edit exam</h2>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            {#if form?.action === "edit" && form?.message}
              <div class="alert alert-danger" role="alert">
                {form.message}
              </div>
            {/if}
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label" for="edit-title">Title</label>
                <input
                  class="form-control"
                  id="edit-title"
                  name="title"
                  value={data.exam.title}
                  required
                />
              </div>
              <div class="col-md-6">
                <label class="form-label" for="edit-tags">Tags</label>
                <input
                  class="form-control"
                  id="edit-tags"
                  name="tags"
                  placeholder="math, midterm, grade-10"
                  value={data.exam.tags?.join(", ") ?? ""}
                />
              </div>
              <div class="col-12">
                <label class="form-label" for="edit-description"
                  >Description</label
                >
                <textarea
                  class="form-control"
                  id="edit-description"
                  name="description"
                  rows="4">{data.exam.description ?? ""}</textarea
                >
              </div>
              <div class="col-12">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    id="edit-visible"
                    name="visible"
                    type="checkbox"
                    checked={data.exam.visible}
                  />
                  <label class="form-check-label" for="edit-visible"
                    >Visible</label
                  >
                </div>
              </div>
              <div class="col-12">
                <label class="form-label" for="edit-gradeFilter"
                  >Filter classes by grade</label
                >
                <select
                  class="form-select"
                  id="edit-gradeFilter"
                  value={selectedGrade}
                  onchange={handleGradeChange}
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
                            id="edit-class-{classItem.id}"
                            name="selectedClasses"
                            value={classItem.id}
                            type="checkbox"
                            bind:group={selectedClassIds}
                          />
                          <label
                            class="form-check-label"
                            for="edit-class-{classItem.id}"
                          >
                            {classItem.title}
                          </label>
                        </div>
                      </div>
                    {:else}
                      <div class="col-12">
                        <div class="text-body-secondary small">
                          {selectedGrade
                            ? `No classes found for ${selectedGrade}`
                            : "Select a grade to see classes"}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" type="submit">Update</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Edit Confirmation Modal -->
  <div
    class="modal fade"
    id="confirmEditExamModal"
    tabindex="-1"
    aria-labelledby="confirmEditExamModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title h6" id="confirmEditExamModalLabel">
            Confirm Edit
          </h2>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to update this exam?</p>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal">Cancel</button
          >
          <button type="button" class="btn btn-primary" onclick={confirmEdit}
            >Update Exam</button
          >
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div
    class="modal fade"
    id="confirmDeleteExamModal"
    tabindex="-1"
    aria-labelledby="confirmDeleteExamModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title h6" id="confirmDeleteExamModalLabel">
            Confirm Deletion
          </h2>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete this exam?</p>
          <p class="text-danger small mb-0">
            This action cannot be undone. All papers and scores associated with
            this exam will also be deleted.
          </p>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal">Cancel</button
          >
          <form
            method="POST"
            action="?/delete"
            bind:this={deleteFormToSubmit}
            class="d-inline"
          >
            <button type="button" class="btn btn-danger" onclick={confirmDelete}
              >Delete Exam</button
            >
          </form>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Create Paper Modal -->
{#if data.isAdmin}
  <div
    class="modal fade"
    id="createPaperModal"
    tabindex="-1"
    aria-labelledby="createPaperModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <form
          method="POST"
          action="?/createPaper"
          onsubmit={handleCreatePaperSubmit}
        >
          <div class="modal-header">
            <h2 class="modal-title h5" id="createPaperModalLabel">
              Create new paper
            </h2>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            {#if form?.action === "createPaper" && form?.message}
              <div class="alert alert-danger" role="alert">
                {form.message}
              </div>
            {/if}
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label" for="create-subject">Subject *</label>
                <select
                  class="form-select"
                  id="create-subject"
                  name="subjectId"
                  required
                >
                  <option value="">-- Select a subject --</option>
                  {#each data.allSubjects as subject}
                    <option value={subject.id}>{subject.title}</option>
                  {/each}
                </select>
              </div>
              <div class="col-12">
                <label class="form-label" for="create-paper-title">Title</label>
                <input
                  class="form-control"
                  id="create-paper-title"
                  name="title"
                  placeholder="e.g., Mathematics Exam"
                />
              </div>
              <div class="col-12">
                <label class="form-label" for="create-paper-description"
                  >Description</label
                >
                <textarea
                  class="form-control"
                  id="create-paper-description"
                  name="description"
                  rows="3"
                  placeholder="Add paper details..."
                ></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal">Cancel</button
            >
            <button type="submit" class="btn btn-primary">Create Paper</button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
