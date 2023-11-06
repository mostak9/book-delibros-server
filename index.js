const express = require('express');
const port = process.env.PORT || 5000;
const cors = require('cors');
const app = express();


// middleware
app.use(cors());
app.use(express.json());


app.get('/', (req, res)  => {
    res.send('LIBRARY SERVER IS IN ONLINE');
})

app.listen(port, ()  => console.log(`listening on ${port}`));
