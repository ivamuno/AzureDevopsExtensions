year = '2019';
quarter = 'Q3';

teams = {};
teams['B-Ops'] = { TeamName: 'Resistance', TeamProject: 'B-Ops', AreaPath: 'B-Ops', DisplayName: 'Resistance', iterations: [] };

today = new Date();

stateOrder = {};
stateOrder['New'] = 1;
stateOrder['Ready'] = 2;
stateOrder['Active'] = 3;
stateOrder['Resolved'] = 4;
stateOrder['UAT'] = 5;
stateOrder['Closed'] = 6;
stateOrder['Postponed'] = 7;

isNotStarted = ['New', 'Ready', 'Postponed'];
isNotActive = isNotStarted.concat(['Closed']);

legend = {};
legend['Unplanned'] = { Color: '#0000FF44', Label: 'Unplanned' };
legend['Problem'] = { Color: '#FF000044', Label: 'Problem' };
legend['Current'] = { Color: '#00FF0044', Label: 'Current Sprint' };
lateDeliverColor = '#FF000000';

quarterStart = new Date(2050, 1, 1);
quarterFinish = new Date(2019, 1, 1);
grid = null;
features2sync = {};
currentTeam = null;
currentIteration = null;
teamIterations = {};

function addDays(date, days) {
  var date = new Date(date.valueOf());
  date.setDate(date.getDate() + days);
  return date;
}

function convertDate(inputFormat) {
  function pad(s) {
    return s < 10 ? '0' + s : s;
  }
  var d = new Date(inputFormat);
  return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('/');
}

function getIteration(iterationPath) {
  return iterationPath.substring(iterationPath.lastIndexOf('\\') + 1);
}

function getQuarter(iterationPath) {
  return iterationPath.substring(0, iterationPath.lastIndexOf('\\'));
}

function getShortQuarter(iterationPath) {
  return iterationPath.substring(iterationPath.length - 5, iterationPath.length - 3);
}

workItemTypesStyles = {};
function getWorkItemTypesStyles() {
  TFSWitWebApi.getClient()
    .getWorkItemTypes(VSS.getWebContext().project.name)
    .then(function (workItemIcons) {
      for (var i = 0; i < workItemIcons.length; i++) {
        var item = workItemIcons[i];
        var statesStyles = {};
        for (var j = 0; j < item.states.length; j++) {
          var state = item.states[j];
          statesStyles[state.name] = state.color;
        }

        workItemTypesStyles[item.name] = { color: item.color, iconUrl: item.icon.url, statesStyles: statesStyles };
      }

      getFeatures(defaultTeam);
    });
}

function getExtraFeatures(workItemsResults) {
  var query = `select [System.Id] 
	from WorkItems 
	where [System.TeamProject] = '${currentTeam.TeamProject}' 
	 and [System.WorkItemType] = 'Feature' 
	 and [System.State] <> 'Removed' 
	 and [System.AreaPath] Under '${currentTeam.AreaPath}' 
	 and [System.Title] Contains '${year}' 
	 and ( 
	 	[System.Title] Contains 'Operations' 
	 	or [System.Title] Contains 'Other' 
	 	or [System.Title] Contains 'Training' 
	 	or [System.Title] Contains 'Maintenance' 
	 	or [System.Title] Contains 'Backend support' 
	 	or [System.Title] Contains 'Training program') 
	order by [System.Id]`;

  var wiql = { query: query };
  TFSWitWebApi.getClient()
    .queryByWiql(wiql, teamContext.projectId, teamContext.teamId)
    .then(function (queryResult) {
      if (queryResult.workItems.length == 0) {
        loadParents(workItemsResults);
        console.log('There are no work items.', queryResult);
        return;
      }
      var allWorkItemIds = [];
      queryResult.workItems.forEach((element) => {
        allWorkItemIds.push(element.id);
      });

      TFSWitWebApi.getClient()
        .getWorkItems(allWorkItemIds, null, null, TFSWitContracts.WorkItemExpand.Relations)
        .then(function (getWorkItemsResults) {
          for (var i = 0; i < getWorkItemsResults.length; i++) {
            let r = getWorkItemsResults[i];
            r.isExtra = true;
          }
          var workItems = getWorkItemsResults.concat(workItemsResults);
          loadParents(workItems);
        });
    });
}

