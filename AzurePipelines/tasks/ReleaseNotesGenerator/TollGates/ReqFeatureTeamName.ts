import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';
import { ReqFeatureBase } from './ReqFeatureBase';

export class ReqFeatureTeamName extends ReqFeatureBase {
    order: number = 2;

    name: string = 'Feature Team Name mandatory.';

    explanation: string = 'All features should contain the team name that will develop them (Action 4).';

    logName: string = `ReqFeatureTeamName`;

    protected Check(feature: Entities.WorkItem): Interfaces.RequirementResult {
        if (feature.fields
            && feature.teamName
            && feature.teamName != '') {
            return { resultType: Interfaces.RequirementResultType.Ok, message: '' };
        }

        return this.returnError(`Feature ${feature.id} doesn't contain team name.`);
    }
}