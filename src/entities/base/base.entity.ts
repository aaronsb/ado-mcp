import { BaseEntity, EntityReference } from './base.types.js';

/**
 * Base class for all Azure DevOps entities
 * Provides common properties and methods
 */
export abstract class ADOBaseEntity implements BaseEntity {
  id: string;
  name?: string;
  url?: string;
  
  /**
   * Create a new entity instance
   * @param data Raw entity data from the API
   */
  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.url = data.url;
  }
  
  /**
   * Convert the entity to a reference
   * @returns Entity reference
   */
  toReference(): EntityReference {
    return {
      id: this.id,
      name: this.name,
      url: this.url
    };
  }
  
  /**
   * Create an entity reference from raw data
   * @param data Raw reference data
   * @returns Entity reference
   */
  static createReference(data: any): EntityReference {
    return {
      id: data.id,
      name: data.name,
      url: data.url
    };
  }
}
