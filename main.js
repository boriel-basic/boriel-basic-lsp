#!/usr/bin/env node

const {
    createConnection,
    Range,
    TextDocuments,
    TextDocumentSyncKind,
    CompletionItemKind,
    CodeActionKind,
} = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');
const { URI } = require('vscode-uri');
const path = require('path');
const fs = require('fs');
const packageJson = require('./package.json');

const projectPath = process.argv[2];

// Crear conexión con el cliente
const connection = createConnection();
connection.console.info(`Boriel Basic LSP server is running - Version ${packageJson.version}`);
console.log(`[LSP] Boriel Basic LSP server started - Version ${packageJson.version}`);

// Manejo de documentos abiertos
const documents = new TextDocuments(TextDocument);
documents.listen(connection);

// Contador para nombres de funciones extraídas
let _extractCounter = 1;

const { borielBasicKeywords } = require('./const');
const { formatBorielBasicCode } = require('./formatter');
const {
    globalDefinitions,
    globalReferences,
    globalVariables,
    analyzeProjectFiles,
    analyzeFileForDefinitions,
    analyzeFileForReferences,
    analyzeTextForDefinitions,
    analyzeTextForReferences,
    stripComments,
} = require('./analyzer');

// Manejar el evento de formato de documentos
connection.onDocumentFormatting((params) => {
    const { formatKeywords: formatKeywords } = connection.workspaceConfig;

    console.log(`Formateando documento con formatKeywords: ${formatKeywords}`);

    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    // Aplicar las reglas de formato
    return formatBorielBasicCode(document, { formatKeywords: formatKeywords });
});

// Manejar solicitud de definición
connection.onDefinition((params) => {
    const document = documents.get(params.textDocument.uri);
    const position = params.position;

    // Obtener la línea de texto en la posición actual
    const lineText = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: Number.MAX_SAFE_INTEGER }
    });

    // Verificar si la posición está dentro de un comentario
    const strippedLine = stripComments(lineText);
    if (position.character >= strippedLine.length) {
        return null; // Está en un comentario
    }

    // Extraer la palabra en la posición actual
    const words = lineText.trim().split(/\s+/);
    let wordAtPosition = words.find((word) => {
        const startIndex = lineText.indexOf(word);
        const endIndex = startIndex + word.length;
        return position.character >= startIndex && position.character <= endIndex;
    });

    if (!wordAtPosition) {
        console.log('No se encontró ninguna palabra en la posición actual.');
        return null;
    }

    // Normalizar la palabra eliminando paréntesis y parámetros
    if (wordAtPosition.includes('(')) {
        wordAtPosition = wordAtPosition.split('(')[0].trim();
    }

    console.log(`Buscando definición para: ${wordAtPosition}`);

    // Buscar en definiciones de funciones
    if (globalDefinitions.has(wordAtPosition)) {
        const definition = globalDefinitions.get(wordAtPosition);

        console.log(`Definición encontrada para ${wordAtPosition}:`, definition.uri);

        return {
            uri: definition.uri,
            range: definition.range
        };
    }

    console.log(`No se encontró definición para: ${wordAtPosition}`);
    return null;
});

