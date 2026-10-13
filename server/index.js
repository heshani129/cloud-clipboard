const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const transferRoutes = require('./routes/transfer');

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', transferRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});