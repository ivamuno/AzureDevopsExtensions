function computeVelocity(items) {
	var sum = items.reduce((prev, cur) => { return prev + cur });
	var max = Math.max(...items);
	var min = Math.min(...items);
	return (sum - max - min) / (items.length - 2);
}

function printChart(values) {
	var sorted = [];
	for (var key in values) {
		sorted.push(key);
	}
	sorted.sort();

	var labels = [];
	var points = [];
	var bugs = [];
	var extra = [];

	for (var index in sorted) {
		var key = sorted[index];
		labels.push(key);
		points.push(values[key].Points);
		bugs.push(values[key].Bugs);
		extra.push(values[key].Extra);
	}

	const velocityBugs = Math.round(computeVelocity(bugs) * 100) / 100;
	const velocityUs = Math.round(computeVelocity(points) * 100) / 100;
	const velocityNoUs = Math.round(computeVelocity(extra) * 100) / 100;
	$("#velocity").text(`Bugs = ${velocityBugs}, UserStories = ${velocityUs}, NoUserStories = ${velocityNoUs}`);

	var config = {
		type: 'bar',
		data: {
			labels: labels,
			datasets: [
				{
					type: 'line',
					label: "Bugs",
					fill: false,
					backgroundColor: window.chartColors.red,
					borderColor: window.chartColors.red,
					data: bugs,
					lineTension: 0,
					yAxisID: 'bugs-amount'
				},
				{
					type: 'bar',
					label: "US",
					fill: false,
					backgroundColor: window.chartColors.green,
					borderColor: window.chartColors.green,
					borderWidth: 10,
					data: points,
					lineTension: 0
				},
				{
					type: 'bar',
					label: "No US",
					fill: false,
					backgroundColor: window.chartColors.blue,
					borderColor: window.chartColors.blue,
					borderWidth: 10,
					data: extra,
					lineTension: 0
				}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			legend: {
				position: 'bottom',
			},
			tooltips: {
				mode: 'index',
				intersect: false,
			},
			hover: {
				mode: 'nearest',
				intersect: true
			},
			scales: {
				xAxes: [{
					display: true,
					stacked: true,
					barThickness: 1,
					scaleLabel: {
						display: true
					}
				}],
				yAxes: [{
					display: true,
					stacked: true,
					scaleLabel: {
						display: true,
						labelString: 'Points'
					}
				}, {
					id: 'bugs-amount',
					display: true,
					position: 'right',
					scaleLabel: {
						display: true,
						labelString: 'Bugs'
					},
					ticks: {
						beginAtZero: true,
						stepSize: 1,
						max: 5
					}
				}
				]
			}
		}
	};
	var ctx = document.getElementById("canvas").getContext("2d");
	window.myMixedChart = new Chart(ctx, config);
}

const iterations = ['B-Ops\\2019\\Q4'];
const iterationFilter = iterations.map(i => `([System.IterationPath] under '${i}' and [System.IterationPath] <> '${i}')`).join(" or ")
const query = `select [System.Id], [System.WorkItemType], [System.Title], [System.State], [Microsoft.VSTS.Scheduling.StoryPoints], 
	[System.IterationPath], [System.Tags], [Microsoft.VSTS.Common.StackRank] 
from WorkItems 
where [System.TeamProject] = @project 
	and ( ${iterationFilter} ) 
	and ([System.State] = 'Closed') 
order by [System.IterationPath]`

function CreateProgressChart(WidgetHelpers, TFS_Wit_WebApi, TFS_Work_WebApi) {
	$("#mainContainer").empty();
	$("#mainContainer").append('<div style="float:left; height: 10%; width: 100%;"><span style="font-weight:bold">Velocity: </span><span id="velocity"></span></div>');
	$("#mainContainer").append('<div style="float:left; height: 90%; width: 100%;"><canvas id="canvas"></canvas></div>');

	WidgetHelpers.IncludeWidgetStyles();
	TFSWorkWebApi = TFS_Work_WebApi;
	teamContext = { projectId: VSS.getWebContext().project.id, teamId: VSS.getWebContext().team.id, project: "", team: "" };

	var values = {};
	TFS_Wit_WebApi.getClient().queryByWiql({ query: query }, teamContext.projectId, teamContext.teamId)
		.then(function (queryResult) {
			var allWorkItemIds = [];
			queryResult.workItems.forEach(element => {
				allWorkItemIds.push(element.id);
			});

			TFS_Wit_WebApi.getClient().getWorkItems(allWorkItemIds)
				.then(function (workItemsResults) {
					for (var i = 0; i < workItemsResults.length; i++) {
						var wi = workItemsResults[i];
						console.log("TfsWidgetSprintPreparationDoc.wi", wi);
						var key = wi.fields['System.IterationPath'];
						key = key.substring(key.lastIndexOf('\\') + 1);
						key = key.substring(key.indexOf('-') + 1);
						var points = wi.fields['Microsoft.VSTS.Scheduling.StoryPoints'];
						if (!points) {
							points = 0;
						}

						var type = wi.fields['System.WorkItemType'];
						if (values[key]) {
							if (type == "User Story") {
								var area = wi.fields['Microsoft.VSTS.Common.ValueArea'];
								if (area == "Architectural") {
									values[key].Extra += points;
								} else {
									values[key].Points += points;
								}
							} else if (type == "Bug") {
								values[key].Bugs++;
							} else {
								values[key].Extra += points;
							}
						} else {
							if (type == "User Story") {
								var area = wi.fields['Microsoft.VSTS.Common.ValueArea'];
								if (area == "Architectural") {
									values[key] = { 'Points': 0, 'Bugs': 0, 'Extra': points }
								} else {
									values[key] = { 'Points': points, 'Bugs': 0, 'Extra': 0 }
								}
							} else if (type == "Bug") {
								values[key] = { 'Points': 0, 'Bugs': 1, 'Extra': 0 }
							} else {
								values[key] = { 'Points': 0, 'Bugs': 0, 'Extra': points }
							}
						}
					}

					printChart(values);
				});
		});
};

VSS.require([
	"TFS/Dashboards/WidgetHelpers",
	"TFS/WorkItemTracking/RestClient",
	"TFS/Work/RestClient"
],

	CreateProgressChart
);