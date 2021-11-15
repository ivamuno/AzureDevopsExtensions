import dateFormat = require('dateformat');
import Collections = require('typescript-collections');

import * as Entities from '../Entities';

export class ReleaseNotesMarkdownFormatter {
    icons = new Collections.Dictionary<string, string>();

    constructor() {
        this.icons.setValue('Work Item', `<span class='fabric-icon ms-Icon--WorkItem'></span>`);
        this.icons.setValue('Task', `<span class='fabric-icon ms-Icon--TaskSolid'></span>`);
        this.icons.setValue('Bug', `<span class='fabric-icon ms-Icon--LadybugSolid'></span>`);
        this.icons.setValue('Enabler', `<span class='fabric-icon ms-Icon--ReadingModeSolid'></span>`);
        this.icons.setValue('Kaizen', `<span class='fabric-icon ms-Icon--ReadingModeSolid'></span>`);
        this.icons.setValue('People', `<span class='fabric-icon ms-Icon--ReadingModeSolid'></span>`);
        this.icons.setValue('Support', `<span class='fabric-icon ms-Icon--ReadingModeSolid'></span>`);
        this.icons.setValue('Tech Debt', `<span class='fabric-icon ms-Icon--ReadingModeSolid'></span>`);
        this.icons.setValue('User Story', `<span class='fabric-icon ms-Icon--ReadingModeSolid'></span>`);
        this.icons.setValue('Feature', `<span class='fabric-icon ms-Icon--Trophy2Solid'></span>`);
        this.icons.setValue('Epic', `<span class='fabric-icon ms-Icon--CrownSolid'></span>`);
        this.icons.setValue('Pull Request', `<span class='fabric-icon ms-Icon--BranchPullRequest'></span>`);
        this.icons.setValue('Release', `<span class='fabric-icon ms-Icon--Rocket'></span>`);
        this.icons.setValue('Stage', `<span class='fabric-icon ms-Icon--ServerEnviroment'></span>`);
        this.icons.setValue('Calendar', `<span class='fabric-icon ms-Icon--Calendar'></span>`);
        this.icons.setValue('Clock', `<span class='fabric-icon ms-Icon--Clock'></span>`);
        this.icons.setValue('Branch', `<span class='fabric-icon ms-Icon--OpenSource'></span>`);
        this.icons.setValue('Build', `<span class='fabric-icon ms-Icon--Build'></span>`);
        this.icons.setValue('Test', `<span class='fabric-icon ms-Icon--TestBeakerSolid'></span>`);
        this.icons.setValue('Artifact', `<span class='fabric-icon ms-Icon--Package'></span>`);
        this.icons.setValue('Repository', `<span class='fabric-icon ms-Icon--GitLogo'></span>`);
        this.icons.setValue('Code Coverage', `<span class='fabric-icon ms-Icon--TestAutoSolid'></span>`);
        this.icons.setValue('Trigger', `<span class='fabric-icon ms-Icon--LightningBolt'></span>`);
        this.icons.setValue('Approval', `<span class='fabric-icon ms-Icon--UserFollowed'></span>`);
        this.icons.setValue('Extension', `<span class='fabric-icon ms-Icon--VerifiedBrand'></span>`);
        this.icons.setValue('Reviewer', `<span class='fabric-icon ms-Icon--UserGauge'></span>`);
        this.icons.setValue('Initiative', `<span class='fabric-icon ms-Icon--DiamondSolid'></span>`);
    }

    private formatDuration(duration: Date): string {
        if (!duration) {
            return '';
        }

        const parts: string[] = [];
        let days: number = 0;
        try {
            days = Math.floor(duration.getTime() / 1000 / 60 / 60 / 24);
        } catch (err) {
            return '';
        }

        if (days > 0) {
            parts.push(`${days}d`);
        }

        const hours: number = duration.getUTCHours();
        if (hours > 0) {
            parts.push(`${hours}h`);
        }

        const minutes: number = duration.getUTCMinutes();
        if (minutes > 0 || parts.length > 0) {
            parts.push(`${minutes}m`);
        }

        const seconds: number = duration.getUTCSeconds();
        if (seconds > 0 || parts.length > 0) {
            parts.push(`${seconds}s`);
        }

        const milliseconds: number = duration.getUTCMilliseconds();
        if (milliseconds > 0 || parts.length > 0) {
            parts.push(`${milliseconds}ms`);
        }

        if (parts.length == 1) {
            return parts[0];
        }

        return parts[0] + ' ' + parts[1];
    }


