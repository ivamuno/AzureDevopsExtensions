import * as tl from 'azure-pipelines-task-lib';
import { Settings } from './Settings';

export class SettingsProvider {
  public getFromPipeline(): Settings {
    const workItemType = tl.getInput('workItemType');
    if (!workItemType) {
      throw new Error('WorkItem types could be loaded.');
    }

    const settings: Settings = {
      releaseProjectId: tl.getVariable('System.TeamProjectId'),
      releaseId: parseInt(tl.getVariable('Release.ReleaseId')),
      workItemTypes: workItemType.split(','),
      workItemState: tl.getInput('workItemState'),
    };

    return settings;
  }

  public getFromCode(): Settings {
    const settings: Settings = {
      releaseProjectId: 'B-Ops',
      releaseId: 4569,
      workItemTypes: ['User Story'],
      workItemState: 'Closed',
    };

    return settings;
  }
}
