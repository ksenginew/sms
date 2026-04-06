<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import AttendanceBreakdown from "$lib/components/AttendanceBreakdown.svelte";
	import AttendanceOverview from "$lib/components/AttendanceOverview.svelte";

	let { data } = $props();

	let currentTime = $state(new Date());
	let teacherCardIndex = $state(0);
	let timer: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		currentTime = new Date(data.nowIso);
	});

	onMount(() => {
		timer = setInterval(() => {
			currentTime = new Date();
		}, 1000);
	});

	onDestroy(() => {
		if (timer) {
			clearInterval(timer);
		}
	});

	$effect(() => {
		if (data.role !== "teacher") {
			teacherCardIndex = 0;
			return;
		}

		const cardCount = data.teacherOverview?.attendanceCards?.length ?? 0;
		if (cardCount === 0) {
			teacherCardIndex = 0;
			return;
		}

		teacherCardIndex = Math.min(teacherCardIndex, cardCount - 1);
	});

	function greetingByHour(date: Date) {
		const hour = date.getHours();
		if (hour < 12) return "Good morning";
		if (hour < 18) return "Good afternoon";
		return "Good evening";
	}

	function formatDateTime(date: Date) {
		return date.toLocaleString(undefined, {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit"
		});
	}

	function initials(name: string | null | undefined) {
		if (!name) return "U";
		const chunks = name.trim().split(/\s+/).filter(Boolean);
		if (chunks.length === 0) return "U";
		if (chunks.length === 1) return chunks[0][0].toUpperCase();
		return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase();
	}

	function previousTeacherCard() {
		const count = data.teacherOverview?.attendanceCards?.length ?? 0;
		if (count === 0) return;
		teacherCardIndex = (teacherCardIndex - 1 + count) % count;
	}

	function nextTeacherCard() {
		const count = data.teacherOverview?.attendanceCards?.length ?? 0;
		if (count === 0) return;
		teacherCardIndex = (teacherCardIndex + 1) % count;
	}

	function rowsFromSummary(summary: {
		present: number;
		absent: number;
		late: number;
		excused: number;
	}) {
		return [
			...Array.from({ length: summary.present }, () => ({ status: "present" })),
			...Array.from({ length: summary.absent }, () => ({ status: "absent" })),
			...Array.from({ length: summary.late }, () => ({ status: "late" })),
			...Array.from({ length: summary.excused }, () => ({ status: "excused" }))
		];
	}
</script>

