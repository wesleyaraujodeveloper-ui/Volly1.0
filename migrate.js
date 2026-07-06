const fs = require('fs');
const path = require('path');

function getRelativePath(from, to) {
    let rel = path.relative(path.dirname(from), to).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    return rel;
}

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    if (filePath.includes('src/theme') || filePath.includes('src/hooks/useTheme')) return;
    if (filePath.includes('app/(tabs)/perfil.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('theme.colors') && !content.includes('globalStyles')) return;
    
    // Check if useTheme is already imported
    if (content.includes('useTheme(')) return;

    console.log('Processing:', filePath);

    const useThemePath = getRelativePath(filePath, path.join(__dirname, 'src/hooks/useTheme')).replace('.ts', '');
    const themeTypePath = getRelativePath(filePath, path.join(__dirname, 'src/theme/index')).replace('.ts', '');
    
    // Remove old imports
    content = content.replace(/import\s+\{([^}]*)\}\s+from\s+['"].*theme['"];?\n?/g, (match, p1) => {
        // If there are other things imported, keep them
        let remaining = p1.split(',').map(s => s.trim()).filter(s => s !== 'theme' && s !== 'globalStyles');
        if (remaining.length > 0) {
            return `import { ${remaining.join(', ')} } from '${match.split('from')[1].trim()}';\n`;
        }
        return '';
    });

    
    // Add new imports
    const importStatements = `import { useTheme } from '${useThemePath}';\nimport { Theme } from '${themeTypePath}';\n`;
    content = importStatements + content;

    // Replace StyleSheet.create
    let hasStyles = content.includes('const styles = StyleSheet.create');
    if (hasStyles) {
        content = content.replace(/const styles = StyleSheet\.create\(\{/g, 'const getStyles = (theme: Theme) => StyleSheet.create({');
    }

    // Inject hooks in the first component
    const componentRegex = /(export\s+default\s+function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/;
    const match = content.match(componentRegex);
    if (match) {
        let hookInjection = `\n  const { theme, globalStyles } = useTheme();`;
        if (hasStyles) {
            hookInjection += `\n  const styles = getStyles(theme);`;
        }
        content = content.replace(componentRegex, match[1] + hookInjection);
    } else {
        const arrowRegex = /(export\s+(?:default\s+)?const\s+[a-zA-Z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{)/;
        const arrowMatch = content.match(arrowRegex);
        if (arrowMatch) {
            let hookInjection = `\n  const { theme, globalStyles } = useTheme();`;
            if (hasStyles) {
                hookInjection += `\n  const styles = getStyles(theme);`;
            }
            content = content.replace(arrowRegex, arrowMatch[1] + hookInjection);
        } else {
            console.log('Skipped component injection for: ' + filePath);
        }
    }

    fs.writeFileSync(filePath, content);
    console.log('Migrated: ' + filePath);
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

const files = [...walkSync('app'), ...walkSync('src/components')];
files.forEach(processFile);
