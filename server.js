const express = require('express');
const fs = require('fs');
const path = require('path');

const pathTo = {
  static: path.join(__dirname, 'dist/sound-book/browser'),
};
const port = 4200;
const web = express();
console.log(pathTo);

// Mirrors src/.htaccess: a prerendered page under its URL, then real files, then the app shell
// (index.csr.html in production builds). song/ and song/:id/ are bare folders and fall through to the app.
web.use((req, res, next) => {
  const page = path.join(pathTo.static, decodeURIComponent(req.path), 'index.html');

  if (req.path !== '/' && page.startsWith(pathTo.static) && fs.existsSync(page)) {
    res.sendFile(page);
    return;
  }

  next();
});
web.use('/', express.static(pathTo.static, { index: false, redirect: false }));
web.use((req, res) => res.sendFile(path.join(pathTo.static, 'index.csr.html')));
web.listen(port, () => console.log(`start at port http://localhost:${port}`));
