<script lang="ts">
	import { afterNavigate, beforeNavigate, goto } from "$app/navigation";
	import { page } from "$app/state";
	import { onMount } from "svelte";

	const appName = "Eduscend";
	const themeStorageKey = "eduscend-theme";
	const currentYear = new Date().getFullYear();

	type ThemeMode = "light" | "dark";
	type Role = "admin" | "teacher" | "student" | "external";
	type NavigationItem = { label: string; href: string; roles: Role[] };
	type SearchResultCard = {
		key: string;
		type: "people" | "classes" | "attendance" | "exams";
		title: string;
		subtitle: string;
		href: string;
	};

	const navigationItems: NavigationItem[] = [
		{
			label: "Home",
			href: "/dashboard",
			roles: ["admin", "teacher", "student", "external"],
		},
		{
			label: "Profile",
			href: "/dashboard/profile",
			roles: ["admin", "teacher", "student", "external"],
		},
		{
			label: "People",
			href: "/dashboard/people",
			roles: ["admin"],
		},
		{
			label: "Classes",
			href: "/dashboard/classes",
			roles: ["admin", "teacher", "student"],
		},
		{
			label: "Attendance",
			href: "/dashboard/attendance",
			roles: ["admin", "teacher", "student"],
		},
		{
			label: "Exams",
			href: "/dashboard/exams",
			roles: ["admin", "teacher", "student"],
		},
	];

	function titleize(segment: string) {
		return segment
			.split("-")
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(" ");
	}

	function buildBreadcrumb(pathname: string) {
		const segments = pathname.split("/").filter(Boolean);

		if (segments.length === 0) {
			return [{ label: "Home", href: "/dashboard", current: true }];
		}

		const items = [
			{
				label: "Home",
				href: "/dashboard",
				current: segments.length === 1,
			},
		];
		let currentPath = "";

		for (const segment of segments.slice(1)) {
			currentPath += `/${segment}`;
			items.push({
				label: titleize(segment),
				href: `/dashboard${currentPath}`,
				current: currentPath === `/${segments.slice(1).join("/")}`,
			});
		}

		return items;
	}

	function getActiveLabel(pathname: string) {
		const segments = pathname.split("/").filter(Boolean);
		if (segments.length <= 1) {
			return "Home";
		}

		return titleize(segments[segments.length - 1]);
	}

	function isNavActive(pathname: string, href: string) {
		if (href === "/dashboard") {
			return pathname === href;
		}

		return pathname === href || pathname.startsWith(`${href}/`);
	}

	function canAccess(item: NavigationItem) {
		const role = data?.person?.role ?? "external";
		return role ? item.roles.includes(role) : false;
	}

	function applyTheme(value: ThemeMode) {
		document.documentElement.setAttribute("data-bs-theme", value);
		theme = value;
	}

	function toggleTheme() {
		const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
		applyTheme(nextTheme);
		window.localStorage.setItem(themeStorageKey, nextTheme);
	}

	function resultTypeLabel(type: SearchResultCard["type"]) {
		if (type === "people") return "People";
		if (type === "classes") return "Class";
		if (type === "attendance") return "Attendance";
		return "Exam";
	}

	let globalSearchQuery = $state("");
	let globalSearchResults = $state<SearchResultCard[]>([]);
	let globalSearchLoading = $state(false);
	let globalSearchError = $state("");
	let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let activeSearchToken = 0;

	async function runGlobalSearch(value: string) {
		const query = value.trim();
		if (query.length < 2) {
			globalSearchResults = [];
			globalSearchLoading = false;
			globalSearchError = "";
			return;
		}

		const token = ++activeSearchToken;
		globalSearchLoading = true;
		globalSearchError = "";

		try {
			const response = await fetch(
				`/api/search?q=${encodeURIComponent(query)}&limit=12`,
			);

			if (!response.ok) {
				throw new Error("Search is currently unavailable.");
			}

			const payload = await response.json();

			if (token !== activeSearchToken) {
				return;
			}

			globalSearchResults = payload.results ?? [];
		} catch (reason) {
			console.log(reason);
			if (token !== activeSearchToken) {
				return;
			}

			globalSearchResults = [];
			globalSearchError =
				reason instanceof Error
					? reason.message
					: "Search is currently unavailable.";
		} finally {
			if (token === activeSearchToken) {
				globalSearchLoading = false;
			}
		}
	}

	function handleGlobalSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		globalSearchQuery = target.value;

		if (searchDebounceTimer) {
			clearTimeout(searchDebounceTimer);
		}

		searchDebounceTimer = setTimeout(() => {
			runGlobalSearch(globalSearchQuery);
		}, 250);
	}

	function cleanupOffcanvasArtifacts() {
		document.querySelectorAll(".offcanvas-backdrop").forEach((element) => {
			element.remove();
		});
		document.body.classList.remove("offcanvas-backdrop", "modal-open");
		document.body.style.removeProperty("overflow");
		document.body.style.removeProperty("padding-right");
	}

	function forceResetSearchOffcanvas() {
		const offcanvasEl = document.getElementById("dashboardSearchOffcanvas");
		if (!offcanvasEl) return;

		offcanvasEl.classList.remove("show");
		offcanvasEl.setAttribute("aria-hidden", "true");
		offcanvasEl.removeAttribute("aria-modal");
		offcanvasEl.removeAttribute("role");
		offcanvasEl.style.removeProperty("visibility");
	}

	async function closeSearchOffcanvas() {
		const offcanvasEl = document.getElementById("dashboardSearchOffcanvas");
		if (!offcanvasEl) return;

		if (!offcanvasEl.classList.contains("show")) {
			forceResetSearchOffcanvas();
			cleanupOffcanvasArtifacts();
			return;
		}

		// @ts-ignore
		const { default: Offcanvas } = await import("bootstrap/js/dist/offcanvas");
		const instance = Offcanvas.getOrCreateInstance(offcanvasEl);

		await new Promise<void>((resolve) => {
			let settled = false;

			const finish = () => {
				if (settled) return;
				settled = true;
				offcanvasEl.removeEventListener("hidden.bs.offcanvas", handleHidden as EventListener);
				forceResetSearchOffcanvas();
				cleanupOffcanvasArtifacts();
				resolve();
			};

			const handleHidden = () => finish();
			offcanvasEl.addEventListener("hidden.bs.offcanvas", handleHidden as EventListener, { once: true });
			instance.hide();
			setTimeout(finish, 450);
		});
	}

	async function handleSearchResultClick(event: MouseEvent, href: string) {
		event.preventDefault();
		await closeSearchOffcanvas();

		globalSearchQuery = "";
		globalSearchResults = [];
		globalSearchError = "";
		await goto(href);
	}

	let theme = $state<ThemeMode>("light");

	onMount(() => {
		const stopBeforeNavigate = beforeNavigate(() => {
			forceResetSearchOffcanvas();
			cleanupOffcanvasArtifacts();
		});

		const stopAfterNavigate = afterNavigate(() => {
			forceResetSearchOffcanvas();
			cleanupOffcanvasArtifacts();
		});

		const storedTheme = window.localStorage.getItem(themeStorageKey);

		if (storedTheme === "light" || storedTheme === "dark") {
			applyTheme(storedTheme);
		} else {
			const preferredTheme: ThemeMode = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches
				? "dark"
				: "light";
			applyTheme(preferredTheme);
		}

		const offcanvasEl = document.getElementById("dashboardSearchOffcanvas");
		const onHidden = () => cleanupOffcanvasArtifacts();
		offcanvasEl?.addEventListener("hidden.bs.offcanvas", onHidden as EventListener);

		return () => {
			if (searchDebounceTimer) {
				clearTimeout(searchDebounceTimer);
			}
			offcanvasEl?.removeEventListener("hidden.bs.offcanvas", onHidden as EventListener);
			stopBeforeNavigate();
			stopAfterNavigate();
			forceResetSearchOffcanvas();
			cleanupOffcanvasArtifacts();
		};
	});

	let { children, data } = $props();
