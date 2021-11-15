import Collections = require('typescript-collections');

import * as ReleaseInterfaces from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import * as TestInterfaces from 'azure-devops-node-api/interfaces/TestInterfaces';

import * as BuildDetails from './BuildDetails';

export interface Result {
    release: ReleaseInterfaces.Release;

    stageTestRun: Collections.Dictionary<number, TestInterfaces.TestResultSummary>;

    builds: BuildDetails.BuildDetails[];

    releaseTestRun: TestResultsForRelease[];
}
export interface TestResultsForRelease {
    releaseEnvironmentId: number;
    testResults: TestInterfaces.TestResultSummary;
}



export class BuildIdWithProject {
    buildId: number;
    projectId: string;
    private static __buildArtifactType: string = "Build";

    public static isBuildArtifact(artifact: ReleaseInterfaces.Artifact): boolean {
        return artifact.type === BuildIdWithProject.__buildArtifactType;
    }
}

export interface AuditedReleaseNote {
    releaseNote: ReleaseNote;
    tollGatesResults: TollGatesResult[];
}

export interface ReleaseNote {
    release: Release;
    builds: Build[];
    commits: Commit[];
    pullRequests: PullRequest[];
}

export interface Release {
    id: number;
    name: string;
    createdOn: Date;
    completedOn: Date;
    duration: Date;
    stages: Stage[];
    url: string;
}

export interface Stage {
    name: string;
    completedOn: Date;
    duration: string;
    triggerReason: string;
    approvals?: Approval[];
    testRun?: TestRun;
}

export interface Approval {
    approver: UserIdentity;
    type: string;
    on: Date;
}

export interface WorkItem {
    id: number;
    type: string;
    title: string;
    teamName: string;
    fields: Fields;
    url: string;
    parent?: WorkItem;
}

export interface Fields {
    estimation?: number;
    acceptanceCriteria?: string;
    privacyAssessment?: PrivacyAssessment;
    securityAssessment?: SecurityAssessment;
}

export interface PrivacyAssessment {
    personalDataProcessed: string;
    personalSensitiveData: string;
    lawfulGround: string;
    globalDataProtectionPolicy: string;
    designAdhereDataPrivacyReqs: string;
    dataPrivacySettingsPreSet: string;
    automaticDecisionLegalEffect: string;
    secondaryPurposesData: string;
    dataOutsideEU: string;
    dataVulnerablePersons: string;
    dataInnovativeSolutions: string;
    dataSystematicMonitoringPublic: string;
    dersonalDataLargeScale: string;
    dataCombiningMultipleDataSets: string;
    dataProcessingPreventsRightOrService: string;
}

export interface SecurityAssessment {
    newMajorFunctionalities: boolean;
    includeAuthenticationMechanism: boolean;
    includeAuthorizationMechanism: boolean;
    newExternalConnections: boolean;
    newInternalConnections: boolean;
    additionalPIIOrPCIDataPicklist: string;
}

export interface Build {
    buildNumber: string;
    definition: string;
    startedOn: Date;
    completedOn: Date;
    trigger: string;
    duration: Date;
    requestedFor: UserIdentity;
    repository: Repository;
    sourceBranch: string;
    sourceVersion: string;
    testRun?: TestRun;
    codeCoverage?: CodeCoverage;
    extensions?: Extension[];
    url: string;
}

export interface TestRun {
    total: number;
    passedPercent: number;
    duration: Date;
    difference: TestRunResultsDifference;
    url?: string;
}

export interface TestRunResultsDifference {
    increaseInDuration?: Date;
    increaseInFailures?: number;
    increaseInOtherTests?: number;
    increaseInPassedTests?: number;
    increaseInTotalTests?: number;
}

export interface Repository {
    id: string;
    name: string;
    url: string;
}

export interface Commit {
    id: string;
    committer: UserIdentity;
    date: Date;
    comment: string;
    url: string;
}

export interface PullRequest {
    id: number;
    title: string;
    codeReviewId: number;
    createdBy: UserIdentity;
    reviewers: UserIdentity[];
    closedBy: UserIdentity;
    creationDate: Date;
    closedDate: Date;
    url: string;
    repository: Repository;
    sourceBranch: string;
    targetBranch: string;
    workItems: WorkItem[];
}

export interface Extension {
    name: string;
    url: string;
}

export interface CodeCoverage {
    flavors: CodeCoverageFlavor[];
}

export interface CodeCoverageFlavor {
    name: string;
    total: number;
    covered: number;
}

export interface UserIdentity {
    id: string;
    name: string;
}

export interface TollGatesResult {
    requirementName: string;
    requirementTitle: string;
    requirementExplanation: string;
    resultType: RequirementResultType;
    message: string;
}

export enum RequirementResultType {
    Ok = 1,
    Error = 2,
    Warn = 3
}

export enum BuildUsage {
    TollGates = 1,
    ReleaseNotes = 2,
    Both = 3,
    None = 4
}