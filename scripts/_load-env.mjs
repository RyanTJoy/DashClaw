import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function loadEnvFile(filePath, force = false) {
  if (!existsSync(filePath)) {
    return;
  }
  const content = readFileSync(filePath, 'utf8');
  content.split('\n').forEach(line => {
    const part = line.trim();
    if (!part || part.startsWith('#')) return;
    const [key, ...valueParts] = part.split('=');
    let value = valueParts.join('=').trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && value) {
      const trimmedKey = key.trim();
      // Overwrite if force is true OR if the current value is a placeholder
      const currentValue = process.env[trimmedKey];
      const isPlaceholder = currentValue && currentValue.includes('<YOUR_');
      
      if (!currentValue || force || isPlaceholder) {
        process.env[trimmedKey] = value;
      }
    }
  });
}

// Load .env first (placeholders), then .env.local (actual values)
loadEnvFile(resolve(projectRoot, '.env'));
loadEnvFile(resolve(projectRoot, '.env.local'), true);
