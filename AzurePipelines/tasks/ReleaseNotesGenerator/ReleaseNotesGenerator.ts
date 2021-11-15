import tl = require('vsts-task-lib/task');

import * as Entities from './Entities';
import { Mapper } from './Mapper';
import { ReleaseNotesMarkdownFormatter } from './MarkdownFormatters/ReleaseNotesMarkdownFormatter';
import { TollGatesResultFormatter } from './MarkdownFormatters/TollGatesResultFormatter';

import * as ReleaseInterfaces from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import { AzureHelperFactory } from './AzureHelperFactory';
import { TollGatesExecuter } from './TollGates/TollGatesExecuter';
import * as BuildDetails from './BuildDetails';
import * as approvers from '@ivamuno-devops/approvers-list-repository';
import { TollGatesRepo, TollGateResult } from '@ivamuno-devops/tollgates-queues-repository'

async function main(): Promise<void> {
    try {
        const azureHelper = new AzureHelperFactory().getSettings();

        const azureRelease: ReleaseInterfaces.Release = await azureHelper.getRelease();

        console.log(`Creating ReleaseNote from ${azureRelease.id}`);

        const azureBuilds: BuildDetails.BuildDetails[] = await azureHelper.getBuilds(azureRelease);
        if (azureBuilds && azureBuilds.length > 0) {
            await Promise.all(
                azureBuilds.map(async b => {
                    if (b.buildUsage != Entities.BuildUsage.None) {
                        const commits = await azureHelper.getBuildChanges(azureBuilds);
                        b.commits = commits;

                        b.pullRequests = await azureHelper.getPullRequests(commits);
                        b.pullRequestWorkItems = await azureHelper.getPullRequestWorkItems(b.pullRequests);
                        b.buildAttachments = (await azureHelper.getBuildAttachments(azureBuilds)).getValue(b.buildId);
                        b.buildCodeCoverage = (await azureHelper.getBuildCodeCoverageSummary(azureBuilds)).getValue(b.buildId);
                        b.buildTestRun = (await azureHelper.queryTestResultsReportForBuild(azureBuilds)).getValue(b.buildId);
                        b.parentWorkItems = await azureHelper.getParentWorkItems(b.pullRequestWorkItems);
                    }
                })
            );

            const azureResult: Entities.Result = {
                release: azureRelease,
                stageTestRun: undefined,
                releaseTestRun: await azureHelper.getReleaseTestResults(azureRelease),
                builds: azureBuilds
            };

            const releaseNote: Entities.ReleaseNote = new Mapper().mapReleaseNote(azureResult);

            const releaseNoteDocument: string = new ReleaseNotesMarkdownFormatter().format(releaseNote);

            const wikiPage = await azureHelper.createWikiPage(releaseNote.release.name, releaseNoteDocument);


            console.log(`Release note published: ${wikiPage.url}`);
            const azureResultForTollGates = Object.assign({}, azureResult);
            azureResultForTollGates.builds = azureResult.builds.filter(b => b.buildUsage === Entities.BuildUsage.TollGates || Entities.BuildUsage.Both)
            const tollGates: Entities.ReleaseNote = new Mapper().mapReleaseNote(azureResultForTollGates);
            const auditedReleaseNote: Entities.AuditedReleaseNote = {
                releaseNote: tollGates,
                tollGatesResults: new TollGatesExecuter().execute(tollGates)
            };
            const tollGatesResultDocument: string = new TollGatesResultFormatter().format(auditedReleaseNote);
            const tollGatesWikiPage = await azureHelper.createWikiPage(`${releaseNote.release.name}/TollGates`, tollGatesResultDocument);

            //save to tollgates queues  
            const projectName = tl.getVariable("System.TeamProject");
            const environmentName = tl.getVariable("Release.EnvironmentName");
            const atob = require('atob');
            const attemptNumber: number = parseInt(tl.getVariable('Release.AttemptNumber'));
            const releaseName = tl.getVariable("Release.ReleaseName");
            const releaseDefinitionName = tl.getVariable('Release.DefinitionName');
            const base64ApproversListConnString = tl.getInput('approversListConnString', true);
            const approversListConnString = atob(base64ApproversListConnString);
            const base64TollgatesQueuesConnString = tl.getInput('tollgatesQueuesConnString', true);
            const tollgatesQueuesConnString = atob(base64TollgatesQueuesConnString);
            const agentName = tl.getVariable("Agent.Name");

            const app = new approvers.ApprovalsRepository(approversListConnString);
            const possibleTeamName = releaseDefinitionName.substring(0, 2);
            const approversList = await app.get(possibleTeamName, projectName);
            let isAgentProduction: boolean | undefined = undefined;
            let teamName: string = "";

            if (approversList !== undefined) {
                isAgentProduction = approversList.isAgentProduction(agentName);
                teamName = approversList.teamName;
            }
            const tollGatesRepo: TollGatesRepo = new TollGatesRepo(tollgatesQueuesConnString);
            await tollGatesRepo.saveTollGate(new TollGateResult(
                azureRelease.id,
                attemptNumber,
                releaseName,
                teamName,
                environmentName,
                true,
                tollGatesWikiPage.remoteUrl,
                azureRelease.url,
                projectName,
                releaseDefinitionName,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqWorkItemsTraceability').resultType === 1,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqFeatureAcceptanceCriteria').resultType === 1,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqFeatureTeamName').resultType === 1,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqFeaturePrivacyAssessment').resultType === 1,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqFeatureSecurityAssessment').resultType === 1,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqUserStoryTeamName').resultType === 1,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqUserStoryEstimation').resultType === 1,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqCodeReviewed').resultType === 1,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqTestsPerformedInBuild').resultType === 1,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqStaticSecurityTesting').resultType === 1,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqStageYamlApproved').resultType === 1,
                isAgentProduction,
                auditedReleaseNote.tollGatesResults.find(tg => tg.requirementName === 'ReqSnykIntegration').resultType === 1,
                true
            ));



            tl.setResult(tl.TaskResult.Succeeded, '');

        } else {
            tl.setResult(tl.TaskResult.SucceededWithIssues, 'No builds detected for release');
        }
    } catch (error) {
        console.log('Caught an error in main: ' + JSON.stringify(error));
        tl.setResult(tl.TaskResult.Failed, error);
    }
}

main();