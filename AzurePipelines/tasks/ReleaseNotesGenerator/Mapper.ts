import Collections = require('typescript-collections');

import * as Entities from './Entities';

import * as ReleaseInterfaces from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';
import * as WorkItemTrackingInterfaces from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import * as GitInterfaces from 'azure-devops-node-api/interfaces/GitInterfaces';
import * as TestInterfaces from 'azure-devops-node-api/interfaces/TestInterfaces';

export class Mapper {
    private mapCommit(commit: GitInterfaces.GitCommit): Entities.Commit {
        if (!commit) {
            return null;
        }

        console.log('Mapping Commit: ' + commit.commitId);

        const result: Entities.Commit = {
            id: commit.commitId,
            date: commit.committer.date,
            committer: {
                id: commit.push.pushedBy.id,
                name: commit.push.pushedBy.displayName
            },
            comment: commit.comment,
            url: commit.url
        }

        console.log('Mapped Commit: ' + commit.commitId);
        return result;
    }

    private mapPullRequest(pullRequest: GitInterfaces.GitPullRequest, workItems: WorkItemTrackingInterfaces.WorkItem[], parents: Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem>)
        : Entities.PullRequest {
        if (!pullRequest) {
            return null;
        }

        console.log('Mapping PullRequest: ' + pullRequest.pullRequestId);
        var filteredWorkItems: Entities.WorkItem[] = [];
        if (workItems) {
            const mappedWorkItems = workItems.map(wi => this.mapWorkItem(wi, parents));
            filteredWorkItems = mappedWorkItems.filter(wi => wi.parent && workItems.find(i => i.id == wi.parent.id) == undefined);
        }

        const result: Entities.PullRequest = {
            id: pullRequest.pullRequestId,
            title: pullRequest.title,
            codeReviewId: pullRequest.codeReviewId,
            createdBy: {
                id: pullRequest.createdBy.id,
                name: pullRequest.createdBy.displayName
            },
            reviewers: pullRequest.reviewers.map(r => {
                return {
                    id: r.id,
                    name: r.displayName
                };
            }),
            closedBy: {
                id: pullRequest.closedBy.id,
                name: pullRequest.closedBy.displayName
            },
            creationDate: pullRequest.creationDate,
            closedDate: pullRequest.closedDate,
            url: pullRequest.url,
            repository: {
                id: pullRequest.repository.id,
                name: pullRequest.repository.name,
                url: pullRequest.repository.url
            },
            sourceBranch: pullRequest.sourceRefName,
            targetBranch: pullRequest.targetRefName,
            workItems: filteredWorkItems
        };

        console.log('Mapped PullRequest: ' + pullRequest.pullRequestId);
        return result;
    }

    private mapTestRun(test: TestInterfaces.TestResultSummary): Entities.TestRun {
        function convertToDate(value: string): Date {
            const result: Date = new Date(-8640000000000000);
            if (!value || value === '00:00:00') {
                return result;
            }

            const durationParts: string[] = value.split('.');
            const durationTime: string = durationParts[0];
            const durationTimeParts: number[] = durationTime.split(':').map(p => parseInt(p));
            let durationMilliseconds: number = 0;
            if (durationParts.length > 1) {
                durationMilliseconds = parseInt(durationParts[1].substring(0, 3));
            }

            result.setUTCHours(durationTimeParts[0], durationTimeParts[1], durationTimeParts[2], durationMilliseconds);
            return result;
        }

        if (!test) {
            return null;
        }

        console.log('Mapping Test Run.');

        const resultsAnalysis = test.aggregatedResultsAnalysis;
        const failures = test.testFailures && test.testFailures.existingFailures && test.testFailures.existingFailures.count || 0;

        let difference = null;
        if (resultsAnalysis.resultsDifference && resultsAnalysis.resultsDifference != undefined) {
            difference = {
                increaseInDuration: resultsAnalysis.resultsDifference.increaseInDuration || convertToDate(resultsAnalysis.resultsDifference.increaseInDuration),
                increaseInFailures: resultsAnalysis.resultsDifference.increaseInFailures,
                increaseInOtherTests: resultsAnalysis.resultsDifference.increaseInOtherTests,
                increaseInPassedTests: resultsAnalysis.resultsDifference.increaseInPassedTests,
                increaseInTotalTests: resultsAnalysis.resultsDifference.increaseInTotalTests
            };
        }

        const releaseTestRun: Entities.TestRun = {
            total: resultsAnalysis.totalTests,
            passedPercent: (resultsAnalysis.totalTests - failures) / resultsAnalysis.totalTests,
            duration: convertToDate(resultsAnalysis.duration),
            difference: difference
        };

        console.log('Mapped Test Run.');
        return releaseTestRun;
    }