// Manejar solicitud de refactor/rename
connection.onRenameRequest((params) => {
    try {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;

        const position = params.position;
        const lineText = document.getText({
            start: { line: position.line, character: 0 },
            end: { line: position.line, character: Number.MAX_SAFE_INTEGER }
        });

        const strippedLine = stripComments(lineText);
        if (position.character >= strippedLine.length) return null; // en comentario

        // encontrar palabra en la posición
        const wordRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
        let match, wordAtPosition = null;
        while ((match = wordRegex.exec(lineText)) !== null) {
            const startIndex = match.index;
            const endIndex = startIndex + match[0].length;
            if (position.character >= startIndex && position.character <= endIndex) {
                wordAtPosition = match[0];
                break;
            }
        }
        if (!wordAtPosition) return null;

        const oldName = wordAtPosition;
        const newName = params.newName && params.newName.trim();
        if (!newName || newName === oldName) return null;

        const edits = {};

        // Definición
        if (globalDefinitions.has(oldName)) {
            const def = globalDefinitions.get(oldName);
            if (def && def.uri) {
                edits[def.uri] = edits[def.uri] || [];
                let defRange = def.range;
                try {
                    if (def.uri.startsWith('file:')) {
                        const defFs = URI.parse(def.uri).fsPath;
                        const fileText = fs.readFileSync(defFs, 'utf8');
                        const defLines = fileText.split(/\r?\n/);
                        const lineIdx = def.range.start.line;
                        if (lineIdx >= 0 && lineIdx < defLines.length) {
                            const headerLine = defLines[lineIdx];
                            const re = new RegExp(`\\b${oldName}\\b`, 'i');
                            const m = re.exec(headerLine);
                            if (m) {
                                const startChar = m.index;
                                defRange = Range.create(lineIdx, startChar, lineIdx, startChar + oldName.length);
                            }
                        }
                    }
                } catch (e) {
                    connection.console.warn(`No se pudo leer archivo para localizar definición: ${e.message}`);
                }
                edits[def.uri].push({ range: defRange, newText: newName });
            }
        }

        // Referencias globales
        if (globalReferences.has(oldName)) {
            for (const loc of globalReferences.get(oldName)) {
                edits[loc.uri] = edits[loc.uri] || [];
                edits[loc.uri].push({ range: loc.range, newText: newName });
            }
        }

        // Ocurrencias locales en el documento actual
        const docText = document.getText();
        const regex = new RegExp(`\\b${oldName}\\b`, 'g');
        let m;
        while ((m = regex.exec(docText)) !== null) {
            const startOffset = m.index;
            const startPos = document.positionAt(startOffset);
            const endPos = document.positionAt(startOffset + oldName.length);
            const uri = params.textDocument.uri;
            edits[uri] = edits[uri] || [];
            edits[uri].push({ range: Range.create(startPos.line, startPos.character, endPos.line, endPos.character), newText: newName });
        }

        // Actualizar índices en memoria inmediatamente para que el servidor
        // reconozca la nueva función antes de que el cliente reanalice.
        if (globalDefinitions.has(oldName)) {
            try {
                const def = globalDefinitions.get(oldName);
                const newDef = Object.assign({}, def, { name: newName });
                if (newDef.header) {
                    newDef.header = newDef.header.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
                }
                globalDefinitions.delete(oldName);
                globalDefinitions.set(newName, newDef);
            } catch (e) {
                connection.console.warn(`Error actualizando globalDefinitions en memoria: ${e.message}`);
            }
        }

        if (globalReferences.has(oldName)) {
            try {
                const refs = globalReferences.get(oldName);
                globalReferences.delete(oldName);
                globalReferences.set(newName, refs);
            } catch (e) {
                connection.console.warn(`Error actualizando globalReferences en memoria: ${e.message}`);
            }
        }

        // Filtrar URIs no-file
        const fileEditsRaw = {};
        for (const uri of Object.keys(edits)) {
            if (uri && uri.startsWith('file:')) fileEditsRaw[uri] = edits[uri];
        }
        if (Object.keys(fileEditsRaw).length === 0) return null;

        // Normalizar/deduplicar y ordenar de final a inicio
        const fileEdits = {};
        for (const uri of Object.keys(fileEditsRaw)) {
            const seen = new Set();
            const arr = [];
            for (const e of fileEditsRaw[uri]) {
                if (!e || !e.range) continue;
                const key = `${e.range.start.line}:${e.range.start.character}-${e.range.end.line}:${e.range.end.character}:${e.newText}`;
                if (seen.has(key)) continue;
                seen.add(key);
                arr.push(e);
            }
            arr.sort((a, b) => {
                if (a.range.start.line !== b.range.start.line) return b.range.start.line - a.range.start.line;
                return b.range.start.character - a.range.start.character;
            });
            fileEdits[uri] = arr;
        }

        return { changes: fileEdits };
    } catch (err) {
        connection.console.error(`Error en onRenameRequest: ${err && err.message}`);
        return null;
    }
});

