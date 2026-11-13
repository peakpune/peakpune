// esbuild entry: starts the compiled Gleam/Lustre app and hides the no-JavaScript fallback once it has rendered.
// This file contains no planner logic.
import { main } from './build/dev/javascript/peakpune_metro/peakpune_metro.mjs';

main();
const mount = document.getElementById('metro-planner');
const fallback = document.getElementById('metro-planner-fallback');
const hide = () => { if (mount && fallback && mount.children.length) fallback.hidden = true; };
hide();
if (mount) new MutationObserver(hide).observe(mount, { childList: true });
