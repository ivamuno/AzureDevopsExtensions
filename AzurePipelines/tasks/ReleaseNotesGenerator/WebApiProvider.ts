//webapiprovider
import tl = require('vsts-task-lib/task');
import * as WebApi from 'azure-devops-node-api/WebApi';
import * as VsoBaseInterfaces from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';


export class WebApiProvider {
    private buildWepApi(endpointUrl: string, accessToken: string): WebApi.WebApi {
        if(!(!!accessToken)){
            tl.setResult(tl.TaskResult.Failed, 'No access token found')
        }        
        const credentialHandler: VsoBaseInterfaces.IRequestHandler = WebApi.getHandlerFromToken(accessToken);
        const webApi: WebApi.WebApi = new WebApi.WebApi(endpointUrl, credentialHandler);
        return webApi;
    }

    public getFromPipeline(): WebApi.WebApi {
        var accessToken = tl.getInput('ivamunoPAT', true);
        const endpointUrl: string = tl.getVariable('System.TeamFoundationCollectionUri');
    
        const atob = require('atob');
        console.log(`AccessToken ${accessToken}`);
        const clearToken = atob(accessToken);

        return this.buildWepApi(endpointUrl, clearToken);
    }

    public getFromCode(): WebApi.WebApi {
        const endpointUrl: string = 'https://dev.azure.com/ivamuno';
        const accessToken: string = process.env.AZURE_DEVOPS_EXT_PAT;
        return this.buildWepApi(endpointUrl, accessToken);
    }
}