<script lang="ts">
	import { page } from "$app/state";
	import { onMount } from "svelte";

	const appName = "Eduscend";
	const themeStorageKey = "eduscend-theme";
	const currentYear = new Date().getFullYear();

	type ThemeMode = "light" | "dark";
	type Role = "admin" | "teacher" | "student" | "external";
	type NavigationItem = { label: string; href: string; roles: Role[] };

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

	let theme = $state<ThemeMode>("light");

	onMount(() => {
		const storedTheme = window.localStorage.getItem(themeStorageKey);

		if (storedTheme === "light" || storedTheme === "dark") {
			applyTheme(storedTheme);
			return;
		}

		const preferredTheme: ThemeMode = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches
			? "dark"
			: "light";
		applyTheme(preferredTheme);
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
						<form class="d-flex" role="search">
							<div
								class="input-group rounded-pill overflow-hidden border"
							>
								<span
									class="input-group-text border-0 bg-body-secondary"
									>Search</span
								>
								<input
									class="form-control border-0"
									type="search"
									placeholder="Find classes, people, exams..."
									aria-label="Search dashboard"
								/>
							</div>
						</form>

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
