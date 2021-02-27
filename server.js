const express = require('express');
const path = require('path');

const pathTo = {
  static: path.join(__dirname, 'dist/sound-book'),
};
const port = 4200;
const web = express();
console.log(pathTo);
web.use('/', express.static(pathTo.static));
web.listen(port, () => console.log(`start at port localhost:${port}`));
