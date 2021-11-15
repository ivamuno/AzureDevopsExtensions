import tl = require('vsts-task-lib/task');
import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';

export class ReqTestsPerformedInBuild implements Interfaces.Requirement {
    order: number = 8;

    name: string = `Unit Tests have to be performed and passed in the Build.`;

    explanation: string = `All Builds needs to know if the unit tests have been performed and completed successfully (Action 17).`;

    public execute(releaseNote: Entities.ReleaseNote): Interfaces.RequirementResult {
        console.log('Executing ReqTestsPerformedInBuild.');

        if (!releaseNote
            || !releaseNote.builds
            || releaseNote.builds.length == 0) {
            return this.returnError(`Release doesn't contain builds.`);
        }

        for (let i = 0; i < releaseNote.builds.length; i++) {
            const build = releaseNote.builds[i];
            if (!build.testRun) {
                return this.returnError(`Build ${build.buildNumber} doesn't have tests.`);
            }

            if (build.testRun.passedPercent != 1) {
                return this.returnError(`Build ${build.buildNumber} doesn't have all tests passing.`);
            }
        }

        console.log('Executed ReqTestsPerformedInBuild.');
        return { resultType: Interfaces.RequirementResultType.Ok, message: `` };
    }

    private returnError(message: string) {
        console.log('Executed ReqTestsPerformedInBuild.');
        return { resultType: Interfaces.RequirementResultType.Error, message: message };
    }
}