    private mapCodeCoverage(coverage: TestInterfaces.CodeCoverageSummary): Entities.CodeCoverage {
        if (!coverage
            || !coverage.coverageData
            || coverage.coverageData.length === 0) {
            return null;
        }

        console.log('Mapping Code Coverage.');

        const coverageStat = coverage.coverageData
            .map(data => data.coverageStats)
            .reduce((acc, it) => [...acc, ...it])
            .map(s => {
                return {
                    name: s.label,
                    total: s.total,
                    covered: s.covered
                };
            });

        if (!coverageStat) {
            return null;
        }

        console.log('Mapped Code Coverage.');
        return { flavors: coverageStat };
    }

    private mapWorkItem(wi: WorkItemTrackingInterfaces.WorkItem, parents: Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem>): Entities.WorkItem {
        function getParentId(url: string): number {
            return parseInt(url.substring(url.lastIndexOf('/') + 1));
        }

        function mapWorkItem(wi: WorkItemTrackingInterfaces.WorkItem): Entities.WorkItem {
            const result: Entities.WorkItem = {
                id: wi.id,
                title: wi.fields['System.Title'],
                type: wi.fields['System.WorkItemType'],
                url: wi._links.html.href,
                fields: {
                    estimation: wi.fields['Microsoft.VSTS.Scheduling.StoryPoints'],
                    acceptanceCriteria: wi.fields['Microsoft.VSTS.Common.AcceptanceCriteria'],
                    privacyAssessment: {
                        personalDataProcessed: wi.fields['Payvision.PersonalDataProcessed'],
                        personalSensitiveData: wi.fields['Custom.PayvisionPersonalSensitiveData'],
                        lawfulGround: wi.fields['Payvision.LawfulGround'],
                        globalDataProtectionPolicy: wi.fields['Custom.PayvisionGlobalDataProtectionPolicy'],
                        designAdhereDataPrivacyReqs: wi.fields['Payvision.DesignAdhereDataPrivacyReqs'],
                        dataPrivacySettingsPreSet: wi.fields['Payvision.DataPrivacySettingsPreSet'],
                        automaticDecisionLegalEffect: wi.fields['Custom.PayvisionAutomaticDecisionLegalEffect'],
                        secondaryPurposesData: wi.fields['Custom.PayvisionSecondaryPurposesData'],
                        dataOutsideEU: wi.fields['Custom.PayvisionDataOutsideEU'],
                        dataVulnerablePersons: wi.fields['Custom.PayvisionDataVulnerablePersons'],
                        dataInnovativeSolutions: wi.fields['Custom.PayvisionDataInnovativeSolutions'],
                        dataSystematicMonitoringPublic: wi.fields['Custom.PayvisionDataSystematicMonitoringPublic'],
                        dersonalDataLargeScale: wi.fields['Custom.PayvisionPersonalDataLargeScale'],
                        dataCombiningMultipleDataSets: wi.fields['Custom.PayvisionDataCombiningMultipleDataSets'],
                        dataProcessingPreventsRightOrService: wi.fields['Custom.PayvisionDataProcessingPreventsRightOrService']
                    },
                    securityAssessment: {
                        newMajorFunctionalities: wi.fields['Custom.PayvisionSecurityNewMajorFunctionalities'],
                        includeAuthenticationMechanism: wi.fields['Custom.PayvisionSecuritySystemIncludeAuthenticationMechanism'],
                        includeAuthorizationMechanism: wi.fields['Custom.PayvisionSecuritySystemIncludeAuthorizationMechanism'],
                        newExternalConnections: wi.fields['Custom.PayvisionSecurityNewExternalConnections'],
                        newInternalConnections: wi.fields['Custom.PayvisionSecurityNewInternalConnections'],
                        additionalPIIOrPCIDataPicklist: wi.fields['Custom.PayvisionSecurityAdditionalPIIOrPCIDataPicklist']
                    },
                },
                teamName: wi.fields['Payvision.Team']
            };

            return result;
        }

        if (!wi) {
            return undefined;
        }

        console.log(`Mapping WorkItem: ${wi.id}.`);

        const result: Entities.WorkItem = mapWorkItem(wi);
        let child = result;

        let relParent: WorkItemTrackingInterfaces.WorkItemRelation = wi.relations.find(r => r.rel == 'System.LinkTypes.Hierarchy-Reverse' && r.attributes.name == 'Parent');
        let parentId: number = relParent ? getParentId(relParent.url) : undefined;
        while (parentId) {
            const parent: WorkItemTrackingInterfaces.WorkItem = parents.getValue(parentId);
            const parentResult: Entities.WorkItem = mapWorkItem(parent);
            child = child.parent = parentResult;

            relParent = parent.relations.find(r => r.rel == 'System.LinkTypes.Hierarchy-Reverse' && r.attributes.name == 'Parent');
            parentId = relParent ? getParentId(relParent.url) : undefined;
        }

        console.log('Mapped WorkItem: ' + wi.id);
        return result;
    }

