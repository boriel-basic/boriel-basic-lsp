const {
    CompletionItemKind,
} = require('vscode-languageserver/node');

// Palabras clave de Boriel Basic para autocompletado
const borielBasicKeywords = [
    // Control de flujo
    { label: 'IF', kind: CompletionItemKind.Keyword, detail: 'Estructura condicional' },
    { label: 'THEN', kind: CompletionItemKind.Keyword, detail: 'Parte de la estructura IF' },
    { label: 'ELSE', kind: CompletionItemKind.Keyword, detail: 'Parte de la estructura IF' },
    { label: 'END IF', kind: CompletionItemKind.Keyword, detail: 'Finaliza una estructura IF' },
    { label: 'FOR', kind: CompletionItemKind.Keyword, detail: 'Bucle FOR' },
    { label: 'TO', kind: CompletionItemKind.Keyword, detail: 'Parte de la estructura FOR' },
    { label: 'STEP', kind: CompletionItemKind.Keyword, detail: 'Incremento en un bucle FOR' },
    { label: 'NEXT', kind: CompletionItemKind.Keyword, detail: 'Finaliza un bucle FOR' },
    { label: 'WHILE', kind: CompletionItemKind.Keyword, detail: 'Bucle WHILE' },
    { label: 'WEND', kind: CompletionItemKind.Keyword, detail: 'Finaliza un bucle WHILE' },
    { label: 'DO', kind: CompletionItemKind.Keyword, detail: 'Inicio de un bucle DO' },
    { label: 'LOOP', kind: CompletionItemKind.Keyword, detail: 'Finaliza un bucle DO' },
    { label: 'EXIT', kind: CompletionItemKind.Keyword, detail: 'Sale de un bucle o subrutina' },
    { label: 'GOTO', kind: CompletionItemKind.Keyword, detail: 'Salta a una línea específica' },
    { label: 'GOSUB', kind: CompletionItemKind.Keyword, detail: 'Llama a una subrutina' },
    { label: 'RETURN', kind: CompletionItemKind.Keyword, detail: 'Regresa de una subrutina' },
    { label: 'ON', kind: CompletionItemKind.Keyword, detail: 'Control de flujo basado en condiciones' },

    // Declaraciones
    { label: 'DIM', kind: CompletionItemKind.Keyword, detail: 'Declara un array' },
    { label: 'CONST', kind: CompletionItemKind.Keyword, detail: 'Declara una constante' },
    { label: 'DEF', kind: CompletionItemKind.Keyword, detail: 'Define una función o subrutina' },
    { label: 'END', kind: CompletionItemKind.Keyword, detail: 'Finaliza el programa o bloque' },
    { label: 'LET', kind: CompletionItemKind.Keyword, detail: 'Asigna un valor a una variable' },

    // Entrada/Salida
    { label: 'PRINT', kind: CompletionItemKind.Keyword, detail: 'Imprime texto o valores en pantalla' },
    { label: 'INPUT', kind: CompletionItemKind.Keyword, detail: 'Solicita entrada del usuario' },
    { label: 'CLS', kind: CompletionItemKind.Keyword, detail: 'Limpia la pantalla' },
    { label: 'PAUSE', kind: CompletionItemKind.Keyword, detail: 'Pausa la ejecución del programa' },

    // Operadores
    { label: 'AND', kind: CompletionItemKind.Keyword, detail: 'Operador lógico AND' },
    { label: 'OR', kind: CompletionItemKind.Keyword, detail: 'Operador lógico OR' },
    { label: 'NOT', kind: CompletionItemKind.Keyword, detail: 'Operador lógico NOT' },
    { label: 'MOD', kind: CompletionItemKind.Keyword, detail: 'Operador de módulo' },

    // Funciones matemáticas
    { label: 'ABS', kind: CompletionItemKind.Function, detail: 'Devuelve el valor absoluto' },
    { label: 'SIN', kind: CompletionItemKind.Function, detail: 'Devuelve el seno de un ángulo' },
    { label: 'COS', kind: CompletionItemKind.Function, detail: 'Devuelve el coseno de un ángulo' },
    { label: 'TAN', kind: CompletionItemKind.Function, detail: 'Devuelve la tangente de un ángulo' },
    { label: 'INT', kind: CompletionItemKind.Function, detail: 'Devuelve la parte entera de un número' },
    { label: 'RND', kind: CompletionItemKind.Function, detail: 'Devuelve un número aleatorio' },
    { label: 'SGN', kind: CompletionItemKind.Function, detail: 'Devuelve el signo de un número' },
    { label: 'SQR', kind: CompletionItemKind.Function, detail: 'Devuelve la raíz cuadrada' },

    // Funciones de cadenas
    { label: 'CHR$', kind: CompletionItemKind.Function, detail: 'Devuelve el carácter correspondiente a un código ASCII' },
    { label: 'ASC', kind: CompletionItemKind.Function, detail: 'Devuelve el código ASCII de un carácter' },
    { label: 'LEN', kind: CompletionItemKind.Function, detail: 'Devuelve la longitud de una cadena' },
    { label: 'LEFT$', kind: CompletionItemKind.Function, detail: 'Devuelve una subcadena desde la izquierda' },
    { label: 'RIGHT$', kind: CompletionItemKind.Function, detail: 'Devuelve una subcadena desde la derecha' },
    { label: 'MID$', kind: CompletionItemKind.Function, detail: 'Devuelve una subcadena desde una posición específica' },

    // Otros
    { label: 'REM', kind: CompletionItemKind.Keyword, detail: 'Comentario en el código' },
    { label: 'DATA', kind: CompletionItemKind.Keyword, detail: 'Define datos para ser leídos con READ' },
    { label: 'READ', kind: CompletionItemKind.Keyword, detail: 'Lee datos definidos con DATA' },
    { label: 'RESTORE', kind: CompletionItemKind.Keyword, detail: 'Restaura el puntero de lectura de DATA' },
    { label: 'RANDOMIZE', kind: CompletionItemKind.Keyword, detail: 'Inicializa el generador de números aleatorios' },

    // Palabras clave adicionales de Boriel Basic
    { label: 'BEEP', kind: CompletionItemKind.Keyword, detail: 'Genera un sonido' },
    { label: 'INK', kind: CompletionItemKind.Keyword, detail: 'Establece el color de la tinta' },
    { label: 'PAPER', kind: CompletionItemKind.Keyword, detail: 'Establece el color del fondo' },
    { label: 'BORDER', kind: CompletionItemKind.Keyword, detail: 'Establece el color del borde' },
    { label: 'POKE', kind: CompletionItemKind.Keyword, detail: 'Escribe un valor en una dirección de memoria' },
    { label: 'PEEK', kind: CompletionItemKind.Function, detail: 'Lee un valor de una dirección de memoria' },
    { label: 'OUT', kind: CompletionItemKind.Keyword, detail: 'Envía un valor a un puerto' },
    { label: 'IN', kind: CompletionItemKind.Function, detail: 'Lee un valor de un puerto' },
    { label: 'SUB', kind: CompletionItemKind.Keyword, detail: 'Define un procedimiento' },
    { label: 'FUNCTION', kind: CompletionItemKind.Keyword, detail: 'Define una función' },

    // Palabras clave de tipos de datos
    { label: 'BYTE', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato byte' },
    { label: 'UBYTE', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato byte sin signo' },
    { label: 'INTEGER', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato entero' },
    { label: 'UINTEGER', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato entero sin signo' },
    { label: 'LONG', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato entero largo' },
    { label: 'ULONG', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato entero largo sin signo' },
    { label: 'STRING', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato cadena' },
    { label: 'ARRAY', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato array' },

    { label: 'AS', kind: CompletionItemKind.Keyword, detail: 'Especifica el tipo de dato de una variable' },
    { label: 'FASTCALL', kind: CompletionItemKind.Keyword, detail: 'Especifica el tipo de llamada a una función' },
    { label: 'BYVAL', kind: CompletionItemKind.Keyword, detail: 'Especifica que un parámetro se pasa por valor' },
    { label: 'BYREF', kind: CompletionItemKind.Keyword, detail: 'Especifica que un parámetro se pasa por referencia' },
    { label: 'OPTION', kind: CompletionItemKind.Keyword, detail: 'Especifica opciones de compilación' },
    { label: 'BASE', kind: CompletionItemKind.Keyword, detail: 'Especifica la base numérica' },
    { label: 'SCREEN', kind: CompletionItemKind.Keyword, detail: 'Especifica la pantalla a utilizar' },
    { label: 'SOUND', kind: CompletionItemKind.Keyword, detail: 'Genera un sonido' },
    { label: 'WAIT', kind: CompletionItemKind.Keyword, detail: 'Espera un evento' },
    { label: 'CLS', kind: CompletionItemKind.Keyword, detail: 'Limpia la pantalla' },

    { label: 'UNTIL', kind: CompletionItemKind.Keyword, detail: 'Espera hasta que se cumpla una condición' },
    { label: 'INKEY$', kind: CompletionItemKind.Function, detail: 'Lee una tecla presionada' },
];

module.exports = {
    borielBasicKeywords
};