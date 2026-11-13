import { build } from 'esbuild';
await build({entryPoints:['src/ask-edgeless/widget.mjs'],outfile:'public/ask-edgeless.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,drop:['console'],legalComments:'eof'});
