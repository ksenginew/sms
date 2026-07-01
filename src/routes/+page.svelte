<svelte:head>
    <title>Eduscend | Home</title>
    <meta
        name="description"
        content="Eduscend helps schools manage people, classes, attendance, and exams in one place."
    />
</svelte:head>

<section class="hero bg-primary text-white py-5 py-md-5">
    <div class="hero-shape shape-1"></div>
    <div class="hero-shape shape-2"></div>
    <div class="hero-shape ring shape-3 d-none d-sm-block"></div>
    <div class="hero-shape square shape-4 d-none d-md-block"></div>
    <div class="hero-shape shape-5 d-none d-sm-block"></div>

    <div class="container py-4 py-md-5">
        <div class="row justify-content-center">
            <div class="col-12 col-lg-9 col-xl-7 text-center">
                <span
                    class="badge rounded-pill bg-white text-primary px-3 py-2 mb-4 fw-semibold"
                >
                    School management made simple
                </span>
                <h1 class="fw-bold mb-3 hero-heading">
                    One dashboard for people, classes, attendance, and exams.
                </h1>
                <p
                    class="lead mb-4 mx-auto opacity-75"
                    style="max-width: 620px;"
                >
                    Eduscend keeps every part of daily school life &mdash; from
                    student records to results &mdash; in one clean, connected
                    place.
                </p>
                <div
                    class="d-flex flex-column flex-sm-row gap-3 justify-content-center"
                >
                    <a
                        href="/auth/signin"
                        class="btn btn-light btn-lg px-4 fw-semibold">Sign in</a
                    >
                    <a
                        href="/dashboard"
                        class="btn btn-outline-light btn-lg px-4"
                        >Open dashboard</a
                    >
                </div>
            </div>
        </div>
    </div>
</section>

<section class="py-5 py-md-5 bg-body-tertiary">
    <div class="container py-3">
        <div class="row justify-content-center mb-4 mb-md-5">
            <div class="col-12 col-lg-8 text-center">
                <h2 class="h3 fw-bold mb-2">Everything a school runs on</h2>
                <p class="text-body-secondary mb-0">
                    Four core tools, built to work together and to stand on
                    their own.
                </p>
            </div>
        </div>

        <div class="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-4">
            <div class="col">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body p-4">
                        <div
                            class="icon-tile rounded-3 bg-primary-subtle text-primary mb-3"
                        >
                            <i class="bi bi-people-fill"></i>
                        </div>
                        <h3 class="h5 fw-bold">User data</h3>
                        <p class="text-body-secondary mb-0">
                            Manage student, teacher, and staff records in one
                            secure, organized directory.
                        </p>
                    </div>
                </div>
            </div>

            <div class="col">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body p-4">
                        <div
                            class="icon-tile rounded-3 bg-primary-subtle text-primary mb-3"
                        >
                            <i class="bi bi-journal-bookmark-fill"></i>
                        </div>
                        <h3 class="h5 fw-bold">Classes</h3>
                        <p class="text-body-secondary mb-0">
                            Keep rosters, schedules, and related class records
                            organized and easy to find.
                        </p>
                    </div>
                </div>
            </div>

            <div class="col">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body p-4">
                        <div
                            class="icon-tile rounded-3 bg-primary-subtle text-primary mb-3"
                        >
                            <i class="bi bi-calendar2-check-fill"></i>
                        </div>
                        <h3 class="h5 fw-bold">Attendance</h3>
                        <p class="text-body-secondary mb-0">
                            View daily status, summaries, and class breakdowns
                            at a glance.
                        </p>
                    </div>
                </div>
            </div>

            <div class="col">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body p-4">
                        <div
                            class="icon-tile rounded-3 bg-primary-subtle text-primary mb-3"
                        >
                            <i class="bi bi-clipboard2-data-fill"></i>
                        </div>
                        <h3 class="h5 fw-bold">Exams</h3>
                        <p class="text-body-secondary mb-0">
                            Track exam updates and results without digging
                            through separate pages.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<footer class="bg-primary-subtle py-4">
    <div class="container text-center">
        <p class="mb-0 text-body-secondary small">
            Eduscend &middot; built for schools &middot;
            <a href="/auth/signin" class="link-primary text-decoration-none"
                >Sign in to get started</a
            >
        </p>
    </div>
</footer>

<style>
    :root {
        --hero-shape: rgba(255, 255, 255, 0.14);
        --hero-shape-2: rgba(255, 255, 255, 0.09);
    }

    .hero {
        position: relative;
        overflow: hidden;
        isolation: isolate;
    }

    .hero-shape {
        position: absolute;
        border-radius: 50%;
        background: var(--hero-shape);
        z-index: -1;
    }
    .hero-shape.square {
        border-radius: 1rem;
    }
    .hero-shape.ring {
        background: transparent;
        border: 2px solid var(--hero-shape-2);
    }

    .shape-1 {
        width: 260px;
        height: 260px;
        top: -80px;
        left: -60px;
    }
    .shape-2 {
        width: 140px;
        height: 140px;
        bottom: -40px;
        right: 8%;
        background: var(--hero-shape-2);
    }
    .shape-3 {
        width: 90px;
        height: 90px;
        top: 20%;
        right: 6%;
        transform: rotate(20deg);
    }
    .shape-4 {
        width: 180px;
        height: 180px;
        bottom: 12%;
        left: 4%;
    }
    .shape-5 {
        width: 60px;
        height: 60px;
        top: 12%;
        left: 14%;
    }

    @media (max-width: 575.98px) {
        .hero-shape {
            display: none;
        }
        .hero-shape.shape-1 {
            display: block;
            width: 160px;
            height: 160px;
            top: -60px;
            left: -50px;
        }
        .hero-shape.shape-2 {
            display: block;
            width: 90px;
            height: 90px;
            bottom: -30px;
            right: -20px;
        }
    }

    .icon-tile {
        width: 3rem;
        height: 3rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.35rem;
    }

    .hero-heading {
        font-size: clamp(1.75rem, 5vw, 3rem);
    }
</style>
