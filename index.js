const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Отдаём статику из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all: любой путь будет отдавать index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