// Reanalizar ficheros afectados de forma asíncrona después de devolver el WorkspaceEdit
// (se usa setImmediate para no bloquear la respuesta al cliente)
setImmediate(() => {
    try {
        // Recolectar URIs afectadas a partir de la última llamada (se reconstruyen desde el índice global si es necesario)
        // Nota: esta función se ejecuta justo después del handler, por lo que `fileEdits` no está en este scope.
        // En su lugar, reanalizamos todos los ficheros abiertos para mantener los índices consistentes.
        for (const [uri, doc] of documents.entries()) {
            try {
                const text = doc.getText();
                analyzeTextForDefinitions(text, uri);
                analyzeTextForReferences(text, uri);
                connection.console.info(`Reanalizado (memoria) tras rename: ${uri}`);
            } catch (e) {
                connection.console.warn(`Error reanalizando (memoria) ${uri}: ${e.message}`);
            }
        }
    } catch (e) {
        connection.console.warn(`Error en reanálisis global tras rename: ${e.message}`);
    }
});

// Manejar solicitud de referencias
connection.onReferences((params) => {
    const position = params.position;
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    const lineText = document.getText(Range.create(position.line, 0, position.line, document.getText().length));

    // Verificar si la posición está dentro de un comentario
    const strippedLine = stripComments(lineText);
    if (position.character >= strippedLine.length) {
        return []; // Está en un comentario
    }
    const words = lineText.trim().split(/\s+/).map(word => word.replace(/[^\w]/g, ''));

    console.log(`Palabras detectadas en la línea ${position.line + 1}:`, words);

    for (const word of words) {
        if (globalReferences.has(word)) {
            console.log(`Referencias globales encontradas para: ${word}`);
            return globalReferences.get(word);
        }
    }

    console.log('No se encontraron referencias globales');
    return [];
});

// Manejar solicitud de información al pasar el mouse (Hover)
connection.onHover((params) => {
    const position = params.position;
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }

    const lineText = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: Number.MAX_SAFE_INTEGER }
    });

    // Verificar si la posición está dentro de un comentario
    const strippedLine = stripComments(lineText);
    if (position.character >= strippedLine.length) {
        return null; // Está en un comentario
    }

    // Encontrar la palabra en la posición del cursor
    // Usamos una regex que incluya caracteres válidos para identificadores
    const wordRegex = /[a-zA-Z0-9_$]+/g;
    let match;
    let wordAtPosition = null;

    while ((match = wordRegex.exec(lineText)) !== null) {
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;
        if (position.character >= startIndex && position.character <= endIndex) {
            wordAtPosition = match[0];
            break;
        }
    }

    if (!wordAtPosition) {
        return null;
    }

    // Priorizar definiciones globales (incluye builtins)
    if (globalDefinitions.has(wordAtPosition)) {
        const def = globalDefinitions.get(wordAtPosition);
        const docText = def.doc || '';

        let codeSignature = '';
        let description = '';

        if (docText) {
            // El doc tiene la firma completa en el primer párrafo y la descripción a continuación
            const parts = docText.split('\n\n');
            codeSignature = parts[0].trim();
            // Preservar saltos de línea simples convirtiéndolos a markdown (dos espacios + \n)
            description = parts.slice(1).join('\n\n').trim().replace(/\n/g, '  \n');
        } else {
            codeSignature = def.header || `${def.type} ${def.name}(${def.parameters || ''})`;
        }

        const mdValue = '```borielbasic\n' + codeSignature + '\n```' +
            (description ? '\n\n' + description : '') +
            `\n\n---\n*boriel-basic-lsp v${packageJson.version}*`;

        return { contents: { kind: 'markdown', value: mdValue } };
    }

    // Si no es una definición global, buscar en las palabras clave de Boriel Basic
    const keyword = borielBasicKeywords.find(k => k.label.toUpperCase() === wordAtPosition.toUpperCase());

    if (keyword) {
        let codeSignature = keyword.label;
        if (keyword.parameters !== undefined && keyword.type === 'function') {
            codeSignature = `${keyword.label}(${keyword.parameters}) As ${keyword.returnType || 'Void'}`;
        }

        const mdValue = '```borielbasic\n' + codeSignature + '\n```\n\n' + keyword.detail +
            `\n\n---\n*boriel-basic-lsp v${packageJson.version}*`;
        return { contents: { kind: 'markdown', value: mdValue } };
    }

    return null;
});

