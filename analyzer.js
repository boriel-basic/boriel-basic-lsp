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
const builtinPaintDataUri = 'builtin://paintData';
globalDefinitions.set('paintData', {
    uri: builtinPaintDataUri,
    range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 }
    },
    type: 'SUB',
    name: 'paintData',
    parameters: 'x as uByte, y as uByte, width as uByte, height as uByte, address as uInteger',
    returnType: 'void',
    header: 'SUB paintData(x as uByte, y as uByte, width as uByte, height as uByte, address as uInteger)',
    doc: `
paintData: dibuja datos en pantalla desde la dirección indicada.

Parámetros:
- x (uByte): coordenada X de inicio.
- y (uByte): coordenada Y de inicio.
- width (uByte): ancho del bloque.
- height (uByte): alto del bloque.
- address (uInteger): dirección en memoria donde están los datos.

Ejemplo:
    ' Dibuja un bloque usando datos en 32768
    paintData(10, 20, 16, 16, 32768)
`,
});

const builtinPutCharsUri = 'builtin://putChars';
globalDefinitions.set('putChars', {
    uri: builtinPutCharsUri,
    range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 }
    },
    type: 'SUB',
    name: 'putChars',
    parameters: 'x as uByte, y as uByte, width as uByte, height as uByte, dataAddress as uInteger',
    returnType: 'void',
    header: 'SUB putChars(x as uByte, y as uByte, width as uByte, height as uByte, dataAddress as uInteger)',
    doc: `
putChars: Fills a rectangle region of the screen width a char

Parameters:
- x (uByte): x coordinate (cell column)
- y (uByte): y coordinate (cell row)
- width (uByte): width (number of columns)
- height (uByte): height (number of rows)
- dataAddress (uInteger): Chars bytes address
`,
});

const builtinGetCharsUri = 'builtin://getChars';
globalDefinitions.set('getChars', {
    uri: builtinGetCharsUri,
    range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 }
    },
    type: 'SUB',
    name: 'getChars',
    parameters: 'x as uByte, y as uByte, width as uByte, height as uByte, dataAddress as uInteger',
    returnType: 'void',
    header: 'SUB getChars(x as uByte, y as uByte, width as uByte, height as uByte, dataAddress as uInteger)',
    doc: `
getChars: Gets a rectangle region of the screen into many chars (opposite of putChars)

Parameters:
- x (uByte): x coordinate (cell column)
- y (uByte): y coordinate (cell row)
- width (uByte): width (number of columns)
- height (uByte): height (number of rows)
- dataAddress (uInteger): Chars bytes address
`,
});

const builtinPaintUri = 'builtin://paint';
globalDefinitions.set('paint', {
    uri: builtinPaintUri,
    range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 }
    },
    type: 'SUB',
    name: 'paint',
    parameters: 'x as uByte, y as uByte, width as uByte, height as uByte, attribute as uByte',
    returnType: 'void',
    header: 'SUB paint(x as uByte, y as uByte, width as uByte, height as uByte, attribute as uByte)',
    doc: `
paint: Fills a rectangle region of the screen width a color

Parameters:
- x (uByte): x coordinate (cell column)
- y (uByte): y coordinate (cell row)
- width (uByte): width (number of columns)
- height (uByte): height (number of rows)
- attribute (uByte): byte-encoded attr
`,
});

const builtinGetPaintDataUri = 'builtin://getPaintData';
globalDefinitions.set('getPaintData', {
    uri: builtinGetPaintDataUri,
    range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 }
    },
    type: 'SUB',
    name: 'getPaintData',
    parameters: 'x as uByte, y as uByte, width as uByte, height as uByte, address as uInteger',
    returnType: 'void',
    header: 'SUB getPaintData(x as uByte, y as uByte, width as uByte, height as uByte, address as uInteger)',
    doc: `
getPaintData: Gets the colors of a rectangle region of the screen into memory (opposite of paintData)

Parameters:
- x (uByte): x coordinate (cell column)
- y (uByte): y coordinate (cell row)
- width (uByte): width (number of columns)
- height (uByte): height (number of rows)
- address (uInteger): address of the byte-encoded attr sequence
`,
});

const builtinPutCharsOverModeUri = 'builtin://putCharsOverMode';
globalDefinitions.set('putCharsOverMode', {
    uri: builtinPutCharsOverModeUri,
    range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 }
    },
    type: 'SUB',
    name: 'putCharsOverMode',
    parameters: 'x as uByte, y as uByte, width as uByte, height as uByte, overMode as uByte, dataAddress as uInteger',
    returnType: 'void',
    header: 'SUB putCharsOverMode(x as uByte, y as uByte, width as uByte, height as uByte, overMode as uByte, dataAddress as uInteger)',
    doc: `
putCharsOverMode: Fills a rectangle region of the screen width a char

Parameters:
- x (uByte): x coordinate (cell column)
- y (uByte): y coordinate (cell row)
- width (uByte): width (number of columns)
- height (uByte): height (number of rows)
- overMode (uByte): the way the characters are combined with the background.
    - 0: the characters are simply replaced.
    - 1: the characters are combined with an Exclusive OR (XOR).
    - 2: the characters are combined using an AND function.
    - 3: the characters are combined using an OR function.
- dataAddress (uInteger): Chars bytes address
`,
});

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
 * Analiza un archivo para encontrar referencias a funciones y subrutinas.
 * @param {string} filePath - Ruta del archivo.
 * @param {string} uri - URI del archivo.
 */
function analyzeFileForReferences(filePath, uri) {
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
    stripComments,
};