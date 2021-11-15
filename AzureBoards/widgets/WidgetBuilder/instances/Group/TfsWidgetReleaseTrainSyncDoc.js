year = '2020';
quarter = 'Q1';

teams = {};
teams['Jaguars'] = { TeamName: 'Jaguars', TeamProject: 'CRM', AreaPath: 'CRM\\Team C', DisplayName: 'Jaguars', iterations: [] };
teams['RedOctober'] = { TeamName: 'Merchant Boarding Team', TeamProject: 'Merchant Boarding', DisplayName: 'Red Oktober', AreaPath: 'Merchant Boarding', iterations: [] };
teams['Vikings'] = { TeamName: 'Vikings', TeamProject: 'Payvision 4.0', AreaPath: 'Payvision 4.0\\Team V', DisplayName: 'Vikings', iterations: [] };
teams['B-Ops'] = { TeamName: 'Resistance', TeamProject: 'B-Ops', AreaPath: 'B-Ops', DisplayName: 'Resistance', iterations: [] };
teams['Warriors'] = { TeamName: 'The Warriors', TeamProject: 'Warriors', AreaPath: 'Warriors\\Team W', DisplayName: 'Warriors', iterations: [] };
teams['DataFactory'] = { TeamName: 'Data Services Team', TeamProject: 'Data Services', AreaPath: 'Data Services', DisplayName: 'DataServices', iterations: [] };
teams['Falcon V'] = { TeamName: 'Falcon V', TeamProject: 'Falcon Dev', AreaPath: 'Falcon Dev', DisplayName: 'Falcon V', iterations: [] };

teams['AXpendables'] = { TeamName: 'The Axpendables', TeamProject: 'ERP', AreaPath: 'ERP\\Team AX', DisplayName: 'AXpendables', iterations: [] };
teams['Mercury'] = { TeamName: 'Mercury', TeamProject: 'Product and Pricing', AreaPath: 'Product and Pricing', DisplayName: 'Mercury', iterations: [] };
teams['Saturn'] = { TeamName: 'Saturn', TeamProject: 'Juno', AreaPath: 'Juno\\TLM', DisplayName: 'Saturn', iterations: [] };
teams['Neptune'] = { TeamName: 'Neptune', TeamProject: 'Juno', AreaPath: 'Juno\\AutoRek', DisplayName: 'Neptune', iterations: [] };

teams['Hyperion'] = { TeamName: 'Hyperion Team', TeamProject: 'Hyperion', AreaPath: 'Hyperion', DisplayName: 'Hyperion', iterations: [] };

teams['Samurai'] = { TeamName: 'Samurai', TeamProject: 'AceHub', AreaPath: 'AceHub', DisplayName: 'Samurais', iterations: [] };
teams["Night'sWatch"] = { TeamName: 'Nights Watch', TeamProject: 'NightsWatch', AreaPath: 'NightsWatch', DisplayName: "Night'sWatch", iterations: [] };
teams['AvenJers'] = { TeamName: 'AvenJers', TeamProject: 'Payvision 4.0', AreaPath: 'Payvision 4.0\\AvenJers', DisplayName: 'Avenjers', iterations: [] };
teams['FightClub'] = { TeamName: 'FightClub', TeamProject: 'ACEProtect', AreaPath: 'ACEProtect', DisplayName: 'FightClub', iterations: [] };

today = new Date();

stateOrder = {};
stateOrder['New'] = 1;
stateOrder['Ready'] = 2;
stateOrder['Active'] = 3;
stateOrder['Resolved'] = 4;
stateOrder['UAT'] = 5;
stateOrder['Closed'] = 6;
stateOrder['Postponed'] = 7;

legend = {};
legend['Unplanned'] = { Color: '#0000FF44' };
legend['Problem'] = { Color: '#FF000044' };
legend['Warning'] = { Color: '#FFFF0044' };
lateDeliverColor = '#FF000000';

quarterStart = new Date(2050, 1, 1);
quarterFinish = new Date(2019, 1, 1);
grid = null;
features2sync = {};
currentTeam = null;
currentIteration = null;
teamIterations = {};

function strip(html) {
  var tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
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
          console.log('TfsWidgetReleaseTrainSyncDoc.item', item);
          var state = item.states[j];
          statesStyles[state.name] = state.color;
        }

        workItemTypesStyles[item.name] = { color: item.color, iconUrl: item.icon.url, statesStyles: statesStyles };
      }

      getFeatures(defaultTeam);
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

  var query = 'select [System.Id]';
  query += ' from WorkItems ';
  query += " where [System.TeamProject] = '" + team.TeamProject + "'";
  query += "  and [System.WorkItemType] = 'Feature'";
  query += "  and [System.State] <> 'Removed'";
  query += "  and [System.AreaPath] Under '" + team.AreaPath + "' ";
  query += '  and (';
  query += "  	([Microsoft.VSTS.Scheduling.TargetDate] >= '" + quarterStart.toDateString() + "' and [Microsoft.VSTS.Scheduling.TargetDate] <= '" + quarterFinish.toDateString() + "')";
  query += "  	or [System.IterationPath] Under '" + quarterIterationPath + "')";
  query += ' order by [System.Id]';

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
          loadChanges(workItemsResults);
        });
    });
}

