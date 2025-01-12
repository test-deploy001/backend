const { updateAvailability } = require('../controllers/availabilityController'); // Import update logic
const appointmentModel = require('../models/appointmentModel'); 
const db = require('../config/db');

const requestAppointment = (req, res) => {
  const { date, timeStart, timeEnd, guardianId, patientId, description, email } = req.body;

  console.log("Received appointment request:", req.body);

  // Validate required fields
  if (!date || !timeStart || !timeEnd || !guardianId || !patientId || !description || !email) {
    console.error("Missing required fields:", req.body);
    return res.status(400).json({ message: "All fields are required." });
  }

  // Query doctor's availability
  const availabilityQuery = `
    SELECT timeSlots 
    FROM availability 
    WHERE email = ? AND date = ?
  `;

  db.execute(availabilityQuery, [email, date], (err, results) => {
    if (err) {
      console.error("Error fetching availability:", err);
      return res.status(500).json({ message: "Failed to check doctor availability." });
    }

    console.log("Doctor's availability query result:", results);

    if (results.length === 0) {
      console.warn("No availability found for the selected date:", date);
      return res.status(404).json({ message: "No availability found for the selected date." });
    }

    const timeSlots = JSON.parse(results[0].timeSlots || "[]");
    console.log("Doctor's available time slots:", timeSlots);

    // Helper functions
    const formatTimeSlot = (start, end) => {
      const addLeadingZero = (time) => (time.length === 7 ? `0${time}` : time);
      return `${addLeadingZero(start)} - ${addLeadingZero(end)}`;
    };

    const convertTo24Hour = (time) => {
      const [hours, minutes, period] = time.match(/(\d+):(\d+)\s(AM|PM)/).slice(1);
      let hour24 = parseInt(hours, 10);
      if (period === "PM" && hour24 !== 12) hour24 += 12;
      if (period === "AM" && hour24 === 12) hour24 = 0;
      return `${hour24.toString().padStart(2, "0")}:${minutes}:00`;
    };

    const requestedSlot = formatTimeSlot(timeStart, timeEnd);
    console.log("Formatted requested time slot:", requestedSlot);

    if (!timeSlots.includes(requestedSlot)) {
      console.warn("Requested time slot is not available:", requestedSlot);
      return res.status(400).json({ message: "Requested time slot is not available." });
    }

    const updatedTimeSlots = timeSlots.filter((slot) => slot !== requestedSlot);
    console.log("Updated time slots after removing requested slot:", updatedTimeSlots);

    // Update availability
    const updateAvailabilityQuery = `
      UPDATE availability
      SET timeSlots = ?,
          bookedTimes = CASE
            WHEN bookedTimes IS NULL THEN JSON_ARRAY(?)
            ELSE JSON_ARRAY_APPEND(bookedTimes, '$', ?)
          END
      WHERE email = ? AND date = ?
    `;

    console.log("Updating availability with:");
    console.log("Updated time slots:", JSON.stringify(updatedTimeSlots));
    console.log("Requested slot to add to bookedTimes:", requestedSlot);

    db.execute(
      updateAvailabilityQuery,
      [JSON.stringify(updatedTimeSlots), requestedSlot, requestedSlot, email, date],
      (updateErr, result) => {
        if (updateErr) {
          console.error("Error updating availability:", updateErr);
          return res.status(500).json({ message: "Failed to update availability." });
        }

        console.log("Availability updated successfully:", result);

        // Insert appointment into the database
        const sql = `
          INSERT INTO appointments (date, timeStart, timeEnd, guardianId, patientId, description, email, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
        `;

        const convertedTimeStart = convertTo24Hour(timeStart);
        const convertedTimeEnd = convertTo24Hour(timeEnd);

        console.log("Converted time start:", convertedTimeStart);
        console.log("Converted time end:", convertedTimeEnd);

        db.execute(
          sql,
          [date, convertedTimeStart, convertedTimeEnd, guardianId, patientId, description, email],
          (createErr, result) => {
            if (createErr) {
              console.error("Error creating appointment:", createErr);
              return res.status(500).json({ message: "Failed to create appointment." });
            }

            console.log("Appointment created successfully:", result);
            res.status(201).json({ message: "Appointment request submitted successfully." });
          }
        );
      }
    );
  });
};



// Get all appointments for admin
const getAppointmentsForAdmin = (req, res) => {
  
  const sql = `
    SELECT 
      a.id AS appointmentId,
      a.date,
      a.timeStart,
      a.timeEnd,
      a.description,
      a.status,
      CONCAT(g.firstname, ' ', g.middlename, ' ', g.lastname) AS guardianFullName,
      CONCAT(p.patientName) AS patientFullName
    FROM appointments a
    JOIN guardians g ON a.guardianId = g.id
    JOIN patients p ON a.patientId = p.id
  `;

  db.execute(sql, [], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to retrieve appointments', error: err });
    }
    res.json({ appointments: results });
  });
};


