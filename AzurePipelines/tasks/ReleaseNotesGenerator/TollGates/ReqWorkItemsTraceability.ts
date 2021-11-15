import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';
import Collections = require('typescript-collections');

export class ReqWorkItemsTraceability implements Interfaces.Requirement {
    workItemChain = new Collections.Dictionary<string, string[]>();

    constructor() {
        this.workItemChain.setValue('Enabler', ['Feature', 'Epic']);
        this.workItemChain.setValue('Kaizen', ['Feature', 'Epic']);
        this.workItemChain.setValue('People', ['Feature', 'Epic']);
        this.workItemChain.setValue('Support', ['Feature', 'Epic']);
        this.workItemChain.setValue('Tech Debt', ['Feature', 'Epic']);
        this.workItemChain.setValue('User Story', ['Feature', 'Epic']);
        this.workItemChain.setValue('Bug', ['Feature', 'Epic']);
    }

    order: number = 1;

    name: string = 'Work items traceability.';

    explanation: string = 'All features should be linked to an existing epic (Action 5).\r\n'
        + 'All user stories or bugs should be linked to an existing feature (Action 13).';

    public execute(releaseNote: Entities.ReleaseNote): Interfaces.RequirementResult {
        console.log('Executing ReqWorkItemsTraceability.');

        if (!releaseNote
            || !releaseNote.pullRequests
            || releaseNote.pullRequests.length == 0) {
            return this.returnError(`Release doesn't contain pull requests.`);
        }

        for (let i = 0; i < releaseNote.pullRequests.length; i++) {
            const pr = releaseNote.pullRequests[i];
            if (!pr.workItems) {
                return this.returnError(`PullRequest ${pr.id} doesn't contain work items.`);
            }

            for (let j = 0; j < pr.workItems.length; j++) {
                let wi = pr.workItems[j];
                let chain: string[] = null;
                let leaf: Entities.WorkItem = null;
                do {
                    if (this.workItemChain.containsKey(wi.type)) {
                        chain = this.workItemChain.getValue(wi.type);
                        leaf = wi;
                    }

                    wi = wi.parent;
                } while (!chain && wi);

                if (!chain) {
                    return this.returnError(`PullRequest ${pr.id} doesn't contain a valid chain of work items.`);
                }

                for (let k = 0; k < chain.length; k++) {
                    if (!leaf.parent
                        || leaf.parent.type != chain[k]) {
                        return this.returnError(`PullRequest ${pr.id} doesn't contain ${chain[k]} work item in some chain.`);
                    }

                    leaf = leaf.parent;
                }
            }
        }

        console.log('Executed ReqWorkItemsTraceability.');
        return { resultType: Interfaces.RequirementResultType.Ok, message: '' };
    }

    private returnError(message: string) {
        console.log('Executed ReqWorkItemsTraceability.');
        return { resultType: Interfaces.RequirementResultType.Error, message: message };
    }
}