function computeTimeDiff(resolvedDate, activatedDate, holidays) {
  var timeDiff = 0;
  for (var d = activatedDate; d < resolvedDate; d.setDate(d.getDate() + 1)) {
    if (d.getDay() >= 1 && d.getDay() <= 5) {
      if (holidays.includes(d.toDateString())) {
        continue;
      }

      timeDiff++;
    }
  }

  return timeDiff;
}

workItemTypesStyles = {};
function getColors(table) {
  TFSWitWebApi.getClient()
    .getWorkItemTypes(VSS.getWebContext().project.name)
    .then(function (workItemIcons) {
      for (var i = 0; i < workItemIcons.length; i++) {
        var item = workItemIcons[i];
        statesStyles = {};
        for (var j = 0; j < item.states.length; j++) {
          var state = item.states[j];
          statesStyles[state.name] = state.color;
        }

        workItemTypesStyles[item.name] = { color: item.color, iconUrl: item.icon.url, statesStyles: statesStyles };
      }

      drawTable(table);
    });
}

function drawTable(table) {
  const Size1 = 'size1';
  const Size2 = 'size2';
  const Size3 = 'size3';
  const Size5 = 'size4';
  const Size8 = 'size8';

  var warnings = {};
  warnings[Size1] = { low: 1, medium: 2, critical: 3, stop: 5 };
  warnings[Size2] = { low: 2, medium: 3, critical: 4, stop: 6 };
  warnings[Size3] = { low: 3, medium: 4, critical: 5, stop: 8 };
  warnings[Size5] = { low: 5, medium: 6, critical: 7, stop: 10 };
  warnings[Size8] = { low: 8, medium: 9, critical: 10, stop: 15 };

  function computeItemSize(item) {
    if (item.StoryPoints < 2) {
      return Size1;
    }

    if (item.StoryPoints < 3) {
      return Size2;
    }

    if (item.StoryPoints < 5) {
      return Size3;
    }

    if (item.StoryPoints < 8) {
      return Size5;
    }

    return Size8;
  }

  function computeDaysColor(item) {
    if (item.State == 'Resolved' || item.State == 'Closed') {
      return 'transparent';
    }

    var itemSize = computeItemSize(item);
    var warning = warnings[itemSize];
    if (item.Days >= warning.stop) {
      return '#00000040';
    }

    if (item.Days >= warning.critical) {
      return '#ff000060';
    }

    if (item.Days >= warning.medium) {
      return '#ff000020';
    }

    if (item.Days >= warning.low) {
      return '#ff993320';
    }

    return 'transparent';
  }

  var workItemType = {};
  workItemType['User Story'] =
    '<i data-reactroot="" aria-label="Bug" class="work-item-type-icon-control work-item-type-icon bowtie-icon bowtie-symbol-task work-item-type-icon-control-no-tooltip" style="color: rgb(0, 156, 204);"></i>';
  workItemType['Bug'] =
    '<i data-reactroot="" aria-label="Bug" class="work-item-type-icon-control work-item-type-icon bowtie-icon bowtie-symbol-task work-item-type-icon-control-no-tooltip" style="color: rgb(204, 41, 61);"></i>';

  table.sort(function (a, b) {
    return a.StackRank - b.StackRank;
  });

  $('#mainContainer').append('<table width="100%" id="table_delays">');
  $('#mainContainer').append('<tr>');
  $('#mainContainer').append('<th style="padding:10px 2px 10px 2px" align="left">Title</th>');
  $('#mainContainer').append('<th style="padding:10px 2px 10px 2px" align="left" width="10%">AssignedTo</th>');
  $('#mainContainer').append('<th style="padding:10px 2px 10px 2px" align="right" width="5%">Points</th>');
  $('#mainContainer').append('<th style="padding:10px 2px 10px 2px" align="left" width="12%">State</th>');
  $('#mainContainer').append('<th style="padding:10px 2px 10px 2px" align="right" width="5%">Days</th>');
  $('#mainContainer').append('</tr>');

  for (var i = 0; i < table.length; i++) {
    var itemName = table[i].Title;
    var item = table[i];

    var daysColor = computeDaysColor(item);
    var workItemTypesStyle = workItemTypesStyles[item.WorkItemType];
    var workItemStateColor = workItemTypesStyle.statesStyles[item.State];
    var decoratorWorkItemStateColor =
      "<div class='state-circle' style='float:left; position:relative; border-radius:50%; width:10px; height: 10px; margin-top: 4px; margin-right: 5px; background-color: " +
      workItemStateColor +
      "' />";

    var row = '<tr style="background-color:' + daysColor + '">';
    //row += '<td style="padding:5px 2px 5px 2px"><span style="display: inline-block;text-overflow: ellipsis;white-space: nowrap;overflow: hidden;width: 400px;"><a class="work-item-title-link" href="'+item.Url+'" tabindex="-1" target="_parent">'+workItemType[item.WorkItemType]+itemName+'</a></span></td>';
    row +=
      '<td style="padding:5px 2px 5px 2px"><span style="display: inline-block;text-overflow: ellipsis;white-space: nowrap;overflow: hidden;width: 500px;"><a class="work-item-title-link" href="' +
      item.Url +
      '" tabindex="-1" target="_parent"><img src="' +
      workItemTypesStyle.iconUrl +
      '" width="14px" />' +
      itemName +
      '</a></span></td>';

    row +=
      '<td width="10%" style="padding:5px 2px 5px 2px"><span style="display: inline-block;text-overflow: ellipsis;white-space: nowrap;overflow: hidden;width: 80px;">' +
      item.AssignedTo +
      '</span></td>';
    row += '<td width="5%" align="right" style="padding:5px 2px 5px 2px;">' + item.StoryPoints + '</td>';
    row += '<td width="12%" style="padding:5px 2px 5px 2px">' + decoratorWorkItemStateColor + item.State + '</div></td>';
    row += '<td width="5%" align="right" style="padding:5px 2px 5px 2px;">' + item.Days + '</td>';
    row += '</tr>';
    $('#mainContainer').append(row);
  }

  $('#mainContainer').append('</table>');
}

