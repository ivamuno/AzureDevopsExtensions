import Collections = require('typescript-collections');

import * as Entities from '../Entities';

import { ReqWorkItemsTraceability } from '../TollGates/ReqWorkItemsTraceability';
import { ReqFeatureAcceptanceCriteria } from '../TollGates/ReqFeatureAcceptanceCriteria';
import { ReqFeatureTeamName } from '../TollGates/ReqFeatureTeamName';
import { ReqFeaturePrivacyAssessment } from '../TollGates/ReqFeaturePrivacyAssessment';
import { ReqFeatureSecurityAssessment } from '../TollGates/ReqFeatureSecurityAssessment';
import { ReqUserStoryEstimation } from '../TollGates/ReqUserStoryEstimation';
import { ReqUserStoryTeamName } from '../TollGates/ReqUserStoryTeamName';
import { ReqCodeReviewed } from '../TollGates/ReqCodeReviewed';
import { ReqTestsPerformedInBuild } from '../TollGates/ReqTestsPerformedInBuild';
import { ReqStaticSecurityTesting } from '../TollGates/ReqStaticSecurityTesting';
import { ReqStageApproved } from '../TollGates/ReqStageApproved';
import { ReqSnykIntegration } from '../TollGates/ReqSnykIntegration';

export class TollGatesResultFormatter {
    ColorOk: string = 'green';
    ColorError: string = 'red';
    ColorWarn: string = 'rgba(214,127,60,1)';

    colors = new Collections.Dictionary<string, string>();
    icons = new Collections.Dictionary<string, string>();

    constructor() {
        this.icons.setValue(Entities.RequirementResultType[Entities.RequirementResultType.Error], `<span class='fabric-icon ms-Icon--StatusErrorFull' style='color:red;'></span>`);
        this.icons.setValue(Entities.RequirementResultType[Entities.RequirementResultType.Ok], `<span class='fabric-icon ms-Icon--CompletedSolid' style='color:${this.ColorOk};'></span>`);
        this.icons.setValue(Entities.RequirementResultType[Entities.RequirementResultType.Warn], `<span class='fabric-icon ms-Icon--AlertSolid' style='color:${this.ColorWarn};'></span>`);
        this.icons.setValue((new ReqWorkItemsTraceability()).constructor.name, `<span class='fabric-icon ms-Icon--WorkItem'></span>`);
        this.icons.setValue((new ReqFeatureAcceptanceCriteria()).constructor.name, `<span class='fabric-icon ms-Icon--Feedback'></span>`);
        this.icons.setValue((new ReqFeatureTeamName()).constructor.name, `<span class='fabric-icon ms-Icon--Group'></span>`);
        this.icons.setValue((new ReqFeaturePrivacyAssessment()).constructor.name, `<span class='fabric-icon ms-Icon--Group'></span>`);
        this.icons.setValue((new ReqFeatureSecurityAssessment()).constructor.name, `<span class='fabric-icon ms-Icon--Group'></span>`);
        this.icons.setValue((new ReqUserStoryEstimation()).constructor.name, `<span class='fabric-icon ms-Icon--Stopwatch'></span>`);
        this.icons.setValue((new ReqUserStoryTeamName()).constructor.name, `<span class='fabric-icon ms-Icon--Group'></span>`);
        this.icons.setValue((new ReqCodeReviewed()).constructor.name, `<span class='fabric-icon ms-Icon--UserGauge'></span>`);
        this.icons.setValue((new ReqTestsPerformedInBuild()).constructor.name, `<span class='fabric-icon ms-Icon--TestBeakerSolid'></span>`);
        this.icons.setValue((new ReqStaticSecurityTesting()).constructor.name, `<span class='fabric-icon ms-Icon--TestAutoSolid'></span>`);
        this.icons.setValue((new ReqSnykIntegration()).constructor.name, `<span class='fabric-icon ms-Icon--TestAutoSolid'></span>`);
        this.icons.setValue((new ReqStageApproved()).constructor.name, `<span class='fabric-icon ms-Icon--UserFollowed'></span>`);

        this.colors.setValue(Entities.RequirementResultType[Entities.RequirementResultType.Error], this.ColorError);
        this.colors.setValue(Entities.RequirementResultType[Entities.RequirementResultType.Ok], this.ColorOk);
        this.colors.setValue(Entities.RequirementResultType[Entities.RequirementResultType.Warn], this.ColorWarn);
    }

    public format(auditedReleaseNote: Entities.AuditedReleaseNote): string {
        const lines: string[] = [];
        lines.push('| **Requirement** | **Passed** | **Details** |');
        lines.push('|--|--|--|');
        const body: string[] = auditedReleaseNote.tollGatesResults
            .map(r => {
                return `| ${this.icons.getValue(r.requirementName)} **${r.requirementTitle}**<br>${r.requirementExplanation.replace('\r\n', '<br>')} | ${this.icons.getValue(Entities.RequirementResultType[r.resultType])} | <span style='color:${this.colors.getValue(Entities.RequirementResultType[r.resultType])};'>${r.message}</span>`;
            });
        lines.push(...body);
        return lines.join('\r\n');
    }
}