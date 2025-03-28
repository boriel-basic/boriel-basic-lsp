const {
    Range,
    DiagnosticSeverity,
} = require('vscode-languageserver/node');

// Función para validar documentos ZX Basic
function validateZXBasic(document, connection) {
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