function CreateProgressChart(WidgetHelpers, TFS_Core_Contracts, TFS_Wit_WebApi, TFS_Work_WebApi, TFS_Core_WebApi) {
  $('#mainContainer').empty();
  TFSWorkWebApi = TFS_Work_WebApi;
  TFSWitWebApi = TFS_Wit_WebApi;
  teamContext = { projectId: VSS.getWebContext().project.id, teamId: VSS.getWebContext().team.id, project: '', team: '' };

  TFS_Work_WebApi.getClient()
    .getTeamIterations(teamContext, 'current')
    .then(function (iterations) {
      currentIteration = iterations[0];
      startDate = new Date(currentIteration.attributes.startDate.toDateString());
      finishDate = new Date(currentIteration.attributes.finishDate.toDateString());

      calendar = {};
      for (var d = new Date(startDate.toDateString()); d <= finishDate; d.setDate(d.getDate() + 1)) {
        calendar[d.toDateString()] = { New: 0, Active: 0, Resolved: 0, UAT: 0, Closed: 0 };
      }
      var query =
        "select [System.Id], [System.WorkItemType], [System.Title], [System.AssignedTo], [System.State], [System.Tags], [Microsoft.VSTS.Scheduling.StoryPoints] from WorkItems where [System.TeamProject] = 'B-Ops' and [System.WorkItemType] <> 'Feature' and [System.WorkItemType] <> 'Task' and [System.State] <> 'Removed'";
      query += " and [System.AreaPath] Under 'B-Ops' ";
      query += " and [System.IterationPath] = '";
      query += currentIteration.path;
      query += "' order by [System.Id]";

      var wiql = { query: query };
      TFS_Wit_WebApi.getClient()
        .queryByWiql(wiql, teamContext.projectId, teamContext.teamId)
        .then(function (queryResult) {
          var allWorkItemIds = [];
          queryResult.workItems.forEach((element) => {
            allWorkItemIds.push(element.id);
          });

          TFSWorkWebApi.getClient()
            .getTeamDaysOff(teamContext, currentIteration.id)
            .then(function (teamDaysOff) {
              holidays = [];

              teamDaysOff.daysOff.forEach((tdO) => {
                var localStartDate = tdO.start;
                var localFinishDate = tdO.end;
                for (var d = new Date(localStartDate.toDateString()); d <= localFinishDate; d.setDate(d.getDate() + 1)) {
                  holidays.push(d.toDateString());
                }
              });

              var userStories = [];
              TFS_Wit_WebApi.getClient()
                .getWorkItems(allWorkItemIds)
                .then(function (workItemsResults) {
                  for (var i = 0; i < workItemsResults.length; i++) {
                    var r = workItemsResults[i];
                    var title = r.fields['System.Title'];
                    var activatedDate = r.fields['Microsoft.VSTS.Common.ActivatedDate'];
                    if (activatedDate) {
                      activatedDate = new Date(new Date(activatedDate).toDateString());
                    } else {
                      activatedDate = Date.today();
                    }

                    var resolvedDate = r.fields['Microsoft.VSTS.Common.ResolvedDate'];
                    if (resolvedDate) {
                      resolvedDate = new Date(new Date(resolvedDate).toDateString());
                    } else {
                      resolvedDate = Date.today();
                    }

                    var assignedTo = r.fields['System.AssignedTo'];
                    if (!assignedTo) {
                      assignedTo = '';
                    }

                    var points = r.fields['Microsoft.VSTS.Scheduling.StoryPoints'];
                    if (!points) {
                      points = 0;
                    }

                    userStories.push({
                      Title: title,
                      WorkItemType: r.fields['System.WorkItemType'],
                      StackRank: r.fields['Microsoft.VSTS.Common.StackRank'],
                      Url: 'https://dev.azure.com/ivamuno/B-Ops/_workitems?id=' + r.id,
                      AssignedTo: assignedTo,
                      State: r.fields['System.State'],
                      ActivatedDate: activatedDate,
                      ResolvedDate: resolvedDate,
                      Days: computeTimeDiff(resolvedDate, activatedDate, holidays),
                      StoryPoints: points,
                    });

                    if (userStories.length === allWorkItemIds.length) {
                      getColors(userStories);
                    }
                  }
                });
            });
        });
    });
}

VSS.require(
  ['TFS/Dashboards/WidgetHelpers', 'TFS/Core/Contracts', 'TFS/WorkItemTracking/RestClient', 'TFS/Work/RestClient', 'TFS/Core/RestClient'],

  CreateProgressChart,
);
