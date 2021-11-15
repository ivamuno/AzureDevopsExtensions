import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';
import { ReqUserStoryBase } from './ReqUserStoryBase';

export class ReqUserStoryTeamName extends ReqUserStoryBase {
    order: number = 2;

    name: string = 'User Story Team Name mandatory.';

    explanation: string = 'All user stories should contain the team name that will develop them (Action 4).';

    logName: string = `ReqUserStoryTeamName`;

    protected Check(workItem: Entities.WorkItem): Interfaces.RequirementResult {
        if (!workItem.fields
            || !workItem.teamName
            || workItem.teamName == '') {
            return this.returnError(`${workItem.type} ${workItem.id} isn't estimated.`);
        }

        return { resultType: Interfaces.RequirementResultType.Ok, message: '' };
    }
}