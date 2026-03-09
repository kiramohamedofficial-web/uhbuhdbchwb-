const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}
let count = 0;
const files = walk('c:/Users/dell/Downloads/Lauren645hdh-main/components');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let modified = false;

    // Arabic fonts often look smaller. Bumping text-xs (12px) to text-sm (14px).
    if (content.match(/\btext-xs\b/)) {
        content = content.replace(/\btext-xs\b/g, 'text-sm');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(f, content, 'utf8');
        count++;
    }
});
console.log('Removed text-xs from ' + count + ' files for ultimate readability.');
process.exit(0);
