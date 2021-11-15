import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';
import { ReqFeatureBase } from './ReqFeatureBase';

export class ReqFeatureSecurityAssessment extends ReqFeatureBase {
    order: number = 4;

    name: string = `Feature Security Assessment mandatory.`;

    explanation: string = `All features must contain security assessment (Action 8 and 9).`;

    logName: string = `ReqFeatureSecurityAssessment`;

    protected Check(feature: Entities.WorkItem): Interfaces.RequirementResult {
        if (!feature.fields
            || !feature.fields.securityAssessment) {
            return { resultType: Interfaces.RequirementResultType.Warn, message: 'N\\A.' };
        }

        if (feature.fields.securityAssessment.additionalPIIOrPCIDataPicklist) {
            return { resultType: Interfaces.RequirementResultType.Ok, message: '' };
        }

        console.log('ReqFeatureSecurityAssessment error for', feature.fields.securityAssessment);
        return this.returnError(`Feature ${feature.id} doesn't have filled privacy assessment properly.`);
    }
}