<section class="vstack gap-4">
	<div class="row g-3 align-items-start">
		<div class="col-12 col-xl-4">
			<div class="vstack gap-3">
				<div class="card shadow-sm rounded-3 border">
					<div class="card-body">
						<div class="d-flex align-items-center gap-3 mb-3">
							{#if data.user.image}
								<img
									src={data.user.image}
									alt="Profile"
									class="rounded-circle border"
									style="width:64px;height:64px;object-fit:cover;"
								/>
							{:else}
								<div
									class="rounded-circle bg-primary-subtle text-primary-emphasis d-flex align-items-center justify-content-center fw-semibold"
									style="width:64px;height:64px;"
								>
									{initials(data.user.name)}
								</div>
							{/if}
							<div>
								<p class="fw-semibold mb-0">{data.user.name}</p>
								<p class="text-body-secondary small mb-0 text-capitalize">{data.role}</p>
							</div>
						</div>
						<h1 class="h5 mb-1">{greetingByHour(currentTime)}</h1>
						<p class="mb-0 text-body-secondary">{formatDateTime(currentTime)}</p>
					</div>
				</div>

				<div class="card shadow-sm rounded-3 border">
					<div class="card-body">
						<div class="border rounded-3 bg-body-tertiary p-3 mb-3">
							<p class="small text-body-secondary mb-1">User ID</p>
							<p class="mb-0 fw-semibold text-break">{data.user.id}</p>
						</div>

						<div class="border rounded-3 bg-body-tertiary p-3 text-center">
							<p class="small text-body-secondary mb-2">QR Placeholder</p>
							<div class="border rounded-2 py-3 text-body-secondary">
								QR preview will be added here later
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="col-12 col-xl-8">
			<div class="vstack gap-3">
				{#if data.role === "student"}
					<div class="card shadow-sm rounded-3 border">
						<div class="card-header border-bottom">Attendance overview (current year)</div>
						<div class="card-body d-flex align-items-center justify-content-center" style="min-height:260px;">
							<AttendanceOverview attendanceRows={data.studentOverview.attendanceRows} />
						</div>
					</div>

					<div class="card shadow-sm rounded-3 border">
						<div class="card-header border-bottom">Exam result notifications</div>
						<div class="card-body d-flex flex-column justify-content-center">
							<div class="placeholder-glow mb-2">
								<span class="placeholder col-8"></span>
							</div>
							<p class="text-body-secondary mb-0">{data.studentOverview.examPreview.message}</p>
						</div>
					</div>
				{/if}

				{#if data.role === "teacher"}
					<div class="card shadow-sm rounded-3 border">
						<div class="card-header border-bottom d-flex justify-content-between align-items-center">
							<span>Attendance snapshot by class</span>
							<div class="d-flex gap-2">
								<button class="btn btn-sm btn-outline-secondary" type="button" onclick={previousTeacherCard}>Previous</button>
								<button class="btn btn-sm btn-outline-secondary" type="button" onclick={nextTeacherCard}>Next</button>
							</div>
						</div>
						<div class="card-body">
							{#if data.teacherOverview.attendanceCards.length === 0}
								<div class="alert alert-info mb-0">No accessible classes found.</div>
							{:else}
								{@const card = data.teacherOverview.attendanceCards[teacherCardIndex]}
								<div class="d-flex justify-content-center align-items-center" style="min-height:240px;">
									<AttendanceBreakdown attendanceRows={rowsFromSummary(card.summary)} />
								</div>
								<div class="text-center">
									<p class="fw-semibold mb-1">{card.classTitle}</p>
									<p class="small text-body-secondary mb-0">
										{card.lastMarkedDate ? `Last marked day: ${card.lastMarkedDate}` : "No attendance marked yet"}
									</p>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				{#if data.role === "admin"}
					<div class="card shadow-sm rounded-3 border">
						<div class="card-header border-bottom">School attendance overview</div>
						<div class="card-body">
							<div class="d-flex justify-content-center align-items-center" style="min-height:240px;">
								<AttendanceBreakdown attendanceRows={rowsFromSummary(data.adminOverview.attendanceSummary)} />
							</div>
							<div class="text-center">
								<p class="fw-semibold mb-1">Present rate: {data.adminOverview.attendanceSummary.percentage}%</p>
								<p class="small text-body-secondary mb-0">
									{#if data.adminOverview.attendanceDay}
										For day {data.adminOverview.attendanceDay}
									{:else}
										No attendance has been marked yet.
									{/if}
								</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#if data.role === "teacher"}
		<div class="row g-3">
			<div class="col-12 col-lg-6">
				<div class="card shadow-sm rounded-3 border h-100">
					<div class="card-header border-bottom">Direct class links</div>
					<div class="card-body d-grid gap-2">
						{#if data.teacherOverview.classesQuickLinks.length === 0}
							<p class="text-body-secondary mb-0">No classes assigned.</p>
						{:else}
							{#each data.teacherOverview.classesQuickLinks as item}
								<a class="btn btn-outline-secondary text-start" href={item.href}>{item.title}</a>
							{/each}
						{/if}
					</div>
				</div>
			</div>
			<div class="col-12 col-lg-6">
				<div class="card shadow-sm rounded-3 border h-100">
					<div class="card-header border-bottom">Direct exam links</div>
					<div class="card-body d-grid gap-2">
						<!-- {#if data.teacherOverview.examsQuickLinks.length === 0}
							<p class="text-body-secondary mb-0">No exams linked yet.</p>
						{:else}
							{#each data.teacherOverview.examsQuickLinks as item}
								<a class="btn btn-outline-secondary text-start" href={item.href}>{item.title}</a>
							{/each}
						{/if} -->
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if data.role === "admin"}
		<div class="row g-3">
			<div class="col-12">
				<div class="card shadow-sm rounded-3 border">
					<div class="card-header border-bottom">Quick access</div>
					<div class="card-body">
						<div class="row g-2">
							{#each data.adminOverview.quickAccess as item}
								<div class="col-6 col-md-3">
									<a class="text-decoration-none" href={item.href}>
										<div class="border rounded-3 p-3 h-100 bg-body-tertiary">
											<p class="fw-semibold mb-1">{item.title}</p>
											<p class="small text-body-secondary mb-0">{item.subtitle}</p>
										</div>
									</a>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</section>
