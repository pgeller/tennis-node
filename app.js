const express = require('express');
const smileDB = require('./smileDB');
const app = express();

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', '*');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.listen("3005", () => {
    console.log("Server started on Port 3005");
});

const normalize = (n) => {
    return n > 9 ? "" + n : "0" + n;
}

const formatTime = time => {
    const hours = Math.floor(time/100);
    const minutes = time % 100;
    return `${hours}:${normalize(minutes)}`
}

//time as an Integer (ex.: 1900 or 1830)
//date as 20210629
const creatTimeQuery = (dateString, time) => {
    const sql = `select b.Eintrag, b.Kundennummer AS kId, b.Typus AS type, t.Kuerzel AS Trainer, b.Start, b.Ende, s.Bezeichnung AS Platz, s.idReiter AS area, s.Spalte AS court  
        from terminspalten s 
        join belegungen b on s.idReiter=b.Bereich AND s.Spalte = b.Platz 
        left join kundentrainer t on t.ID = b.Trainer
        where ( s.idReiter = 6 OR s.idReiter = 7 OR s.idReiter = 12 ) 
        AND b.Datum=${dateString} 
        AND ((b.Ende>${time} AND b.Start<${time+100}) OR (b.Ende='0000' AND b.Start<${time+100}))`;
    return sql;
}
const getAllTennisPlaces = async () =>{
    const sql = `select s.Bezeichnung, s.idReiter AS area, s.Spalte AS court  from terminspalten s 
        WHERE (s.idReiter = 6 OR s.idReiter = 12 OR s.idReiter = 7)`;
    const list = await smileDB.awaitQuery(sql);
    return list.map(entry => {
        return {
            entry: "",
            coach: "",
            place: entry.Bezeichnung,
            start: "",
            end: "",
            area: entry.area,
            court: entry.court
        }
    });
    
}

const returnEmpty = string => {
    return (string == null) ? "" : string ;
};


const formatEntry = entry => {


    if(entry.kId > 0){
        if(entry.firstname != null && entry.secondname != null){
            return `${entry.firstname} ${entry.secondname.charAt(0)}.`
        } else {
            if(entry.firstname == null){
                return returnEmpty(entry.secondname);
            } else {
                return returnEmpty(entry.firstname);
            }
        }
    }else{
        return (entry.kId < 0 && entry.type != 2) ? "Belegt bzw. Gesperrt." : (returnEmpty(entry.Eintrag))
    }
}

const formatResult = result => result.map(entry => {
    return {
        entry: formatEntry(entry),
        coach: returnEmpty(entry.Trainer),
        place: returnEmpty(entry.Platz),
        start: returnEmpty(formatTime(entry.Start)),
        end: returnEmpty(formatTime(entry.Ende)),
        area: returnEmpty(entry.area),
        court: returnEmpty(entry.court)
    }
})

const addEmptyPlaces = (array, places) => places.reduce((accumulator, currentValue, currentIndex, farray) => {
    const filtered = array.filter(elem => {
        return elem.place == currentValue.place;
    });
    const addedEntries = filtered.length == 0 ? currentValue : filtered;
    return accumulator.concat(addedEntries);
},[]);

//Wenn ein neuer Reiter bzw eine neue Spalte in Smile hinzugefügt wird,
//muss hier eine entsprechende Änderung vorgenommen werden
//Namensänderungen verursachen hingegen kein Fehlverhalten
const groupedByArea = table => table.reduce((accumulator, currentValue, currentIndex, farray) => {
    switch ((`${currentValue.area}${currentValue.court}`)){
        case '61':
            accumulator.fixhalle.push(currentValue);
            break;
        case '62':
            accumulator.fixhalle.push(currentValue);
            break;
        case '63':
            accumulator.fixhalle.push(currentValue);
            break;
        case '71':
            accumulator.sand.push(currentValue);
            break;
        case '121':
            accumulator.vip.push(currentValue);
            break;
        case '122':
            accumulator.vip.push(currentValue);
            break;
        case '123':
            accumulator.redcourt.push(currentValue);
            break;
        case '124':
            accumulator.redcourt.push(currentValue);
            break;
        case '125':
            accumulator.redcourt.push(currentValue);
            break;
        case '126':
            accumulator.redcourt.push(currentValue);
            break;
        case '127':
            accumulator.sand.push(currentValue);
            break;
        case '128':
            accumulator.sand.push(currentValue);
            break;
        case '129':
            accumulator.sand.push(currentValue);
            break;
        case '1210':
            accumulator.sand.push(currentValue);
            break;
        case '64':
            accumulator.traglufthalle.push(currentValue);
               break;
        case '65':
            accumulator.traglufthalle.push(currentValue);
            break;
        case '66':
            accumulator.traglufthalle.push(currentValue);
            break;
        default:
            console.log(`${currentValue.area}${currentValue.court}/${currentValue.place} muss eingetragen werden`);
            break;
    }
    return accumulator;
},{
    vip:[],
    redcourt: [],
    fixhalle: [],
    sand: [],
    traglufthalle: []
})

app.get('/', async (req, res) => {
    try{
        const today = new Date(Date.now());
        const dateString = `${today.getFullYear()}${normalize(today.getMonth() + 1)}${normalize(today.getDate())}`;
        const timeNow = today.getHours()*100;
        const sqlFirst = creatTimeQuery(dateString, timeNow);
        const sqlSecond = creatTimeQuery(dateString, timeNow + 100);
        const resultFirst = await smileDB.awaitQuery(sqlFirst);
        const resultSecond = await smileDB.awaitQuery(sqlSecond);
        const allTennisPlaces = await getAllTennisPlaces();
        const first = formatResult(resultFirst);
        const second = formatResult(resultSecond); 
        const firstPlus = addEmptyPlaces(first, allTennisPlaces);
        const secondPlus = addEmptyPlaces(second, allTennisPlaces);
        const groupedFirstTable = groupedByArea(firstPlus);
        const groupedSecondTable = groupedByArea(secondPlus);
        
        res.status(200).json({
            status: "success",
            first: groupedFirstTable,
            second: groupedSecondTable
        });

    }catch(err){
        res.status(500).json({
            status: "error"
        });
    }
})