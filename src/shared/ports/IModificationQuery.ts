/**
 * Port interface for querying block modifications.
 * Used by WorldService to apply saved modifications during chunk generation.
 */
export interface IModificationQuery {
  /**
   * Get modifications for a specific chunk by its key (e.g., "0,0")
   * Returns Map<localPosKey, blockType> or undefined if no modifications
   */
  getChunkModifications(chunkKey: string): Map<string, number> | undefined
}
