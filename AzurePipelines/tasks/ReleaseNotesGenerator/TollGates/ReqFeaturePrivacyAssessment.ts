import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';
import { ReqFeatureBase } from './ReqFeatureBase';

export class ReqFeaturePrivacyAssessment extends ReqFeatureBase {
    order: number = 5;

    name: string = `Feature Privacy Assessment mandatory.`;

    explanation: string = `All features must contain privacy assessment (Action 10 and 11).`;

    logName: string = `ReqFeaturePrivacyAssessment`;

    protected Check(feature: Entities.WorkItem): Interfaces.RequirementResult {
        if (!feature.fields
            || !feature.fields.privacyAssessment) {
            return { resultType: Interfaces.RequirementResultType.Warn, message: 'N\\A.' };
        }

        if (feature.fields.privacyAssessment.personalDataProcessed
            && (feature.fields.privacyAssessment.personalDataProcessed.startsWith('No')
                || (feature.fields.privacyAssessment.personalDataProcessed.startsWith('Yes'))
                && feature.fields.privacyAssessment.personalSensitiveData
                && feature.fields.privacyAssessment.lawfulGround
                && feature.fields.privacyAssessment.globalDataProtectionPolicy
                && feature.fields.privacyAssessment.designAdhereDataPrivacyReqs
                && feature.fields.privacyAssessment.dataPrivacySettingsPreSet
                && feature.fields.privacyAssessment.automaticDecisionLegalEffect
                && feature.fields.privacyAssessment.secondaryPurposesData
                && feature.fields.privacyAssessment.dataOutsideEU
                && feature.fields.privacyAssessment.dataVulnerablePersons
                && feature.fields.privacyAssessment.dataInnovativeSolutions
                && feature.fields.privacyAssessment.dataSystematicMonitoringPublic
                && feature.fields.privacyAssessment.dersonalDataLargeScale
                && feature.fields.privacyAssessment.dataCombiningMultipleDataSets
                && feature.fields.privacyAssessment.dataProcessingPreventsRightOrService)) {
            return { resultType: Interfaces.RequirementResultType.Ok, message: '' };
        }

        console.log('ReqFeaturePrivacyAssessment error for', feature.fields.privacyAssessment);
        return this.returnError(`Feature ${feature.id} doesn't have filled privacy assessment properly.`);
    }
}
