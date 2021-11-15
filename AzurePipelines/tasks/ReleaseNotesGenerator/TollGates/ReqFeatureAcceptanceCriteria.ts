import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';
import { ReqFeatureBase } from './ReqFeatureBase';

export class ReqFeatureAcceptanceCriteria extends ReqFeatureBase implements Interfaces.Requirement {
    order: number = 3;

    name: string = `Feature Acceptance Criteria mandatory.`;

    explanation: string = `All features should contain acceptance criteria (Action 7).`;

    logName: string = `ReqFeatureAcceptanceCriteria`;

    protected Check(feature: Entities.WorkItem): Interfaces.RequirementResult {
        if (feature.fields
            && feature.fields.acceptanceCriteria
            && feature.fields.acceptanceCriteria != '') {
            return { resultType: Interfaces.RequirementResultType.Ok, message: '' };
        }

        return this.returnError(`Feature ${feature.id} doesn't contain acceptance criteria.`);
    }
}