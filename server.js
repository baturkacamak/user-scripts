const express = require('express');
const cors = require('cors');

const app = express();

const PORT = 3000;

app.use(cors());
app.use(express.static(__dirname));

app.listen(PORT, () => {
    // eslint-disable-next-line no-console
  console.log(`Server is running at http://localhost:${PORT}`);
});
