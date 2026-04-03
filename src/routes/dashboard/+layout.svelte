<script lang="ts">
	import { page } from '$app/state';

	const appName = 'Eduscend LMS';

	const navigationItems = [
		{ label: 'Home', href: '/dashboard' },
		{ label: 'Profile', href: '/dashboard/profile' },
		{ label: 'People', href: '/dashboard/people' },
		{ label: 'Classes', href: '/dashboard/classes' },
		{ label: 'Attendance', href: '/dashboard/attendance' },
		{ label: 'Exams', href: '/dashboard/exams' }
	];

	function titleize(segment: string) {
		return segment
			.split('-')
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}

	function buildBreadcrumb(pathname: string) {
		const segments = pathname.split('/').filter(Boolean);

		if (segments.length === 0) {
			return [{ label: 'Home', href: '/dashboard', current: true }];
		}

		const items = [{ label: 'Home', href: '/dashboard', current: segments.length === 1 }];
		let currentPath = '';

		for (const segment of segments.slice(1)) {
			currentPath += `/${segment}`;
			items.push({
				label: titleize(segment),
				href: `/dashboard${currentPath}`,
				current: currentPath === `/${segments.slice(1).join('/')}`
			});
		}

		return items;
	}

	function getActiveLabel(pathname: string) {
		const segments = pathname.split('/').filter(Boolean);
		if (segments.length <= 1) {
			return 'Home';
		}

		return titleize(segments[segments.length - 1]);
	}

	let { children } = $props();
</script>

<svelte:head>
	<title>{appName} | {getActiveLabel(page.url.pathname)}</title>
</svelte:head>

<div class="d-flex min-vh-100 flex-column bg-body-tertiary">
	<header class="navbar navbar-dark bg-dark navbar-expand-lg">
		<div class="container-fluid">
			<a class="navbar-brand" href="/dashboard">{appName}</a>

			<button
				class="navbar-toggler"
				type="button"
				data-bs-toggle="offcanvas"
				data-bs-target="#dashboardSidebar"
				aria-controls="dashboardSidebar"
				aria-label="Toggle dashboard navigation"
			>
				<span class="navbar-toggler-icon"></span>
			</button>
		</div>
	</header>

	<div class="flex-grow-1 container-fluid py-3">
		<div class="row g-3">
			<aside class="col-lg-3 col-xl-2">
				<div class="offcanvas-lg offcanvas-start bg-body border rounded-3" tabindex="-1" id="dashboardSidebar" aria-labelledby="dashboardSidebarLabel">
					<div class="offcanvas-header">
						<h2 class="offcanvas-title h6 mb-0" id="dashboardSidebarLabel">Menu</h2>
						<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
					</div>
					<div class="offcanvas-body p-2">
						<nav class="nav nav-pills flex-column">
							{#each navigationItems as item}
								<a class:active={page.url.pathname === item.href} class="nav-link" href={item.href} aria-current={page.url.pathname === item.href ? 'page' : undefined}>{item.label}</a>
							{/each}
						</nav>
					</div>
				</div>
			</aside>

			<main class="col-lg-9 col-xl-10">
				<nav aria-label="breadcrumb">
					<ol class="breadcrumb mb-3">
						{#each buildBreadcrumb(page.url.pathname) as item}
							<li class="breadcrumb-item" class:active={item.current} aria-current={item.current ? 'page' : undefined}>
								{#if item.current}
									{item.label}
								{:else}
									<a href={item.href}>{item.label}</a>
								{/if}
							</li>
						{/each}
					</ol>
				</nav>

				<div class="card">
					<div class="card-body">
						<h1 class="h5">{getActiveLabel(page.url.pathname)}</h1>
						{@render children?.()}
					</div>
				</div>
			</main>
		</div>
	</div>

	<footer class="border-top bg-body py-2">
		<div class="container-fluid small text-body-secondary">{appName}</div>
	</footer>
</div>
