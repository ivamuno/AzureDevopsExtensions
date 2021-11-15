import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';
import { ReqFeatureAcceptanceCriteria } from './ReqFeatureAcceptanceCriteria';
import { ReqWorkItemsTraceability } from './ReqWorkItemsTraceability';
import { ReqFeatureTeamName } from './ReqFeatureTeamName';
import { ReqUserStoryEstimation } from './ReqUserStoryEstimation';
import { ReqCodeReviewed } from './ReqCodeReviewed';
import { ReqTestsPerformedInBuild } from './ReqTestsPerformedInBuild';
import { ReqStaticSecurityTesting } from './ReqStaticSecurityTesting';
import { ReqStageApproved } from './ReqStageApproved';
import { ReqFeaturePrivacyAssessment } from './ReqFeaturePrivacyAssessment';
import { ReqFeatureSecurityAssessment } from './ReqFeatureSecurityAssessment';
import { ReqUserStoryTeamName } from './ReqUserStoryTeamName';
import { ReqSnykIntegration } from './ReqSnykIntegration';

export class TollGatesExecuter implements Interfaces.ITollGatesExecuter {
    requirements: Interfaces.Requirement[] = [
        new ReqWorkItemsTraceability(),
        new ReqFeatureAcceptanceCriteria(),
        new ReqFeatureTeamName(),
        new ReqFeaturePrivacyAssessment(),
        new ReqFeatureSecurityAssessment(),
        new ReqUserStoryTeamName(),
        new ReqUserStoryEstimation(),
        new ReqCodeReviewed(),
        new ReqTestsPerformedInBuild(),
        new ReqStaticSecurityTesting(),
        new ReqStageApproved(),
        new ReqSnykIntegration()
    ];

    execute(releaseNote: Entities.ReleaseNote): Interfaces.TollGatesResult[] {
        return this.requirements
            .map(r => {
                const result = r.execute(releaseNote);
                return {
                    requirementName: r.constructor.name,
                    requirementTitle: r.name,
                    requirementExplanation: r.explanation,
                    explanation: r.explanation,
                    resultType: result.resultType,
                    message: result.message
                };
            });
    }
}