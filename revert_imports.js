const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}
let count = 0;
const files = walk('c:/Users/dell/Downloads/Lauren645hdh-main/hooks/components');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let modified = false;

    // Reverse the replacement we did earlier
    if (content.includes('../../useSession')) {
        content = content.replace(/\.\.\/\.\.\/useSession/g, '../../hooks/useSession');
        modified = true;
    }
    if (content.includes('../../useSubscription')) {
        content = content.replace(/\.\.\/\.\.\/useSubscription/g, '../../hooks/useSubscription');
        modified = true;
    }
    if (content.includes('../../useSwipeBack')) {
        content = content.replace(/\.\.\/\.\.\/useSwipeBack/g, '../../hooks/useSwipeBack');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(f, content, 'utf8');
        count++;
    }
});
console.log('Reverted in ' + count + ' files.');
process.exit(0);
