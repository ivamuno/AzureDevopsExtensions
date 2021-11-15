import tl = require('vsts-task-lib/task');
import { AzureHelper } from './AzureHelper';
import { SettingsProvider } from './SettingsProvider';
import { WebApiProvider } from './WebApiProvider';

export class AzureHelperFactory {
    private webApiProvider = new WebApiProvider();
    private settingsProvider = new SettingsProvider();

    public getSettings(): AzureHelper {
        console.log('Check environment variable to get settings');
        const environmentDev: string | undefined = process.env.RELEASE_NOTES_DEV_ENV;
        console.log(`Environment dev: ${environmentDev}`);
        if (environmentDev != undefined) {
            return this.getFromCode();
        }
        else {
            return this.getFromPipeline();
        }
    }

    private getFromPipeline(): AzureHelper {
        console.log('Get settings from pipeline');
        return new AzureHelper(this.webApiProvider.getFromPipeline(), this.settingsProvider.getFromPipeline());
    }

    private getFromCode(): AzureHelper {
        console.log('Get settings from code');
        return new AzureHelper(this.webApiProvider.getFromCode(), this.settingsProvider.getFromCode());
    }
}