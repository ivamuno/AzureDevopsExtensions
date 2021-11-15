import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';
import * as ReleaseInterfaces from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import * as WorkItemTrackingInterfaces from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import * as tl from 'azure-pipelines-task-lib';
import * as Collections from 'typescript-collections';

import { AzureHelperFactory } from './AzureHelperFactory';

async function main(): Promise<void> {
  try {
    const azureHelper = new AzureHelperFactory().getFromPipeline();

    const azureRelease: ReleaseInterfaces.Release = await azureHelper.getRelease();

    console.log('Creating ReleaseNote for', azureRelease.id);
    const azureBuilds: Collections.Dictionary<number, BuildInterfaces.Build> = await azureHelper.getBuilds(azureRelease);
    const buildWorkItems: Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem[]> = await azureHelper.getBuildWorkItems(azureBuilds);
    await azureHelper.updateWorkItemState(buildWorkItems.values().reduce((acc, it) => [...acc, ...it]));

    tl.setResult(tl.TaskResult.Succeeded, '');
  } catch (error) {
    console.log('Caught an error in main: ' + JSON.stringify(error));
    tl.setResult(tl.TaskResult.Failed, error);
  }
}

main();
