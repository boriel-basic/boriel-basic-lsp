const { formatBorielBasicCode } = require('./formatter');
const { TextDocument } = require('vscode-languageserver-textdocument');

/**
 * Helper para crear un documento de prueba
 */
function createTestDocument(content) {
    return TextDocument.create('file:///test.bas', 'borielbasic', 1, content);
}

/**
 * Helper para aplicar los edits y obtener el resultado
 */
function applyEdits(document, edits) {
    let text = document.getText();
    const lines = text.split(/\r?\n/);

    // Aplicar edits en orden inverso para no afectar las posiciones
    edits.sort((a, b) => {
        if (a.range.start.line !== b.range.start.line) {
            return b.range.start.line - a.range.start.line;
        }
        return b.range.start.character - a.range.start.character;
    });

    edits.forEach(edit => {
        const startLine = edit.range.start.line;
        const endLine = edit.range.end.line;
        lines[startLine] = edit.newText;
    });

    return lines.join('\n');
}

/**
 * Test para IF...THEN sin comentarios
 */
function testIfThenWithoutComment() {
    const input = `If Peek(23312) = 1 Then
musicBank = 3
End If`;

    const expected = `If Peek(23312) = 1 Then
    musicBank = 3
End If`;

    const doc = createTestDocument(input);
    const edits = formatBorielBasicCode(doc);
    const result = applyEdits(doc, edits);

    console.log('\n=== TEST: IF THEN sin comentario ===');
    console.log('Input:');
    console.log(input);
    console.log('\nExpected:');
    console.log(expected);
    console.log('\nResult:');
    console.log(result);
    console.log('\nPassed:', result === expected ? '✓' : '✗');

    return result === expected;
}

/**
 * Test para IF...THEN con comentario
 */
function testIfThenWithComment() {
    const input = `If Peek(23312) = 1 Then ' Amstrad
musicBank = 3
End If`;

    const expected = `If Peek(23312) = 1 Then ' Amstrad
    musicBank = 3
End If`;

    const doc = createTestDocument(input);
    const edits = formatBorielBasicCode(doc);
    const result = applyEdits(doc, edits);

    console.log('\n=== TEST: IF THEN con comentario ===');
    console.log('Input:');
    console.log(input);
    console.log('\nExpected:');
    console.log(expected);
    console.log('\nResult:');
    console.log(result);
    console.log('\nPassed:', result === expected ? '✓' : '✗');

    return result === expected;
}

/**
 * Test para IF...THEN de una sola línea (no debe indentar)
 */
function testIfThenSingleLine() {
    const input = `If Peek(23312) = 1 Then musicBank = 3
Print "done"`;

    const expected = `If Peek(23312) = 1 Then musicBank = 3
Print "done"`;

    const doc = createTestDocument(input);
    const edits = formatBorielBasicCode(doc);
    const result = applyEdits(doc, edits);

    console.log('\n=== TEST: IF THEN de una sola línea ===');
    console.log('Input:');
    console.log(input);
    console.log('\nExpected:');
    console.log(expected);
    console.log('\nResult:');
    console.log(result);
    console.log('\nPassed:', result === expected ? '✓' : '✗');

    return result === expected;
}

/**
 * Test para FOR...NEXT
 */
function testForNext() {
    const input = `For i = 1 To 10
Print i
Next i`;

    const expected = `For i = 1 To 10
    Print i
Next i`;

    const doc = createTestDocument(input);
    const edits = formatBorielBasicCode(doc);
    const result = applyEdits(doc, edits);

    console.log('\n=== TEST: FOR NEXT ===');
    console.log('Input:');
    console.log(input);
    console.log('\nExpected:');
    console.log(expected);
    console.log('\nResult:');
    console.log(result);
    console.log('\nPassed:', result === expected ? '✓' : '✗');

    return result === expected;
}

/**
 * Test para WHILE...WEND
 */
function testWhileWend() {
    const input = `While x < 10
x = x + 1
Wend`;

    const expected = `While x < 10
    x = x + 1
Wend`;

    const doc = createTestDocument(input);
    const edits = formatBorielBasicCode(doc);
    const result = applyEdits(doc, edits);

    console.log('\n=== TEST: WHILE WEND ===');
    console.log('Input:');
    console.log(input);
    console.log('\nExpected:');
    console.log(expected);
    console.log('\nResult:');
    console.log(result);
    console.log('\nPassed:', result === expected ? '✓' : '✗');

    return result === expected;
}

