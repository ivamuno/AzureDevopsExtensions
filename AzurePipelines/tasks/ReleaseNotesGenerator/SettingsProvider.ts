import tl = require('vsts-task-lib/task');
import { Settings } from './Settings';

export class SettingsProvider {
    public getFromPipeline(): Settings {
        const settings: Settings = {
            releaseProjectId: tl.getVariable('System.TeamProjectId'),
            releaseId: parseInt(tl.getVariable('Release.ReleaseId')),
            wikiProjectId: tl.getInput('wikiProjectId'),
            wikiIdentifier: tl.getInput('wikiIdentifier'),
            wikiRootPath: tl.getInput('wikiRootPath')
        };

        return settings;
    }

    public getFromCode(): Settings {
        const project = 'Hyperion';
        const buildOrRelaseId = 2539;
        const settings: Settings = {
            releaseProjectId: project,
            releaseId: buildOrRelaseId,
            wikiProjectId: 'LfraileTests',
            wikiIdentifier: 'LfraileTests.wiki',
            wikiRootPath: '/NW3/'
        };
        tl.setVariable("Build.BuildId", buildOrRelaseId.toString());
        tl.setVariable("System.TeamProjectId", project);

        return settings;
    }
}