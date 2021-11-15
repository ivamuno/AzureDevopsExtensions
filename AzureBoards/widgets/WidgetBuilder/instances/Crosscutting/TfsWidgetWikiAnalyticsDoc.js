async function getWiki() {
  const client = WikiRestClient.getClient();

  let pages = [];
  let continuationToken = 1;
  const top = 10;
  let batch;
  do {
    batch = await client.getPagesBatch(
      { pageViewsForDays: 30, continuationToken, top },
      project,
      wikiIdentifier
    );
    continuationToken = Math.max(...(batch.map(b => b.id)));
    pages = pages.concat(...batch);
  } while (batch.length === top);

  return pages;
};

function toGridHierarchySource(pagesBatch) {
  const result = [];
  for (const p of pagesBatch) {
    const rawPath = p.path;
    // All paths start with '/', we need to remove it to avoid creating another hierchary level.
    const path = rawPath.substring(1, rawPath.length);
    const pathParts = path.split('/');
    let pathPartsPointer = result;
    for (const pathPart of pathParts) {
      const pathPartsItem = (pathPartsPointer.children || pathPartsPointer).find(ppp => ppp.path == pathPart);
      if (pathPartsItem) {
        pathPartsPointer = pathPartsItem;
      } else {
        const viewStatsCount = (p.viewStats || []).reduce((a, c) => a + c.count, 0);
        const newPointer = {
          path: pathPart,
          id: p.id,
          viewStats: p.viewStats,
          viewStatsCount: viewStatsCount,
          totalViewStatsCount: viewStatsCount,
          children: [],
          collapsed: true
        };
        (pathPartsPointer.children || pathPartsPointer).push(newPointer);
        pathPartsPointer.totalViewStatsCount += viewStatsCount;
        pathPartsPointer = newPointer;
      }
    }
  }

  return result;
}

function getExpandCollapseColumn(type) {
  return {
    width: 20,
    fieldId: null,
    fixed: true,
    canSortBy: false,
    canMove: false,
    headerContainerCss: "expand-collapse-icons-header",
    getHeaderCellContents: function (column) {
      return $("<span>")
          .css("cursor", "pointer")
          .css("margin", "8 0 0 3")
          .addClass(`${type}-icon bowtie-icon bowtie-toggle-${type}`);
    },
  };
}

function render(stats) {
  const expandColumn = getExpandCollapseColumn("expand");
  const collapseColumn = getExpandCollapseColumn("collapse");
  const gridOptions = {
    height: "100%",
    width: "100%",
    source: new VSSControlsGrids.GridHierarchySource(stats),
    sortOrder: [],
    columns: [
      expandColumn,
      collapseColumn,
      {
        text: "Page",
        index: "path",
        width: 500,
        indent: true,
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
          const gridCell = $("<div>")
            .addClass("grid-cell")
            .width(column.width)
            .css("text-indent", (16 * (level - 1)) + "px");

          if (columnOrder === indentIndex && level > 0) {
            const indent = ((level * 16) - 13);
            column.indentOffset = indent;
            if (expandedState !== 0) {
              const treeSign = $("<div>")
                .css("left", indent)
                .addClass("icon grid-tree-icon")
                .appendTo(gridCell);
              if (expandedState > 0) {
                treeSign.addClass("bowtie-icon bowtie-chevron-down");
              }
              else {
                treeSign.addClass("bowtie-icon bowtie-chevron-right");
              }
            }
          }

          const decorator = $("<div>")
            .css("display", "inline")
            .css("margin-left", "15px");
          const webContext = VSS.getWebContext();
          const baseLinkUrl = (webContext.account || webContext.host).uri;
          const id = this.getColumnValue(dataIndex, "id");
          const titleHref = $("<a>")
            .attr("href", `${baseLinkUrl}${project}/_wiki/wikis/${wikiIdentifier}/${id}`)
            .attr("target", "_blank");
          titleHref.text(this.getColumnValue(dataIndex, "path"));

          const titleText = titleHref.appendTo($("<div>").css("display", "inline"));
          gridCell.append(decorator);
          gridCell.append(titleText);

          return gridCell;
        }
      },
      { text: "Page views", index: "viewStatsCount", width: 100 },
      { text: "Total views", index: "totalViewStatsCount", width: 100 }
    ]
  };

  grid = VSSControls.create(VSSControlsGrids.Grid, $("#container"), gridOptions);
  grid.setSelectedRowIndex(-1);
  expandColumn.onHeaderClick = function () { grid.expandAll(); };
  collapseColumn.onHeaderClick = function () { grid.collapseAll(); };
}

async function main(Wiki_RestClient, Wiki_Contracts, VSS_Controls, VSS_Controls_Grids) {
  VSSControls = VSS_Controls;
  VSSControlsGrids = VSS_Controls_Grids;
  WikiRestClient = Wiki_RestClient
  WikiContracts = Wiki_Contracts

  $("#mainContainer").empty();
  $("#mainContainer").append('<div id="filter" style="float: left;"></div>');
  $("#mainContainer").append('<div id="extra" style="float: right; margin-left: 10px; margin-right: 10px;"></div>');
  $("#mainContainer").append('<div id="legend" style="float: right; margin-left: 10px; margin-right: 10px;"></div>');
  $("#mainContainer").append('<div id="container"></div>');
  
  const stats = await getWiki();
  render(toGridHierarchySource(stats));
}

VSS.require([
  "TFS/Wiki/WikiRestClient",
  "TFS/Wiki/Contracts",
  "VSS/Controls",
  "VSS/Controls/Grids"
],
  main
);