// This checked-in local entry verifies the artifact actually produced by the
// build; the parent never supplies an executable JavaScript string.
import { nativeBuildInfo } from '../native/index.mjs';

console.log(JSON.stringify(nativeBuildInfo()));
