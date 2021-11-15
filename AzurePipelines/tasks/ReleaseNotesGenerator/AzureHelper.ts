import tl = require('vsts-task-lib/task');
import Collections = require('typescript-collections');

import { Settings } from './Settings';

import { WebApi } from 'azure-devops-node-api/WebApi';
import * as VSSInterfaces from 'azure-devops-node-api/interfaces/common/VSSInterfaces';

import { IReleaseApi } from 'azure-devops-node-api/ReleaseApi';
import * as ReleaseInterfaces from 'azure-devops-node-api/interfaces/ReleaseInterfaces';

import { IBuildApi } from 'azure-devops-node-api/BuildApi';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';

import { IWorkItemTrackingApi } from 'azure-devops-node-api/WorkItemTrackingApi';
import * as WorkItemTrackingInterfaces from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';

import { IGitApi } from 'azure-devops-node-api/GitApi';
import * as GitInterfaces from 'azure-devops-node-api/interfaces/GitInterfaces';

import { ITestApi } from 'azure-devops-node-api/TestApi';
import * as TestInterfaces from 'azure-devops-node-api/interfaces/TestInterfaces';

import { WikiApi } from 'azure-devops-node-api/WikiApi';
import * as WikiInterfaces from 'azure-devops-node-api/interfaces/WikiInterfaces';
import './WikiExtensions';
import * as Entities from './Entities';
import * as BuildDetails from './BuildDetails';


export class AzureHelper {
    vstsWebApi: WebApi;
    settings: Settings;

    buildUriIndicator = 'vstfs:///Build/Build/';

    constructor(vstsWebApi: WebApi, settings: Settings) {
        this.vstsWebApi = vstsWebApi;
        this.settings = settings;
    }

    public async getRelease()
        : Promise<ReleaseInterfaces.Release> {
        console.log('Getting Release For ReleaseId: ' + this.settings.releaseId + '.');
        const client: IReleaseApi = await this.vstsWebApi.getReleaseApi();
        const release = await client.getRelease(this.settings.releaseProjectId, this.settings.releaseId, ReleaseInterfaces.ApprovalFilters.All);

        console.log('Got Release For ReleaseId: ' + this.settings.releaseId + '.');

        return release;
    }

    public async getReleaseTestResults(azureRelease: ReleaseInterfaces.Release)
        : Promise<Entities.TestResultsForRelease[]> {
        console.log('Getting Release test details For ReleaseId: ' + azureRelease.id + '.');
        const client: ITestApi = await this.vstsWebApi.getTestApi();

        const result: Entities.TestResultsForRelease[] = [];

        await Promise.all(
            azureRelease.environments.map(async environment => {
                const releaseTests = await client.queryTestResultsReportForRelease(azureRelease.projectReference.id, azureRelease.id, environment.id);
                result.push({ releaseEnvironmentId: environment.id, testResults: releaseTests });
            })
        );

        console.log('Got Release test details For ReleaseId: ' + azureRelease.id + '.');

        return result;
    }

    public async getPullRequestWorkItems(azurePullRequests: GitInterfaces.GitPullRequest[])
        : Promise<Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem[]>> {

        const result = new Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem[]>();

        await Promise.all(
            azurePullRequests.map(async pr => {
                console.log('Getting WorkItems For PullRequest: ' + pr.pullRequestId + '.');

                const gitClient: IGitApi = await this.vstsWebApi.getGitApi();
                const workItemRefs: VSSInterfaces.ResourceRef[] = await gitClient.getPullRequestWorkItemRefs(pr.repository.id, pr.pullRequestId, pr.repository.project.id);
                if (!workItemRefs || workItemRefs.length === 0) {
                    console.log('No workitems found to update.');
                    return result;
                }

                const workItemTrackingClient: IWorkItemTrackingApi = await this.vstsWebApi.getWorkItemTrackingApi();
                const workItems: WorkItemTrackingInterfaces.WorkItem[] = await workItemTrackingClient.getWorkItems(workItemRefs.map(wir => parseInt(wir.id)), undefined, undefined, WorkItemTrackingInterfaces.WorkItemExpand.All);
                result.setValue(pr.pullRequestId, workItems);
                console.log('Got WorkItems For PullRequest: ' + pr.pullRequestId + '.');
            })
        );

        return result;
    }

