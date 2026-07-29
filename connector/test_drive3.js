const https = require('https');
const url = `https://drive.usercontent.google.com/download?id=1_-oAMgrbEbztdWkSZ9IVQ0TWEgyvbYE2&export=download`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
});
