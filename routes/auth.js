const express = require('express');
const { login, logout, renderLogin } = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.get('/login', redirectIfAuthenticated, renderLogin);
router.post('/api/auth/login', redirectIfAuthenticated, login);
router.post('/api/auth/logout', logout);
router.delete('/api/auth/logout', logout);
router.post('/logout', logout);

module.exports = router;