    private mapBuild(
        build: BuildInterfaces.Build,
        test: TestInterfaces.TestResultSummary,
        coverage: TestInterfaces.CodeCoverageSummary,
        attachments: BuildInterfaces.Attachment[])
        : Entities.Build {
        if (!build) {
            return null;
        }

        console.log('Mapping Build: ' + build.id);

        const result: Entities.Build = {
            buildNumber: build.buildNumber,
            definition: build.definition.name,
            startedOn: build.startTime,
            completedOn: build.finishTime,
            trigger: undefined,
            duration: new Date(build.finishTime.getTime() - build.startTime.getTime()),
            requestedFor: {
                id: build.requestedFor.id,
                name: build.requestedFor.displayName
            },
            repository: {
                id: build.repository.id,
                name: build.repository.name,
                url: build.repository.url
            },
            sourceBranch: build.sourceBranch,
            sourceVersion: build.sourceVersion,
            testRun: this.mapTestRun(test),
            codeCoverage: this.mapCodeCoverage(coverage),
            extensions: attachments.map(a => { return { name: a.name, url: a._links.self.href }; }),
            url: build._links.web.href
        };

        console.log('Mapped Build: ' + build.id);
        return result;
    }

    private mapStage(env: ReleaseInterfaces.ReleaseEnvironment, test: TestInterfaces.TestResultSummary): Entities.Stage {
        if (!env) {
            return null;
        }

        console.log('Mapping Stage For EnvironmentId: ' + env.id);

        const approvals: Entities.Approval[] = env.preDeployApprovals
            .concat(env.postDeployApprovals)
            .filter(e => e.status == ReleaseInterfaces.ApprovalStatus.Approved && !e.isAutomated)
            .map(a => {
                return {
                    approver: {
                        id: a.approvedBy && a.approvedBy.id,
                        name: a.approvedBy && a.approvedBy.displayName
                    },
                    type: ReleaseInterfaces.ApprovalType[a.approvalType],
                    on: a.modifiedOn
                };
            })
            // Remove duplicates.
            .reduce((accumulator: Collections.Dictionary<string, Entities.Approval>, current: Entities.Approval) => {
                if (accumulator.containsKey(current.approver.id)) {
                    const approval = accumulator.getValue(current.approver.id);
                    if (current.on > approval.on) {
                        accumulator.setValue(current.approver.id, current);
                        return accumulator;
                    }
                }

                accumulator.setValue(current.approver.id, current);
                return accumulator;
            }, new Collections.Dictionary<string, Entities.Approval>())
            .values().map(a => a);

        const result: Entities.Stage = {
            name: env.name,
            duration: env.timeToDeploy ? env.timeToDeploy.toString() : '',
            completedOn: env.modifiedOn,
            triggerReason: env.triggerReason,
            approvals: approvals,
            testRun: this.mapTestRun(test)
        };

        console.log('Mapped Stage For EnvironmentId: ' + env.id);
        return result;
    }

    public mapReleaseNote(result: Entities.Result): Entities.ReleaseNote {
        console.log('Mapping Release Notes.');

        const releaseCompletedOn = result.release.environments.map(e => e.modifiedOn).sort().reverse()[0];
        let duration = new Date(-8640000000000000);
        if (releaseCompletedOn && result.release.createdOn) {
            duration = new Date(releaseCompletedOn.getTime() - result.release.createdOn.getTime());
        }

        const releaseNote: Entities.ReleaseNote = {
            release: {
                id: result.release.id,
                name: result.release.name,
                createdOn: result.release.createdOn,
                completedOn: releaseCompletedOn,
                duration: duration,
                stages: result.release.environments.map(e => {
                    let test: TestInterfaces.TestResultSummary;
                    if (result.stageTestRun) {
                        test = result.stageTestRun.getValue(e.id);
                    }

                    return this.mapStage(e, test);
                }),
                url: result.release._links.web.href
            },
            builds: result.builds.map(build => {
                let test: TestInterfaces.TestResultSummary;
                if (build.buildTestRun) {
                    test = build.buildTestRun;
                }

                let coverage: TestInterfaces.CodeCoverageSummary;
                if (build.buildCodeCoverage) {
                    coverage = build.buildCodeCoverage;
                }

                let attachments: BuildInterfaces.Attachment[] = [];
                if (build.buildAttachments) {
                    attachments = build.buildAttachments;
                }

                return this.mapBuild(build.buildDetails, test, coverage, attachments);
            }),
            commits: result.builds.map(b => b.commits.map(this.mapCommit)).reduce((acc, it) => [...acc, ...it]),
            pullRequests: result.builds.map(b => b.pullRequests.map(pr => this.mapPullRequest(pr, b.pullRequestWorkItems.getValue(pr.pullRequestId), b.parentWorkItems))).reduce((acc, it) => [...acc, ...it]),
        };

        console.log('Mapped Release Notes.');
        return releaseNote;
    }
}