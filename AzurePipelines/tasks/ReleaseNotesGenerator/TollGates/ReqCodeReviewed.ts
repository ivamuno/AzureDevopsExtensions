import tl = require('vsts-task-lib/task');
import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';

export class ReqCodeReviewed implements Interfaces.Requirement {
    order: number = 5;

    name: string = 'Code must be reviewed.';

    explanation: string = 'Code must be always reviewed by a different engineer than the one that developed it (Action 16).';

    public execute(releaseNote: Entities.ReleaseNote): Interfaces.RequirementResult {
        console.log('Executing ReqCodeReviewed.');

        if (!releaseNote
            || !releaseNote.pullRequests
            || releaseNote.pullRequests.length == 0) {
            return this.returnError(`Release doesn't contain pull requests.`);
        }

        for (let i = 0; i < releaseNote.pullRequests.length; i++) {
            const pr = releaseNote.pullRequests[i];
            if (!pr.reviewers || pr.reviewers.length == 0) {
                return this.returnError(`PullRequest ${pr.id} doesn't have reviewers.`);
            }
        }

        console.log('Executed ReqCodeReviewed.');
        return { resultType: Interfaces.RequirementResultType.Ok, message: '' };
    }

    private returnError(message: string) {
        console.log('Executed ReqCodeReviewed.');
        return { resultType: Interfaces.RequirementResultType.Error, message: message };
    }
}