    private formatRelease(release: Entities.Release): string[] {
        const lines: string[] = [];
        lines.push(`# ${this.icons.getValue('Release')} RELEASE [${release.id} - ${release.name}](${release.url}).`);
        lines.push(`**Release created** : ${dateFormat(release.createdOn)} ${this.icons.getValue('Calendar')}`);
        lines.push(`**Release completed** : ${dateFormat(release.completedOn)} ${this.icons.getValue('Calendar')}`);
        lines.push(`**Duration** : ${this.formatDuration(release.duration)} ${this.icons.getValue('Clock')}`);
        return lines;
    }

    private formatWorkItems(workItems: Entities.WorkItem[]): string[] {
        const lines: string[] = [];

        // Removing duplicates.
        const filteredWorkItems = Array.from(new Set(workItems.map(wi => wi.id))).map(wiId => workItems.find(wi => wi.id == wiId));
        lines.push(`## ${this.icons.getValue('Work Item')} **Work Items**`);
        if (filteredWorkItems.length == 0) {
            lines.push(` - No items found.`);
        }

        filteredWorkItems.forEach(wi => {
            let workItemIcon = this.icons.getValue(wi.type);
            let indent = '';
            lines.push(`${indent} - ${workItemIcon} **${wi.type}.** [${wi.id}-${wi.title}](${wi.url})`);
            let parent = wi.parent;
            while (parent) {
                workItemIcon = this.icons.getValue(parent.type);
                indent += '    ';
                lines.push(`${indent} - ${workItemIcon} **${parent.type}.** [${parent.id}-${parent.title}](${parent.url})`);
                parent = parent.parent;
            }
        });

        return lines;
    }

    private formatStages(stages: Entities.Stage[]): string[] {
        const lines: string[] = [];
        lines.push(`## ${this.icons.getValue('Stage')} **Stages**`);
        if (stages.length == 0) {
            lines.push(` - No items found.`);
        }

        stages.forEach(s => {
            lines.push(`- **${s.name}**`);
            lines.push(`    - **Trigger Reason:** ${s.triggerReason} ${this.icons.getValue('Trigger')}`);
            lines.push(`    - **Completed:** ${dateFormat(s.completedOn)} ${this.icons.getValue('Calendar')}.`);
            lines.push(`    - **Duration:** ${s.duration} ${this.icons.getValue('Clock')}.`);
            if (s.approvals && s.approvals.length > 0) {
                lines.push(`    - ${this.icons.getValue('Approval')} **Approvals**`);
                s.approvals.forEach(a => {
                    lines.push(`        - **${a.type}:** ${a.approver.name} **on** ${dateFormat(a.on)}`);
                });
            } else {
                lines.push(`    - ${this.icons.getValue('Approval')} **Approvals:** N/A.`);
            }
        });

        return lines;
    }

