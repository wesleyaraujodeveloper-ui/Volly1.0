const https = require('https');
const fileId = '1_-oAMgrbEbztdWkSZ9IVQ0TWEgyvbYE2';
const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

https.get(url, (res) => {
    console.log("Status:", res.statusCode);
    console.log("Headers:", res.headers);
    if (res.statusCode === 302 || res.statusCode === 303) {
        console.log("Redirect Location:", res.headers.location);
    }
});
