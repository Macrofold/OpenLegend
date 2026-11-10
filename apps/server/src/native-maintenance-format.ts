import { canonicalJson, validMindFilePath, wordCount, type MindFiles } from '@open-legend/domain';
import type { NativeGeometryQueries } from '@open-legend/native-simulation';

export interface NativeMaintenanceFormatRequest {
  readonly binding: NativeGeometryQueries['binding'];
  readonly publication: Readonly<Record<string, unknown>> & {
    readonly files: MindFiles;
    readonly thoughts: readonly string[];
  };
}
/** The existing Source Unicode and canonical-text owners prepare finite text
 * facts only. Native retains the exact publication and all protected state,
 * validates this reply and performs its own byte/identity/source checks. */
export function nativeMaintenanceFormat(request: NativeMaintenanceFormatRequest) {
  return {
    binding: request.binding,
    canonicalPublication: canonicalJson(request.publication),
    validPaths: request.publication.files.map((file) => validMindFilePath(file.path)),
    fileWords: request.publication.files.map((file) => wordCount(`${file.path} ${file.text}`)),
    thoughtWords: request.publication.thoughts.map(wordCount),
  };
}
