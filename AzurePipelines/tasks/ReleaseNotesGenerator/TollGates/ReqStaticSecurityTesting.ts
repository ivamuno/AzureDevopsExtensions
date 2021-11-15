import tl = require('vsts-task-lib/task');
import * as Interfaces from './Interfaces';
import * as Entities from '../Entities';

export class ReqStaticSecurityTesting implements Interfaces.Requirement {
    order: number = 9;

    name: string = 'Static Application Security Testing (SAST) have to be performed and passed in the Build.';

    explanation: string = 'Start sending all code to SonarQ to define quality standards and, if necessary, check if quality is sufficient (Action 18).';

    public execute(releaseNote: Entities.ReleaseNote): Interfaces.RequirementResult {
        console.log('Executing ReqStaticSecurityTesting.');

        if (!releaseNote
            || !releaseNote.builds
            || releaseNote.builds.length == 0) {
            return this.returnError(`Release doesn't contain builds.`);
        }

        for (let i = 0; i < releaseNote.builds.length; i++) {
            const build = releaseNote.builds[i];
            if (!build.extensions
                || !build.extensions.find(e => e.name.includes('Sonar'))) {
                return this.returnError(`Build ${build.buildNumber} doesn't have SAST.`);
            }
        }

        console.log('Executed ReqStaticSecurityTesting.');
        return { resultType: Interfaces.RequirementResultType.Ok, message: '' };
    }

    private returnError(message: string) {
        console.log('Executed ReqStaticSecurityTesting.');
        return { resultType: Interfaces.RequirementResultType.Error, message: message };
    }
}