const https = require('https');
const url = `https://drive.google.com/uc?export=download&id=1_-oAMgrbEbztdWkSZ9IVQ0TWEgyvbYE2&confirm=t&uuid=f272ca01-2db0-419a-9c09-9377a21ede27`;

https.get(url, (res) => {
    console.log("Status:", res.statusCode);
    console.log("Headers:", res.headers);
    if (res.statusCode === 302 || res.statusCode === 303) {
        console.log("Redirect Location:", res.headers.location);
    }
});
