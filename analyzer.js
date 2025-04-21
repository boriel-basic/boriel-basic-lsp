const { Range, Location } = require('vscode-languageserver/node');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const ignore = require('ignore');

// Índices para definiciones y referencias
const globalDefinitions = new Map(); // { nombre: Location }
const globalReferences = new Map(); // { nombre: [Location, ...] }
const globalVariables = new Map(); // { nombre: Location }

const { URI } = require('vscode-uri');

// Obtener la ruta del proyecto desde los argumentos
const projectPath = process.argv[2]; // La ruta del proyecto se pasa como argumento al servidor

if (!projectPath) {
    console.error('No se proporcionó la ruta del proyecto.');
    process.exit(1);
}

// Cargar y procesar el archivo .gitignore
const gitignorePath = path.join(projectPath, '.gitignore');
const ig = ignore();

if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    ig.add(gitignoreContent);
    console.log('Reglas de .gitignore cargadas:', gitignoreContent.split('\n').filter(Boolean));
} else {
    console.warn('No se encontró un archivo .gitignore en el proyecto.');
}

/**
 * Analiza todos los archivos del proyecto para encontrar definiciones y referencias.
 */
function analyzeProjectFiles() {
    const pattern = projectPath.replace(/\\/g, '/') + '/**/*.{bas,zxbas}'

    console.log('Buscando archivos con patrón:', pattern);

    const files = glob.sync(pattern);

    // Filtrar los archivos según las reglas de .gitignore
    const filteredFiles = files.filter((file) => {
        const relativePath = path.relative(projectPath, file);
        return !ig.ignores(relativePath); // Excluir archivos ignorados
    });

    console.log('Archivos encontrados (después de aplicar .gitignore):', filteredFiles);

    // Primer pase: analizar definiciones
    filteredFiles.forEach((file) => {
        console.log(`Analizando definiciones en archivo: ${file}`);

        // convertir el file en uri
        const uri = URI.file(file).toString();

        console.log(`Analizando uri: ${uri}`);

        analyzeFileForDefinitions(file, uri);
    });

    // Segundo pase: analizar referencias
    filteredFiles.forEach((file) => {
        console.log(`Analizando referencias en archivo: ${file}`);
        // convertir el file en uri
        const uri = URI.file(file).toString();
        console.log(`Analizando uri: ${uri}`);
        analyzeFileForReferences(file, uri);
    });

    console.log('Análisis inicial completado');
}

/**
 * Analiza un archivo para encontrar definiciones de funciones y subrutinas.
 * @param {string} filePath - Ruta del archivo.
 * @param {string} uri - URI del archivo.
 */
function analyzeFileForDefinitions(filePath, uri) {
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);

    lines.forEach((line, i) => {
        const trimmedLine = line.trim();

        // Ignorar líneas que son comentarios o están vacías
        if (trimmedLine.startsWith("'") || trimmedLine === '') {
            return;
        }

        // Detectar definiciones de SUB o FUNCTION (con o sin FASTCALL y con parámetros con tipos)
        const definitionMatch = /^\s*(SUB|FUNCTION)\s+(?:FASTCALL\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)?\s*(?:AS\s+(\w+))?/i.exec(trimmedLine);
        if (definitionMatch) {
            const type = definitionMatch[1].toUpperCase(); // SUB o FUNCTION
            const name = definitionMatch[2]; // Nombre de la función o subrutina
            const parameters = definitionMatch[3]; // Parámetros (si existen)
            const returnType = definitionMatch[4] || 'void'; // Tipo de retorno (si existe)
            const header = trimmedLine;
            console.log(`Definición encontrada: ${type} ${name}(${parameters}) en ${filePath}, línea ${i + 1}`);

            // Almacenar el nombre normalizado (sin parámetros ni FASTCALL)
            globalDefinitions.set(name, {
                uri,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: line.length }
                },
                type,
                name,
                parameters,
                returnType,
                header,
            });
        }

        // Detectar definiciones de variables con DIM
        const variableMatch = /^\s*DIM\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:AS\s+(\w+))?\s*=/i.exec(trimmedLine);        if (variableMatch) {
            const name = variableMatch[1]; // Nombre de la variable
            const type = variableMatch[2] || ''; // Tipo de la variable (si existe)
            console.log(`Definición de variable encontrada: DIM ${name} en ${filePath}, línea ${i + 1}`);

            // Almacenar la definición de la variable
            globalVariables.set(name, {
                location: Location.create(uri, Range.create(i, 0, i, trimmedLine.length)),
                type
            });
        }
    });
}

/**
 * Analiza un archivo para encontrar referencias a funciones y subrutinas.
 * @param {string} filePath - Ruta del archivo.
 * @param {string} uri - URI del archivo.
 */
function analyzeFileForReferences(filePath, uri) {
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);

    lines.forEach((line, i) => {
        const trimmedLine = line.trim();

        // Ignorar líneas que son comentarios o están vacías
        if (trimmedLine.startsWith("'") || trimmedLine === '') {
            return;
        }

        // Detectar referencias a funciones o subrutinas
        globalDefinitions.forEach((_, name) => {
            // Patrón para llamadas a funciones (nombre seguido de un paréntesis)
            const callPattern = new RegExp(`\\b${name}\\s*\\(`, 'i');
            // Patrón para subrutinas (nombre en una línea sin paréntesis)
            const subPattern = new RegExp(`\\b${name}\\b(?!\\s*\\()`, 'i');

            if (callPattern.test(trimmedLine) || subPattern.test(trimmedLine)) {
                if (!globalReferences.has(name)) {
                    globalReferences.set(name, []);
                }
                console.log(`Referencia encontrada: ${name} en ${filePath}, línea ${i + 1}`);
                globalReferences.get(name).push(Location.create(uri, Range.create(i, 0, i, trimmedLine.length)));
            }
        });
    });
}

module.exports = {
    analyzeProjectFiles,
    analyzeFileForDefinitions,
    analyzeFileForReferences,
    globalDefinitions,
    globalReferences,
    globalVariables,
};