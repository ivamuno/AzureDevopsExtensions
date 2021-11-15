import * as VsoBaseInterfaces from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';
import * as WebApi from 'azure-devops-node-api/WebApi';
import * as tl from 'azure-pipelines-task-lib';

export class WebApiProvider {
  public getFromPipeline(): WebApi.WebApi {
    const endpointUrl: string = tl.getVariable('System.TeamFoundationCollectionUri');
    const accessToken: string = tl.getVariable('AcessToken');
    return this.buildWepApi(endpointUrl, accessToken);
  }

  public getFromCode(): WebApi.WebApi {
    const endpointUrl: string = 'https://dev.azure.com/ivamuno';
    const accessToken: string = process.env.AZURE_DEVOPS_EXT_PAT;
    return this.buildWepApi(endpointUrl, accessToken);
  }

  private buildWepApi(endpointUrl: string, accessToken: string): WebApi.WebApi {
    const credentialHandler: VsoBaseInterfaces.IRequestHandler = WebApi.getHandlerFromToken(accessToken);
    const webApi: WebApi.WebApi = new WebApi.WebApi(endpointUrl, credentialHandler);
    return webApi;
  }
}
