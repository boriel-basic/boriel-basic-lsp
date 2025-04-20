#!/usr/bin/env node

const {
    createConnection,
    Range,
    TextDocuments,
    TextDocumentSyncKind,
    CompletionItemKind,
} = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');
const { URI } = require('vscode-uri');

// Crear conexión con el cliente
const connection = createConnection();
connection.console.info('Boriel Basic LSP server is running');

// Manejo de documentos abiertos
const documents = new TextDocuments(TextDocument);
documents.listen(connection);

const { borielBasicKeywords } = require('./const');
const { formatBorielBasicCode } = require('./formatter');
const {
    globalDefinitions,
    globalReferences,
    globalVariables,
    analyzeProjectFiles,
    analyzeFileForDefinitions,
    analyzeFileForReferences,
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

    // if wordAtPosition is a function or subroutine
    if (wordAtPosition.includes('(')) {
        wordAtPosition = wordAtPosition.split('(')[0].trim();
        console.log(`Buscando definición para: ${wordAtPosition}`);
        // Normalizar la palabra eliminando paréntesis y parámetros
        wordAtPosition = wordAtPosition.split('(')[0].trim();
        console.log(`Buscando definición para: ${wordAtPosition}`);

        // Buscar en definiciones de funciones
        if (globalDefinitions.has(wordAtPosition)) {
            const location = globalDefinitions.get(wordAtPosition);
            console.log(`Definición de función encontrada para ${wordAtPosition}:`, location);
            return location;
        }
    }

    // Buscar en definiciones de variables
    if (globalVariables.has(wordAtPosition)) {
        const location = globalVariables.get(wordAtPosition).location;
        console.log(`Definición de variable encontrada para ${wordAtPosition}:`, location);
        return location;
    }

    console.log(`No se encontró definición para: ${wordAtPosition}`);
    return null;
});

// Manejar solicitud de referencias
connection.onReferences((params) => {
    const position = params.position;
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    const lineText = document.getText(Range.create(position.line, 0, position.line, document.getText().length));
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
        label: keyword.label,
        kind: CompletionItemKind.Keyword,
        detail: keyword.detail
    }));

    return [...keywordCompletions, ...functionCompletions, ...variableCompletions];
});

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

    // Extraer la palabra antes del paréntesis de apertura
    const match = lineText.match(/(\w+)\s*\(/);
    if (!match) {
        return null;
    }

    const funcName = match[1];
    console.log(`Buscando firma para la función: ${funcName}`);

    // Buscar la función en las definiciones globales
    const funcData = globalDefinitions.get(funcName);
    if (!funcData) {
        console.log(`No se encontró la función: ${funcName}`);
        return null;
    }

    // Crear la respuesta de ayuda de firma
    const parameters = funcData.parameters.split(',').map(param => param.trim());
    const signature = {
        label: `${funcName}(${funcData.parameters}) -> ${funcData.returnType}`,
        documentation: `Función definida por el usuario.\n\nRetorna: ${funcData.returnType}`,
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

        // Detectar comentarios
        const commentMatch = line.match(/(?:REM\b|')\s*(.*)/i);
        if (commentMatch) {
            const commentStart = line.indexOf(commentMatch[0]);
            tokens.push({
                line: lineIndex,
                startChar: commentStart,
                length: line.length - commentStart,
                tokenType: 5, // 'comment'
                tokenModifiers: []
            });

            // No procesar más tokens en esta línea después de un comentario
            return;
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
        case 'keyword': return 0; // 'keyword'
        default: return 0; // Default to 'keyword'
    }
}

// Escuchar la conexión
connection.listen();