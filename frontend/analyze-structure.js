const fs = require('fs');

const data = JSON.parse(fs.readFileSync('student-page-structure.txt', 'utf8'));

function extractStructure(node, depth = 0) {
  const indent = '  '.repeat(depth);
  let output = `${indent}${node.name} (${node.type})\n`;
  
  if (node.children && depth < 4) {
    node.children.forEach(child => {
      output += extractStructure(child, depth + 1);
    });
  }
  
  return output;
}

const structure = extractStructure(data.document);
console.log(structure);
