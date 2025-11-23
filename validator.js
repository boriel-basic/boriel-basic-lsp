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

        // Validar llamadas a funciones
        const words = trimmedLine.split(/\s+/);
        words.forEach((word, wordIndex) => {
            // Si la palabra termina en '(' o la siguiente palabra empieza por '(', es una posible llamada a función
            let funcName = '';
            let isFuncCall = false;
            let funcNameIndex = -1;

            if (word.includes('(')) {
                funcName = word.split('(')[0];
                isFuncCall = true;
                funcNameIndex = line.indexOf(funcName);
            } else if (wordIndex < words.length - 1 && words[wordIndex + 1].startsWith('(')) {
                funcName = word;
                isFuncCall = true;
                funcNameIndex = line.indexOf(funcName);
            }

            if (isFuncCall && funcName && /^[a-zA-Z_]\w*$/.test(funcName)) {
                // Ignorar palabras clave del lenguaje que no son funciones (como IF, PRINT, etc.)
                // Pero verificar si es una función de librería o definida por el usuario
                const isKeyword = borielBasicKeywords.some(k => k.label.toUpperCase() === funcName.toUpperCase());
                const isGlobalDef = globalDefinitions.has(funcName);

                // Si es una palabra clave, verificar si es de tipo función o si es una instrucción válida
                // Si no es palabra clave ni definición global, es un error (a menos que sea una variable array, pero eso es difícil de distinguir sin análisis más profundo)
                // Por ahora, asumimos que si no está en keywords ni definitions, y parece función, es sospechoso.
                // Sin embargo, arrays se acceden igual: Array(Index).
                // Así que solo marcaremos error si no es NADA conocido (ni variable, ni función, ni keyword).

                const isVariable = globalVariables.has(funcName);

                if (!isKeyword && !isGlobalDef && !isVariable) {
                    // Verificar si es una declaración (DIM, SUB, FUNCTION) para no marcar el nombre que se está definiendo
                    const isDeclaration = /^\s*(DIM|SUB|FUNCTION)\b/i.test(trimmedLine);

                    if (!isDeclaration) {
                        diagnostics.push({
                            range: Range.create(i, funcNameIndex, i, funcNameIndex + funcName.length),
                            message: `Función o variable desconocida: "${funcName}"`,
                            severity: DiagnosticSeverity.Error
                        });
                    }
                }
            }
        });
    });

    // Verificar si quedaron bloques IF sin cerrar
    openIfStack.forEach((lineNumber) => {
        diagnostics.push({
            range: Range.create(lineNumber, 0, lineNumber, lines[lineNumber].length),
            message: 'Falta "End If" para esta estructura condicional.',
            severity: DiagnosticDiagnosticSeverity.Error
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