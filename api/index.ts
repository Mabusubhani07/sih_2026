// IMPORTANT: Polyfills MUST be imported first — before any other import.
// Vercel/esbuild hoists all imports, so this side-effect import runs before
// pdf.js initialises its internal DOMMatrix/DOMPoint references.
import '../server/src/polyfills';

import app from '../server/src/index';

export default app;
module.exports = app;