    public async getParentWorkItems(workItems: Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem[]>)
        : Promise<Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem>> {

        function getParentId(url: string): number {
            return parseInt(url.substring(url.lastIndexOf('/') + 1));
        }

        const result = new Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem>();

        await Promise.all(
            workItems.keys().map(async key => {
                const workItemsByBuild: WorkItemTrackingInterfaces.WorkItem[] = workItems.getValue(key);

                const workItemTrackingClient: IWorkItemTrackingApi = await this.vstsWebApi.getWorkItemTrackingApi();
                let items = workItemsByBuild
                    .map(wi => wi.relations)
                    .reduce((acc, it) => [...acc, ...it])
                    .filter(r => r.rel == 'System.LinkTypes.Hierarchy-Reverse' && r.attributes.name == 'Parent')
                    .map(r => getParentId(r.url));
                while (items.length > 0 && items[0]) {
                    const getWorkItemsResult: WorkItemTrackingInterfaces.WorkItem[] = await workItemTrackingClient.getWorkItems(items.map(wir => wir), undefined, undefined, WorkItemTrackingInterfaces.WorkItemExpand.All);
                    getWorkItemsResult.forEach(r => result.setValue(r.id, r));
                    items = getWorkItemsResult
                        .map(wi => wi.relations)
                        .reduce((acc, it) => [...acc, ...it])
                        .filter(r => r.rel == 'System.LinkTypes.Hierarchy-Reverse' && r.attributes.name == 'Parent')
                        .map(r => getParentId(r.url));
                }
            })
        );

        return result;
    }

    public async getBuilds(azureRelease: ReleaseInterfaces.Release)
        : Promise<BuildDetails.BuildDetails[]> {
        const buildIds: Entities.BuildIdWithProject[] = [];

        this.extractBuildIdsFromArtifacts(azureRelease, buildIds);

        const client: IBuildApi = await this.vstsWebApi.getBuildApi();
        const clientWi: IWorkItemTrackingApi = await this.vstsWebApi.getWorkItemTrackingApi();

        const auxBuildIds = [...buildIds];

        console.log(`aux build ids ${JSON.stringify(auxBuildIds)}`);

        await Promise.all(
            auxBuildIds.map(async build => {
                console.log(`Get WIs references for build id ${build.buildId}`);
                const workItemsRefs = await client.getBuildWorkItemsRefs(build.projectId, build.buildId);
                console.log(`Got WIs references ${JSON.stringify(workItemsRefs)} for build id ${build.buildId}`);
                if (workItemsRefs) {
                    console.log(`Existing WIs references for build id ${build.buildId} ${JSON.stringify(workItemsRefs)}`);
                    await Promise.all(
                        workItemsRefs.map(async (wiRef) => {
                            const wi = await clientWi.getWorkItem(Number.parseInt(wiRef.id), undefined, undefined, WorkItemTrackingInterfaces.WorkItemExpand.Relations);
                            const buildRelations = wi.relations.filter(w => w.rel == 'ArtifactLink' && w.url.startsWith(this.buildUriIndicator));
                            if (buildRelations) {
                                buildRelations.forEach(buildRelated => {
                                    const extractedBuildId = Number.parseInt(buildRelated.url.replace(this.buildUriIndicator, ''));
                                    if (!buildIds.find(b => b.buildId == extractedBuildId)) {
                                        buildIds.push({ buildId: extractedBuildId, projectId: wi.fields['System.TeamProject'] });
                                    } else {
                                        console.log(`Not adding build id ${extractedBuildId} from ${wiRef.id} as is related previously`);
                                    }
                                });
                            }
                        })
                    );
                }
            })
        );

        const returnValue: BuildDetails.BuildDetails[] = [];

        await Promise.all(
            buildIds.map(async id => {
                await this.proccessBuildIdForDetails(id, client, clientWi, returnValue);
            })
        );


        return returnValue;
    }

    private async proccessBuildIdForDetails(build: Entities.BuildIdWithProject, client: IBuildApi, clientWi: IWorkItemTrackingApi, returnValue: BuildDetails.BuildDetails[]) {
        console.log('Getting Build For BuildId: ' + build.buildId + '.');
        const buildDetails = await client.getBuild(build.projectId, build.buildId);

        if (buildDetails) {
            const buildDefinition = await client.getDefinition(build.projectId, buildDetails.definition.id);

            const details: BuildDetails.BuildDetails = new BuildDetails.BuildDetails(buildDetails.id, buildDetails, buildDefinition, undefined);
            if (details.buildUsage != Entities.BuildUsage.None) {
                returnValue.push(details);
            }
        }
    }

