const fs = require('fs');
const path = require('path');

function patchFile(filePath, transforms) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  for (const { from, to } of transforms) {
    content = content.replace(from, to);
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully patched ${filePath}`);
  }
}

// 1. Patch entry-base.js (CJS & ESM)
const entryBaseCjs = path.join(__dirname, '../node_modules/next/dist/server/app-render/entry-base.js');
const entryBaseEsm = path.join(__dirname, '../node_modules/next/dist/esm/server/app-render/entry-base.js');

const devtoolsRequirePattern = /if\s*\(process\.env\.NODE_ENV\s*===\s*['"]development['"]\)\s*\{\s*const mod\s*=\s*require\(['"][^'"]*segment-explorer-node['"]\);\s*SegmentViewNode\s*=\s*mod\.SegmentViewNode;\s*SegmentViewStateNode\s*=\s*mod\.SegmentViewStateNode;\s*\}/g;

patchFile(entryBaseCjs, [
  { from: 'let SegmentViewNode = ()=>null;', to: 'let SegmentViewNode = (props)=>(props?.children || null);' },
  { from: devtoolsRequirePattern, to: '/* disabled next-devtools in userspace */' }
]);

patchFile(entryBaseEsm, [
  { from: 'let SegmentViewNode = ()=>null;', to: 'let SegmentViewNode = (props)=>(props?.children || null);' },
  { from: devtoolsRequirePattern, to: '/* disabled next-devtools in userspace */' }
]);

// 2. Patch segment-explorer-node.js
const devtoolsNodeCjs = path.join(__dirname, '../node_modules/next/dist/next-devtools/userspace/app/segment-explorer-node.js');
const devtoolsNodeEsm = path.join(__dirname, '../node_modules/next/dist/esm/next-devtools/userspace/app/segment-explorer-node.js');

const safeDevtoolsContent = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentViewNode = function(param) { return param ? param.children : null; };
exports.SegmentViewStateNode = function() { return null; };
exports.SegmentBoundaryTriggerNode = function() { return null; };
exports.SegmentStateProvider = function(param) { return param ? param.children : null; };
exports.useSegmentState = function() { return { boundaryType: null, setBoundaryType: function() {} }; };
exports.SEGMENT_EXPLORER_SIMULATED_ERROR_MESSAGE = 'NEXT_DEVTOOLS_SIMULATED_ERROR';
`;

if (fs.existsSync(devtoolsNodeCjs)) {
  fs.writeFileSync(devtoolsNodeCjs, safeDevtoolsContent, 'utf8');
  console.log(`Safely replaced ${devtoolsNodeCjs}`);
}

if (fs.existsSync(devtoolsNodeEsm)) {
  fs.writeFileSync(devtoolsNodeEsm, safeDevtoolsContent, 'utf8');
  console.log(`Safely replaced ${devtoolsNodeEsm}`);
}
