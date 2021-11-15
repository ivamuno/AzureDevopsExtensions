import { AzureHelper } from './AzureHelper';
import { SettingsProvider } from './SettingsProvider';
import { WebApiProvider } from './WebApiProvider';

export class AzureHelperFactory {
  private webApiProvider = new WebApiProvider();
  private settingsProvider = new SettingsProvider();

  public getFromPipeline(): AzureHelper {
    return new AzureHelper(this.webApiProvider.getFromPipeline(), this.settingsProvider.getFromPipeline());
  }

  public getFromCode(): AzureHelper {
    return new AzureHelper(this.webApiProvider.getFromCode(), this.settingsProvider.getFromCode());
  }
}
