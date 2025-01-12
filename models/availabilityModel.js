const db = require('../config/db');

const saveAvailability = (availabilityData, callback) => {
  const { name, email, date, timeSlots, status, user_id } = availabilityData;

  const query = `
    INSERT INTO availability (name, email, date, timeSlots, status, user_id) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.execute(
    query,
    [name, email, date, JSON.stringify(timeSlots), status, user_id],
    (err, result) => {
      if (err) return callback(err);
      callback(null, result);
    }
  );
};

module.exports = { saveAvailability };
