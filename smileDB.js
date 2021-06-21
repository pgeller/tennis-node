const mysql = require("mysql-await");

//create connection
const smileDB = mysql.createConnection({
    host: "192.168.2.224",
    user: "root",
    password: "",
    database: "smile",
});

//connect
smileDB.on(`error`, (err) => {
    console.error(`Connection error ${err.code}`);
});

module.exports = smileDB;
