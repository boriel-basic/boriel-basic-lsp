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

// Registrar definiciones builtin (funciones integradas) aquí para que
// estén disponibles en hover/completion/definition incluso si no existen
// en los archivos del proyecto.
const builtinDefinitions = require('./functionsDefinitions');

builtinDefinitions.forEach(def => {
    const uri = `builtin://${def.name}`;
    globalDefinitions.set(def.name, {
        uri: uri,
        range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 }
        },
        type: 'SUB',
        name: def.name,
        parameters: def.parameters,
        returnType: def.returnType || 'void',
        header: def.header || `SUB ${def.name}(${def.parameters})`,
        doc: def.doc
    });
});

// Obtener la ruta del proyecto desde los argumentos
const projectPath = process.argv[2]; // La ruta del proyecto se pasa como argumento al servidor

if (!projectPath && require.main === module) {
    console.error('No se proporcionó la ruta del proyecto.');
    process.exit(1);
}

// Cargar y procesar el archivo .gitignore
const gitignorePath = projectPath ? path.join(projectPath, '.gitignore') : null;
const ig = ignore();

if (gitignorePath && fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    ig.add(gitignoreContent);
    console.log('Reglas de .gitignore cargadas:', gitignoreContent.split('\n').filter(Boolean));
} else if (projectPath) {
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
 * Elimina los comentarios de una línea de código, respetando las cadenas de texto.
 * @param {string} line - La línea de código a procesar.
 * @returns {string} - La línea sin comentarios.
 */
function stripComments(line) {
    let inString = false;
    let result = '';

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inString = !inString;
            result += char;
            continue;
        }

        if (!inString) {
            // Detectar comentario con '
            if (char === "'") {
                break; // El resto de la línea es comentario
            }

            // Detectar comentario con REM (debe ser palabra completa)
            if (line.substr(i, 3).toUpperCase() === 'REM') {
                // Verificar que REM sea una palabra completa (seguido de espacio o fin de línea)
                // y precedido por espacio, inicio de línea o dos puntos
                const nextChar = line[i + 3];
                const prevChar = i > 0 ? line[i - 1] : ' ';

                const isWordEnd = !nextChar || /\s/.test(nextChar);
                const isWordStart = /\s|:/.test(prevChar);

                if (isWordEnd && isWordStart) {
                    break; // El resto de la línea es comentario
                }
            }
        }

        result += char;
    }

    return result;
}

/**
 * Analiza un archivo para encontrar definiciones de funciones y subrutinas.
 * @param {string} filePath - Ruta del archivo.
 * @param {string} uri - URI del archivo.
 */
