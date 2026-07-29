const https = require('https');
const url = `https://drive.usercontent.google.com/download?id=1_-oAMgrbEbztdWkSZ9IVQ0TWEgyvbYE2&export=download`;

https.get(url, (res) => {
    console.log("Status:", res.statusCode);
    console.log("Headers:", res.headers);
    if (res.statusCode === 302 || res.statusCode === 303) {
        console.log("Redirect Location:", res.headers.location);
    }
});