// Inicialización del servidor
connection.onInitialize((params) => {
    // Recoger las opciones de inicialización
    const formatOptions = params.initializationOptions?.formatOptions || {};
    const formatKeywords = formatOptions.formatKeywords || false;

    console.log(`Opción formatKeywords recibida: ${formatKeywords}`);

    // Guardar la configuración para usarla más tarde
    connection.workspaceConfig = {
        formatKeywords
    };

    analyzeProjectFiles();

    return {
        capabilities: {
            textDocumentSync: {
                openClose: true,
                change: TextDocumentSyncKind.Incremental,
                save: { includeText: true } // Habilitar eventos de guardado
            },
            completionProvider: {
                resolveProvider: true // Permite resolver detalles adicionales de los ítems
            },
            signatureHelpProvider: {
                triggerCharacters: ['(', ','] // Activar al escribir '(' o ','
            },
            documentFormattingProvider: true, // Habilitar el formato de documentos
            definitionProvider: true, // Habilitar ir a la definición
            referencesProvider: true,  // Habilitar encontrar referencias
            semanticTokensProvider: {
                legend: {
                    tokenTypes: ['keyword', 'function', 'variable', 'string', 'number', 'comment'],
                    tokenModifiers: []
                },
                full: true
            }
        }
    };
});

const { watchBasicFiles } = require('./watcher');
watchBasicFiles();

const { validateBorielBasic } = require('./validator');

// Validar documentos al abrir o cambiar contenido
documents.onDidOpen((event) => {
    validateBorielBasic(event.document, connection);
});

documents.onDidChangeContent((event) => {
    validateBorielBasic(event.document, connection);
});

// Manejar el evento de guardar un documento
documents.onDidSave((event) => {
    const document = event.document;
    const uri = document.uri;
    const filePath = URI.parse(uri).fsPath;

    console.log(`Archivo guardado: ${filePath}. Reanalizando definiciones y referencias...`);
    console.log(`URI: ${uri}`);

    // Volver a analizar el archivo para encontrar definiciones y referencias
    analyzeFileForDefinitions(filePath, uri);
    analyzeFileForReferences(filePath, uri);

    console.log(`Análisis completado para el archivo guardado: ${filePath}`);
});

// Proveer autocompletado
connection.onCompletion(() => {
    console.log('Generando sugerencias de autocompletado...');
    console.log('CompletionItemKind:', CompletionItemKind);

    // Agregar funciones definidas por el desarrollador
    const functionCompletions = Array.from(globalDefinitions.keys()).map(funcName => {
        const funcData = globalDefinitions.get(funcName);
        if (funcData) {
            return {
                label: funcName,
                kind: CompletionItemKind.Function,
                detail: funcData.header,
            };
        }
    });

    // Agregar variables definidas por el desarrollador
    const variableCompletions = Array.from(globalVariables.keys()).map(varName => {
        console.log(globalVariables.get(varName));
        const varType = globalVariables.get(varName).type;
        return {
            label: varName,
            kind: CompletionItemKind.Variable,
            detail: varType,
            documentation: `Variable definida por el usuario`
        };
    });

    // Retornar las palabras clave, funciones y variables como sugerencias de autocompletado
    const keywordCompletions = borielBasicKeywords.map(keyword => ({
        label: toPascalCase(keyword.label),
        kind: keyword.kind || CompletionItemKind.Keyword,
        detail: keyword.parameters ? `${keyword.detail}\n(${keyword.parameters})` : keyword.detail
    }));

    return [...keywordCompletions, ...functionCompletions, ...variableCompletions];
});

