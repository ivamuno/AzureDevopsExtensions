teams = {};
teams['Resistance'] = { TeamName: 'Resistance', TeamProject: 'B-Ops', AreaPath: 'B-Ops', WorkItemTypes: ["User Story"] };
teams['The Warriors'] = { TeamName: 'The Warriors', TeamProject: 'Warriors', AreaPath: 'Warriors\\Team W', WorkItemTypes: ["User Story", "Enabler", "Kaizen", "People", "Support", "Tech Debt", "Bug"] };
teams['AvenJers'] = { TeamName: 'AvenJers', TeamProject: 'Payvision 4.0', AreaPath: 'Payvision 4.0\\AvenJers', WorkItemTypes: ["User Story", "Enabler", "Kaizen", "People", "Support", "Tech Debt"] };

function wholeHistoryLoaded() {
	console.log("TfsWidgetProgressDoc.wholeHistory", wholeHistory);
	var rawStartDate = startDate.toString("yyyyMMdd");
	var rawFinishDate = finishDate.toString("yyyyMMdd");
	for (var i = 0; i < wholeHistory.length; i++) {
		var sorted = [];
		var workItem = wholeHistory[i];
		for (var key in workItem) {
			sorted.push(key);
		}
		sorted.sort();

		if (workItem[rawStartDate] == null) {
			var r = workItem[sorted[0]];
			var firstWorkItem = workItem[rawStartDate] = { Id: r.id, ChangedDate: startDate, State: "New", StoryPoints: r.StoryPoints };
			for (var j = 0; j < sorted.length; j++) {
				r = workItem[sorted[j]];
				if (r.ChangedDate.compareTo(startDate) > 0) {
					break;
				}

				firstWorkItem = { Id: r.id, ChangedDate: startDate, State: r.State, StoryPoints: r.StoryPoints };
			}

			workItem[rawStartDate] = firstWorkItem;
			sorted.push(rawStartDate);
			sorted.sort();
		}

		if (workItem[rawFinishDate] == null) {
			var lastWorkItem = workItem[sorted[sorted.length - 1]];
			workItem[rawFinishDate] = { Id: lastWorkItem.id, ChangedDate: finishDate, State: lastWorkItem.State, StoryPoints: lastWorkItem.StoryPoints };
			sorted.push(rawFinishDate);
		}

		var storyPoints = workItem[rawFinishDate].StoryPoints;
		for (var key in workItem) {
			var item = workItem[key];
			workItem[key] = { Id: item.id, ChangedDate: item.ChangedDate, State: item.State, StoryPoints: storyPoints };
		}

		var previousWorkItemDay = { ChangedDate: new Date(new Date(workItem[sorted[0]].ChangedDate).toDateString()), State: "New", StoryPoints: 0 };
		for (var j = 0; j < sorted.length; j++) {
			if (previousWorkItemDay.ChangedDate.compareTo(finishDate) > 0) {
				break;
			}

			var r = workItem[sorted[j]];
			var state = r.State;
			var storyPoints = r.StoryPoints;
			var changedDate = new Date(new Date(r.ChangedDate).toDateString());
			if (changedDate.compareTo(startDate) < 0) {
				continue;
			}

			for (var d = new Date(previousWorkItemDay.ChangedDate.toDateString()); d < changedDate; d.setDate(d.getDate() + 1)) {
				if (d.between(startDate, finishDate)) {
					var item = calendar[d.toDateString()];
					item[previousWorkItemDay.State] += previousWorkItemDay.StoryPoints;
				}
			}

			if (changedDate.between(startDate, finishDate)) {
				var item = calendar[d.toDateString()];
				item[state] += storyPoints;
			}

			previousWorkItemDay = { ChangedDate: changedDate.addDays(1), State: state, StoryPoints: storyPoints };
		}
	}
	computeCapacity();
}

