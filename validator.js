const {
    Range,
    DiagnosticSeverity,
} = require('vscode-languageserver/node');

const { globalVariables, globalDefinitions } = require('./analyzer');
const { borielBasicKeywords } = require('./const');

// Función para validar documentos Boriel Basic
function validateBorielBasic(document, connection) {
    console.log('Validando documento:', document.uri);

    // Extraer de todos los elemenos de borielBasicKeywords la propiedad label
    const keywordLabels = Object.keys(borielBasicKeywords).map((key) => borielBasicKeywords[key].label);

    const text = document.getText();
    const diagnostics = [];

    // Ejemplo: Detectar errores básicos de sintaxis
    const lines = text.split(/\r?\n/);
    const openIfStack = []; // Pila para rastrear los bloques IF abiertos

    lines.forEach((line, i) => {
        const trimmedLine = line.trim();
    
        // Detectar palabras reservadas mal escritas (ejemplo: "pritn" en lugar de "print")
        const typoIndex = trimmedLine.indexOf('pritn');
        if (/pritn/i.test(trimmedLine) && typoIndex >= 0) {
            diagnostics.push({
                range: Range.create(i, typoIndex, i, typoIndex + 5),
                message: '¿Quisiste decir "PRINT"?',
                severity: DiagnosticSeverity.Warning
            });
        }
    
        // Detectar ifs sin THEN
        const ifIndex = trimmedLine.toLowerCase().indexOf('if');
        if (/^\s*if\s+.+$/i.test(trimmedLine) && !/then/i.test(trimmedLine) && ifIndex >= 0) {
            diagnostics.push({
                range: Range.create(i, ifIndex, i, ifIndex + 2), // Solo resaltar "if"
                message: 'Falta "Then" después de la condición If.',
                severity: DiagnosticSeverity.Error
            });
        }
    
        // Detectar apertura de bloques IF
        if (/^\s*if\s+.+\s+then\s*$/i.test(trimmedLine)) {
            openIfStack.push(i); // Guardar la línea donde se abrió el IF
        }
    
        // Detectar cierre de bloques END IF
        if (/^\s*end\s*if\s*$/i.test(trimmedLine)) {
            openIfStack.pop(); // Sacar el último IF abierto de la pila
        }
    });
    
    // Verificar si quedaron bloques IF sin cerrar
    openIfStack.forEach((lineNumber) => {
        diagnostics.push({
            range: Range.create(lineNumber, 0, lineNumber, lines[lineNumber].length),
            message: 'Falta "End If" para esta estructura condicional.',
            severity: DiagnosticSeverity.Error
        });
    });

    // Enviar diagnósticos al cliente
    connection.sendDiagnostics({
        uri: document.uri,
        version: document.version,
        diagnostics
    });
}

module.exports = {
    validateBorielBasic
};