import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';
import { ReqUserStoryBase } from './ReqUserStoryBase';

export class ReqUserStoryEstimation extends ReqUserStoryBase {
    order: number = 6;

    name: string = `User Story has to be estimated.`;

    explanation: string = `All user stories should be estimated giving an indication of the effort to be done (Action 15).`;

    logName: string = `ReqUserStoryEstimation`;

    protected Check(workItem: Entities.WorkItem): Interfaces.RequirementResult {
        if (workItem.type != 'User Story') {
            return { resultType: Interfaces.RequirementResultType.Warn, message: 'N\\A.' };
        }

        if (!workItem.fields.estimation) {
            return this.returnError(`User Story ${workItem.id} isn't estimated.`);
        }

        return { resultType: Interfaces.RequirementResultType.Ok, message: '' };
    }
}