const model = require('../Interpreter/ProcessedData/model.json');
const storage = require('./AxFileManager/main');

function generateTrinomials(text) {
    const words = text.trim().split(/\s+/);

    const trinomials = [];
    for (let i = 0; i < words.length - 2; i++) {
        trinomials.push([words[i], words[i + 1], words[i + 2]]);
    }

    return trinomials;
}

let total_params = 0;
for (const data of model) {
    const answer = generateTrinomials(data.answer);
    total_params = total_params + Object.keys(answer).length;
    const tags = data.tags;

    let chainsstarter = data.answer.split(' ')[0];
    if (data.answer.split(' ')[1]) chainsstarter = chainsstarter + ' ' + data.answer.split(' ')[1];
    
    const objectClass = {
        tags: tags,
        chains: answer,
        starter: chainsstarter
    };

    storage.addInMemory(objectClass, tags);
};


process.on('SIGINT', () => {
    require('./AxFileManager/main').secureSave();
    process.exit();
});