function toPascalCase(str) {
    return str
        .toLowerCase()
        .replace(/(?:^|_|\s|-)(\w)/g, (_, c) => (c ? c.toUpperCase() : ''));
}

// Resolver detalles adicionales de los ítems de autocompletado
connection.onCompletionResolve((item) => {
    // Puedes agregar más detalles aquí si es necesario
    return item;
});

connection.onSignatureHelp((params) => {
    const document = documents.get(params.textDocument.uri);
    const position = params.position;

    if (!document) {
        return null;
    }

    // Obtener la línea de texto en la posición actual
    const lineText = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: Number.MAX_SAFE_INTEGER }
    });

    // Verificar si la posición está dentro de un comentario
    const strippedLine = stripComments(lineText);
    if (position.character >= strippedLine.length) {
        return null; // Está en un comentario
    }

    // Extraer la palabra antes del paréntesis de apertura
    const match = lineText.match(/(\w+)\s*\(/);
    if (!match) {
        return null;
    }

    const funcName = match[1];
    console.log(`Buscando firma para la función: ${funcName}`);

    // Buscar la función en las definiciones globales
    let funcData = globalDefinitions.get(funcName);
    let isUserDefined = true;

    if (!funcData) {
        // Buscar en las palabras clave de Boriel Basic
        const keyword = borielBasicKeywords.find(k => k.label.toUpperCase() === funcName.toUpperCase() && k.type === 'function');
        if (keyword) {
            funcData = {
                parameters: keyword.parameters || '',
                returnType: keyword.returnType || 'void',
                detail: keyword.detail
            };
            isUserDefined = false;
        }
    }

    if (!funcData) {
        console.log(`No se encontró la función: ${funcName}`);
        return null;
    }

    // Crear la respuesta de ayuda de firma
    const parameters = funcData.parameters ? funcData.parameters.split(',').map(param => param.trim()) : [];
    const signature = {
        label: `${funcName}(${funcData.parameters}) -> ${funcData.returnType}`,
        documentation: isUserDefined
            ? `Función definida por el usuario.\n\nRetorna: ${funcData.returnType}`
            : `${funcData.detail}\n\nRetorna: ${funcData.returnType}`,
        parameters: parameters.map(param => ({
            label: param,
            documentation: `Parámetro: ${param}`
        }))
    };

    return {
        signatures: [signature],
        activeSignature: 0,
        activeParameter: Math.max(0, params.context?.triggerCharacter === ',' ? parameters.length - 1 : 0)
    };
});

