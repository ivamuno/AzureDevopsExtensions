import * as Entities from './Entities';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';
import Collections = require('typescript-collections');
import * as TestInterfaces from 'azure-devops-node-api/interfaces/TestInterfaces';
import * as GitInterfaces from 'azure-devops-node-api/interfaces/GitInterfaces';
import * as WorkItemTrackingInterfaces from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';

export class BuildDetails {
    buildId: number;
    buildDetails: BuildInterfaces.Build;
    buildUsage: Entities.BuildUsage;

    buildCodeCoverage: TestInterfaces.CodeCoverageSummary;
    buildAttachments: BuildInterfaces.Attachment[];
    buildTestRun: TestInterfaces.TestResultSummary;

    commits: GitInterfaces.GitCommit[];
    pullRequests: GitInterfaces.GitPullRequest[];
    pullRequestWorkItems: Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem[]>;

    parentWorkItems: Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem>;

    private buildUsageTollGatesVariableRef = 'RNG_UseFor_TollGates';
    private buildUsageReleaseNotesVariableRef = 'RNG_UseFor_ReleaseNotes';

    constructor(buildId: number, buildDetails: BuildInterfaces.Build, buildDefinition: BuildInterfaces.BuildDefinition, commits: GitInterfaces.GitCommit[]) {
        this.buildId = buildId;
        this.buildDetails = buildDetails;
        this.buildUsage = this.getBuildUsage(buildDefinition);
        this.commits = commits;
        this.buildCodeCoverage = undefined;
        this.buildAttachments = undefined;
        this.buildTestRun = undefined;
        this.pullRequests = undefined;
        this.pullRequestWorkItems = undefined;
        this.parentWorkItems = undefined;
    }

    getBuildUsage(buildDefinition: BuildInterfaces.BuildDefinition): Entities.BuildUsage {

        if (buildDefinition && buildDefinition.variables) {
            const tollGatesVariable = buildDefinition.variables[this.buildUsageTollGatesVariableRef];
            const releaseNotesVariable = buildDefinition.variables[this.buildUsageReleaseNotesVariableRef];

            const isTollGates = !!tollGatesVariable && tollGatesVariable.value.toLocaleLowerCase() === 'true';
            const isReleaseNotes = !!releaseNotesVariable && releaseNotesVariable.value.toLocaleLowerCase() === 'true';

            if (isReleaseNotes && isTollGates) {
                return Entities.BuildUsage.Both;
            }
            if (isReleaseNotes) {
                return Entities.BuildUsage.ReleaseNotes;
            }
            if (isTollGates) {
                return Entities.BuildUsage.TollGates;
            }
        }

        return Entities.BuildUsage.None;
    }
}