    private extractBuildIdsFromArtifacts(azureRelease: ReleaseInterfaces.Release, buildIds: Entities.BuildIdWithProject[]) {
        azureRelease.artifacts.forEach(artifact => {
            if (Entities.BuildIdWithProject.isBuildArtifact(artifact)) {
                buildIds.push({ buildId: Number(artifact.definitionReference.version.id), projectId: artifact.definitionReference.project.id });
            }
        });
    }

    public async getReleaseChanges(azureRelease: ReleaseInterfaces.Release)
        : Promise<GitInterfaces.GitCommit[]> {
        const result: GitInterfaces.GitCommit[] = [];

        console.log(`Getting Changes For ReleaseId: ${azureRelease.id}.`);
        const client: IReleaseApi = await this.vstsWebApi.getReleaseApi();
        const previousRelease: ReleaseInterfaces.Release = await this.getPreviousReleases(azureRelease);

        const releaseChanges: ReleaseInterfaces.Change[] = [];
        await Promise.all(
            azureRelease.artifacts.map(async artifact => {
                const changes: ReleaseInterfaces.Change[] = await client.getReleaseChanges(azureRelease.projectReference.id, azureRelease.id, previousRelease.id, 500, artifact.alias);
                changes.forEach(c => releaseChanges.push(c));
            })
        );

        if (!releaseChanges || releaseChanges.length === 0) {
            console.log('No Changes found in the Release.');
            return result;
        }

        const gitApiClient: IGitApi = await this.vstsWebApi.getGitApi();
        const commits: GitInterfaces.GitCommit[] = [];
        await Promise.all(
            releaseChanges.map(async change => {
                const repositoryName: string = this.getRepositoryName(change.location);
                const commit = await gitApiClient.getCommit(change.id, repositoryName, azureRelease.projectReference.id);
                commits.push(commit);
            })
        );

        return commits;
    }

    public async getBuildChanges(azureBuilds: BuildDetails.BuildDetails[])
        : Promise<GitInterfaces.GitCommit[]> {
        const buildIds: number[] = this.extractBuildIds(azureBuilds);
        console.log('Getting Build Changes For Build Ids: ' + JSON.stringify(buildIds) + '.');

        const gitCommits: GitInterfaces.GitCommit[] = [];
        const client: IBuildApi = await this.vstsWebApi.getBuildApi();

        await Promise.all(
            azureBuilds.map(async build => {
                console.log('Getting Changes For BuildId: ' + build.buildId + '.');
                const buildChanges = await client.getBuildChanges(build.buildDetails.project.id, build.buildId);
                const gitApiClient: IGitApi = await this.vstsWebApi.getGitApi();

                await Promise.all(
                    buildChanges.map(async change => {
                        const commit = await gitApiClient.getCommit(change.id, build.buildDetails.repository.id, build.buildDetails.project.id);
                        console.log(`Got Commit: ${commit.commitId} For BuildId: ${build.buildId}.`);
                        gitCommits.push(commit);
                    })
                );

                console.log('Got Changes For BuildId: ' + build.buildId + '.');
            })
        );

        console.log('Got Build Changes For Build Ids: ' + JSON.stringify(buildIds) + '.');

        return gitCommits;
    }

    private extractBuildIds(azureBuilds: BuildDetails.BuildDetails[]) {
        const buildIds: number[] = [];
        azureBuilds.map(azureBuild => {
            buildIds.push(azureBuild.buildId);
        });
        return buildIds;
    }

    public async getBuildCodeCoverage(azureBuilds: BuildDetails.BuildDetails[])
        : Promise<Collections.Dictionary<number, TestInterfaces.BuildCoverage[]>> {
        // Flags: Value of flags determine the level of code coverage details to be fetched. Flags are additive.
        const codeCoverageFlags = { Modules: 1, Functions: 2, BlockData: 4 };

        const buildIds: number[] = this.extractBuildIds(azureBuilds);
        console.log('Getting Code Coverage For Build Ids: ' + JSON.stringify(buildIds) + '.');

        const result = new Collections.Dictionary<number, TestInterfaces.BuildCoverage[]>();
        const client: ITestApi = await this.vstsWebApi.getTestApi();

        await Promise.all(
            azureBuilds.map(async (build: BuildDetails.BuildDetails) => {
                console.log('Getting Code Coverage For BuildId: ' + build.buildId + '.');
                const buildCodeCoverage = await client.getBuildCodeCoverage(build.buildDetails.project.id, build.buildId,
                    codeCoverageFlags.Modules + codeCoverageFlags.Functions + codeCoverageFlags.BlockData);
                result.setValue(build.buildId, buildCodeCoverage);
            })
        );

        return result;
    }