function computeCapacity() {
	TFSWorkWebApi.getClient().getTeamDaysOff(teamContext, currentIteration.id)
		.then(function (teamDaysOff) {
			TFSWorkWebApi.getClient().getCapacities(teamContext, currentIteration.id)
				.then(function (capacities) {
					var holidays = {};
					for (var d = new Date(startDate.toDateString()); d <= finishDate; d.setDate(d.getDate() + 1)) {
						holidays[d.toDateString()] = 0;
					}
					var totalDevelopers = 0;
					capacities.forEach(c => {
						c.activities.forEach(a => {
							if (a.name == "Development") {
								totalDevelopers += 1;
								c.daysOff.forEach(tdO => {
									var localStartDate = tdO.start;
									var localFinishDate = tdO.end;
									for (var d = new Date(localStartDate.toDateString()); d <= localFinishDate; d.setDate(d.getDate() + 1)) {
										var dateString = d.toDateString();
										holidays[dateString] -= 1;
									}
								});
							}
						});
					});

					teamDaysOff.daysOff.forEach(tdO => {
						var localStartDate = tdO.start;
						var localFinishDate = tdO.end;
						for (var d = new Date(localStartDate.toDateString()); d <= localFinishDate; d.setDate(d.getDate() + 1)) {
							holidays[d.toDateString()] = -totalDevelopers;
						}
					});

					var totalHoursPerDay = {};
					var totalHours = 0;
					var totalHoursPerDayCount = 0;
					var dailyHours = 0;
					for (var key in holidays) {
						totalHoursPerDayCount++;
						var d = new Date(key);
						if (totalHoursPerDayCount == 1 || totalHoursPerDayCount == 5) {
							dailyHours = 0;
						} else if (d.getDay() >= 1 && d.getDay() <= 4) {
							dailyHours = 8.5;
						} else if (d.getDay() == 5) {
							dailyHours = 6;
						} else {
							continue;
						}

						totalHoursPerDay[key] = (totalDevelopers + holidays[key]) * dailyHours;
						totalHours += totalHoursPerDay[key];
					}

					capacityPerDay = {};
					for (var key in totalHoursPerDay) {
						capacityPerDay[key] = totalHoursPerDay[key] / totalHours;
					}

					printChart();
				});
		});
}

function printChart() {
	console.log("TfsWidgetProgressDoc.capacityPerDay", capacityPerDay);
	console.log("TfsWidgetProgressDoc.calendar", calendar);

	var labels = [];
	var activeStoryPoints = [];
	var resolvedStoryPoints = [];
	var uatStoryPoints = [];
	var closedStoryPoints = [];

	var partialData = 0;
	for (var key in capacityPerDay) {
		labels.push(Date.parse(key).toString("ddd"));

		partialData = calendar[key].Closed;
		closedStoryPoints.push(calendar[key].Closed);

		partialData += calendar[key].UAT;
		uatStoryPoints.push(calendar[key].UAT);

		partialData += calendar[key].Resolved;
		resolvedStoryPoints.push(calendar[key].Resolved);

		partialData += calendar[key].Active;
		activeStoryPoints.push(calendar[key].Active);

		partialData += calendar[key].New;
	}

	var previousIdealData = 0;
	var idealData = [];
	var highlightTodayData = [];
	var maximumData = [];
	for (var key in capacityPerDay) {
		previousIdealData += capacityPerDay[key];
		idealData.push(Math.round(previousIdealData * velocity * 100) / 100);

		if (Date.parse(key).compareTo(Date.today()) === 0) {
			highlightTodayData.push(partialData);
		} else {
			highlightTodayData.push(NaN);
		}

		maximumData.push(partialData);
	}

	for (var i = manualAdjustment.length; i < maximumData.length; i++) {
		manualAdjustment.push(manualAdjustment[manualAdjustment.length - 1]);
	}

	for (var i = 0; i < idealData.length; i++) {
		idealData[i] += manualAdjustment[i];
	}

	var config = {
		type: 'line',
		data: {
			labels: labels,
			datasets: [{
				type: 'bar',
				label: 'Today',
				backgroundColor: "rgba(0,0,0,1)",
				borderColor: "rgba(0,0,0,1)",
				fill: false,
				data: highlightTodayData,
				yAxisID: 'y-extra'
			}, {
				type: 'line',
				label: "Total",
				fill: false,
				backgroundColor: window.chartColors.red,
				borderColor: window.chartColors.red,
				borderDash: [5, 5],
				data: maximumData,
				lineTension: 0,
				yAxisID: 'y-extra'
			}, {
				type: 'line',
				label: "Ideal",
				fill: false,
				backgroundColor: "rgba(102,0,204, 1)",
				borderColor: "rgba(102,0,204, 1)",
				data: idealData,
				lineTension: 0,
				yAxisID: 'y-extra'
			}, {
				type: 'line',
				label: "Closed",
				backgroundColor: "rgba(0,128,0,1)",
				borderWidth: 0,
				data: closedStoryPoints,
				fill: true,
				lineTension: 0
			}, {
				type: 'line',
				label: "UAT",
				backgroundColor: "rgba(245,139,31,1)",
				borderWidth: 0,
				data: uatStoryPoints,
				fill: true,
				lineTension: 0
			}, {
				type: 'line',
				label: "Resolved",
				backgroundColor: "rgba(0,122,204,0.6)",
				borderWidth: 0,
				data: resolvedStoryPoints,
				fill: true,
				lineTension: 0
			}, {
				type: 'line',
				label: "Active",
				backgroundColor: "rgba(0,122,204,0.3)",
				borderWidth: 0,
				data: activeStoryPoints,
				fill: true,
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
						labelString: 'Story Points'
					},
					ticks: {
						beginAtZero: true,
						min: 0,
						suggestedMax: maximumData[0] + 1
					}
				}, {
					id: 'y-extra',
					display: false,
					position: 'right',
					ticks: {
						beginAtZero: true,
						min: 0,
						suggestedMax: maximumData[0] + 1
					}
				}]
			}
		}
	};
	var ctx = document.getElementById("canvas").getContext("2d");
	window.myMixedChart = new Chart(ctx, config);
}

