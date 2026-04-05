<script>
	import { Chart, registerables } from 'chart.js';
	import { onMount } from 'svelte';

	Chart.register(...registerables);

	let chartContainer;
	let chart = null;

	let { attendanceRows = [] } = $props();

	$effect(() => {
		if (chartContainer && attendanceRows.length > 0) {
			renderChart();
		}
	});

	function renderChart() {
		const total = attendanceRows.length;
		const presentCount = attendanceRows.filter(r => r.status === 'present').length;
		const percentage = Math.round((presentCount / total) * 100);

		const ctx = chartContainer.getContext('2d');

		if (chart) {
			chart.destroy();
		}

		chart = new Chart(ctx, {
			type: 'doughnut',
			data: {
				datasets: [
					{
						data: [percentage, 100 - percentage],
						backgroundColor: ['#6366f1', '#e5e7eb'],
						borderWidth: 0,
						borderColor: 'transparent'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						enabled: false
					}
				},
				cutout: '75%'
			}
		});
	}

	$effect(() => {
		if (chart && attendanceRows.length > 0) {
			const total = attendanceRows.length;
			const presentCount = attendanceRows.filter(r => r.status === 'present').length;
			const percentage = Math.round((presentCount / total) * 100);
			chart.data.datasets[0].data = [percentage, 100 - percentage];
			chart.update();
		}
	});
</script>

<div class="attendance-overview">
	<div class="overview-content">
		<canvas bind:this={chartContainer} width="150" height="150"></canvas>
		<div class="overview-text center-text">
			<div class="percentage">
				{#if attendanceRows.length > 0}
					{Math.round((attendanceRows.filter(r => r.status === 'present').length / attendanceRows.length) * 100)}%
				{:else}
					0%
				{/if}
			</div>
		</div>
	</div>
	<div class="overview-details">
		<div class="label">Overall Attendance</div>
		{#if attendanceRows.length > 0}
			<div class="count">{attendanceRows.filter(r => r.status === 'present').length} out of {attendanceRows.length}</div>
		{/if}
	</div>
</div>

<style>
	.attendance-overview {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		gap: 1rem;
	}

	.overview-content {
		position: relative;
		width: 150px;
		height: 150px;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	canvas {
		position: absolute;
		width: 150px;
		height: 150px;
	}

	.overview-text {
		position: relative;
		z-index: 10;
		text-align: center;
	}

	.center-text {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.percentage {
		font-size: 2rem;
		font-weight: 700;
		color: #6366f1;
		line-height: 1;
	}

	.overview-details {
		text-align: center;
	}

	.label {
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 500;
	}

	.count {
		font-size: 0.7rem;
		color: #9ca3af;
		margin-top: 0.25rem;
		display: block;
	}
</style>