function analyzeFileForDefinitions(filePath, uri) {
    // Limpiar definiciones antiguas de este archivo para evitar entradas obsoletas
    globalDefinitions.forEach((value, key) => {
        if (value.uri === uri) {
            globalDefinitions.delete(key);
        }
    });
    globalVariables.forEach((value, key) => {
        if (value.location && value.location.uri === uri) {
            globalVariables.delete(key);
        }
    });

    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);

    lines.forEach((line, i) => {
        // Usar stripComments para ignorar comentarios
        const codeLine = stripComments(line);
        const trimmedLine = codeLine.trim();

        // Ignorar líneas vacías
        if (trimmedLine === '') {
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

        // Detectar definiciones de variables con DIM (incluyendo arrays multidimensionales)
        const variableMatch = /^\s*DIM\s+([a-zA-Z_][a-zA-Z0-9_]*)(\([^\)]*\))?\s*(?:AS\s+(\w+))?(?:\s*=\s*(.+))?/i.exec(trimmedLine);
        if (variableMatch) {
            const name = variableMatch[1]; // Nombre de la variable o array
            const dimensions = variableMatch[2] || null; // Dimensiones del array (si existen)
            const type = variableMatch[3] || 'unknown'; // Tipo de la variable (si existe)
            const value = variableMatch[4] || null; // Valor de la variable (si existe)

            console.log(`Procesando línea ${i + 1}: ${trimmedLine}`);
            console.log(`Definición de variable encontrada: DIM ${name}${dimensions || ''} AS ${type}${value ? ` = ${value}` : ''} en ${filePath}, línea ${i + 1}`);

            // Procesar dimensiones del array
            let parsedDimensions = null;
            if (dimensions) {
                parsedDimensions = dimensions
                    .replace(/[()]/g, '') // Eliminar paréntesis
                    .split(',') // Dividir por comas
                    .map(dim => dim.trim()); // Eliminar espacios en blanco
            }

            console.log(`Dimensiones procesadas para ${name}:`, parsedDimensions);

            // Almacenar la definición de la variable o array
            globalVariables.set(name, {
                location: Location.create(uri, Range.create(i, 0, i, trimmedLine.length)),
                type,
                value,
                dimensions: parsedDimensions
            });
        }

        // Detectar definiciones de constantes con CONST
        const constantMatch = /^\s*CONST\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:AS\s+(\w+))?\s*=\s*(.+)/i.exec(trimmedLine);
        if (constantMatch) {
            const name = constantMatch[1]; // Nombre de la constante
            const type = constantMatch[2] || 'unknown'; // Tipo de la constante (si existe)
            const value = constantMatch[3]; // Valor de la constante
            console.log(`Definición de constante encontrada: CONST ${name} AS ${type} = ${value} en ${filePath}, línea ${i + 1}`);

            // Almacenar la definición de la constante
            globalVariables.set(name, {
                location: Location.create(uri, Range.create(i, 0, i, trimmedLine.length)),
                type: 'constant',
                value,
                dataType: type
            });
        }

        // Detectar macros con #DEFINE
        const macroMatch = /^\s*#DEFINE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(.+)?/i.exec(trimmedLine);
        if (macroMatch) {
            const name = macroMatch[1]; // Nombre de la macro
            const value = macroMatch[2] || ''; // Valor de la macro (si existe)
            console.log(`Definición de macro encontrada: #DEFINE ${name} ${value} en ${filePath}, línea ${i + 1}`);

            // Almacenar la definición de la macro
            globalVariables.set(name, {
                location: Location.create(uri, Range.create(i, 0, i, trimmedLine.length)),
                type: 'macro',
                value
            });
        }
    });
}

/**
 * Analiza el contenido de un archivo provisto como texto para encontrar definiciones.
 * Útil cuando el documento está abierto en memoria en lugar de leerlo desde disco.
 */