function CreateProgressChart(TFS_Wit_WebApi, TFS_Work_WebApi) {
	$("#mainContainer").empty();
	$("#mainContainer").append('<div style="float:left; height: 100%;width: 100%;"><canvas id="canvas"></canvas></div>');
	TFSWorkWebApi = TFS_Work_WebApi;
	teamContext = { projectId: VSS.getWebContext().project.id, teamId: VSS.getWebContext().team.id, project: "", team: VSS.getWebContext().team.name };

	console.log("team", teamContext.team)
	currentTeam = teams[teamContext.team];

	TFS_Work_WebApi.getClient().getTeamIterations(teamContext, "current")
		.then(function (iterations) {
			currentIteration = iterations[0];
			startDate = new Date(currentIteration.attributes.startDate.toDateString());
			finishDate = new Date(currentIteration.attributes.finishDate.toDateString());

			calendar = {};
			for (var d = new Date(startDate.toDateString()); d <= finishDate; d.setDate(d.getDate() + 1)) {
				calendar[d.toDateString()] = { New: 0, Active: 0, Resolved: 0, UAT: 0, Closed: 0 };
			}

			var workItemTypes = currentTeam.WorkItemTypes.map(x => "'" + x + "'").join(', ');
			var query = `select [System.Id], [System.WorkItemType], [System.Title], [System.AssignedTo], [System.State], [System.Tags], [Microsoft.VSTS.Scheduling.StoryPoints] 
			from WorkItems 
			where [System.TeamProject] = '${currentTeam.TeamProject}' 
				and [System.WorkItemType] IN (${workItemTypes}) 
				and [System.State] <> 'Removed' 
				and [System.AreaPath] Under '${currentTeam.AreaPath}' 
				and [System.IterationPath] = '${currentIteration.path}' 
				and [Microsoft.VSTS.Scheduling.StoryPoints] > 0 
			order by [System.Id]`;

			var wiql = { query: query };
			TFS_Wit_WebApi.getClient().queryByWiql(wiql, teamContext.projectId, teamContext.teamId)
				.then(function (queryResult) {
					console.log("TfsWidgetProgressDoc.queryByWiqlResult", queryResult);
					var allWorkItemIds = [];
					queryResult.workItems.forEach(element => {
						allWorkItemIds.push(element.id);
					});

					TFS_Wit_WebApi.getClient().getWorkItems(allWorkItemIds)
						.then(function (workItemsResults) {
							wholeHistory = [];
							for (let i = 0; i < workItemsResults.length; i++) {
								TFS_Wit_WebApi.getClient().getRevisions(workItemsResults[i].id)
									.then(function (workItemsHistoryResult) {
										let workItemDays = {};
										workItemsHistoryResult.forEach(r => {
											let state = r.fields["System.State"];
											let storyPoints = r.fields["Microsoft.VSTS.Scheduling.StoryPoints"];
											if (state || storyPoints) {
												let changedDate = new Date(r.fields["System.ChangedDate"]);
												let key = changedDate.toString("yyyyMMdd");
												let id = r.id;
												let value = workItemDays[key];
												if (value) {
													let item = workItemDays[key];
													if (!state) {
														state = item.State;
													}

													if (!storyPoints) {
														storyPoints = item.StoryPoints;
													}

													state = state == 'Ready' ? 'New' : state;
												}

												if (!storyPoints) {
													storyPoints = 0;
												}

												workItemDays[key] = { Id: id, ChangedDate: changedDate, State: state, StoryPoints: storyPoints };
											}
										});

										wholeHistory.push(workItemDays);
										if (wholeHistory.length === workItemsResults.length) {
											wholeHistoryLoaded();
										}
									});
							}
						});
				});
		});
}

VSS.require([
	"TFS/WorkItemTracking/RestClient",
	"TFS/Work/RestClient"
],

	CreateProgressChart
);