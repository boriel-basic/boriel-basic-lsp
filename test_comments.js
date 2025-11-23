const { stripComments } = require('./analyzer');

const testCases = [
    { input: 'PRINT "Hello"', expected: 'PRINT "Hello"' },
    { input: 'PRINT "Hello" \' Comment', expected: 'PRINT "Hello" ' },
    { input: 'REM Comment', expected: '' },
    { input: '   REM Comment', expected: '   ' },
    { input: 'PRINT "Don\'t stop"', expected: 'PRINT "Don\'t stop"' },
    { input: 'PRINT "Str" : REM Comment', expected: 'PRINT "Str" : ' },
    { input: 'dim a as string = "REM inside string"', expected: 'dim a as string = "REM inside string"' },
    { input: 'print "string" : print "another" \' comment', expected: 'print "string" : print "another" ' },
    { input: 'print "string with \' quote"', expected: 'print "string with \' quote"' },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    const result = stripComments(test.input);
    if (result === test.expected) {
        console.log(`[PASS] Test ${index + 1}: "${test.input}" -> "${result}"`);
        passed++;
    } else {
        console.log(`[FAIL] Test ${index + 1}: "${test.input}"`);
        console.log(`  Expected: "${test.expected}"`);
        console.log(`  Actual:   "${result}"`);
        failed++;
    }
});

console.log(`\nTotal: ${testCases.length}, Passed: ${passed}, Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
}