function loadChanges(workItemsResults) {
  for (var i = 0; i < workItemsResults.length; i++) {
    let r = workItemsResults[i];
    features2sync[r.id] = { Id: r.id, Fields: r.fields, Comment: null, Links: [], Parent: null };

    var commentsLoaded = 0;
    TFSWitWebApi.getClient()
      .getComments(r.id)
      .then(function (comments) {
        for (var k = 0; k < comments.count; k++) {
          var commentHtmlText = comments.comments[k].text;
          if (commentHtmlText) {
            var commentText = strip(commentHtmlText);
            var commentChangeIndexOf = commentText.indexOf('##Change:');
            if (commentChangeIndexOf != -1) {
              features2sync[r.id].Comment = commentText.substring(commentChangeIndexOf + 9);
            }
          }
        }

        if (++commentsLoaded == workItemsResults.length) {
          loadParents(workItemsResults);
        }
      });
  }
}

function loadParents(workItemsResults) {
  var parents = [];
  for (var i = 0; i < workItemsResults.length; i++) {
    let r = workItemsResults[i];
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

        loadDependencies(workItemsResults);
      })
      .catch(function (err) {
        loadDependencies(workItemsResults);
      });
  } else {
    loadDependencies(workItemsResults);
  }
}

function loadDependencies(workItemsResults) {
  var dependencies = [];
  for (var i = 0; i < workItemsResults.length; i++) {
    let r = workItemsResults[i];
    if (r && r.relations) {
      for (var j = 0; j < r.relations.length; j++) {
        var relation = r.relations[j];
        if (relation.rel === 'System.LinkTypes.Dependency-Reverse') {
          var dependencyUrl = relation.url;
          var dependencyId = dependencyUrl.substring(dependencyUrl.lastIndexOf('/') + 1);
          dependencies.push(dependencyId);

          var link = { Id: dependencyId, Comment: '', Team: '', r: null };
          var commentRel = relation.attributes.comment;
          if (commentRel) {
            link.Comment = commentRel;
          }

          features2sync[r.id].Links.push(link);
        }
      }
    }
  }

  if (dependencies.length != 0) {
    TFSWitWebApi.getClient()
      .getWorkItems(dependencies)
      .then(function (dependenciesResults) {
        for (var k = 0; k < dependenciesResults.length; k++) {
          var dependencyResult = dependenciesResults[k];
          for (var key in features2sync) {
            var links = features2sync[key].Links;
            if (links) {
              for (var x = 0; x < links.length; x++) {
                var link = links[x];
                if (link.Id == dependencyResult.id) {
                  link.Fields = dependencyResult.fields;
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
  linkTargetDate.setDate(linkTargetDate.getDate() - 1);
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

function convertToGridSource() {
  var gridSource = [];
  console.log('TfsWidgetReleaseTrainSyncDoc.Features: ', features2sync);
  for (var key in features2sync) {
    var feature = features2sync[key];

    var reason = null;
    if (feature.Comment) {
      reason = feature.Comment;
    }

    var featureTargetDate = new Date(feature.Fields['Microsoft.VSTS.Scheduling.TargetDate']);
    var featureIterationPath = feature.Fields['System.IterationPath'];
    var featureIterationDate = null;

    var featureEta = '';
    var featureEstimation = '';
    for (var i = 0; i < currentTeam.iterations.length; i++) {
      var iteration = currentTeam.iterations[i];

      teamIterations[iteration.name] = { startDate: iteration.startDate, finishDate: iteration.finishDate };
      if (featureTargetDate >= iteration.startDate && featureTargetDate <= iteration.finishDate) {
        featureEta = getEtaValue(iteration);
      }

      if (featureIterationPath == iteration.path) {
        featureIterationDate = iteration.finishDate;
        featureEstimation = getEtaValue(iteration);
      }
    }

    if (featureIterationDate < new Date(quarterStart)) {
      console.log('TfsWidgetReleaseTrainSyncDoc.filtered', featureIterationDate, feature);
      continue;
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
      fr: reason,
      fpi: getIteration(feature.Fields['System.IterationPath']),
      feta: featureEta,
      fetaDate: featureIterationDate,
      letaDate: null,
      fest: featureEstimation == '' ? ' ' : featureEstimation,
      fUnplanned: featureEta == '',
      lt: '',
      lComment: '',
      priority: feature.Fields['Microsoft.VSTS.Common.Priority'],
      children: [],
    };

    var linkTeamDependencies = [];
    var hasUnsolvedDependencies = false;
    for (var i = 0; i < feature.Links.length; i++) {
      var link = feature.Links[i];
      var linkTeam = link.Fields['Payvision.Team'];

      var linkIterationPath = link.Fields['System.IterationPath'];
      var currentLinkTeam = teams[linkTeam];
      if (!currentLinkTeam) {
        currentLinkTeam = currentTeam;
      }

      var linkEta = getEta(currentLinkTeam, link);
      var linkEstimation = getEtaEstimate(currentLinkTeam, link);

      var linkIterationDate = null;
      for (var j = 0; j < currentLinkTeam.iterations.length; j++) {
        var iteration = currentLinkTeam.iterations[j];
        var iterationPath = iteration.path;
        if (linkIterationPath == iterationPath) {
          linkIterationDate = iteration.finishDate;
        }
      }

      var linkStateName = link.Fields['System.State'];

      if (linkStateName === 'Active' || linkStateName === 'New' || linkStateName === 'Ready') {
        linkTeamDependencies.push(linkTeam);
        hasUnsolvedDependencies = true;
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
        fest: linkEstimation,
        fUnplanned: linkEta == '',
        lt: linkTeam,
        lComment: link.Comment,
        priority: link.Fields['Microsoft.VSTS.Common.Priority'],
      };
      gridSourceItem.children.push(child);
    }

    gridSourceItem.lt = linkTeamDependencies.join(', ');
    gridSourceItem.collapsed = !hasUnsolvedDependencies;
    gridSource.push(gridSourceItem);
  }

  drawTable(gridSource);
}

function drawTable(gridSource) {
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
      {
        text: 'Feature',
        index: 'fn',
        width: 500,
        indent: true,
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
          var gridCell = $("<div class='grid-cell'/>").width(column.width);
          gridCell.css('text-indent', 16 * (level - 1) + 'px');

          var fetaDate = new Date(this.getColumnValue(dataIndex, 'fetaDate')).getTime();
          var state = this.getColumnValue(dataIndex, 'fsName');
          if (this.getColumnValue(dataIndex, 'letaDate') && (state === 'Active' || state === 'New' || state === 'Ready')) {
            var letaDate = new Date(this.getColumnValue(dataIndex, 'letaDate')).getTime();
            if (letaDate === fetaDate) {
              rowInfo.row.context.style.backgroundColor = legend['Warning'].Color;
            } else if (letaDate > fetaDate) {
              rowInfo.row.context.style.backgroundColor = legend['Problem'].Color;
            }
          }

          if (today > fetaDate && (state === 'Active' || state === 'New' || state === 'Ready')) {
            rowInfo.row.context.style.backgroundColor = legend['Problem'].Color;
          }

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
      { text: 'Dependency', index: 'lt', width: 100 },
      { text: 'ETA', index: 'fest', width: 140 },
      {
        text: 'RT ETA',
        index: 'feta',
        width: 130,
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
          var gridCell = $("<div class='grid-cell'/>").width(column.width);

          var titleText = $("<div style='display:inline' />").text(this.getColumnValue(dataIndex, 'feta'));
          gridCell.append(titleText);

          if (this.getColumnValue(dataIndex, 'pn')) {
            var iteration = teamIterations[this.getColumnValue(dataIndex, 'fpi')];
            if (iteration) {
              var state = this.getColumnValue(dataIndex, 'fsName');

              if (
                this.getColumnValue(dataIndex, 'feta') &&
                this.getColumnValue(dataIndex, 'fest') > this.getColumnValue(dataIndex, 'feta') &&
                (state === 'Closed' || state === 'Resolved') &&
                showLateDeliver
              ) {
                gridCell.css('backgroundColor', lateDeliverColor);
                gridCell.addClass('grid-cell-rt-eta');
              }

              if (
                this.getColumnValue(dataIndex, 'fest') &&
                this.getColumnValue(dataIndex, 'feta') &&
                this.getColumnValue(dataIndex, 'fest') > this.getColumnValue(dataIndex, 'feta') &&
                (state === 'Active' || state === 'New' || state === 'Ready')
              ) {
                rowInfo.row.context.style.backgroundColor = legend['Problem'].Color;
              }
            }
          }

          return gridCell;
        },
      },
      {
        text: 'Comment',
        index: 'lComment',
        width: 370,
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
          var divContent = '';
          if (this.getColumnValue(dataIndex, 'lComment')) {
            divContent = this.getColumnValue(dataIndex, 'lComment');
          } else {
            divContent = this.getColumnValue(dataIndex, 'fr');
          }

          return $("<div class='grid-cell'>" + (divContent || '') + '</div>').width(column.width || 370);
        },
      },
    ],
  };

  grid = VSSControls.create(VSSControlsGrids.Grid, $('#container'), gridOptions);
  grid.setSelectedRowIndex(-1);
  //grid.collapseAll();
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
    var legendText = key;
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

function drawPayvisionTeams(ivamunoTeamItems) {
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
          var finishDate = teamIteration.attributes.finishDate;
          var isCurrent = today >= startDate && today <= finishDate;
          team.iterations.push({ startDate: startDate, finishDate: finishDate, path: teamIteration.path, name: teamIteration.name, isCurrent: isCurrent });
        }

        if (++getTeamIterationsCount == Object.keys(teams).length) {
          drawLegend();
          drawPayvisionTeams(ivamunoTeamItems);
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
          drawPayvisionTeams(ivamunoTeamItems);
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