function getFeatures(team) {
  quarterStart = new Date(2050, 1, 1);
  quarterFinish = new Date(2019, 1, 1);
  grid = null;
  features2sync = {};
  currentTeam = team;
  currentIteration = null;
  teamIterations = {};
  quarterIterationPath = currentTeam.AreaPath;

  for (var i = 0; i < currentTeam.iterations.length; i++) {
    var iteration = currentTeam.iterations[i];
    if (today >= iteration.startDate && today <= iteration.finishDate) {
      currentIteration = iteration;
    }

    if (iteration.path.includes(year) && iteration.path.includes(quarter)) {
      if (iteration.startDate < quarterStart) {
        quarterStart = iteration.startDate;
      }

      if (iteration.finishDate > quarterFinish) {
        quarterFinish = iteration.finishDate;
      }

      quarterIterationPath = getQuarter(iteration.path);
    }
  }

  var query = `select [System.Id] 
	from WorkItems 
	where [System.TeamProject] = '${team.TeamProject}' 
		and [System.WorkItemType] = 'Feature' 
		and [System.State] <> 'Removed' 
		and [System.AreaPath] Under '${team.AreaPath}' 
		and (
			([Microsoft.VSTS.Scheduling.TargetDate] >= '${quarterStart.toDateString()}' and [Microsoft.VSTS.Scheduling.TargetDate] <= '${quarterFinish.toDateString()}') 
				or [System.IterationPath] Under '${quarterIterationPath}') 
	order by [System.Id]`;

  var wiql = { query: query };
  TFSWitWebApi.getClient()
    .queryByWiql(wiql, teamContext.projectId, teamContext.teamId)
    .then(function (queryResult) {
      if (queryResult.workItems.length == 0) {
        console.log('There are no work items.', queryResult);
        return;
      }
      var allWorkItemIds = [];
      queryResult.workItems.forEach((element) => {
        allWorkItemIds.push(element.id);
      });

      TFSWitWebApi.getClient()
        .getWorkItems(allWorkItemIds, null, null, TFSWitContracts.WorkItemExpand.Relations)
        .then(function (workItemsResults) {
          var filterdWorkItemsResults = [];
          for (var i = 0; i < workItemsResults.length; i++) {
            let r = workItemsResults[i];
            r.isExtra = false;
            var featureIterationDate = null;
            for (var j = 0; j < currentTeam.iterations.length; j++) {
              var iteration = currentTeam.iterations[j];
              teamIterations[iteration.name] = { startDate: iteration.startDate, finishDate: iteration.finishDate };
              var featureIterationPath = r.fields['System.IterationPath'];
              if (featureIterationPath == iteration.path) {
                featureIterationDate = iteration.finishDate;
              }
            }

            if (featureIterationDate < new Date(quarterStart)) {
              console.log('TfsWidgetReleaseTrainSyncDoc.filtered', featureIterationDate, r);
            } else {
              filterdWorkItemsResults.push(r);
            }
          }

          getExtraFeatures(filterdWorkItemsResults);
        });
    });
}

function loadParents(workItemsResults) {
  var parents = [];
  for (var i = 0; i < workItemsResults.length; i++) {
    let r = workItemsResults[i];
    features2sync[r.id] = { Id: r.id, Fields: r.fields, Links: [], Parent: null, IsExtra: r.isExtra };
    if (r && r.relations) {
      for (var j = 0; j < r.relations.length; j++) {
        var relation = r.relations[j];
        if (relation.rel === 'System.LinkTypes.Hierarchy-Reverse') {
          var parentUrl = relation.url;
          var parentId = parentUrl.substring(parentUrl.lastIndexOf('/') + 1);
          features2sync[r.id].Parent = { Id: parentId, Name: '', Type: '' };
          parents.push(parentId);
        }
      }
    }
  }

  if (parents.length != 0) {
    TFSWitWebApi.getClient()
      .getWorkItems(parents)
      .then(function (parentsResults) {
        for (var k = 0; k < parentsResults.length; k++) {
          var parentsResult = parentsResults[k];
          for (var key in features2sync) {
            var parent = features2sync[key].Parent;
            if (parent && parent.Id == parentsResult.id) {
              parent.Name = parentsResult.fields['System.Title'];
              parent.Type = parentsResult.fields['System.WorkItemType'];
            }
          }
        }

        loadChildren(workItemsResults);
      })
      .catch(function (err) {
        loadChildren(workItemsResults);
      });
  } else {
    loadChildren(workItemsResults);
  }
}