// Update the status of an appointment
const updateAppointmentStatus = (req, res) => {
  const { appointmentId, status } = req.body; // Get appointment ID and status

  if (!appointmentId || !status) {
    return res.status(400).json({ message: 'Appointment ID and status are required.' });
  }

  // Step 1: Get the pediatrician's ID dynamically (assuming there's only one pediatrician)
  const getPediatricianSql = `
    SELECT id FROM users WHERE userType = 'pediatrician' LIMIT 1;
  `;

  db.execute(getPediatricianSql, [], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching pediatrician ID', error: err });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'No pediatrician found' });
    }

    const pediatricianId = result[0].id; // Get the pediatrician's ID

    // Step 2: If status is 'approved', update with pediatricianId
    let updateSql = `
      UPDATE appointments
      SET status = ?, pediatricianId = ?
      WHERE id = ?
    `;

    if (status.toLowerCase() === 'declined') {
      // If declined, just update the status
      updateSql = `
        UPDATE appointments
        SET status = ?
        WHERE id = ?
      `;
    }

    // Step 3: Execute the update query
    db.execute(updateSql, [status, pediatricianId, appointmentId], (err, updateResult) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to update appointment', error: err });
      }
      res.json({ message: `Appointment status updated to ${status}.` });
    });
  });
};


const getAppointmentsForGuardian = (req, res) => {
  const userId = req.user.id; // Extract user_id from the JWT token

  // Fetch the guardianId corresponding to the user_id
  appointmentModel.getGuardianId(userId, (err, guardianId) => {
    if (err) {
      console.error('Error fetching guardianId:', err);
      return res.status(500).json({ message: 'Failed to retrieve guardian ID', error: err });
    }

    if (!guardianId) {
      return res.status(404).json({ message: 'Guardian ID not found for the user' });
    }

    // Fetch appointments using the retrieved guardianId
    appointmentModel.getAppointmentsForGuardian(guardianId, (err, results) => {
      if (err) {
        console.error('Error fetching appointments:', err);
        return res.status(500).json({ message: 'Failed to retrieve appointments', error: err });
      }

      res.json({ appointments: results });
    });
  });
};


const getAppointmentDetails = (req, res) => {
  const { appointmentId } = req.params;

  appointmentModel.getAppointmentById(appointmentId, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to retrieve appointment details', error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(results[0]);
  });
};

const deleteAppointment = (req, res) => {
  const { appointmentId } = req.params;

  appointmentModel.deleteAppointmentById(appointmentId, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to delete appointment', error: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.status(200).json({ message: 'Appointment deleted successfully' });
  });
};

const getUpcomingAppointmentsForGuardian = (req, res) => {
  const userId = req.user.id; // Extracted from the JWT token

  console.log('User ID:', userId); // Log the user ID for debugging

  // Fetch the guardianId using the userId
  appointmentModel.getGuardianId(userId, (err, guardianId) => {
    if (err) {
      console.error('Error fetching guardianId:', err); // Log error
      return res.status(500).json({ message: 'Failed to fetch guardian ID', error: err.message });
    }

    console.log('Guardian ID:', guardianId); // Log the fetched guardian ID

    // Fetch upcoming appointments using the correct guardianId
    appointmentModel.getUpcomingAppointmentsForGuardian(guardianId, (err, results) => {
      if (err) {
        console.error('Error fetching appointments:', err); // Log SQL error
        return res.status(500).json({ message: 'Failed to retrieve appointments', error: err.message });
      }

      console.log('Appointments fetched from DB:', results); // Log the results

      res.json(results); // Return upcoming appointments
    });
  });
};

// Get all approved appointments for pediatrician
const getAppointmentsForPediatrician = (req, res) => {
  const sql = `
    SELECT 
      a.id AS appointmentId,
      a.date,
      a.timeStart,
      a.timeEnd,
      a.description,
      a.status,
      CONCAT(g.firstname, ' ', g.middlename, ' ', g.lastname) AS guardianFullName,
      CONCAT(p.patientName) AS patientFullName
    FROM appointments a
    JOIN guardians g ON a.guardianId = g.id
    JOIN patients p ON a.patientId = p.id
    WHERE a.status = 'approved'  -- Only approved appointments
  `;

  db.execute(sql, [], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to retrieve appointments', error: err });
    }
    res.json({ appointments: results });
  });
};

const getAppointmentDetailsForPediatrician = (req, res) => {
  const { appointmentId } = req.params;
  const pediatricianId = req.user.id;  // Assuming `req.user` contains the logged-in user's data
  console.log('Pediatrician ID:', pediatricianId);

  // Ensure the logged-in user is a pediatrician
  if (!pediatricianId) {
    return res.status(403).json({ message: 'You are not authorized to view this appointment' });
  }

  // Fetch the appointment details along with the pediatricianId to ensure they are assigned
  appointmentModel.getAppointmentByIdForPediatrician(appointmentId, pediatricianId, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to retrieve appointment details', error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Appointment not found or you are not assigned to this appointment' });
    }

    res.json(results[0]);
  });
};

module.exports = { requestAppointment, getAppointmentsForAdmin, updateAppointmentStatus, getAppointmentsForGuardian, getAppointmentDetails,
  deleteAppointment, getUpcomingAppointmentsForGuardian, getAppointmentsForPediatrician, getAppointmentDetailsForPediatrician
 };
