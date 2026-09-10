/**
 * Encoding facts that the *generated page* also needs to know.
 *
 * Deliberately a leaf module with no imports: watermark.ts pulls in
 * node:child_process, and the demo template must stay free of Node
 * built-ins (it is rendered from the app, and lib/video already imports
 * the demo generator — importing back into watermark.ts would close
 * that loop).
 */

/**
 * Frame rate every scrub encode is interpolated to.
 *
 * The page that scrubs these clips derives its scroll distance from the
 * frame count (see scrollVideoSection): what reads as smooth is how
 * many pixels of scroll pass between two distinct frames, so the page
 * has to know how many frames there are. No browser API exposes a
 * video's frame rate, so the number travels from the encoder to the
 * page through this constant rather than being written down twice.
 */
export const SCRUB_FPS = 30;