function loadChildren(workItemsResults) {
  console.log('TfsWidgetReleaseTrainProgressDoc.workItemsResults', workItemsResults);
  var children = [];
  for (var i = 0; i < workItemsResults.length; i++) {
    let r = workItemsResults[i];
    if (r && r.relations) {
      for (var j = 0; j < r.relations.length; j++) {
        var relation = r.relations[j];
        if (relation.rel === 'System.LinkTypes.Hierarchy-Forward') {
          var childUrl = relation.url;
          var childId = childUrl.substring(childUrl.lastIndexOf('/') + 1);
          children.push(childId);

          var link = { Id: childId, Team: '', r: null };
          features2sync[r.id].Links.push(link);
        }
      }
    }
  }

  if (children.length != 0) {
    TFSWitWebApi.getClient()
      .getWorkItems(children)
      .then(function (childrenResults) {
        for (var k = 0; k < childrenResults.length; k++) {
          var childrenResult = childrenResults[k];
          for (var key in features2sync) {
            var links = features2sync[key].Links;
            if (links) {
              for (var x = 0; x < links.length; x++) {
                var link = links[x];
                if (link.Id == childrenResult.id) {
                  link.Fields = childrenResult.fields;
                }
              }
            }
          }
        }

        convertToGridSource();
      })
      .catch(function (err) {
        convertToGridSource();
      });
  } else {
    convertToGridSource();
  }
}

function getEtaValue(iteration) {
  var shortQuarter = getShortQuarter(iteration.path);
  if (!shortQuarter) {
    console.log('Invalid shortQuarter.', shortQuarter);
  }
  return convertDate(new Date(iteration.finishDate)) + ' (' + shortQuarter + '-' + iteration.path.substring(iteration.path.lastIndexOf('-') + 1) + ')';
}

function getEta(currentLinkTeam, link) {
  var linkTargetDate = new Date(link.Fields['Microsoft.VSTS.Scheduling.TargetDate']);
  for (var j = 0; j < currentLinkTeam.iterations.length; j++) {
    var iteration = currentLinkTeam.iterations[j];
    if (linkTargetDate >= iteration.startDate && linkTargetDate <= iteration.finishDate) {
      return getEtaValue(iteration);
    }
  }
}

function getEtaEstimate(currentLinkTeam, link) {
  var linkIterationPath = link.Fields['System.IterationPath'];
  for (var j = 0; j < currentLinkTeam.iterations.length; j++) {
    var iteration = currentLinkTeam.iterations[j];
    var iterationPath = iteration.path;
    if (linkIterationPath == iterationPath) {
      return getEtaValue(iteration);
    }
  }
}

function computeCycleTime(item) {
  return computeDiffTime(item, 'Microsoft.VSTS.Common.ActivatedDate', 'System.CreatedDate', 'Microsoft.VSTS.Common.ClosedDate', null);
}

function computeDevTime(item) {
  return computeDiffTime(item, 'Microsoft.VSTS.Common.ActivatedDate', 'System.CreatedDate', 'Microsoft.VSTS.Common.ResolvedDate', 'Microsoft.VSTS.Common.ClosedDate');
}

function computeReleaseTime(item) {
  return computeDiffTime(item, 'Microsoft.VSTS.Common.ResolvedDate', 'Microsoft.VSTS.Common.ClosedDate', 'Microsoft.VSTS.Common.ClosedDate', null);
}

