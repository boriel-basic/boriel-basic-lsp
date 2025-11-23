const fs = require('fs');
const path = require('path');

const definitionsDir = path.join(__dirname, 'functionsDefinitions');
const definitions = [];

if (fs.existsSync(definitionsDir)) {
    const files = fs.readdirSync(definitionsDir);
    files.forEach(file => {
        if (path.extname(file) === '.json') {
            const filePath = path.join(definitionsDir, file);
            try {
                const fileContent = require(filePath);
                if (Array.isArray(fileContent)) {
                    definitions.push(...fileContent);
                }
            } catch (err) {
                console.error(`Error cargando definiciones de ${file}:`, err);
            }
        }
    });
}

module.exports = definitions;
