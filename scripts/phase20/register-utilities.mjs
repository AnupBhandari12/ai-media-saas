// Phase 20 final gate. Applies exactly three reviewed text updates after browser QA.
// No env, API, secrets, DB, network or Git operations. Refuses unfamiliar source markers.
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const root=process.cwd();
const registry=resolve(root,"lib/tools/registry.js");
const hub=resolve(root,"components/tools/ToolsHub.jsx");
const tests=resolve(root,"tests/tools/registry.test.js");
const entries = [
  {id:"UTL-01",slug:"qr-code",name:"QR Code Generator",description:"Create QR codes for links, text, contacts and Wi-Fi.",route:"/tools/utility/qr-code",inputTypes:["text/plain"],outputTypes:["image/png","image/svg+xml"],priority:"P1"},
  {id:"UTL-03",slug:"image-ocr",name:"Image to Text OCR",description:"Extract English or Nepali text from an image locally.",route:"/tools/utility/image-ocr",inputTypes:["image/jpeg","image/png","image/webp"],outputTypes:["text/plain"],priority:"P2"},
  {id:"UTL-04",slug:"document-scanner",name:"Document Scanner",description:"Perspective-correct document photos and export image or PDF.",route:"/tools/utility/document-scanner",inputTypes:["image/jpeg","image/png","image/webp"],outputTypes:["image/jpeg","application/pdf"],priority:"P2"},
  {id:"UTL-05",slug:"color-palette",name:"Color Picker / Palette",description:"Pick HEX/RGB colors and palettes from photos.",route:"/tools/utility/color-palette",inputTypes:["image/jpeg","image/png","image/webp"],outputTypes:["text/plain"],priority:"P3"},
  {id:"UTL-06",slug:"favicon-generator",name:"Favicon / App Icon Generator",description:"Generate sized favicon and app icons as a ZIP.",route:"/tools/utility/favicon-generator",inputTypes:["image/jpeg","image/png","image/webp"],outputTypes:["application/zip"],priority:"P2"},
  {id:"UTL-08",slug:"file-inspector",name:"File Inspector",description:"Inspect file signatures, dimensions and metadata locally.",route:"/tools/utility/file-inspector",inputTypes:["application/octet-stream"],outputTypes:["application/json"],priority:"P2"},
];
function replaceOnce(content,find,replace,label){
 if(!content.includes(find))throw new Error(`Cannot locate verified ${label} marker; no files changed.`);
 if(content.split(find).length!==2)throw new Error(`Duplicate ${label} marker; no files changed.`);
 return content.replace(find,replace);
}
async function main(){
 // Git on Windows can check out tracked files as CRLF. Normalize only for
 // marker matching, and preserve each original file's line endings on write.
 const originals=await Promise.all([registry,hub,tests].map(x=>readFile(x,"utf8")));
 const lineEndings=originals.map(x=>x.includes("\r\n")?"\r\n":"\n");
 const files=originals.map(x=>x.replace(/\r\n/g,"\n"));
 if(files.some(x=>x.includes('id: "UTL-01"'))){throw new Error("Utility registry appears already installed; refusing to apply twice.");}
 const beforeRegistry=files[0];
 if((beforeRegistry.match(/\bid:\s*"/g)||[]).length!==67)throw new Error("Expected exactly 67 existing tool definitions; inspect current main branch first.");
 const defs=entries.map(e=>`  { id: "${e.id}", slug: "${e.slug}", name: ${JSON.stringify(e.name)}, description: ${JSON.stringify(e.description)}, category: "UTILITY", route: "${e.route}", engine: TOOL_ENGINES.BROWSER_UTILITY, inputTypes: ${JSON.stringify(e.inputTypes)}, outputTypes: ${JSON.stringify(e.outputTypes)}, quotaKey: "LOCAL_UTILITY_TOOL", status: TOOL_STATUS.AVAILABLE, priority: "${e.priority}" }`).join(',\n');
 let newRegistry=replaceOnce(files[0], '  BROWSER_AUDIO:\n    "BROWSER_AUDIO",', '  BROWSER_UTILITY: "BROWSER_UTILITY",\n\n  BROWSER_AUDIO:\n    "BROWSER_AUDIO",', "engine identifier");
 newRegistry=replaceOnce(newRegistry,"export function getToolById(toolId) {",`// Phase 20 additions: browser-local; no cloud uploads.\ntools.push(\n${defs}\n);\n\nexport function getToolById(toolId) {`,"registry");
 let newHub=replaceOnce(files[1],'  AUDIO: "Audio",','  AUDIO: "Audio",\n  UTILITY: "Utility",',"category label");
 newHub=replaceOnce(newHub,'Search image, PDF, video, audio and AI tools...','Search image, PDF, utility, video, audio and AI tools...',"search placeholder");
 let newTests=replaceOnce(files[2],"toHaveLength(\n      67\n    );","toHaveLength(\n      73\n    );","tool count");
 newTests=replaceOnce(newTests,'      "AUD-06",','      "AUD-06",\n\n      "UTL-01",\n      "UTL-03",\n      "UTL-04",\n      "UTL-05",\n      "UTL-06",\n      "UTL-08",',"available ID list");
 // Every precondition completed before writing to disk.
 await Promise.all([[registry,newRegistry],[hub,newHub],[tests,newTests]].map(([path,content],i)=>writeFile(path,content.replace(/\n/g,lineEndings[i]),"utf8")));
 console.log("Phase 20 tools registered: 6. Updated registry, ToolsHub and registry test. Review git diff; run all tests before committing.");
}
main().catch(e=>{console.error("Phase20 registration REFUSED: "+e.message);process.exitCode=1;});