// Proponer CodeAction para Extract Method
connection.onCodeAction((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    const range = params.range;
    const startOffset = doc.offsetAt(range.start);
    const endOffset = doc.offsetAt(range.end);
    if (endOffset <= startOffset) return [];

    const selectedText = doc.getText(range);
    if (!selectedText || !selectedText.trim()) return [];

    // Evitar extract dentro de comentarios (básico: comprobar la línea start)
    const startLineText = doc.getText({ start: { line: range.start.line, character: 0 }, end: { line: range.start.line, character: Number.MAX_SAFE_INTEGER } });
    if (stripComments(startLineText).trim().length <= 0) return [];

    // Generar nombre único
    const funcName = `extracted_${_extractCounter++}`;

    // Detectar identificadores usados en la selección, ignorando texto entre comillas
    const usedIdsOrdered = [];
    const usedIdsSet = new Set();
    (function collectIdsOutsideStrings(text) {
        let inString = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '"') {
                // handle doubled quotes "" inside strings
                if (inString && text[i + 1] === '"') {
                    i++; // skip escaped quote
                    continue;
                }
                inString = !inString;
                continue;
            }
            if (inString) continue;

            // identifier start
            if (/[A-Za-z_]/.test(ch)) {
                let j = i + 1;
                while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j++;
                const id = text.slice(i, j);
                if (!usedIdsSet.has(id)) {
                    usedIdsSet.add(id);
                    usedIdsOrdered.push(id);
                }
                i = j - 1;
            }
        }
    })(selectedText);

    // Excluir palabras reservadas y builtins
    const keywordSet = new Set(borielBasicKeywords.map(k => k.label.toUpperCase()));
    const builtinsSet = new Set(Array.from(globalDefinitions.keys()).map(k => k.toUpperCase()));

    // Detectar identificadores declarados dentro de la selección (DIM, CONST, asignaciones simples)
    const declaredInside = new Set();
    const dimRegex = /\bDIM\s+([A-Za-z_][A-Za-z0-9_]*)/ig;
    let im2;
    while ((im2 = dimRegex.exec(selectedText)) !== null) declaredInside.add(im2[1]);
    const constRegex = /\bCONST\s+([A-Za-z_][A-Za-z0-9_]*)/ig;
    while ((im2 = constRegex.exec(selectedText)) !== null) declaredInside.add(im2[1]);
    const assignRegex = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/mg;
    while ((im2 = assignRegex.exec(selectedText)) !== null) declaredInside.add(im2[1]);

    // Construir lista de parámetros: usados pero no declarados dentro y no keywords/builtins
    const paramsList = [];
    for (const id of usedIdsOrdered) {
        const up = id.toUpperCase();
        if (declaredInside.has(id)) continue;
        if (keywordSet.has(up)) continue;
        if (builtinsSet.has(up)) continue;
        if (/^\d+$/.test(id)) continue;
        // evitar que 'Print' u otras palabras de linea inicial sean pasadas
        paramsList.push(id);
    }

    // Formatear el bloque de función con indentación de 4 espacios
    const selLines = selectedText.split(/\r?\n/);
    // eliminar líneas iniciales/finales vacías
    while (selLines.length && selLines[0].trim() === '') selLines.shift();
    while (selLines.length && selLines[selLines.length - 1].trim() === '') selLines.pop();
    const indented = selLines.map(l => (l.trim() === '' ? '' : '    ' + l)).join('\n');

    // Construir firma con tipos cuando estén disponibles en globalVariables
    const paramSigs = paramsList.map(p => {
        const entry = globalVariables.get(p);
        if (entry) {
            const t = entry.dataType || entry.type || null;
            if (t && t !== 'unknown') return `${p} As ${t}`;
        }
        return p;
    });
    const paramsSignature = paramSigs.length ? `(${paramSigs.join(', ')})` : '()';
    const funcText = `\nSUB ${funcName}${paramsSignature}\n${indented}\nEND SUB\n`;

    // Construir ediciones: insertar al final del documento y reemplazar selección por llamada
    const uri = params.textDocument.uri;
    const edits = {};
    const docText = doc.getText();
    const docEndPos = doc.positionAt(docText.length);
    edits[uri] = [];

    // Insertar la nueva función al final
    edits[uri].push({ range: Range.create(docEndPos.line, docEndPos.character, docEndPos.line, docEndPos.character), newText: funcText });

    // Reemplazar selección por la llamada a la función, pasando parámetros en orden deducido
    const callText = `${funcName}${paramsList.length ? '(' + paramsList.join(', ') + ')' : '()'}`;
    edits[uri].push({ range: range, newText: callText });

    const workspaceEdit = { changes: {} };
    workspaceEdit.changes[uri] = edits[uri];

    const action = {
        title: 'Extract Method',
        kind: CodeActionKind.RefactorExtract,
        edit: workspaceEdit
    };

    return [action];
});

