import { ADOBaseEntity } from '../base/base.entity.js';
import { EntityReference } from '../base/base.types.js';

/**
 * Project visibility
 */
export enum ProjectVisibility {
  Private = 'private',
  Public = 'public',
}

/**
 * Project state
 */
export enum ProjectState {
  All = 'all',
  Creating = 'creating',
  Deleted = 'deleted',
  Deleting = 'deleting',
  New = 'new',
  WellFormed = 'wellFormed',
}

/**
 * Project capabilities
 */
export interface ProjectCapabilities {
  versioncontrol?: {
    sourceControlType: string;
  };
  processTemplate?: {
    templateTypeId: string;
  };
}

/**
 * Project properties
 */
export interface ProjectProperties {
  [key: string]: string;
}

/**
 * Project entity
 */
export interface ProjectData {
  id: string;
  name: string;
  url: string;
  description?: string;
  state: ProjectState;
  revision?: number;
  visibility: ProjectVisibility;
  lastUpdateTime: string;
  defaultTeam?: EntityReference;
  capabilities?: ProjectCapabilities;
  properties?: ProjectProperties;
}

/**
 * Project entity class
 */
export class Project extends ADOBaseEntity {
  description?: string;
  state: ProjectState;
  revision?: number;
  visibility: ProjectVisibility;
  lastUpdateTime: Date;
  defaultTeam?: EntityReference;
  capabilities?: ProjectCapabilities;
  properties?: ProjectProperties;
  
  /**
   * Create a new Project instance
   * @param data Raw project data from the API
   */
  constructor(data: ProjectData) {
    super(data);
    this.description = data.description;
    this.state = data.state;
    this.revision = data.revision;
    this.visibility = data.visibility;
    this.lastUpdateTime = new Date(data.lastUpdateTime);
    this.defaultTeam = data.defaultTeam;
    this.capabilities = data.capabilities;
    this.properties = data.properties;
  }
  
  /**
   * Check if the project is public
   * @returns True if the project is public
   */
  isPublic(): boolean {
    return this.visibility === ProjectVisibility.Public;
  }
  
  /**
   * Check if the project is active
   * @returns True if the project is in a well-formed state
   */
  isActive(): boolean {
    return this.state === ProjectState.WellFormed;
  }
  
  /**
   * Get the source control type for the project
   * @returns Source control type (e.g., Git, Tfvc)
   */
  getSourceControlType(): string | undefined {
    return this.capabilities?.versioncontrol?.sourceControlType;
  }
  
  /**
   * Get the process template ID for the project
   * @returns Process template ID
   */
  getProcessTemplateId(): string | undefined {
    return this.capabilities?.processTemplate?.templateTypeId;
  }
}
