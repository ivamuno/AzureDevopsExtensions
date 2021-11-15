import * as Entities from '../Entities';

export interface ITollGatesExecuter {
    execute(releaseNote: Entities.ReleaseNote): TollGatesResult[];
}

export interface TollGatesResult {
    requirementName: string;
    requirementTitle: string;
    requirementExplanation: string;
    resultType: RequirementResultType;
    message: string;
}

export interface Requirement {
    order: number;
    name: string;
    explanation: string;
    execute(releaseNote: Entities.ReleaseNote): RequirementResult;
}

export interface RequirementResult {
    resultType: RequirementResultType;
    message: string;
}

export enum RequirementResultType {
    Ok = 1,
    Error = 2,
    Warn = 3
}