    private formatBuilds(builds: Entities.Build[]): string[] {
        const lines: string[] = [];
        lines.push(`## ${this.icons.getValue('Build')} **Builds**`);
        if (builds.length == 0) {
            lines.push(` - No items found.`);
        }

        builds.forEach(b => {
            lines.push(`- ${this.icons.getValue('Artifact')} [${b.buildNumber} - ${b.definition}](${b.url}).`);
            lines.push(`    - **Trigger:** ${b.trigger} ${this.icons.getValue('Trigger')}`);
            lines.push(`    - **Started:** ${dateFormat(b.startedOn)} ${this.icons.getValue('Calendar')}.`);
            lines.push(`    - **Completed:** ${dateFormat(b.completedOn)} ${this.icons.getValue('Calendar')}.`);
            lines.push(`    - **Duration:** ${this.formatDuration(b.duration)} ${this.icons.getValue('Clock')}`);
            lines.push(`    - **Requested For:** ${b.requestedFor.name}`);
            lines.push(`    - ${this.icons.getValue('Repository')} **Repository:** [${b.repository.name}](${b.repository.url})`);
            lines.push(`        - **Branch:** ${b.sourceBranch} ${this.icons.getValue('Branch')}`);
            lines.push(`        - **Version:** ${b.sourceVersion}`);
            if (b.testRun && b.testRun.total > 0) {
                const test = b.testRun;
                lines.push(`    - ${this.icons.getValue('Test')} **Test Run:** ${test.passedPercent * 100}% passed of ${test.total}, ran for ${this.formatDuration(test.duration)} ${this.icons.getValue('Clock')}.`);
                lines.push(`        - **Increase in total:** ${test.difference.increaseInTotalTests}.`);
                lines.push(`        - **Increase in duration:** ${this.formatDuration(test.difference.increaseInDuration)}.`);
            } else {
                lines.push(`    - ${this.icons.getValue('Test')} **Test Run:** N/A.`);
            }

            if (b.codeCoverage) {
                const codeCoverage = b.codeCoverage;
                lines.push(`    - ${this.icons.getValue('Code Coverage')} **Code Coverage:**`);
                codeCoverage.flavors.forEach(f => {
                    lines.push(`        - **Flavor:** ${f.name}. **Total:** ${f.total}, **Covered:** ${Math.round(f.covered / f.total * 10000) / 100}%.`);
                });
            } else {
                lines.push(`    - ${this.icons.getValue('Code Coverage')} **Code Coverage:** N/A.`);
            }

            if (b.extensions && b.extensions.length > 0) {
                lines.push(`    - ${this.icons.getValue('Extension')} **Extensions:**`);
                b.extensions.forEach(e => {
                    lines.push(`        - **Name:** [${e.name}](${e.url}).`);
                });
            } else {
                lines.push(`    - ${this.icons.getValue('Extension')} **Extensions:** N/A.`);
            }
        });

        return lines;
    }

    private formatPullRequest(pullRequests: Entities.PullRequest[]): string[] {
        const lines: string[] = [];
        lines.push(`## ${this.icons.getValue('Pull Request')} **Pull Requests**`);
        if (pullRequests.length == 0) {
            lines.push(` - No items found.`);
        }

        pullRequests.forEach(pr => {
            lines.push(`- [${pr.id} - ${pr.title}](${pr.url})`); lines.push(`    - **Created by** ${pr.createdBy.name} **on** ${dateFormat(pr.creationDate)} ${this.icons.getValue('Calendar')}.`);
            lines.push(`    - **Closed by** ${pr.closedBy.name} **on** ${dateFormat(pr.closedDate)} ${this.icons.getValue('Calendar')}.`);
            if (pr.reviewers && pr.reviewers.length > 0) {
                lines.push(`    - ${this.icons.getValue('Reviewer')} **Reviewers**`);
                pr.reviewers.forEach(r => {
                    lines.push(`        - **${r.name}**`);
                });
            } else {
                lines.push(`    - ${this.icons.getValue('Reviewer')} **Reviewers:** N/A.`);
            }

            lines.push(`    - **Repository:** ${this.icons.getValue('Repository')} ${pr.repository.name}. **From** ${this.icons.getValue('Branch')} ${pr.sourceBranch} **to** ${this.icons.getValue('Branch')} ${pr.targetBranch}.`);
        });

        return lines;
    }

    public format(releaseNote: Entities.ReleaseNote): string {
        const workItems: Entities.WorkItem[][] = releaseNote.pullRequests.map(pr => pr.workItems);
        const lines: string[] = [
            ...this.formatRelease(releaseNote.release),
            ...this.formatPullRequest(releaseNote.pullRequests),
            ...this.formatWorkItems(workItems.length == 0 ? [] : workItems.reduce((acc, it) => [...acc, ...it])),
            ...this.formatStages(releaseNote.release.stages),
            ...this.formatBuilds(releaseNote.builds),
        ];

        return lines.join('\r\n');
    }
}