</script>

<svelte:head>
	<title>{appName} | {getActiveLabel(page.url.pathname)}</title>
</svelte:head>

<div class="d-flex min-vh-100 flex-column bg-body-tertiary">
	<header class="sticky-top border-bottom bg-body shadow-sm">
		<div class="container-fluid py-2">
			<nav class="navbar navbar-expand-xl p-0">
				<div class="d-flex align-items-center gap-2">
					<a
						class="navbar-brand d-flex align-items-center gap-2 mb-0"
						href="/dashboard"
					>
						<span
							class="badge rounded-pill bg-primary-subtle text-primary-emphasis px-3 py-2"
							>ES</span
						>
						<span class="fw-semibold">{appName}</span>
					</a>
				</div>

				<button
					class="navbar-toggler"
					type="button"
					data-bs-toggle="collapse"
					data-bs-target="#dashboardTopNav"
					aria-controls="dashboardTopNav"
					aria-expanded="false"
					aria-label="Toggle navigation"
				>
					<span class="navbar-toggler-icon"></span>
				</button>

				<div class="collapse navbar-collapse" id="dashboardTopNav">
					<ul class="navbar-nav me-auto mb-2 mb-xl-0 gap-xl-1">
						{#each navigationItems.filter(canAccess) as item}
							<li class="nav-item">
								<a
									class="nav-link rounded-pill px-3"
									class:bg-body-secondary={isNavActive(
										page.url.pathname,
										item.href,
									)}
									class:text-body-emphasis={isNavActive(
										page.url.pathname,
										item.href,
									)}
									href={item.href}
									aria-current={isNavActive(
										page.url.pathname,
										item.href,
									)
										? "page"
										: undefined}
								>
									{item.label}
								</a>
							</li>
						{/each}
					</ul>

					<div
						class="d-flex flex-column flex-xl-row align-items-stretch align-items-xl-center gap-2 mt-2 mt-xl-0"
					>
						<button
							class="btn btn-outline-secondary rounded-pill px-3"
							type="button"
							data-bs-toggle="offcanvas"
							data-bs-target="#dashboardSearchOffcanvas"
							aria-controls="dashboardSearchOffcanvas"
						>
							Search
						</button>

						<div class="dropdown">
							<button
								class="btn btn-outline-secondary dropdown-toggle w-100 d-flex align-items-center justify-content-between px-3 gap-2 rounded-pill"
								type="button"
								data-bs-toggle="dropdown"
								aria-expanded="false"
								aria-label="Open account menu"
							>
								{data.user.name.length > 20
									? data.user.name.slice(0, 20) + "..."
									: data.user.name}
							</button>
							<ul
								class="dropdown-menu dropdown-menu-end shadow-sm"
							>
								<li>
									<a
										class="dropdown-item"
										href="/dashboard/profile">Profile</a
									>
								</li>
								<li>
									<button
										class="dropdown-item"
										type="button"
										onclick={toggleTheme}
									>
										Theme: {theme === "dark"
											? "Dark"
											: "Light"} (toggle)
									</button>
								</li>
								<li><hr class="dropdown-divider" /></li>
								<li>
									<a
										class="dropdown-item"
										href="/auth/signout">Sign out</a
									>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</nav>
		</div>
	</header>

	<div
		class="offcanvas offcanvas-end"
		tabindex="-1"
		id="dashboardSearchOffcanvas"
		aria-labelledby="dashboardSearchOffcanvasLabel"
	>
		<div class="offcanvas-header border-bottom">
			<h2 class="offcanvas-title h5 mb-0" id="dashboardSearchOffcanvasLabel">
				Search dashboard
			</h2>
			<button
				type="button"
				class="btn-close"
				data-bs-dismiss="offcanvas"
				aria-label="Close"
			></button>
		</div>
		<div class="offcanvas-body d-flex flex-column gap-3">
			<div>
				<label class="form-label" for="globalDashboardSearchInput">Full text search</label>
				<input
					id="globalDashboardSearchInput"
					class="form-control"
					type="search"
					placeholder="Classes, people, attendance, exams"
					value={globalSearchQuery}
					oninput={handleGlobalSearchInput}
					autocomplete="off"
				/>
				<p class="small text-body-secondary mb-0 mt-2">
					Type at least 2 characters
				</p>
			</div>

			<div role="region" aria-live="polite" aria-label="Search results">
				{#if globalSearchLoading}
					<div class="d-grid gap-2">
						<div class="placeholder-glow"><span class="placeholder col-12"></span></div>
						<div class="placeholder-glow"><span class="placeholder col-10"></span></div>
						<div class="placeholder-glow"><span class="placeholder col-8"></span></div>
					</div>
				{:else if globalSearchError}
					<div class="alert alert-danger mb-0">{globalSearchError}</div>
				{:else if globalSearchQuery.trim().length >= 2 && globalSearchResults.length === 0}
					<div class="alert alert-info mb-0">No results found.</div>
				{:else if globalSearchResults.length > 0}
					<div class="row g-2">
						{#each globalSearchResults as result}
							<div class="col-12">
								<a
									class="card text-decoration-none border h-100"
									href={result.href}
									onclick={(event) => handleSearchResultClick(event, result.href)}
								>
									<div class="card-body d-flex justify-content-between align-items-start gap-2">
										<div>
											<p class="fw-semibold mb-1 text-body-emphasis">{result.title}</p>
											<p class="small text-body-secondary mb-0">{result.subtitle}</p>
										</div>
										<span class="badge text-bg-secondary">{resultTypeLabel(result.type)}</span>
									</div>
								</a>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="flex-grow-1 container-fluid py-3">
		<main>
			<nav aria-label="breadcrumb">
				<ol class="breadcrumb mb-3">
					{#each buildBreadcrumb(page.url.pathname) as item}
						<li
							class="breadcrumb-item"
							class:active={item.current}
							aria-current={item.current ? "page" : undefined}
						>
							{#if item.current}
								{item.label}
							{:else}
								<a href={item.href}>{item.label}</a>
							{/if}
						</li>
					{/each}
				</ol>
			</nav>

			<div class="card border-0 shadow-sm rounded-4">
				<div class="card-body">
					{@render children?.()}
				</div>
			</div>
		</main>
	</div>

	<footer class="border-top bg-body mt-4">
		<div class="container-fluid">
			<div class="row align-items-center py-3 g-2">
				<div
					class="col-12 col-md-4 text-center text-md-start text-body-secondary"
				>
					{appName}
				</div>

				<div class="col-12 col-md-4 text-center text-body-secondary">
					Copyright {currentYear}
					{appName}
				</div>

				<ul
					class="nav col-12 col-md-4 justify-content-center justify-content-md-end"
				>
					{#each navigationItems.filter(canAccess) as item}
						<li class="nav-item">
							<a
								class="nav-link px-2 text-body-secondary"
								href={item.href}>{item.label}</a
							>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</footer>
</div>
