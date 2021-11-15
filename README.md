# AzureDevopsExtensions

Custom common Azure DevOps extensions.

- [AzureDevopsExtensions](#azuredevopsextensions)
  - [Getting Started](#getting-started)
  - [Build and Test](#build-and-test)
    - [Azure DevOps pipelines](#azure-devops-pipelines)
    - [Local](#local)
  - [Contribute](#contribute)
  - [Versioning](#versioning)

## Getting Started

Extensions are organized in a folder for each type of extension ([Azure DevOps extension categories](https://docs.microsoft.com/en-us/azure/devops/extend/develop/manifest?view=azure-devops)):

- Azure Repos
- Azure Boards
- Azure Pipelines
- Azure Test Plans
- Azure Artifacts

## Build and Test

### Local

To execute locally some of the tasks, it is necessary to include your Azure DevOps Personal Access Token (PAT) as environment variable `AZURE_DEVOPS_EXT_PAT`.

## Contribute

Each extension should:

- Contain an `overview.md` file with the extension description and the list of available tasks.
- Have an extension `id` that matches the Azure DevOps extension category such as `ivamuno-azure-pipelines`.
- Have a name starting with `[IVAMUNO]` and followed by the Azure DevOps category such as `[IVAMUNO] Azure Pipelines`.
- Have as publisher `ivamuno`.
- Have an icon.
- Contain all the components code under their type folder, the name of the folder is given by the lastest part of the type. For example, the folder for `"type": "ms.vss-distributed-task.task"` is `tasks`.

Folder and files structure example:

- AzurePipelines
  - img
    - `icon.png`
  - tasks
    - ReleaseNotesGenerator
      - `icon.png` (A 512x512 icon for the task)
  - `overview.md`

Each task should:

- Have a GUID as the task `id`.
- Have a description that must be included in the extension `overview.md` file.

## Versioning

Every time a new component (commonly `task`) is:

- Added: the minor version of the extension has to be increased (i.e. 1.**2**.0).
- Modified:
  - the patch version of the extension has to be increased (i.e. 1.0.**1**).
  - the task version must be increased following standard conventions (major for breaking changes, minor for new features and patch for bug fixes).
