import tl = require('vsts-task-lib/task');
import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';

export class ReqSnykIntegration implements Interfaces.Requirement {
    order: number = 9;

    name: string = 'Snyk decorator enabled.';

    explanation: string = 'Checks if the build has executed Snyk enabling the decorator.';

    public execute(releaseNote: Entities.ReleaseNote): Interfaces.RequirementResult {
        console.log('Executing Snyk review.');

        if (!releaseNote
            || !releaseNote.builds
            || releaseNote.builds.length == 0) {
            return this.returnError(`Release doesn't contain builds.`);
        }

        for (let i = 0; i < releaseNote.builds.length; i++) {
            const build = releaseNote.builds[i];
            if (!build.extensions
                || !build.extensions.find(e => e.name.includes('PayvisionSnykCheck'))) {
                return this.returnError(`Build ${build.buildNumber} doesn't have executed Snyk.`);
            }
        }

        console.log('Executed ReqSnykIntegration.');
        return { resultType: Interfaces.RequirementResultType.Ok, message: '' };
    }

    private returnError(message: string) {
        console.log('Executed ReqSnykIntegration.');
        return { resultType: Interfaces.RequirementResultType.Warn, message: message };
    }
}