function computeDiffTime(item, startState, fallbackStartState, endState, fallbackEndState) {
  var startDate = getDate(item, startState, fallbackStartState);
  var endDate = getDate(item, endState, fallbackEndState);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getDate(item, state, fallbackState) {
  var date = item.Fields[state];
  if (date) {
    return new Date(new Date(date).toDateString());
  }

  if (fallbackState) {
    return getDate(item, fallbackState, null);
  }

  return Date.today();
}

function convertToGridSource() {
  var gridSource = [];
  console.log('TfsWidgetReleaseTrainProgressDoc.Features: ', features2sync);
  for (var key in features2sync) {
    var feature = features2sync[key];
    var featureIterationDate = null;

    var featureEta = '';
    var featureEstimation = '';

    if (feature.IsExtra) {
      featureEstimation = convertDate(new Date(parseInt(year) + 1, 0));
      var filteredLinks = [];
      for (var i = 0; i < feature.Links.length; i++) {
        var link = feature.Links[i];
        var linkIterationPath = link.Fields['System.IterationPath'];
        if (linkIterationPath.includes(year) && linkIterationPath.includes(quarter)) {
          filteredLinks.push(link);
        }
      }

      feature.Links = filteredLinks;
    } else {
      var featureTargetDate = new Date(feature.Fields['Microsoft.VSTS.Scheduling.TargetDate']);
      var featureIterationPath = feature.Fields['System.IterationPath'];
      for (var i = 0; i < currentTeam.iterations.length; i++) {
        var iteration = currentTeam.iterations[i];

        if (featureTargetDate >= iteration.startDate && featureTargetDate <= iteration.finishDate) {
          featureEta = getEtaValue(iteration);
        }

        if (featureIterationPath == iteration.path) {
          featureIterationDate = iteration.finishDate;
          featureEstimation = getEtaValue(iteration);
        }
      }
    }

    var stateName = feature.Fields['System.State'];
    var gridSourceItem = {
      pid: feature.Parent ? feature.Parent.Id : null,
      pt: feature.Parent ? feature.Parent.Type : null,
      pn: feature.Parent ? feature.Parent.Name : null,
      fid: feature.Id,
      fn: feature.Fields['System.Title'],
      ft: feature.Fields['System.WorkItemType'],
      fs: stateOrder[stateName],
      fsName: stateName,
      fpi: getIteration(feature.Fields['System.IterationPath']),
      feta: featureEta,
      fetaDate: featureIterationDate,
      letaDate: null,
      fest: featureEstimation == '' ? ' ' : featureEstimation,
      fUnplanned: featureEta == '',
      priority: feature.Fields['Microsoft.VSTS.Common.Priority'],
      size: 0,
      completed: 0,
      cycleTime: isNotStarted.includes(stateName) ? null : computeCycleTime(feature),
      devTime: null,
      releaseTime: null,
      isCurrentSprint: featureIterationDate && featureIterationDate.getTime() === currentIteration.finishDate.getTime(),
      isExtra: feature.IsExtra,
      collapsed: false,
      children: [],
    };

    var activePoints = 0;
    for (var i = 0; i < feature.Links.length; i++) {
      var link = feature.Links[i];
      var linkStateName = link.Fields['System.State'];
      if (linkStateName == 'Removed') {
        continue;
      }

      var linkTeam = link.Fields['Payvision.Team'];
      var linkIterationPath = link.Fields['System.IterationPath'];
      var currentLinkTeam = teams[linkTeam];
      if (!currentLinkTeam) {
        currentLinkTeam = currentTeam;
      }

      var linkEta = getEta(currentLinkTeam, link);

      var linkIterationDate = null;
      for (var j = 0; j < currentLinkTeam.iterations.length; j++) {
        var iteration = currentLinkTeam.iterations[j];
        var iterationPath = iteration.path;
        if (linkIterationPath == iterationPath) {
          linkIterationDate = iteration.finishDate;
        }
      }

      var child = {
        pid: feature.Id,
        pt: null,
        pn: null,
        fid: link.Id,
        fn: link.Fields['System.Title'],
        ft: link.Fields['System.WorkItemType'],
        fs: stateOrder[linkStateName],
        fsName: linkStateName,
        fr: null,
        fpi: getIteration(link.Fields['System.IterationPath']),
        feta: linkEta,
        fetaDate: featureIterationDate,
        letaDate: linkIterationDate,
        fest: null,
        fUnplanned: linkEta == '',
        size: link.Fields['Microsoft.VSTS.Scheduling.StoryPoints'],
        completed: null,
        cycleTime: isNotStarted.includes(linkStateName) ? null : computeCycleTime(link),
        devTime: isNotStarted.includes(linkStateName) ? null : computeDevTime(link),
        releaseTime: isNotStarted.includes(linkStateName) ? null : computeReleaseTime(link),
        isCurrentSprint: linkIterationDate && linkIterationDate.getTime() === currentIteration.finishDate.getTime(),
        isExtra: false,
        priority: link.Fields['Microsoft.VSTS.Common.Priority'],
      };
      gridSourceItem.size += isNaN(child.size) ? 0 : child.size;
      activePoints += linkStateName == 'Closed' ? child.size : 0;

      gridSourceItem.children.push(child);
    }

    gridSourceItem.completed = gridSourceItem.size == 0 && stateName == 'Closed' ? 100 : Math.round((activePoints / gridSourceItem.size) * 10000) / 100;
    gridSourceItem.completed = isNaN(gridSourceItem.completed) ? 0 : gridSourceItem.completed;
    var isExpanded = !isNotActive.includes(stateName) || gridSourceItem.children.find((c) => c.isCurrentSprint) != undefined;
    gridSourceItem.collapsed = !isExpanded;
    gridSource.push(gridSourceItem);
  }

  drawTable(gridSource);
}

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

function computeItemSize(storyPoints) {
  if (storyPoints < 2) {
    return Size1;
  }

  if (storyPoints < 3) {
    return Size2;
  }

  if (storyPoints < 5) {
    return Size3;
  }

  if (storyPoints < 8) {
    return Size5;
  }

  return Size8;
}

function computeDaysColor(state, storyPoints, days) {
  if (['Resolved', 'UAT', 'Closed'].includes(state)) {
    return { fore: 'black', back: 'transparent' };
  }

  var itemSize = computeItemSize(storyPoints);
  var warning = warnings[itemSize];
  if (days >= warning.stop) {
    return { fore: 'white', back: '#000000ff' };
  }

  if (days >= warning.critical) {
    return { fore: 'black', back: '#ff0000ff' };
  }

  if (days >= warning.medium) {
    return { fore: 'black', back: '#ff000088' };
  }

  if (days >= warning.low) {
    return { fore: 'black', back: '#ff9933ff' };
  }

  return { fore: 'black', back: 'transparent' };
}

function drawTable(gridSource) {
  console.log('TfsWidgetReleaseTrainProgressDoc.gridSource', gridSource);
  var gridOptions = {
    height: '100%',
    width: '100%',
    source: new VSSControlsGrids.GridHierarchySource(gridSource),
    sortOrder: [
      { index: 'fest', order: 'asc' },
      { index: 'fs', order: 'desc' },
    ],
    columns: [
      {
        text: 'State',
        index: 'fs',
        width: 90,
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
          var indent = '0px';
          var gridCell = $("<div class='grid-cell' style='margin-left:" + indent + "'/>").width(column.width);
          var decorator = $("<div class='state-circle' style='float:left; border-radius:50%; width:10px; height: 10px; margin-top: 4px; margin-right: 5px;' />");

          var workItemType = this.getColumnValue(dataIndex, 'ft');
          var state = this.getColumnValue(dataIndex, 'fsName');
          decorator.css('background-color', workItemTypesStyles[workItemType].statesStyles[state]);
          gridCell.append(decorator);

          var titleText = $("<div style='display:inline' />").text(state);
          gridCell.append(titleText);

          if (this.getColumnValue(dataIndex, 'fUnplanned')) {
            var workItemType = this.getColumnValue(dataIndex, 'ft');
            if (workItemType == 'Feature') {
              gridCell.css('backgroundColor', legend['Unplanned'].Color);
            }
          }

          return gridCell;
        },
      },
      { text: '(%)', index: 'completed', width: 75 },
      {
        text: 'Feature',
        index: 'fn',
        width: 500,
        indent: true,
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
          var gridCell = $("<div class='grid-cell'/>").width(column.width);
          gridCell.css('text-indent', 16 * (level - 1) + 'px');

          if (columnOrder === indentIndex && level > 0) {
            var indent = level * 16 - 13;
            column.indentOffset = indent;
            if (expandedState !== 0) {
              var treeSign = $("<div class='icon grid-tree-icon'/>").appendTo(gridCell).css('left', indent);
              if (expandedState > 0) {
                treeSign.addClass('bowtie-icon bowtie-chevron-down');
              } else {
                treeSign.addClass('bowtie-icon bowtie-chevron-right');
              }
            }
          }

          var workItemType = this.getColumnValue(dataIndex, 'ft');
          var decorator = $("<div style='display:inline; margin-left:15px'><img src='" + workItemTypesStyles[workItemType].iconUrl + "' width='14px' /></div>");

          var titleHref = $('<a>');
          titleHref.on('click', () => {
            TFSWitServices.WorkItemFormNavigationService.getService().then((service) => {
              service.openWorkItem(this.getColumnValue(dataIndex, 'fid'), false);
            });
          });
          titleHref.text(this.getColumnValue(dataIndex, 'fn'));

          if (this.getColumnValue(dataIndex, 'priority') == 1) {
            titleHref.css('font-weight', 'bold');
          }

          var titleText = titleHref.appendTo($("<div style='display:inline' />"));

          gridCell.append(decorator);
          gridCell.append(titleText);

          return gridCell;
        },
      },
      {
        text: 'Epic',
        index: 'pn',
        width: 350,
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
          var gridCell = $("<div class='grid-cell'/>").width(column.width);
          var workItemType = this.getColumnValue(dataIndex, 'pt');
          if (!workItemType) {
            return gridCell;
          }

          var decorator = $("<img src='" + workItemTypesStyles[workItemType].iconUrl + "' width='14px' />");

          var titleHref = $('<a>');
          titleHref.on('click', () => {
            TFSWitServices.WorkItemFormNavigationService.getService().then((service) => {
              service.openWorkItem(this.getColumnValue(dataIndex, 'pid'), false);
            });
          });
          titleHref.text(this.getColumnValue(dataIndex, 'pn'));
          var titleText = $("<div style='display:inline' />").add(titleHref);

          gridCell.append(decorator);
          gridCell.append(titleText);

          return gridCell;
        },
      },
      { text: 'ETA', index: 'fest', width: 140 },
      {
        text: 'RT ETA',
        index: 'feta',
        width: 130,
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
          var gridCell = $("<div class='grid-cell'/>").width(column.width);

          var titleText = $("<div style='display:inline' />").text(this.getColumnValue(dataIndex, 'feta'));
          gridCell.append(titleText);

          // Coloring child row.
          if (level == 2 && this.getColumnValue(dataIndex, 'isCurrentSprint')) {
            rowInfo.row.context.style.backgroundColor = legend['Current'].Color;
          }

          // Coloring Feature row.
          if (level == 1 && !this.getColumnValue(dataIndex, 'isExtra')) {
            var state = this.getColumnValue(dataIndex, 'fsName');
            var fetaDate = new Date(this.getColumnValue(dataIndex, 'fetaDate')).getTime();

            if (
              state != 'Closed' &&
              (today > fetaDate ||
                (this.getColumnValue(dataIndex, 'fest') && this.getColumnValue(dataIndex, 'feta') && this.getColumnValue(dataIndex, 'fest') > this.getColumnValue(dataIndex, 'feta')))
            ) {
              rowInfo.row.context.style.backgroundColor = legend['Problem'].Color;
            }

            if (this.getColumnValue(dataIndex, 'feta') && this.getColumnValue(dataIndex, 'fest') > this.getColumnValue(dataIndex, 'feta') && state === 'Closed' && showLateDeliver) {
              gridCell.css('backgroundColor', lateDeliverColor);
              gridCell.addClass('grid-cell-rt-eta');
            }
          }

          return gridCell;
        },
      },
      { text: 'Points', index: 'size', width: 75 },
      { text: 'Dev Time', index: 'devTime', width: 75 },
      { text: 'Release Time', index: 'releaseTime', width: 75 },
      {
        text: 'Cycle Time',
        index: 'cycleTime',
        width: 75,
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
          var gridCell = $("<div class='grid-cell'/>").width(column.width);

          if (level == 2) {
            var color = computeDaysColor(this.getColumnValue(dataIndex, 'fsName'), this.getColumnValue(dataIndex, 'size'), this.getColumnValue(dataIndex, 'cycleTime'));
            gridCell.css('color', color.fore);
            gridCell.css('backgroundColor', color.back);
          }

          var titleText = $("<div style='display:inline' />").text(this.getColumnValue(dataIndex, 'cycleTime'));
          gridCell.append(titleText);

          return gridCell;
        },
      },
    ],
  };

  grid = VSSControls.create(VSSControlsGrids.Grid, $('#container'), gridOptions);
  grid.setSelectedRowIndex(-1);
}

