const {
    CompletionItemKind,
} = require('vscode-languageserver/node');

// Palabras clave de Boriel Basic para autocompletado
const borielBasicKeywords = [
    // Control de flujo
    { label: 'IF', kind: CompletionItemKind.Keyword, detail: 'Estructura condicional', type: 'control' },
    { label: '#IFDEF', kind: CompletionItemKind.Keyword, detail: 'Estructura condicional', type: 'control' },
    { label: '#IFNDEF', kind: CompletionItemKind.Keyword, detail: 'Estructura condicional', type: 'control' },
    { label: 'THEN', kind: CompletionItemKind.Keyword, detail: 'Parte de la estructura IF', type: 'control' },
    { label: 'ELSE', kind: CompletionItemKind.Keyword, detail: 'Parte de la estructura IF', type: 'control' },
    { label: '#ELSE', kind: CompletionItemKind.Keyword, detail: 'Parte de la estructura IF', type: 'control' },
    { label: 'ELSEIF', kind: CompletionItemKind.Keyword, detail: 'Parte de la estructura IF', type: 'control' },
    { label: '#ELSEIF', kind: CompletionItemKind.Keyword, detail: 'Parte de la estructura IF', type: 'control' },
    { label: 'END IF', kind: CompletionItemKind.Keyword, detail: 'Finaliza una estructura IF', type: 'control' },
    { label: '#ENDIF', kind: CompletionItemKind.Keyword, detail: 'Finaliza una estructura IF', type: 'control' },
    { label: 'FOR', kind: CompletionItemKind.Keyword, detail: 'Bucle FOR', type: 'control' },
    { label: 'TO', kind: CompletionItemKind.Keyword, detail: 'Parte de la estructura FOR', type: 'control' },
    { label: 'STEP', kind: CompletionItemKind.Keyword, detail: 'Incremento en un bucle FOR', type: 'control' },
    { label: 'NEXT', kind: CompletionItemKind.Keyword, detail: 'Finaliza un bucle FOR', type: 'control' },
    { label: 'WHILE', kind: CompletionItemKind.Keyword, detail: 'Bucle WHILE', type: 'control' },
    { label: 'WEND', kind: CompletionItemKind.Keyword, detail: 'Finaliza un bucle WHILE', type: 'control' },
    { label: 'DO', kind: CompletionItemKind.Keyword, detail: 'Inicio de un bucle DO', type: 'control' },
    { label: 'LOOP', kind: CompletionItemKind.Keyword, detail: 'Finaliza un bucle DO', type: 'control' },
    { label: 'EXIT', kind: CompletionItemKind.Keyword, detail: 'Sale de un bucle o subrutina', type: 'control' },
    { label: 'GOTO', kind: CompletionItemKind.Keyword, detail: 'Salta a una línea específica', type: 'control' },
    { label: 'GOSUB', kind: CompletionItemKind.Keyword, detail: 'Llama a una subrutina', type: 'control' },
    { label: 'RETURN', kind: CompletionItemKind.Keyword, detail: 'Regresa de una subrutina', type: 'control' },
    { label: 'ON', kind: CompletionItemKind.Keyword, detail: 'Control de flujo basado en condiciones', type: 'control' },
    { label: 'SUB', kind: CompletionItemKind.Keyword, detail: 'Define un procedimiento', type: 'keyword' },
    { label: 'FUNCTION', kind: CompletionItemKind.Keyword, detail: 'Define una función', type: 'keyword' },
    { label: 'END', kind: CompletionItemKind.Keyword, detail: 'Define una función', type: 'keyword' },
    { label: 'ASM', kind: CompletionItemKind.Keyword, detail: 'Apertura de código ASM', type: 'keyword' },
    { label: 'END ASM', kind: CompletionItemKind.Keyword, detail: 'Clausura de código ASM', type: 'keyword' },
    { label: '#DEFINE', kind: CompletionItemKind.Keyword, detail: 'Define una macro o valor', type: 'keyword' },
    { label: '#INCLUDE', kind: CompletionItemKind.Keyword, detail: 'Incluye un archivo externo', type: 'keyword' },

    // Declaraciones
    { label: 'DIM', kind: CompletionItemKind.Keyword, detail: 'Declara un array', type: 'definition' },
    { label: 'CONST', kind: CompletionItemKind.Keyword, detail: 'Declara una constante', type: 'definition' },
    { label: 'DEF', kind: CompletionItemKind.Keyword, detail: 'Define una función o subrutina', type: 'definition' },
    { label: 'LET', kind: CompletionItemKind.Keyword, detail: 'Asigna un valor a una variable', type: 'definition' },

    // Entrada/Salida
    { label: 'PRINT', kind: CompletionItemKind.Keyword, detail: 'Imprime texto o valores en pantalla', type: 'keyword' },
    { label: 'INPUT', kind: CompletionItemKind.Keyword, detail: 'Solicita entrada del usuario', type: 'keyword' },
    { label: 'CLS', kind: CompletionItemKind.Keyword, detail: 'Limpia la pantalla', type: 'keyword' },
    { label: 'PAUSE', kind: CompletionItemKind.Keyword, detail: 'Pausa la ejecución del programa', type: 'keyword' },

    // Operadores
    { label: 'AND', kind: CompletionItemKind.Keyword, detail: 'Operador lógico AND', type: 'logic' },
    { label: 'OR', kind: CompletionItemKind.Keyword, detail: 'Operador lógico OR', type: 'logic' },
    { label: 'NOT', kind: CompletionItemKind.Keyword, detail: 'Operador lógico NOT', type: 'logic' },
    { label: 'MOD', kind: CompletionItemKind.Keyword, detail: 'Operador de módulo', type: 'logic' },

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
    { label: 'BRIGHT', kind: CompletionItemKind.Keyword, detail: 'Establece el brillo' },
    { label: 'FLASH', kind: CompletionItemKind.Keyword, detail: 'Establece el parpadeo' },
    { label: 'INVERSE', kind: CompletionItemKind.Keyword, detail: 'Establece el inverso' },
    { label: 'OVER', kind: CompletionItemKind.Keyword, detail: 'Establece la sobreescritura' },
    { label: 'BORDER', kind: CompletionItemKind.Keyword, detail: 'Establece el color del borde' },
    { label: 'POKE', kind: CompletionItemKind.Keyword, detail: 'Escribe un valor en una dirección de memoria' },
    { label: 'PEEK', kind: CompletionItemKind.Function, detail: 'Lee un valor de una dirección de memoria' },
    { label: 'OUT', kind: CompletionItemKind.Keyword, detail: 'Envía un valor a un puerto' },
    { label: 'IN', kind: CompletionItemKind.Function, detail: 'Lee un valor de un puerto' },

    // Palabras clave de tipos de datos
    { label: 'BYTE', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato byte', type: 'type' },
    { label: 'UBYTE', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato byte sin signo', type: 'type' },
    { label: 'INTEGER', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato entero', type: 'type' },
    { label: 'UINTEGER', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato entero sin signo', type: 'type' },
    { label: 'LONG', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato entero largo', type: 'type' },
    { label: 'ULONG', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato entero largo sin signo', type: 'type' },
    { label: 'STRING', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato cadena', type: 'type' },
    { label: 'ARRAY', kind: CompletionItemKind.Keyword, detail: 'Tipo de dato array', type: 'type' },

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

    { label: 'UNTIL', kind: CompletionItemKind.Keyword, detail: 'Espera hasta que se cumpla una condición', type: 'control' },
    { label: 'INKEY$', kind: CompletionItemKind.Function, detail: 'Lee una tecla presionada' },

    // Librerías de Boriel Basic
    // Maths
    { label: 'fSin', kind: CompletionItemKind.Function, detail: 'Seno rápido (menos preciso)', type: 'function', parameters: 'angle As Fixed', returnType: 'Fixed' },
    { label: 'fCos', kind: CompletionItemKind.Function, detail: 'Coseno rápido (menos preciso)', type: 'function', parameters: 'angle As Fixed', returnType: 'Fixed' },
    { label: 'fTan', kind: CompletionItemKind.Function, detail: 'Tangente rápida (menos preciso)', type: 'function', parameters: 'angle As Fixed', returnType: 'Fixed' },
    { label: 'fSqrt', kind: CompletionItemKind.Function, detail: 'Raíz cuadrada rápida', type: 'function', parameters: 'value As Fixed', returnType: 'Fixed' },
    { label: 'iSqrt', kind: CompletionItemKind.Function, detail: 'Raíz cuadrada entera', type: 'function', parameters: 'value As UInteger', returnType: 'UInteger' },
    { label: 'distance', kind: CompletionItemKind.Function, detail: 'Calcula la distancia (Pitágoras)', type: 'function', parameters: 'x As Fixed, y As Fixed', returnType: 'Fixed' },

    // Graphics
    { label: 'attrAddress', kind: CompletionItemKind.Function, detail: 'Dirección de atributo para X,Y', type: 'function', parameters: 'x As UByte, y As UByte', returnType: 'UInteger' },
    { label: 'clearBox', kind: CompletionItemKind.Keyword, detail: 'Limpia un área de la pantalla', type: 'function', parameters: 'x As UByte, y As UByte, w As UByte, h As UByte', returnType: 'void' },
    { label: 'csrlin', kind: CompletionItemKind.Function, detail: 'Línea actual del cursor', type: 'function', parameters: '', returnType: 'UByte' },
    { label: 'fastPlot', kind: CompletionItemKind.Keyword, detail: 'Plot rápido sin atributos', type: 'function', parameters: 'x As UInteger, y As UByte', returnType: 'void' },
    { label: 'HRPrint', kind: CompletionItemKind.Keyword, detail: 'Impresión de alta resolución', type: 'function', parameters: 'x As UInteger, y As UByte, text As String', returnType: 'void' },
    { label: 'HRPrintFast', kind: CompletionItemKind.Keyword, detail: 'Impresión de alta resolución rápida', type: 'function', parameters: 'x As UInteger, y As UByte, text As String', returnType: 'void' },
    { label: 'hMirror', kind: CompletionItemKind.Function, detail: 'Espejo horizontal de un byte', type: 'function', parameters: 'value As UByte', returnType: 'UByte' },
    { label: 'pos', kind: CompletionItemKind.Function, detail: 'Posición horizontal del cursor', type: 'function', parameters: '', returnType: 'UByte' },
    { label: 'windowPaint', kind: CompletionItemKind.Keyword, detail: 'Pinta atributos en una ventana', type: 'function', parameters: 'x As UByte, y As UByte, w As UByte, h As UByte, attr As UByte', returnType: 'void' },
    { label: 'putChars', kind: CompletionItemKind.Keyword, detail: 'Pone caracteres gráficos', type: 'function', parameters: 'x As UByte, y As UByte, w As UByte, h As UByte, address As UInteger', returnType: 'void' },
    { label: 'paintData', kind: CompletionItemKind.Keyword, detail: 'Pinta datos gráficos', type: 'function', parameters: 'x As UByte, y As UByte, w As UByte, h As UByte, address As UInteger', returnType: 'void' },
    { label: 'scrAddress', kind: CompletionItemKind.Function, detail: 'Dirección de pantalla para X,Y', type: 'function', parameters: 'x As UByte, y As UByte', returnType: 'UInteger' },
    { label: 'putTile', kind: CompletionItemKind.Keyword, detail: 'Pone un tile 2x2', type: 'function', parameters: 'x As UByte, y As UByte, tileIndex As UByte', returnType: 'void' },
    { label: 'pixelScroll', kind: CompletionItemKind.Keyword, detail: 'Scroll de píxeles', type: 'function', parameters: 'lines As UByte', returnType: 'void' },
    { label: 'windowScrollUP', kind: CompletionItemKind.Keyword, detail: 'Scroll de ventana hacia arriba', type: 'function', parameters: 'x As UByte, y As UByte, w As UByte, h As UByte', returnType: 'void' },
    { label: 'windowAttrScrollUP', kind: CompletionItemKind.Keyword, detail: 'Scroll de atributos de ventana hacia arriba', type: 'function', parameters: 'x As UByte, y As UByte, w As UByte, h As UByte', returnType: 'void' },

    // Text Handling
    { label: 'asc', kind: CompletionItemKind.Function, detail: 'Código ASCII (compatible FreeBasic)', type: 'function', parameters: 'char As String', returnType: 'UByte' },
    { label: 'doubleSizePrint', kind: CompletionItemKind.Keyword, detail: 'Impresión de doble tamaño', type: 'function', parameters: 'text As String', returnType: 'void' },
    { label: 'propPrint', kind: CompletionItemKind.Keyword, detail: 'Impresión proporcional', type: 'function', parameters: 'text As String', returnType: 'void' },
    { label: 'print42', kind: CompletionItemKind.Keyword, detail: 'Impresión de 42 columnas', type: 'function', parameters: 'text As String', returnType: 'void' },
    { label: 'print64', kind: CompletionItemKind.Keyword, detail: 'Impresión de 64 columnas', type: 'function', parameters: 'text As String', returnType: 'void' },
    { label: 'Print64x32', kind: CompletionItemKind.Keyword, detail: 'Impresión de 64x32 caracteres', type: 'function', parameters: 'text As String', returnType: 'void' },

    // Memory Banking
    { label: 'SetBank', kind: CompletionItemKind.Keyword, detail: 'Establece el banco de memoria en $C000', type: 'function', parameters: 'bank As UByte', returnType: 'void' },
    { label: 'GetBank', kind: CompletionItemKind.Function, detail: 'Obtiene el banco actual en $C000', type: 'function', parameters: '', returnType: 'UByte' },
    { label: 'SetCodeBank', kind: CompletionItemKind.Keyword, detail: 'Copia banco a $8000', type: 'function', parameters: 'bank As UByte', returnType: 'void' },

    // Compression
    { label: 'megaLZDepack', kind: CompletionItemKind.Keyword, detail: 'Descompresión MegaLZ', type: 'function', parameters: 'source As UInteger, dest As UInteger', returnType: 'void' },
    { label: 'zx0', kind: CompletionItemKind.Keyword, detail: 'Descompresión ZX0', type: 'function', parameters: 'source As UInteger, dest As UInteger', returnType: 'void' },

    // Keys
    { label: 'GetKey', kind: CompletionItemKind.Function, detail: 'Obtiene la tecla pulsada', type: 'function', parameters: '', returnType: 'String' },
    { label: 'GetKeyScanCode', kind: CompletionItemKind.Function, detail: 'Obtiene el scancode de la tecla', type: 'function', parameters: '', returnType: 'UByte' },
    { label: 'MultiKeys', kind: CompletionItemKind.Function, detail: 'Detecta múltiples teclas', type: 'function', parameters: 'key1 As UByte, key2 As UByte', returnType: 'UByte' },

    // Other / User Requested
    { label: 'MemCopy', kind: CompletionItemKind.Keyword, detail: 'Copia bloque de memoria', type: 'function', parameters: 'source As UInteger, dest As UInteger, length As UInteger', returnType: 'void' },
];

// Import library function definitions and add them to keywords
const libraryDefinitions = require('./functionsDefinitions');
libraryDefinitions.forEach(def => {
    borielBasicKeywords.push({
        label: def.name,
        kind: CompletionItemKind.Function,
        detail: def.doc ? def.doc.split('\n')[1] || 'Library function' : 'Library function',
        type: 'function',
        parameters: def.parameters || '',
        returnType: def.returnType || 'void'
    });
});

module.exports = {
    borielBasicKeywords
};