function analyzeTextForDefinitions(text, uri) {
    // Limpiar definiciones antiguas de este archivo para evitar entradas obsoletas
    globalDefinitions.forEach((value, key) => {
        if (value.uri === uri) {
            globalDefinitions.delete(key);
        }
    });
    globalVariables.forEach((value, key) => {
        if (value.location && value.location.uri === uri) {
            globalVariables.delete(key);
        }
    });

    const lines = text.split(/\r?\n/);

    lines.forEach((line, i) => {
        const codeLine = stripComments(line);
        const trimmedLine = codeLine.trim();
        if (trimmedLine === '') return;

        const definitionMatch = /^\s*(SUB|FUNCTION)\s+(?:FASTCALL\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)?\s*(?:AS\s+(\w+))?/i.exec(trimmedLine);
        if (definitionMatch) {
            const type = definitionMatch[1].toUpperCase();
            const name = definitionMatch[2];
            const parameters = definitionMatch[3];
            const returnType = definitionMatch[4] || 'void';
            const header = trimmedLine;

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

        // Variables, constantes, macros (mismo comportamiento que analyzeFileForDefinitions)
        const variableMatch = /^\s*DIM\s+([a-zA-Z_][a-zA-Z0-9_]*)(\([^\)]*\))?\s*(?:AS\s+(\w+))?(?:\s*=\s*(.+))?/i.exec(trimmedLine);
        if (variableMatch) {
            const name = variableMatch[1];
            const dimensions = variableMatch[2] || null;
            const type = variableMatch[3] || 'unknown';
            const value = variableMatch[4] || null;

            let parsedDimensions = null;
            if (dimensions) {
                parsedDimensions = dimensions.replace(/[()]/g, '').split(',').map(dim => dim.trim());
            }

            globalVariables.set(name, {
                location: Location.create(uri, Range.create(i, 0, i, trimmedLine.length)),
                type,
                value,
                dimensions: parsedDimensions
            });
        }

        const constantMatch = /^\s*CONST\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:AS\s+(\w+))?\s*=\s*(.+)/i.exec(trimmedLine);
        if (constantMatch) {
            const name = constantMatch[1];
            const type = constantMatch[2] || 'unknown';
            const value = constantMatch[3];

            globalVariables.set(name, {
                location: Location.create(uri, Range.create(i, 0, i, trimmedLine.length)),
                type: 'constant',
                value,
                dataType: type
            });
        }

        const macroMatch = /^\s*#DEFINE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(.+)?/i.exec(trimmedLine);
        if (macroMatch) {
            const name = macroMatch[1];
            const value = macroMatch[2] || '';

            globalVariables.set(name, {
                location: Location.create(uri, Range.create(i, 0, i, trimmedLine.length)),
                type: 'macro',
                value
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
    // Limpiar referencias existentes de este archivo para evitar duplicados al re-analizar
    globalReferences.forEach((locations, name) => {
        const filtered = locations.filter(loc => loc.uri !== uri);
        if (filtered.length === 0) {
            globalReferences.delete(name);
        } else {
            globalReferences.set(name, filtered);
        }
    });

    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);

    lines.forEach((line, i) => {
        // Usar stripComments para ignorar comentarios
        const codeLine = stripComments(line);
        const trimmedLine = codeLine.trim();

        // Ignorar líneas vacías
        if (trimmedLine === '') {
            return;
        }

        // Ignorar líneas de definición (SUB/FUNCTION): no son referencias
        if (/^\s*(SUB|FUNCTION)\s+(?:FASTCALL\s+)?[a-zA-Z_][a-zA-Z0-9_]*/i.test(trimmedLine)) {
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
                // Usar la posición exacta del identificador en la línea original
                const nameMatch = new RegExp(`\\b${name}\\b`, 'i').exec(line);
                const startChar = nameMatch ? nameMatch.index : 0;
                const endChar = startChar + name.length;
                console.log(`Referencia encontrada: ${name} en ${filePath}, línea ${i + 1}`);
                globalReferences.get(name).push(Location.create(uri, Range.create(i, startChar, i, endChar)));
            }
        });
    });
}

/**
 * Analiza referencias a partir de un texto en memoria.
 */
function analyzeTextForReferences(text, uri) {
    // Limpiar referencias existentes de este archivo para evitar duplicados al re-analizar
    globalReferences.forEach((locations, name) => {
        const filtered = locations.filter(loc => loc.uri !== uri);
        if (filtered.length === 0) {
            globalReferences.delete(name);
        } else {
            globalReferences.set(name, filtered);
        }
    });

    const lines = text.split(/\r?\n/);

    lines.forEach((line, i) => {
        const codeLine = stripComments(line);
        const trimmedLine = codeLine.trim();
        if (trimmedLine === '') return;

        // Ignorar líneas de definición (SUB/FUNCTION): no son referencias
        if (/^\s*(SUB|FUNCTION)\s+(?:FASTCALL\s+)?[a-zA-Z_][a-zA-Z0-9_]*/i.test(trimmedLine)) {
            return;
        }

        globalDefinitions.forEach((_, name) => {
            const callPattern = new RegExp(`\\b${name}\\s*\\(`, 'i');
            const subPattern = new RegExp(`\\b${name}\\b(?!\\s*\\()`, 'i');

            if (callPattern.test(trimmedLine) || subPattern.test(trimmedLine)) {
                if (!globalReferences.has(name)) {
                    globalReferences.set(name, []);
                }
                const nameMatch = new RegExp(`\\b${name}\\b`, 'i').exec(line);
                const startChar = nameMatch ? nameMatch.index : 0;
                const endChar = startChar + name.length;
                globalReferences.get(name).push(Location.create(uri, Range.create(i, startChar, i, endChar)));
            }
        });
    });
}

module.exports = {
    analyzeProjectFiles,
    analyzeFileForDefinitions,
    analyzeFileForReferences,
    analyzeTextForDefinitions,
    analyzeTextForReferences,
    globalDefinitions,
    globalReferences,
    globalVariables,
    stripComments,
};