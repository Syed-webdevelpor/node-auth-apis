const express = require('express');
const {
    tokenValidation,
    validate,
} = require("../middlewares/authentication.js");
const router = express.Router();
const supportTicketController = require('../controllers/supportTicket');

// 🔹 Create a new support ticket
router.post('/', tokenValidation(), validate, supportTicketController.createTicket);

// 🔹 Get all tickets assigned to an account manager
router.get('/manager/:id', tokenValidation(), validate, supportTicketController.getTicketsByManagerId);

// 🔹 Get all tickets created by a user
router.get('/user/:id', tokenValidation(), validate, supportTicketController.getTicketsByUserId);

// 🔹 Get a single ticket by ticket ID
router.get('/:id', tokenValidation(), validate, supportTicketController.getTicketById);

// 🔹 Update a ticket (status, priority, etc.)
router.put('/:id', tokenValidation(), validate, supportTicketController.updateTicket);

module.exports = router;