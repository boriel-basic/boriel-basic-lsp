/**
 * Tests para analyzer.js — definiciones y referencias
 *
 * Ejecutar con: node analyzer.test.js
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

// analyzer.js usa process.argv[2] como projectPath al cargarse.
// Lo establecemos antes del require para evitar el warning del .gitignore.
if (!process.argv[2]) {
    process.argv[2] = os.tmpdir();
}

const {
    analyzeFileForDefinitions,
    analyzeFileForReferences,
    globalDefinitions,
    globalReferences,
} = require('../analyzer');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createTempFile(content) {
    const tmpFile = path.join(os.tmpdir(), `analyzer_test_${Date.now()}_${Math.random().toString(36).slice(2)}.bas`);
    fs.writeFileSync(tmpFile, content, 'utf8');
    return tmpFile;
}

function removeTempFile(filePath) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/** Normaliza una ruta de archivo a URI file:/// */
function fileUri(filePath) {
    return 'file:///' + filePath.replace(/\\/g, '/').replace(/^\//, '');
}

/** Resetea solo los mapas de usuario (respeta builtins en globalDefinitions). */
function resetUserState() {
    // Eliminar definiciones de usuario (no builtins cuya uri empieza por 'builtin://')
    globalDefinitions.forEach((value, key) => {
        if (!value.uri.startsWith('builtin://')) {
            globalDefinitions.delete(key);
        }
    });
    globalReferences.clear();
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ ${message}`);
        failed++;
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

/**
 * TEST 1: Las referencias no se duplican al analizar el mismo archivo varias veces
 * (simula guardar el archivo 3 veces seguidas).
 */
function testNoDuplicateReferences() {
    console.log('\n=== TEST 1: Sin duplicados al re-analizar el mismo fichero ===');
    resetUserState();

    const content = [
        'Sub MyFunc(x As Integer)',
        '    Print x',
        'End Sub',
        '',
        'Sub Caller()',
        '    MyFunc(1)',
        '    MyFunc(2)',
        'End Sub',
    ].join('\n');

    const tmpFile = createTempFile(content);
    const uri = fileUri(tmpFile);

    try {
        // Primera pasada (carga inicial)
        analyzeFileForDefinitions(tmpFile, uri);
        analyzeFileForReferences(tmpFile, uri);
        const refsAfter1 = (globalReferences.get('MyFunc') || []).filter(r => r.uri === uri).length;

        // Segunda pasada (guardar una vez)
        analyzeFileForDefinitions(tmpFile, uri);
        analyzeFileForReferences(tmpFile, uri);
        const refsAfter2 = (globalReferences.get('MyFunc') || []).filter(r => r.uri === uri).length;

        // Tercera pasada (guardar otra vez)
        analyzeFileForDefinitions(tmpFile, uri);
        analyzeFileForReferences(tmpFile, uri);
        const refsAfter3 = (globalReferences.get('MyFunc') || []).filter(r => r.uri === uri).length;

        console.log(`  Referencias tras 1ª pasada: ${refsAfter1}`);
        console.log(`  Referencias tras 2ª pasada: ${refsAfter2}`);
        console.log(`  Referencias tras 3ª pasada: ${refsAfter3}`);

        assert(refsAfter1 === 2, `1ª pasada → 2 referencias (encontradas: ${refsAfter1})`);
        assert(refsAfter1 === refsAfter2, `2ª pasada no duplica (${refsAfter2} === ${refsAfter1})`);
        assert(refsAfter1 === refsAfter3, `3ª pasada no duplica (${refsAfter3} === ${refsAfter1})`);
    } finally {
        removeTempFile(tmpFile);
    }
}

/**
 * TEST 2: La línea de definición (Sub/Function) no aparece como referencia.
 */
function testDefinitionLineNotInReferences() {
    console.log('\n=== TEST 2: La línea de definición no es una referencia ===');
    resetUserState();

    const content = [
        'Sub MyFunc(x As Integer)',   // línea 0 — definición, NO debe ser referencia
        '    Print x',
        'End Sub',
        '',
        'Sub Caller()',
        '    MyFunc(42)',              // línea 5 — única referencia real
        'End Sub',
    ].join('\n');

    const tmpFile = createTempFile(content);
    const uri = fileUri(tmpFile);

    try {
        analyzeFileForDefinitions(tmpFile, uri);
        analyzeFileForReferences(tmpFile, uri);

        const refs = (globalReferences.get('MyFunc') || []).filter(r => r.uri === uri);
        const hasDefinitionLine = refs.some(r => r.range.start.line === 0);

        console.log(`  Referencias encontradas: ${refs.length}`);
        console.log(`  Líneas referenciadas: ${refs.map(r => r.range.start.line).join(', ')}`);

        assert(!hasDefinitionLine, 'La línea 0 (definición) NO aparece como referencia');
        assert(refs.length === 1, `Exactamente 1 referencia (encontradas: ${refs.length})`);
        assert(refs[0]?.range.start.line === 5, `Referencia en línea 5 (encontrada en: ${refs[0]?.range.start.line})`);
    } finally {
        removeTempFile(tmpFile);
    }
}

/**
 * TEST 3: Conteo correcto de referencias con múltiples llamadas.
 */
function testCorrectReferenceCount() {
    console.log('\n=== TEST 3: Conteo correcto de referencias ===');
    resetUserState();

    const content = [
        'Sub MyFunc(x As Integer)',
        '    Print x',
        'End Sub',
        '',
        'Sub Caller()',
        '    MyFunc(1)',
        '    MyFunc(2)',
        '    MyFunc(3)',
        'End Sub',
    ].join('\n');

    const tmpFile = createTempFile(content);
    const uri = fileUri(tmpFile);

    try {
        analyzeFileForDefinitions(tmpFile, uri);
        analyzeFileForReferences(tmpFile, uri);

        const refs = (globalReferences.get('MyFunc') || []).filter(r => r.uri === uri);

        console.log(`  Referencias encontradas: ${refs.length}`);
        assert(refs.length === 3, `Exactamente 3 referencias (encontradas: ${refs.length})`);
    } finally {
        removeTempFile(tmpFile);
    }
}

/**
 * TEST 4: Los rangos de referencia apuntan al identificador exacto, no a la línea entera.
 */
function testReferenceRangeIsExact() {
    console.log('\n=== TEST 4: El rango de la referencia apunta al identificador exacto ===');
    resetUserState();

    const content = [
        'Sub MyFunc(x As Integer)',
        '    Print x',
        'End Sub',
        '',
        'Sub Caller()',
        '    MyFunc(99)',       // línea 5: "    MyFunc(99)" → MyFunc empieza en char 4
        'End Sub',
    ].join('\n');

    const tmpFile = createTempFile(content);
    const uri = fileUri(tmpFile);

    try {
        analyzeFileForDefinitions(tmpFile, uri);
        analyzeFileForReferences(tmpFile, uri);

        const refs = (globalReferences.get('MyFunc') || []).filter(r => r.uri === uri);
        const ref = refs[0];

        console.log(`  Rango: línea ${ref?.range.start.line}, chars ${ref?.range.start.character}–${ref?.range.end.character}`);

        assert(ref !== undefined, 'Referencia encontrada');
        assert(ref?.range.start.character === 4, `startChar === 4 (encontrado: ${ref?.range.start.character})`);
        assert(ref?.range.end.character === 10, `endChar === 10 (longitud "MyFunc" = 6, 4+6=10) (encontrado: ${ref?.range.end.character})`);
    } finally {
        removeTempFile(tmpFile);
    }
}

/**
 * TEST 5: Las definiciones antiguas de un fichero se eliminan al re-analizar
 * (evita que una función renombrada quede con dos entradas).
 */
function testNoStaleDefinitions() {
    console.log('\n=== TEST 5: Definiciones obsoletas eliminadas al re-analizar ===');
    resetUserState();

    const tmpFile = createTempFile('Sub OldName()\nEnd Sub\n');
    const uri = fileUri(tmpFile);

    try {
        analyzeFileForDefinitions(tmpFile, uri);
        assert(globalDefinitions.has('OldName'), 'OldName definida tras primer análisis');

        // Simular renombrado: reescribir el fichero con un nombre nuevo
        fs.writeFileSync(tmpFile, 'Sub NewName()\nEnd Sub\n', 'utf8');
        analyzeFileForDefinitions(tmpFile, uri);

        assert(!globalDefinitions.has('OldName'), 'OldName eliminada tras re-análisis');
        assert(globalDefinitions.has('NewName'), 'NewName presente tras re-análisis');
    } finally {
        removeTempFile(tmpFile);
    }
}

// ─── Ejecución ────────────────────────────────────────────────────────────────

[
    testNoDuplicateReferences,
    testDefinitionLineNotInReferences,
    testCorrectReferenceCount,
    testReferenceRangeIsExact,
    testNoStaleDefinitions,
].forEach(test => test());

console.log(`\n${'='.repeat(50)}`);
console.log(`RESULTADOS: ${passed} pasados, ${failed} fallados`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
