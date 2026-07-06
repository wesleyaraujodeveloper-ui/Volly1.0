const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if useTheme is already imported but hooks are NOT injected
    if (!content.includes('useTheme()')) {
        let hasStyles = content.includes('const getStyles = (theme: Theme) => StyleSheet.create');
        if (!hasStyles) hasStyles = content.includes('const getStyles =');
        
        // Match standard React.FC or arrow functions
        const componentRegex = /(export\s+(?:default\s+)?(?:function\s+[a-zA-Z0-9_]+\s*\([^)]*\)|const\s+[a-zA-Z0-9_]+\s*(?::\s*React\.FC(?:<[^>]+>)?\s*)?=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)\s*\{)/;
        
        const match = content.match(componentRegex);
        if (match) {
            let hookInjection = `\n  const { theme, globalStyles } = useTheme();`;
            if (hasStyles && !content.includes('const styles = getStyles(theme)')) {
                hookInjection += `\n  const styles = getStyles(theme);`;
            }
            content = content.replace(componentRegex, match[1] + hookInjection);
            fs.writeFileSync(filePath, content);
            console.log('Injected hooks for: ' + filePath);
        } else {
            console.log('Failed to match component in: ' + filePath);
        }
    }
}

function walkSync(dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            filelist = walkSync(fullPath, filelist);
        } else {
            filelist.push(fullPath);
        }
    });
    return filelist;
}

const files = walkSync('src/components');
files.forEach(processFile);
