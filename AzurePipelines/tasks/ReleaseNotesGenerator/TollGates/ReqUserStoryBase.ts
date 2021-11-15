import tl = require('vsts-task-lib/task');
import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';

export abstract class ReqUserStoryBase implements Interfaces.Requirement {
    private requirementBacklogWorkItemTypes: string[] = ['Enabler', 'Enabler Feature', 'Kaizen', 'People', 'Support', 'Tech Debt', 'User Story', 'Bug'];

    order: number;

    name: string;

    explanation: string;

    protected logName: string;

    public execute(releaseNote: Entities.ReleaseNote): Interfaces.RequirementResult {
        console.log(`Executing ${this.logName}.`);

        if (!releaseNote
            || !releaseNote.pullRequests
            || releaseNote.pullRequests.length == 0) {
            return this.returnError(`Release doesn't contain pull requests.`);
        }

        let reqResult: Interfaces.RequirementResult = { resultType: Interfaces.RequirementResultType.Ok, message: '' };
        for (let i = 0; i < releaseNote.pullRequests.length; i++) {
            const pr = releaseNote.pullRequests[i];
            if (!pr.workItems) {
                return this.returnError(`PullRequest ${pr.id} doesn't contain work items.`);
            }

            for (let j = 0; j < pr.workItems.length; j++) {
                const wi = pr.workItems[j];
                const rbit = this.flattenWorkItem(wi).find(fwi => this.requirementBacklogWorkItemTypes.find(x => x == fwi.type) != undefined);
                reqResult = this.Check(rbit);
                if (reqResult.resultType == Interfaces.RequirementResultType.Error) {
                    return reqResult;
                }
            }
        }

        console.log(`Executed ${this.logName}.`);
        return reqResult;
    }

    protected abstract Check(workItem: Entities.WorkItem): Interfaces.RequirementResult;

    protected returnError(message: string): Interfaces.RequirementResult {
        console.log(`Executed ${this.logName}.`);
        return { resultType: Interfaces.RequirementResultType.Error, message: message };
    }

    private flattenWorkItem(workItem: Entities.WorkItem): Entities.WorkItem[] {
        const workItems: Entities.WorkItem[] = [];
        let current = workItem;
        while (current) {
            workItems.push(current);
            current = current.parent;
        }

        return workItems;
    }
}