function drawExtra() {
  $('#extra').append('<input id="showLateDeliver" type="checkbox"><label>Highlight Late Deliver</label></button>');
  $('#showLateDeliver').on('click', function () {
    if ($(this).is(':checked')) {
      lateDeliverColor = lateDeliverColor.substring(0, 7) + '99';
    } else {
      lateDeliverColor = lateDeliverColor.substring(0, 7) + '00';
    }

    $('.grid-cell-rt-eta').css('backgroundColor', lateDeliverColor);
  });
}

function drawLegend() {
  $('#legend').append('<div style="float:left; display:inline;"><span style="font-weight: bold">Legend: </span></div>');
  for (var key in legend) {
    var legendText = legend[key].Label;
    var legendColor = legend[key].Color;
    $('#legend').append(
      '<div style="float:left; display:inline; margin-left: 5px;"><div class="state-circle" style="float: left; width: 10px; height: 10px; margin-top: 4px; margin-right: 1px; background-color: ' +
        legendColor +
        '"></div><span>' +
        legendText +
        '</span></div>',
    );
  }
}

function drawTeams(ivamunoTeamItems) {
  ivamunoTeamItems = ivamunoTeamItems.filter(function (ele) {
    return ele.grant;
  });
  VSSControls.create(VSSControlsNavigation.PivotFilter, $('#filter'), {
    behavior: 'dropdown',
    text: 'Payvision Team',
    items: ivamunoTeamItems,
    change: function (item) {
      $('#container').empty();
      getFeatures(teams[item.id]);
    },
  });

  defaultTeam = teams[ivamunoTeamItems[0].id];
}

