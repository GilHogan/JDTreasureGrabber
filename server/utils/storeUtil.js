const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

function getUserData() {
    const dataPath = path.join(app.getPath('userData'), 'data.json');
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(
            dataPath,
            JSON.stringify({}),
            { encoding: "utf-8" }
        );
    }
    return JSON.parse(fs.readFileSync(dataPath, { encoding: "utf-8" }));
}

function setUserData(params) {
    const dataPath = path.join(app.getPath('userData'), 'data.json');
    fs.writeFileSync(
        dataPath,
        JSON.stringify(params),
        { encoding: "utf-8" }
    );
}

function setUserDataStr(strParams) {
    const dataPath = path.join(app.getPath('userData'), 'data.json');
    fs.writeFileSync(
        dataPath,
        strParams,
        { encoding: "utf-8" }
    );
}

function getUserDataProperty(key) {
    return getUserData()[key];
}

function setUserDataProperty(key, value) {
    const userData = getUserData();
    userData[key] = value;
    setUserData(userData);
}

function setUserDataJsonProperty(key, json) {
    let obj;
    try {
        obj = JSON.parse(json);
    } catch (err) {
        // Invalid JSON
    }
    if (obj) {
        const userData = getUserData();
        userData[key] = obj;
        setUserData(userData);
    }
}

module.exports = { getUserData, setUserData, setUserDataStr, getUserDataProperty, setUserDataProperty, setUserDataJsonProperty };
