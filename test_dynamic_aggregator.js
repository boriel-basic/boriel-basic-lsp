const definitions = require('./functionsDefinitions');
console.log('Total definitions:', definitions.length);
definitions.forEach(d => console.log('-', d.name));
