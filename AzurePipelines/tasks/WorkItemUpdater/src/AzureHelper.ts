import { IBuildApi } from 'azure-devops-node-api/BuildApi';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';
import * as VSSInterfaces from 'azure-devops-node-api/interfaces/common/VSSInterfaces';
import * as ReleaseInterfaces from 'azure-devops-node-api/interfaces/ReleaseInterfaces';

import * as WorkItemTrackingInterfaces from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import { IReleaseApi } from 'azure-devops-node-api/ReleaseApi';
import { WebApi } from 'azure-devops-node-api/WebApi';
import { IWorkItemTrackingApi } from 'azure-devops-node-api/WorkItemTrackingApi';
import * as Collections from 'typescript-collections';
import { Settings } from './Settings';

export class AzureHelper {
  vstsWebApi: WebApi;
  settings: Settings;

  constructor(vstsWebApi: WebApi, settings: Settings) {
    this.vstsWebApi = vstsWebApi;
    this.settings = settings;
  }

  public async getBuildWorkItems(
    azureBuilds: Collections.Dictionary<number, BuildInterfaces.Build>,
  ): Promise<Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem[]>> {
    async function getWorkItemsRefs(vstsWebApi: WebApi, settings: Settings, azureBuild: BuildInterfaces.Build): Promise<VSSInterfaces.ResourceRef[]> {
      const buildClient: IBuildApi = await vstsWebApi.getBuildApi();
      const workItemRefs: VSSInterfaces.ResourceRef[] = await buildClient.getBuildWorkItemsRefs(settings.releaseProjectId, azureBuild.id);
      return workItemRefs;
    }

    const result = new Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem[]>();

    await Promise.all(
      azureBuilds.values().map(async (build) => {
        console.log(`Getting Build From BuildId: ${build.id}.`);

        const workItemTrackingClient: IWorkItemTrackingApi = await this.vstsWebApi.getWorkItemTrackingApi();
        const workItemRefs: VSSInterfaces.ResourceRef[] = await getWorkItemsRefs(this.vstsWebApi, this.settings, build);
        if (!workItemRefs || workItemRefs.length === 0) {
          console.log('No workitems found to update.');
          return result;
        }

        const workItems: WorkItemTrackingInterfaces.WorkItem[] = await workItemTrackingClient.getWorkItems(
          workItemRefs.map((wir) => parseInt(wir.id)),
          undefined,
          undefined,
          WorkItemTrackingInterfaces.WorkItemExpand.All,
        );
        result.setValue(build.id, workItems);
        console.log(`Got Build From BuildId: ${build.id}.`);
      }),
    );

    return result;
  }

  public async getParentWorkItems(
    workItems: Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem[]>,
  ): Promise<Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem>> {
    function getParentId(url: string): number {
      return parseInt(url.substring(url.lastIndexOf('/') + 1));
    }

    const result = new Collections.Dictionary<number, WorkItemTrackingInterfaces.WorkItem>();

    await Promise.all(
      workItems.keys().map(async (key) => {
        const workItemsByBuild: WorkItemTrackingInterfaces.WorkItem[] = workItems.getValue(key);

        const workItemTrackingClient: IWorkItemTrackingApi = await this.vstsWebApi.getWorkItemTrackingApi();
        let items = workItemsByBuild
          .map((wi) => wi.relations)
          .reduce((acc, it) => [...acc, ...it])
          .filter((r) => r.rel === 'System.LinkTypes.Hierarchy-Reverse' && r.attributes.name === 'Parent')
          .map((r) => getParentId(r.url));
        while (items.length > 0 && items[0]) {
          const getWorkItemsResult: WorkItemTrackingInterfaces.WorkItem[] = await workItemTrackingClient.getWorkItems(
            items.map((wir) => wir),
            undefined,
            undefined,
            WorkItemTrackingInterfaces.WorkItemExpand.Relations,
          );
          getWorkItemsResult.forEach((r) => result.setValue(r.id, r));
          items = getWorkItemsResult
            .map((wi) => wi.relations)
            .reduce((acc, it) => [...acc, ...it])
            .filter((r) => r.rel === 'System.LinkTypes.Hierarchy-Reverse' && r.attributes.name === 'Parent')
            .map((r) => getParentId(r.url));
        }
      }),
    );

    return result;
  }

  public async getBuilds(azureRelease: ReleaseInterfaces.Release): Promise<Collections.Dictionary<number, BuildInterfaces.Build>> {
    const buildIds: number[] = [];
    azureRelease.artifacts.forEach((a) => {
      buildIds.push(Number(a.definitionReference.version.id));
    });

    console.log(`Getting Build From Artifact Ids: ${JSON.stringify(buildIds)}.`);

    const returnValue = new Collections.Dictionary<number, BuildInterfaces.Build>();
    const client: IBuildApi = await this.vstsWebApi.getBuildApi();

    await Promise.all(
      buildIds.map(async (id) => {
        console.log(`Getting Build From BuildId: ${id}.'`);
        const b = await client.getBuild(this.settings.releaseProjectId, id);
        returnValue.setValue(id, b);
      }),
    );

    console.log(`Got Build From Artifact Ids: ${JSON.stringify(buildIds)}.`);

    return returnValue;
  }

  public async getRelease(): Promise<ReleaseInterfaces.Release> {
    console.log(`Getting Release From ReleaseId: ${this.settings.releaseId}.`);
    const client: IReleaseApi = await this.vstsWebApi.getReleaseApi();
    const release = await client.getRelease(this.settings.releaseProjectId, this.settings.releaseId, ReleaseInterfaces.ApprovalFilters.All);
    console.log(`Got Release From ReleaseId: ${this.settings.releaseId}.`);
    return release;
  }

  public async updateWorkItemState(workItems: WorkItemTrackingInterfaces.WorkItem[]): Promise<WorkItemTrackingInterfaces.WorkItem[]> {
    const result: WorkItemTrackingInterfaces.WorkItem[] = [];
    const workItemTrackingClient: IWorkItemTrackingApi = await this.vstsWebApi.getWorkItemTrackingApi();
    console.log('Updating WorkItems From ReleaseId: ' + this.settings.releaseId + '.');

    workItems.forEach(async (wi) => {
      const wiType = wi.fields['System.WorkItemType'];
      const wiState = wi.fields['System.State'];
      if (!this.settings.workItemTypes.find((s) => s === wiType)) {
        console.log(`Skipped WorkItem From Id: ${wi.id}. Type: "${wiType}" -> Only updating if type in "${this.settings.workItemTypes}".`);
        return;
      }

      console.log(`Updating WorkItem State (${wiState} -> ${this.settings.workItemState}) From Id: ${wi.id}.`);
      const patchOperation: VSSInterfaces.JsonPatchOperation = {
        from: undefined,
        op: VSSInterfaces.Operation.Add,
        path: '/fields/System.State',
        value: this.settings.workItemState,
      };

      const document: any[] = [patchOperation];
      const updatedWorkItem = await workItemTrackingClient.updateWorkItem(undefined, document, wi.id, this.settings.releaseProjectId);
      result.push(updatedWorkItem);

      console.log(`Updated WorkItem State From Id: ${wi.id}.`);
    });

    console.log(`Updated WorkItems From ReleaseId: ${this.settings.releaseId}.`);
    return result;
  }
}