function CreateProgressChart(TFS_Wit_WebApi, TFS_Wit_Contracts, TFS_Wit_Services, TFS_Work_WebApi, VSS_Controls, VSS_Controls_Grids, VSS_Controls_Navigation) {
  VSSControls = VSS_Controls;
  VSSControlsNavigation = VSS_Controls_Navigation;

  $('#mainContainer').empty();
  $('#mainContainer').append('<div id="filter" style="float: left;"></div>');
  $('#mainContainer').append('<div id="extra" style="float: right; margin-left: 10px; margin-right: 10px;"></div>');
  $('#mainContainer').append('<div id="legend" style="float: right; margin-left: 10px; margin-right: 10px;"></div>');
  $('#mainContainer').append('<div id="container"></div>');

  TFSWorkWebApi = TFS_Work_WebApi;
  TFSWitWebApi = TFS_Wit_WebApi;
  TFSWitContracts = TFS_Wit_Contracts;
  TFSWitServices = TFS_Wit_Services;
  VSSControlsGrids = VSS_Controls_Grids;

  var ivamunoTeamItems = [];
  var getTeamIterationsCount = 0;
  for (let key in teams) {
    teamContext = { project: teams[key].TeamProject, team: teams[key].TeamName };
    ivamunoTeamItems.push({ id: key, text: teams[key].DisplayName, value: teams[key], grant: true });

    TFSWorkWebApi.getClient()
      .getTeamIterations(teamContext)
      .then(function (teamIterationsResult) {
        for (var k = 0; k < teamIterationsResult.length; k++) {
          var teamIteration = teamIterationsResult[k];
          team = teams[key];
          var startDate = teamIteration.attributes.startDate;
          var finishDate = addDays(teamIteration.attributes.finishDate, 1);
          var isCurrent = today >= startDate && today <= finishDate;
          team.iterations.push({ startDate: startDate, finishDate: finishDate, path: teamIteration.path, name: teamIteration.name, isCurrent: isCurrent });
        }

        if (++getTeamIterationsCount == Object.keys(teams).length) {
          drawLegend();
          drawTeams(ivamunoTeamItems);
          drawExtra();
          getWorkItemTypesStyles();
        }
      })
      .catch(function (err) {
        for (var i = 0; i < ivamunoTeamItems.length; i++) {
          if (ivamunoTeamItems[i].id == key) {
            ivamunoTeamItems[i].grant = false;
          }
        }

        if (++getTeamIterationsCount == Object.keys(teams).length) {
          drawLegend();
          drawTeams(ivamunoTeamItems);
          drawExtra();
          getWorkItemTypesStyles();
        }
      });
  }
}

VSS.require(
  ['TFS/WorkItemTracking/RestClient', 'TFS/WorkItemTracking/Contracts', 'TFS/WorkItemTracking/Services', 'TFS/Work/RestClient', 'VSS/Controls', 'VSS/Controls/Grids', 'VSS/Controls/Navigation'],
  CreateProgressChart,
);