connection.languages.semanticTokens.on((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return { data: [] };
    }

    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const tokens = [];

    lines.forEach((line, lineIndex) => {
        let remainingLine = line;
        let currentCharIndex = 0;
        let commentToken = null;

        // Detectar comentarios de forma robusta
        const strippedLine = stripComments(line);
        if (strippedLine.length < line.length) {
            const commentStart = strippedLine.length;
            commentToken = {
                line: lineIndex,
                startChar: commentStart,
                length: line.length - commentStart,
                tokenType: 5, // 'comment'
                tokenModifiers: []
            };

            // Truncar la línea para no procesar el comentario como código
            remainingLine = strippedLine;
        }

        // Detectar tokens compuestos
        borielBasicKeywords
            .filter(k => k.label.includes(' ')) // Filtrar solo tokens compuestos
            .forEach(keyword => {
                const keywordIndex = remainingLine.toUpperCase().indexOf(keyword.label.toUpperCase());
                if (keywordIndex !== -1) {
                    tokens.push({
                        line: lineIndex,
                        startChar: keywordIndex,
                        length: keyword.label.length,
                        tokenType: getTokenType(keyword.type),
                        tokenModifiers: []
                    });

                    // Eliminar el token compuesto de la línea para evitar procesarlo dos veces
                    remainingLine = remainingLine.slice(0, keywordIndex) + ' '.repeat(keyword.label.length) + remainingLine.slice(keywordIndex + keyword.label.length);
                }
            });

        // Detectar cabeceras de funciones o subrutinas
        if (/^\s*(Sub|Function)\b/i.test(line)) {
            const match = line.match(/^\s*(Sub|Function)\s+(\w+)\s*\((.*)\)\s*(As\s+\w+)?/i);
            if (match) {
                const [, keyword, functionName, parameters, returnType] = match;

                // Agregar el token para la palabra clave (Sub o Function)
                tokens.push({
                    line: lineIndex,
                    startChar: line.indexOf(keyword),
                    length: keyword.length,
                    tokenType: 0, // 'keyword'
                    tokenModifiers: []
                });

                // Agregar el token para el nombre de la función
                tokens.push({
                    line: lineIndex,
                    startChar: line.indexOf(functionName),
                    length: functionName.length,
                    tokenType: 1, // 'function'
                    tokenModifiers: []
                });

                // Procesar los parámetros
                const params = parameters.split(',').map(param => param.trim());
                params.forEach(param => {
                    const paramMatch = param.match(/(\w+)\s+As\s+(\w+)/i);
                    if (paramMatch) {
                        const [, paramName, paramType] = paramMatch;

                        // Buscar la posición del nombre del parámetro
                        const paramNameStart = line.indexOf(paramName, currentCharIndex);

                        // Agregar el token para el nombre del parámetro
                        tokens.push({
                            line: lineIndex,
                            startChar: paramNameStart,
                            length: paramName.length,
                            tokenType: 2, // 'variable'
                            tokenModifiers: []
                        });

                        // Buscar la posición de "As" y el tipo
                        const asIndex = line.indexOf('As', paramNameStart + paramName.length);
                        const typeStartChar = line.indexOf(paramType, asIndex + 2);

                        // Agregar el token para el tipo del parámetro
                        tokens.push({
                            line: lineIndex,
                            startChar: typeStartChar,
                            length: paramType.length,
                            tokenType: 4, // 'type'
                            tokenModifiers: []
                        });

                        // Actualizar el índice actual para evitar conflictos con parámetros posteriores
                        currentCharIndex = typeStartChar + paramType.length;
                    }
                });

                // Procesar el tipo de retorno
                if (returnType) {
                    const returnTypeMatch = returnType.match(/As\s+(\w+)/i);
                    if (returnTypeMatch) {
                        const [, returnTypeName] = returnTypeMatch;

                        // Buscar la posición de "As" y el tipo de retorno
                        const returnAsIndex = line.indexOf('As', line.indexOf(')') + 1);
                        const returnTypeStartChar = line.indexOf(returnTypeName, returnAsIndex + 2);

                        // Agregar el token para el tipo de retorno
                        tokens.push({
                            line: lineIndex,
                            startChar: returnTypeStartChar,
                            length: returnTypeName.length,
                            tokenType: 4, // 'type'
                            tokenModifiers: []
                        });
                    }
                }
            }
        }

        // Detectar palabras clave y otros tokens
        const words = remainingLine.split(/\s+/);

        words.forEach((word, wordIndex) => {
            // Eliminar paréntesis y su contenido del nombre
            // Si la palabra contiene un paréntesis de apertura, nos quedamos con lo que hay antes
            if (word.includes('(')) {
                word = word.split('(')[0];
            }
            // También limpiar paréntesis de cierre si quedaron (por si acaso)
            word = word.replace(/\)/g, '');
            const startChar = line.indexOf(word, wordIndex > 0 ? line.indexOf(words[wordIndex - 1]) + words[wordIndex - 1].length : 0);
            const length = word.length;

            // Detectar palabras clave
            const keyword = borielBasicKeywords.find(k => k.label.toUpperCase() === word.toUpperCase());
            if (keyword) {
                tokens.push({
                    line: lineIndex,
                    startChar,
                    length,
                    tokenType: getTokenType(keyword.type),
                    tokenModifiers: []
                });
                return;
            }

            // Detectar variables
            if (globalVariables.has(word)) {
                tokens.push({
                    line: lineIndex,
                    startChar,
                    length,
                    tokenType: 2, // 'variable'
                    tokenModifiers: []
                });
                return;
            }
        });

        // Detectar palabras clave de tipo 'type' en cualquier contexto
        borielBasicKeywords
            .filter(k => k.type === 'type') // Filtrar solo palabras clave de tipo 'type'
            .forEach(typeKeyword => {
                let typeIndex = remainingLine.toUpperCase().indexOf(typeKeyword.label.toUpperCase());
                while (typeIndex !== -1) {
                    tokens.push({
                        line: lineIndex,
                        startChar: typeIndex,
                        length: typeKeyword.label.length,
                        tokenType: 4, // 'type'
                        tokenModifiers: []
                    });

                    // Continuar buscando más ocurrencias en la misma línea
                    typeIndex = remainingLine.toUpperCase().indexOf(typeKeyword.label.toUpperCase(), typeIndex + typeKeyword.label.length);
                }
            });

        // Agregar el token de comentario al final, si existe
        if (commentToken) {
            tokens.push(commentToken);
        }
    });

    // Convertir los tokens al formato esperado
    const data = [];
    let lastLine = 0;
    let lastChar = 0;

    tokens.forEach(token => {
        const deltaLine = token.line - lastLine;
        const deltaStart = deltaLine === 0 ? token.startChar - lastChar : token.startChar;

        data.push(deltaLine, deltaStart, token.length, token.tokenType, 0);

        lastLine = token.line;
        lastChar = token.startChar;
    });

    return { data };
});

// Función para obtener el tipo de token
function getTokenType(type) {
    switch (type) {
        case 'logic': return 0; // 'keyword'
        case 'control': return 3; // 'control'
        case 'type': return 4; // 'type'
        case 'definition': return 5; // 'definition'
        case 'io': return 6; // 'io'
        case 'function': return 1; // 'function'
        case 'keyword': return 0; // 'keyword'
        default: return 0; // Default to 'keyword'
    }
}

// Escuchar la conexión
connection.listen();