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
const files = walk('c:/Users/dell/Downloads/Lauren645hdh-main');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let modified = false;

    if (content.includes('text-[10px]')) {
        content = content.replace(/text-\[10px\]/g, 'text-xs');
        modified = true;
    }
    if (content.includes('text-[9px]')) {
        content = content.replace(/text-\[9px\]/g, 'text-xs');
        modified = true;
    }
    // Also replacing text-white/40 or text-white/30 with higher opacity for readability
    if (content.includes('text-white/40')) {
        content = content.replace(/text-white\/40/g, 'text-white/70');
        modified = true;
    }
    if (content.includes('opacity-30') && content.includes('text')) {
        // Just generally bumping up very low opacities
        content = content.replace(/opacity-30/g, 'opacity-60');
        modified = true;
    }
    if (content.includes('opacity-40') && content.includes('text')) {
        content = content.replace(/opacity-40/g, 'opacity-70');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(f, content, 'utf8');
        count++;
    }
});
console.log('Improved typography in ' + count + ' files.');
process.exit(0);
