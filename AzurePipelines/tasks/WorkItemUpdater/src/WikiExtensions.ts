import * as WikiInterfaces from 'azure-devops-node-api/interfaces/WikiInterfaces';
import * as vsom from 'azure-devops-node-api/VsoClient';

import { IWikiApi, WikiApi } from 'azure-devops-node-api/WikiApi';
import * as restm from 'typed-rest-client/RestClient';

declare module 'azure-devops-node-api/WikiApi' {
  export interface IWikiApi {
    createPage(this: IWikiApi, project: string, wikiIdentifier: string, path: string, content: string): Promise<WikiInterfaces.WikiPage>;
  }

  export interface WikiApi {
    createPage(this: IWikiApi, project: string, wikiIdentifier: string, path: string, content: string): Promise<WikiInterfaces.WikiPage>;
  }
}

/**
 * Creates or edits a wiki page.
 *
 * @param {string} project - Project ID or project name
 * @param {string} wikiIdentifier - Wiki Id or name.
 * @param {string} path - Wiki page path.
 * @param {string} content - Wiki page content.
 */
export async function createPage(
  this: IWikiApi,
  project: string,
  wikiIdentifier: string,
  path: string,
  content: string,
): Promise<WikiInterfaces.WikiPage> {
  const routeValues: any = {
    project: project,
    wikiIdentifier: wikiIdentifier,
  };

  const queryValues: any = {
    path: path,
  };

  const verData: vsom.ClientVersioningData = await this.vsoClient.getVersioningData(
    '5.0',
    'wiki',
    '25d3fbc7-fe3d-46cb-b5a5-0b6f79caf27b',
    routeValues,
    queryValues,
  );

  const url: string = verData.requestUrl!;
  const options: restm.IRequestOptions = this.createRequestOptions('application/json', verData.apiVersion);

  const req: WikiInterfaces.WikiPageCreateOrUpdateParameters = { content: content };
  const res = await this.rest.replace(url, req, options);
  const ret = this.formatResponse(res.result, <any>{}, false);

  return ret;
}

WikiApi.prototype.createPage = createPage;
