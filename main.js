#!/usr/bin/env node

const {
    createConnection,
    Range,
    TextDocuments,
    TextDocumentSyncKind,
    CompletionItem,
    TextEdit,
    Location
} = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Crear conexión con el cliente
const connection = createConnection();
connection.console.info('ZX Basic LSP server is running');

// Manejo de documentos abiertos
const documents = new TextDocuments(TextDocument);
documents.listen(connection);

const { zxBasicKeywords } = require('./const');
const { formatZXBasicCode } = require('./formatter');
const { globalDefinitions, globalReferences, analyzeProjectFiles } = require('./analyzer');

// Manejar el evento de formato de documentos
connection.onDocumentFormatting((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    // Aplicar las reglas de formato
    return formatZXBasicCode(document);
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

    // Normalizar la palabra eliminando paréntesis y parámetros
    wordAtPosition = wordAtPosition.replace(/\(.*\)$/, '');
    console.log(`Buscando definición para: ${wordAtPosition}`);

    // Buscar la definición en globalDefinitions
    if (globalDefinitions.has(wordAtPosition)) {
        const location = globalDefinitions.get(wordAtPosition);
        console.log(`Definición encontrada para ${wordAtPosition}:`, location);
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
connection.onInitialize(() => {
    analyzeProjectFiles();

    return {
        capabilities: {
            textDocumentSync: {
                openClose: true,
                change: TextDocumentSyncKind.Incremental
            },
            completionProvider: {
                resolveProvider: true // Permite resolver detalles adicionales de los ítems
            },
            documentFormattingProvider: true, // Habilitar el formato de documentos
            definitionProvider: true, // Habilitar ir a la definición
            referencesProvider: true  // Habilitar encontrar referencias
        }
    };
});

const { watchBasicFiles } = require('./watcher');
watchBasicFiles();

const { validateZXBasic } = require('./validator');

// Validar documentos al abrir o cambiar contenido
documents.onDidOpen((event) => {
    validateZXBasic(event.document, connection);
});

documents.onDidChangeContent((event) => {
    validateZXBasic(event.document, connection);
});

// Proveer autocompletado
connection.onCompletion(() => {
    // Retornar las palabras clave como sugerencias de autocompletado
    return zxBasicKeywords;
});

// Resolver detalles adicionales de los ítems de autocompletado
connection.onCompletionResolve((item) => {
    // Puedes agregar más detalles aquí si es necesario
    return item;
});

// Escuchar la conexión
connection.listen();