import * as WebApi from 'azure-devops-node-api/WebApi';
import * as VsoBaseInterfaces from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';
import * as ExtensionManagementApi from 'azure-devops-node-api/ExtensionManagementApi';
import * as fs from 'fs';

const publisherName: string = 'Ivamuno';
const extensionName: string = 'ivamuno-azure-boards';
const scopeType: string = 'Default';
const scopeValue: string = 'Current';

function buildWepApi(): WebApi.WebApi {
  const endpointUrl: string = 'https://dev.azure.com/ivamuno';
  const accessToken: string = 'INSERT_YOUR_AZURE_DEVOPS_ACCESS_TOKEN';
  const credentialHandler: VsoBaseInterfaces.IRequestHandler = WebApi.getHandlerFromToken(accessToken);
  const webApi: WebApi.WebApi = new WebApi.WebApi(endpointUrl, credentialHandler);
  return webApi;
}

async function getDocuments(collectionName: string): Promise<any> {
  const webApi: WebApi.WebApi = buildWepApi();
  const eManager: ExtensionManagementApi.IExtensionManagementApi = await webApi.getExtensionManagementApi();
  return await eManager.getDocumentsByName(publisherName, extensionName, scopeType, scopeValue, collectionName);
}

async function getDocument(collectionName: string, documentId: string): Promise<any> {
  const webApi: WebApi.WebApi = buildWepApi();
  const eManager: ExtensionManagementApi.IExtensionManagementApi = await webApi.getExtensionManagementApi();
  return await eManager.getDocumentByName(publisherName, extensionName, scopeType, scopeValue, collectionName, documentId);
}

async function deleteDocument(collectionName: string, documentId: string): Promise<any> {
  const webApi: WebApi.WebApi = buildWepApi();
  const eManager: ExtensionManagementApi.IExtensionManagementApi = await webApi.getExtensionManagementApi();
  return await eManager.deleteDocumentByName(publisherName, extensionName, scopeType, scopeValue, collectionName, documentId);
}

async function deployDocument(collectionName: string, document: any): Promise<any> {
  const webApi: WebApi.WebApi = buildWepApi();
  const eManager: ExtensionManagementApi.IExtensionManagementApi = await webApi.getExtensionManagementApi();

  let doc = await getDocument(collectionName, document.id);
  if (doc && doc.id) {
    doc = await deleteDocument(collectionName, document.id);
  }

  return await eManager.setDocumentByName(document, publisherName, extensionName, scopeType, scopeValue, collectionName);
}

async function deployTfsWidgetDoc(collectionName: string, documentId: string) {
  const file: string = fs.readFileSync(`./widgets/WidgetBuilder/instances/${collectionName}/${documentId}.js`, 'utf8');
  const document = { id: documentId, value: file };
  await deployDocument(collectionName, document);

  console.log(`Instance '${documentId}' deployed correctly.`);
}

async function deployTfsWidgetProgressDoc() {
  await deployTfsWidgetDoc('Team', 'TfsWidgetProgressDoc');
}

async function deployTfsWidgetCurrentSprintDoc() {
  await deployTfsWidgetDoc('Team', 'TfsWidgetCurrentSprintDoc');
}

async function deployTfsWidgetSprintPreparationDoc() {
  await deployTfsWidgetDoc('Team', 'TfsWidgetSprintPreparationDoc');
}

async function deployTfsWidgetCrosscutting() {
  await deployTfsWidgetDoc('Crosscutting', 'TfsWidgetWikiAnalyticsDoc');
}

async function deployTfsWidgetTeam() {
  await deployTfsWidgetProgressDoc();
  await deployTfsWidgetCurrentSprintDoc();
  await deployTfsWidgetSprintPreparationDoc();
}

async function deployTfsWidgetGroup() {
  await deployTfsWidgetDoc('Group', 'TfsWidgetReleaseTrainSyncDoc');
  await deployTfsWidgetDoc('Group', 'TfsWidgetReleaseTrainProgressDoc');
}

async function main(): Promise<void> {
  try {
    await deployTfsWidgetCrosscutting();
    await deployTfsWidgetTeam();
    await deployTfsWidgetGroup();
    console.log('Instance(s) deployed correctly.');
  } catch (error) {
    console.log('Error: ', error);
  }
}

main();
