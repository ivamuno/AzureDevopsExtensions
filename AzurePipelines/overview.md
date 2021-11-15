# [Ivamuno] Azure Pipelines

## Overview

Set of tasks to be used in an Azure DevOps release pipeline.
This extension provides the following features:

- **PTAF on Docker**: Execute PTAF end-to-end tests on a Docker container.
  - Publish the results on OnionKnight (https://onionknight.ivamuno.app).
- **Sonar Team Setter**: Set the team in SonarQube as tag.
- **Work Item Updater**: Update WorkItem fields.
  For now, it updates the state for any work item type.