    public async getBuildCodeCoverageSummary(azureBuilds: BuildDetails.BuildDetails[])
        : Promise<Collections.Dictionary<number, TestInterfaces.CodeCoverageSummary>> {
        const buildIds: number[] = this.extractBuildIds(azureBuilds);
        console.log('Getting Code Coverage Summary For Build Ids: ' + JSON.stringify(buildIds) + '.');

        const result = new Collections.Dictionary<number, TestInterfaces.CodeCoverageSummary>();
        const client: ITestApi = await this.vstsWebApi.getTestApi();

        await Promise.all(
            azureBuilds.map(async (build: BuildDetails.BuildDetails) => {
                console.log('Getting Code Coverage For BuildId: ' + build.buildId + '.');

                const buildCodeCoverage = await client.getCodeCoverageSummary(build.buildDetails.project.id, build.buildId);
                result.setValue(build.buildId, buildCodeCoverage);
            })
        );

        console.log('Got Code Coverage Summary For Build Ids: ' + JSON.stringify(buildIds) + '.');

        return result;
    }

    public async queryTestResultsReportForBuild(azureBuilds: BuildDetails.BuildDetails[])
        : Promise<Collections.Dictionary<number, TestInterfaces.TestResultSummary>> {
        const buildIds: number[] = this.extractBuildIds(azureBuilds);
        console.log('Getting Test Results Report For BuildId: ' + buildIds + '.');

        const result = new Collections.Dictionary<number, TestInterfaces.TestResultSummary>();
        const client: ITestApi = await this.vstsWebApi.getTestApi();

        await Promise.all(
            azureBuilds.map(async (build: BuildDetails.BuildDetails) => {
                const testResultDetailsForBuild = await client.queryTestResultsReportForBuild(build.buildDetails.project.id, build.buildId);
                result.setValue(build.buildId, testResultDetailsForBuild);
            })
        );

        console.log('Got Test Results Report For BuildId: ' + buildIds + '.');

        return result;
    }

    public async getBuildAttachments(azureBuilds: BuildDetails.BuildDetails[])
        : Promise<Collections.Dictionary<number, BuildInterfaces.Attachment[]>> {
        const attachmentTypes = ['Distributedtask.Core.Log', 'Distributedtask.Core.Summary', 'Distributedtask.Core.FileAttachment', 'Distributedtask.Core.DiagnosticLog'];

        const result = new Collections.Dictionary<number, BuildInterfaces.Attachment[]>();
        const client: IBuildApi = await this.vstsWebApi.getBuildApi();

        await Promise.all(
            azureBuilds.map(async (build: BuildDetails.BuildDetails) => {

                console.log('Getting Build Attachments For BuildId: ' + build.buildId + '.');
                const attachments: BuildInterfaces.Attachment[] = [];
                await Promise.all(
                    attachmentTypes.map(async (type: string) => {
                        console.log('Getting Attachments For BuildId: ' + build.buildId + ', Type: ' + type + '.');
                        const attachmentsResult = await client.getAttachments(build.buildDetails.project.id, build.buildId, type);
                        attachmentsResult.forEach(r => {
                            console.log(`Got Attachments For BuildId: '${build.buildId}', Type: '${type}', Name: '${r.name}'`);
                            attachments.push(r);
                        });
                    })
                );
                result.setValue(build.buildId, attachments);
                console.log('Got Build Attachments For BuildId: ' + build.buildId + '.');
            })
        );

        return result;
    }