/**
 * Test para DO...LOOP
 */
function testDoLoop() {
    const input = `Do
x = x + 1
Loop While x < 10`;

    const expected = `Do
    x = x + 1
Loop While x < 10`;

    const doc = createTestDocument(input);
    const edits = formatBorielBasicCode(doc);
    const result = applyEdits(doc, edits);

    console.log('\n=== TEST: DO LOOP ===');
    console.log('Input:');
    console.log(input);
    console.log('\nExpected:');
    console.log(expected);
    console.log('\nResult:');
    console.log(result);
    console.log('\nPassed:', result === expected ? '✓' : '✗');

    return result === expected;
}

/**
 * Test para SUB...END SUB
 */
function testSubEndSub() {
    const input = `Sub MyFunction()
Print "Hello"
End Sub`;

    const expected = `Sub MyFunction()
    Print "Hello"
End Sub`;

    const doc = createTestDocument(input);
    const edits = formatBorielBasicCode(doc);
    const result = applyEdits(doc, edits);

    console.log('\n=== TEST: SUB END SUB ===');
    console.log('Input:');
    console.log(input);
    console.log('\nExpected:');
    console.log(expected);
    console.log('\nResult:');
    console.log(result);
    console.log('\nPassed:', result === expected ? '✓' : '✗');

    return result === expected;
}

/**
 * Test para IF...ELSE...END IF
 */
function testIfElseEndIf() {
    const input = `If x = 1 Then
y = 2
Else
y = 3
End If`;

    const expected = `If x = 1 Then
    y = 2
Else
    y = 3
End If`;

    const doc = createTestDocument(input);
    const edits = formatBorielBasicCode(doc);
    const result = applyEdits(doc, edits);

    console.log('\n=== TEST: IF ELSE END IF ===');
    console.log('Input:');
    console.log(input);
    console.log('\nExpected:');
    console.log(expected);
    console.log('\nResult:');
    console.log(result);
    console.log('\nPassed:', result === expected ? '✓' : '✗');

    return result === expected;
}

/**
 * Test para indentación anidada
 */
function testNestedIndentation() {
    const input = `If x = 1 Then
For i = 1 To 10
Print i
Next i
End If`;

    const expected = `If x = 1 Then
    For i = 1 To 10
        Print i
    Next i
End If`;

    const doc = createTestDocument(input);
    const edits = formatBorielBasicCode(doc);
    const result = applyEdits(doc, edits);

    console.log('\n=== TEST: Indentación anidada ===');
    console.log('Input:');
    console.log(input);
    console.log('\nExpected:');
    console.log(expected);
    console.log('\nResult:');
    console.log(result);
    console.log('\nPassed:', result === expected ? '✓' : '✗');

    return result === expected;
}

// Ejecutar todos los tests
function runAllTests() {
    console.log('========================================');
    console.log('   TESTS DE INDENTACIÓN DE FORMATTER   ');
    console.log('========================================');

    const tests = [
        { name: 'IF THEN sin comentario', fn: testIfThenWithoutComment },
        { name: 'IF THEN con comentario', fn: testIfThenWithComment },
        { name: 'IF THEN de una sola línea', fn: testIfThenSingleLine },
        { name: 'FOR NEXT', fn: testForNext },
        { name: 'WHILE WEND', fn: testWhileWend },
        { name: 'DO LOOP', fn: testDoLoop },
        { name: 'SUB END SUB', fn: testSubEndSub },
        { name: 'IF ELSE END IF', fn: testIfElseEndIf },
        { name: 'Indentación anidada', fn: testNestedIndentation }
    ];

    const results = tests.map(test => ({
        name: test.name,
        passed: test.fn()
    }));

    console.log('\n========================================');
    console.log('            RESUMEN DE TESTS            ');
    console.log('========================================');
    results.forEach(result => {
        console.log(`${result.passed ? '✓' : '✗'} ${result.name}`);
    });

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`\nTotal: ${passedCount}/${totalCount} tests pasados`);

    if (passedCount === totalCount) {
        console.log('\n🎉 ¡Todos los tests pasaron!');
    } else {
        console.log('\n❌ Algunos tests fallaron');
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runAllTests,
    testIfThenWithoutComment,
    testIfThenWithComment,
    testIfThenSingleLine,
    testForNext,
    testWhileWend,
    testDoLoop,
    testSubEndSub,
    testIfElseEndIf,
    testNestedIndentation
};
