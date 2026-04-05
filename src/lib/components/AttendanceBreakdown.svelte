<script>
	import { Chart, registerables } from 'chart.js';

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
		const presentCount = attendanceRows.filter(r => r.status === 'present').length;
		const absentCount = attendanceRows.filter(r => r.status === 'absent').length;
		const lateCount = attendanceRows.filter(r => r.status === 'late').length;
		const excusedCount = attendanceRows.filter(r => r.status === 'excused').length;

		const ctx = chartContainer.getContext('2d');

		if (chart) {
			chart.destroy();
		}

		chart = new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: ['Present', 'Absent', 'Late', 'Excused'],
				datasets: [
					{
						data: [presentCount, absentCount, lateCount, excusedCount],
						backgroundColor: [
							'#10b981', // soft green for present
							'#ef4444', // soft red for absent
							'#f59e0b', // soft yellow for late
							'#3b82f6'  // soft blue for excused
						],
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
						position: 'bottom',
						labels: {
							padding: 15,
							font: {
								size: 13
							},
							color: '#6b7280'
						}
					},
					tooltip: {
						callbacks: {
							label: function (context) {
								return context.label + ': ' + context.parsed;
							}
						}
					}
				}
			}
		});
	}

	$effect(() => {
		if (chart && attendanceRows.length > 0) {
			const presentCount = attendanceRows.filter(r => r.status === 'present').length;
			const absentCount = attendanceRows.filter(r => r.status === 'absent').length;
			const lateCount = attendanceRows.filter(r => r.status === 'late').length;
			const excusedCount = attendanceRows.filter(r => r.status === 'excused').length;

			chart.data.datasets[0].data = [presentCount, absentCount, lateCount, excusedCount];
			chart.update();
		}
	});
</script>

<div class="attendance-breakdown">
	<canvas bind:this={chartContainer}></canvas>
</div>

<style>
	.attendance-breakdown {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		max-width: 250px;
		margin: 0 auto;
	}
</style>
