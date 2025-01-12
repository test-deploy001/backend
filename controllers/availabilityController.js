const User = require('../models/userModel');
const { verifyRole } = require('../middleware/authMiddleware')
const db = require('../config/db');
const moment = require('moment-timezone');

const postAvailability = (req, res) => {
  const { name, email, date, timeSlots, status } = req.body;
  const user_id = req.user.id;

  if (!name || !email || !date || !timeSlots || !status) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const formattedDate = moment.tz(date, "Asia/Manila").format("YYYY-MM-DD");

  const availabilityData = {
    name,
    email,
    date: formattedDate,
    timeSlots,
    status,
    user_id,
  };

  const query = `
    INSERT INTO availability (user_id, name, email, date, timeSlots, status)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      timeSlots = VALUES(timeSlots), 
      status = VALUES(status)
  `;

  db.execute(
    query,
    [
      availabilityData.user_id,
      availabilityData.name,
      availabilityData.email,
      availabilityData.date,
      JSON.stringify(availabilityData.timeSlots),
      availabilityData.status,
    ],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.status(201).json({
        message: "Availability saved successfully",
        availability: availabilityData,
        result,
      });
    }
  );
};


const getMarkedDates = (req, res) => {
  const userRole = req.user.userType;
  const userId = req.user.id;

  let query;
  let params;

  if (userRole === "Pediatrician") {
    query = `SELECT date, status, timeSlots, name, email FROM availability WHERE user_id = ?`;
    params = [userId];
  } else if (userRole === "Guardian") {
    query = `SELECT date, status, timeSlots, name, email FROM availability`;
    params = [];
  } else {
    console.log("Unauthorized role:", userRole); // Log unauthorized access
    return res.status(403).json({ message: "Unauthorized role" });
  }

  console.log("Executing query:", query, "with params:", params); // Log query and params
  db.execute(query, params, (err, results) => {
    if (err) {
      console.error("Database error:", err); // Log database error
      return res.status(500).json({ message: "Database error" });
    }

    console.log("Raw database results:", results); // Log raw database results

    const markedDates = results.reduce((acc, row) => {
      const localDate = moment(row.date).tz("Asia/Manila").format("YYYY-MM-DD");
      acc[localDate] = {
        status: row.status,
        name: row.name || null, // Log missing fields as null
        email: row.email || null,
        timeSlots: Array.isArray(row.timeSlots)
          ? row.timeSlots
          : JSON.parse(row.timeSlots || "[]"),
      };
      return acc;
    }, {});

    console.log("Formatted markedDates object:", markedDates); // Log final formatted data
    res.json(markedDates);
  });
};





module.exports = { postAvailability, getMarkedDates};
