const fs = require('fs');

let _cache = {
    current_file: undefined,
    file_content: []
};

let pointer = require('./storage/partitions.pointer.json');

const total_files = fs.readdirSync('./AxFileManager/storage/partitions').filter(filename => filename.endsWith('.json')).length;
if (total_files === 0) {
    _cache.current_file = 1;
    fs.writeFileSync('./AxFileManager/storage/partitions/1.json', JSON.stringify([]), { encoding: 'utf-8' });
} else {
    const file_size = fs.statSync(`./AxFileManager/storage/partitions/${total_files}.json`).size / 1024;
    _cache.current_file = total_files;
    if (file_size > 100) {
        _cache.current_file++;
        fs.writeFileSync(`./AxFileManager/storage/partitions/${_cache.current_file}.json`, JSON.stringify([]), { encoding: 'utf-8' });
    } else {
        _cache.file_content = require(`./AxFileManager/storage/partitions/${_cache.current_file}.json`);
    }
}

function formatRanges(arr) {
    let result = [];
    let start = arr[0];

    for (let i = 1; i <= arr.length; i++) {
        if (arr[i] !== arr[i - 1] + 1) {
            if (start === arr[i - 1]) {
                result.push(`${start}`);
            } else {
                result.push(`${start}-${arr[i - 1]}`);
            }
            start = arr[i];
        }
    }

    return result.join(",");
}

function revertRanges(rangeString) {
    let result = [];
    const ranges = rangeString.split(",");

    ranges.forEach(range => {
        if (range.includes("-")) {
            const [start, end] = range.split("-").map(Number);
            for (let i = start; i <= end; i++) {
                result.push(i);
            }
        } else {
            result.push(Number(range));
        }
    });

    return result;
};

exports.addInMemory = (object, tags) => {
    //sum total params here

    object['ID'] = _cache.file_content.length + 1;
    for (const tag of tags) {
        if (pointer[tag.tag]) {
            if (pointer[tag.tag][_cache.current_file]) {
                let convertIntoArray = revertRanges(pointer[tag.tag][_cache.current_file]);
                if (!convertIntoArray.includes(object.ID)) {
                    convertIntoArray.push(object.ID);
                    const convertIntoString = formatRanges(convertIntoArray);
                    pointer[tag.tag][_cache.current_file] = convertIntoString;
                };
            } else {
                pointer[tag.tag][_cache.current_file] = `${object.ID}`;
            }
        } else {
            pointer[tag.tag] = {};
            pointer[tag.tag][_cache.current_file] = `${object.ID}`;
        }
    }

    _cache.file_content.push(object);
    const new_size = (Buffer.byteLength(JSON.stringify(_cache.file_content), 'utf8')) / 1024;
    if (new_size > 100) {
        fs.writeFileSync(`./AxFileManager/storage/partitions.pointer.json`, JSON.stringify(pointer), { encoding: 'utf-8' });
        fs.writeFileSync(`./AxFileManager/storage/partitions/${_cache.current_file}.json`, JSON.stringify(_cache.file_content), { encoding: 'utf-8' });
        _cache.current_file++;
        _cache.file_content = [];
    }
}

exports.getObjectByTags = async (tags) => {
    let files = {};
    await Promise.all(tags.map(async (tag) => {
        await Promise.all(Object.keys(pointer[tag]).map(async (ID) => {
            files[ID] = revertRanges(pointer[tag][ID]);
        })
    )}));

    let callback = [];
    await Promise.all(Object.keys(files).map(async (file) => {
        await new Promise(async (resolve) => {
            const getFile = JSON.parse(await fs.promises.readFile(`./AxFileManager/storage/partitions/${file}.json`, 'utf-8'));
            const filteredObjects = getFile.filter(obj => files[file].includes(obj.ID));
            const cleanedObjects = filteredObjects.map(({ ID, ...rest }) => rest);
            callback = callback.concat(cleanedObjects);
            resolve();
        });
    }));

    return callback;
}

exports.secureSave = () => {
    fs.writeFileSync(`./AxFileManager/storage/partitions.pointer.json`, JSON.stringify(pointer), { encoding: 'utf-8' });
    fs.writeFileSync(`./AxFileManager/storage/partitions/${_cache.current_file}.json`, JSON.stringify(_cache.file_content), { encoding: 'utf-8' });
}