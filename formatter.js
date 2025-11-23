const {
    Range,
    TextEdit,
} = require('vscode-languageserver/node');

const { borielBasicKeywords } = require('./const');

function formatBorielBasicCode(document, options = { formatKeywords: false }) {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const edits = [];
    let indentLevel = 0;
    const indentSize = 4; // Tamaño de la indentación (4 espacios)

    // Crear un conjunto de palabras clave en mayúsculas para comparación
    const keywordsSet = new Set(
        borielBasicKeywords.map(keyword =>
            keyword.label.replace(/\\\$/g, '$').toUpperCase()
        )
    );

    lines.forEach((line, i) => {
        const trimmedLine = line.trim();
        const originalIndent = line.slice(0, line.indexOf(trimmedLine)); // Preservar la indentación original

        console.log('Línea:', i, 'Indentación:', indentLevel, 'Texto:', trimmedLine);

        // Reducir nivel de indentación para palabras clave de cierre
        if (/^\s*(END SUB|END FUNCTION|END IF|NEXT|WEND|LOOP|END ASM|#ENDIF)\b/i.test(trimmedLine)) {
            indentLevel = Math.max(0, indentLevel - 1);
        }

        // Ajustar indentación para llaves de cierre (arrays)
        const openBraces = (trimmedLine.match(/{/g) || []).length;
        const closeBraces = (trimmedLine.match(/}/g) || []).length;
        if (closeBraces > openBraces) {
            indentLevel = Math.max(0, indentLevel - (closeBraces - openBraces));
        }

        // Manejar bloques ELSE y ELSEIF
        if (/^\s*(ELSE|ELSEIF|#ELSE\b.*)\b/i.test(trimmedLine)) {
            const elseExpectedIndent = ' '.repeat(Math.max(0, (indentLevel - 1) * indentSize));
            let formattedElseLine = trimmedLine;

            // Convertir palabras clave a Pascal Case si la opción está habilitada
            if (options.formatKeywords) {
                // Separar comentario del código
                const commentMatch = formattedElseLine.match(/(?:REM\b|')/i);
                let codePart = formattedElseLine;
                let commentPart = '';

                if (commentMatch) {
                    const commentIndex = formattedElseLine.indexOf(commentMatch[0]);
                    codePart = formattedElseLine.substring(0, commentIndex);
                    commentPart = formattedElseLine.substring(commentIndex);
                }

                codePart = codePart.replace(/[\w\$]+/g, (word) => {
                    const pascalWord = keywordsSet.has(word.toUpperCase())
                        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        : word;
                    console.log(`Palabra formateada: "${word}" -> "${pascalWord}"`);
                    return pascalWord;
                });

                formattedElseLine = codePart + commentPart;
            }

            const finalElseLine = elseExpectedIndent + formattedElseLine;

            if (line !== finalElseLine) {
                console.log(`Editando línea ELSE/ELSEIF: "${line}" -> "${finalElseLine}"`);
                edits.push(TextEdit.replace(
                    Range.create(i, 0, i, line.length),
                    finalElseLine
                ));
            }
            return; // No procesar más para ELSE/ELSEIF
        }

        // Calcular la indentación esperada
        const expectedIndent = ' '.repeat(indentLevel * indentSize);
        let formattedLine = trimmedLine;

        // Convertir palabras clave a Pascal Case si la opción está habilitada
        if (options.formatKeywords) {
            // Separar comentario del código
            const commentMatch = formattedLine.match(/(?:REM\b|')/i);
            let codePart = formattedLine;
            let commentPart = '';

            if (commentMatch) {
                const commentIndex = formattedLine.indexOf(commentMatch[0]);
                codePart = formattedLine.substring(0, commentIndex);
                commentPart = formattedLine.substring(commentIndex);
            }

            codePart = codePart.replace(/[\w\$]+/g, (word) => {
                const pascalWord = keywordsSet.has(word.toUpperCase())
                    ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    : word;
                console.log(`Palabra formateada: "${word}" -> "${pascalWord}"`);
                return pascalWord;
            });

            formattedLine = codePart + commentPart;
        }

        // Reconstruir la línea con la indentación original o esperada
        const finalLine = expectedIndent + formattedLine;

        if (line !== finalLine) {
            // Crear un cambio de texto para corregir la línea completa
            edits.push(TextEdit.replace(
                Range.create(i, 0, i, line.length),
                finalLine
            ));
        }

        // Aumentar nivel de indentación para palabras clave de apertura
        if (/^\s*(SUB|FUNCTION|IF|FOR|WHILE|DO|ASM|#IFDEF|#IFNDEF)\b/i.test(trimmedLine)) {
            // Excepción: "Do Loop", "Do Loop While ..." y "Do Loop Until ..." en una sola línea no incrementa indentación
            if (/^\s*DO\s+LOOP(\s+(WHILE|UNTIL)\s+.+)?\s*$/i.test(trimmedLine)) {
                console.log('No se incrementa la indentación para "Do Loop" en una sola línea.');
                return;
            }

            // Excepción: "WHILE ... WEND" en la misma línea no incrementa indentación
            if (/^\s*WHILE\b/i.test(trimmedLine) && /\bWEND\b/i.test(trimmedLine)) {
                console.log('No se incrementa la indentación para "WHILE ... WEND" en una sola línea.');
                return;
            }

            // Si es un "IF ... THEN" con más contenido en la misma línea, no incrementar
            if (/^\s*(?!#IFDEF|#IFNDEF)\bIF\b.+\bTHEN\b.+$/i.test(trimmedLine)) {
                console.log(`No se incrementa la indentación para la línea: "${trimmedLine}"`);
                return;
            }

            if (trimmedLine.includes(':WEND\n')) return

            indentLevel++;
        }

        // Aumentar indentación para llaves de apertura (arrays)
        if (openBraces > closeBraces) {
            indentLevel += (openBraces - closeBraces);
        }
    });

    console.log('Ediciones realizadas:', edits.length);

    return edits;
}

module.exports = {
    formatBorielBasicCode
};