    public async getPullRequests(commits: GitInterfaces.GitCommit[])
        : Promise<GitInterfaces.GitPullRequest[]> {
        const gitClient: IGitApi = await this.vstsWebApi.getGitApi();

        const pullRequests: GitInterfaces.GitPullRequest[] = [];
        await Promise.all(
            commits.map(async commit => {
                if (commit) {
                    console.log('Getting Pull Request For CommitId: ' + commit.commitId + '.');
                    const queryInput: GitInterfaces.GitPullRequestQueryInput = { items: [commit.commitId], type: GitInterfaces.GitPullRequestQueryType.LastMergeCommit };
                    const query: GitInterfaces.GitPullRequestQuery = { queries: [queryInput], results: undefined };
                    const repositoryName = this.getRepositoryName(commit.url);
                    const getPullRequestQueryResult = await gitClient.getPullRequestQuery(query, repositoryName);
                    for (let i = 0; i < getPullRequestQueryResult.results.length; i++) {
                        const results = getPullRequestQueryResult.results[i];
                        for (const key in results) {
                            for (let j = 0; j < results[key].length; j++) {
                                try {
                                    const id = results[key][j].pullRequestId;
                                    console.log('Getting Pull Request For Id: ' + id + '.');
                                    const getPullRequestByIdResult = await gitClient.getPullRequestById(id);
                                    console.log('Got Pull Request For Id: ' + id + '.');
                                    pullRequests.push(getPullRequestByIdResult);
                                } catch (error) {
                                    console.log(`Caught an error ${JSON.stringify(error)} trying to get pull request: ${JSON.stringify(results[key][j])}`);
                                }
                            }
                        }
                    }
                    console.log('Got Pull Request For CommitId: ' + commit.commitId + '.');
                } else {
                    console.log(`Got error trying to get commit ${commit}`);
                }
            })
        );

        return pullRequests;
    }

    public async getReleaseApprovals()
        : Promise<ReleaseInterfaces.ReleaseApproval[]> {
        console.log('Getting Approvals For ReleaseId: ' + this.settings.releaseId + '.');
        const client: IReleaseApi = await this.vstsWebApi.getReleaseApi();
        const approvals = await client.getApprovals(this.settings.releaseProjectId, undefined, ReleaseInterfaces.ApprovalStatus.Approved, [this.settings.releaseId], ReleaseInterfaces.ApprovalType.All);
        console.log('Got Approvals For ReleaseId: ' + this.settings.releaseId + '.');
        return approvals;
    }

    public async createWikiPage(page: string, content: string)
        : Promise<WikiInterfaces.WikiPage> {
        console.log('Creating WikiPage', page);
        const wikiApiClient: WikiApi = await this.vstsWebApi.getWikiApi();

        const fullPageName = `${this.settings.wikiRootPath}${page}`;
        const existingWikiPage: any = await wikiApiClient.getPageText(this.settings.wikiProjectId, this.settings.wikiIdentifier, fullPageName);
        if (existingWikiPage.statusCode != 404) {
            console.log(`Delete ${fullPageName} as already exists in wiki ${this.settings.wikiIdentifier} in project ${this.settings.wikiProjectId}`);
            await this.deleteWikiPage(fullPageName, wikiApiClient);
        }

        const wikiPage = await wikiApiClient.createPage(this.settings.wikiProjectId, this.settings.wikiIdentifier, fullPageName, content);
        console.log('Created WikiPage', wikiPage.url);
        return wikiPage;
    }

    private async deleteWikiPage(fullPageName: string, wikiApiClient: WikiApi) {
        const deleteRouteValues: any = {
            project: this.settings.wikiProjectId,
            wikiIdentifier: this.settings.wikiIdentifier,
            path: fullPageName
        };
        let verData: any = await this.vstsWebApi.vsoClient.getVersioningData("6.0-preview.1", "wiki", "25d3fbc7-fe3d-46cb-b5a5-0b6f79caf27b", deleteRouteValues);
        let url: string = verData.requestUrl!;
        let options: any = wikiApiClient.createRequestOptions('application/json', verData.apiVersion);
        await wikiApiClient.rest.del<WikiInterfaces.WikiPageResponse>(url, options);
    }

    private async getPreviousReleases(azureRelease: ReleaseInterfaces.Release)
        : Promise<ReleaseInterfaces.Release> {
        console.log('Getting Previous Release For ReleaseId: ' + this.settings.releaseId + '.');
        const client: IReleaseApi = await this.vstsWebApi.getReleaseApi();
        const releases: ReleaseInterfaces.Release[] = await client.getReleases(this.settings.releaseProjectId, azureRelease.releaseDefinition.id, undefined, undefined, undefined, ReleaseInterfaces.ReleaseStatus.Active, null, null, azureRelease.createdOn, ReleaseInterfaces.ReleaseQueryOrder.Descending, 2, null, null, null, null, null, null, false);
        console.log('Got Previous Release For ReleaseId: ' + this.settings.releaseId + '.');
        return releases.length == 0 ? azureRelease : releases[0];
    }

    private getRepositoryName(url: string) {
        return url.substring(url.indexOf('/repositories/') + ('/repositories/').length, url.indexOf('/commits/'));
    }
}