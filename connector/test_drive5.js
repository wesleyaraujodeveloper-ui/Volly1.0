const https = require('https');
const url = `https://drive.usercontent.google.com/download?id=1_-oAMgrbEbztdWkSZ9IVQ0TWEgyvbYE2&export=download&confirm=t&uuid=f272ca01-2db0-419a-9c09-9377a21ede27`;

const options = {
    headers: {
        'Cookie': 'NID=533=bT-8-nGukm836yEh0k6fIPna7V_1ylk2jwwLN-Tv3rmrblLNTw2VTHzgsnuXv8GzZwam8YsZRD4O10-LFLVRT8e3TmOqdRlF0-G3F-tF6vEuKOCkecz4brtTnLv7QgEYtBGS4dB4lYHFOZsVjBVPxn-y8HyZECoASSk5kNUikutn2JHbT7KzYiFjEVzBwQr13sBO2fgDWUpLm-_-WN1KggX2ZObk424ohWFH5v9-P72W;'
    }
};

https.get(url, options, (res) => {
    console.log("Status:", res.statusCode);
    console.log("Headers:", res.headers);
    if (res.statusCode === 302 || res.statusCode === 303) {
        console.log("Redirect Location:", res.headers.location);
    }
});
