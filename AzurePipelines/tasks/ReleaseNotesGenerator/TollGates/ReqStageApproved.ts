import tl = require('vsts-task-lib/task');
import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';
import Collections = require('typescript-collections');

export class ReqStageApproved implements Interfaces.Requirement {
    approversByStage = new Collections.Dictionary<string, number>();

    constructor() {
        this.approversByStage.setValue('Acceptance', 1);
        this.approversByStage.setValue('Production', 2);
    }

    order: number = 10;

    name: string = 'Release stages have to be approved.';

    explanation: string = 'There must be at least two different approvers for the release to move on. If not, release will stay on hold (Action 24).';

    public execute(releaseNote: Entities.ReleaseNote): Interfaces.RequirementResult {
        console.log('Executing ReqStageApproved.');

        if (!releaseNote
            || !releaseNote.release
            || !releaseNote.release.stages
            || releaseNote.release.stages.length == 0) {
            return this.returnError('Release doesn\'t contain stages.');
        }

        const keys = this.approversByStage.keys();
        for (let i = 0; i < keys.length; i++) {
            const stageName = keys[i];
            const stage = releaseNote.release.stages.find(s => s.name.startsWith(stageName));
            if (stage === undefined) {
                return this.returnError(`Release doesn't contain stage ${stageName}.`);
            }

            if (!stage.approvals || stage.approvals.length === undefined || stage.approvals.length < this.approversByStage.getValue(stageName)) {
                return this.returnError(`Release doesn't have the minimum number of approvals for stage ${stageName}.`);
            }
        }

        console.log('Executed ReqStageApproved.');
        return { resultType: Interfaces.RequirementResultType.Ok, message: '' };
    }

    private returnError(message: string) {
        console.log('Executed ReqStageApproved.');
        return { resultType: Interfaces.RequirementResultType.Error, message: message };
    }
}