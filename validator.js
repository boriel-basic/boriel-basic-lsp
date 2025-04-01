const {
    Range,
    DiagnosticSeverity,
} = require('vscode-languageserver/node');

const { globalVariables, globalDefinitions } = require('./analyzer');
const { zxBasicKeywords } = require('./const');

// Función para validar documentos ZX Basic
function validateZXBasic(document, connection) {
    console.log('Validando documento:', document.uri);
    console.log('globalVariables:', globalVariables);

    // Extraer de todos los elemenos de zxBasicKeywords la propiedad label
    const keywordLabels = Object.keys(zxBasicKeywords).map((key) => zxBasicKeywords[key].label);
    console.log('Palabras clave:', keywordLabels);

    const text = document.getText();
    const diagnostics = [];

    // Ejemplo: Detectar errores básicos de sintaxis
    const lines = text.split(/\r?\n/);
    const openIfStack = []; // Pila para rastrear los bloques IF abiertos

    lines.forEach((line, i) => {
        const trimmedLine = line.trim();

        // Detectar palabras reservadas mal escritas (ejemplo: "pritn" en lugar de "print")
        if (/pritn/i.test(trimmedLine)) {
            diagnostics.push({
                range: Range.create(i, trimmedLine.indexOf('pritn'), i, trimmedLine.indexOf('pritn') + 5),
                message: '¿Quisiste decir "PRINT"?',
                severity: DiagnosticSeverity.Warning
            });
        }

        // Detectar ifs sin THEN
        if (/^\s*if\s+.+\s*$/i.test(trimmedLine) && !/then/i.test(trimmedLine)) {
            diagnostics.push({
                range: Range.create(i, trimmedLine.indexOf('if'), i, trimmedLine.length),
                message: 'Falta "THEN" después de la condición IF.',
                severity: DiagnosticSeverity.Error
            });
        }

        // Detectar uso de variables no definidas
        const variableRegex = /[a-zA-Z_]\w*\(|[a-zA-Z_]\w*|"[^"]*"/g;
        const variables = trimmedLine.match(variableRegex);
        if (variables) {
            variables.forEach((variable) => {
                console.log('Variable encontrada:', variable);

                if (variable.includes('(')) {
                    return; // Ignorar funciones o subrutinas
                }

                if (variable.includes('"')) {
                    return; // Ignorar variables de cadena
                }

                const normalizedVariable = variable.trim().toUpperCase();

                if (keywordLabels.includes(normalizedVariable)) {
                    return;
                }
                if (!globalVariables.has(variable)) { // Cambiado de includes a has
                    diagnostics.push({
                        range: Range.create(i, trimmedLine.indexOf(variable), i, trimmedLine.indexOf(variable) + variable.length),
                        message: `La variable "${variable}" no está definida.`,
                        severity: DiagnosticSeverity.Error
                    });
                }
            });
        }

        // Detectar uso de funciones no definidas
        const functionRegex = /\b[a-zA-Z_]\w*\s*\(/g;
        const functions = trimmedLine.match(functionRegex);
        if (functions) {
            functions.forEach((func) => {
                const functionName = func.split('(')[0].trim();
                if (keywordLabels.includes(functionName)) {
                    return;
                }
                if (!globalDefinitions.has(functionName)) {
                    diagnostics.push({
                        range: Range.create(i, trimmedLine.indexOf(func), i, trimmedLine.indexOf(func) + func.length),
                        message: `La función "${functionName}" no está definida.`,
                        severity: DiagnosticSeverity.Error
                    });
                }
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
            message: 'Falta "END IF" para esta estructura condicional.',
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
    validateZXBasic
};