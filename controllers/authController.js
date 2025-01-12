const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const db = require('../config/db');

// Register a new user
const registerUser = (req, res) => {
  const { email, password, userType, firstname, middlename, lastname, extension, contact, guardianAddress, clinicAddress, specialization, patientInfo } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ message: 'Error hashing password' });
    }

    User.createUser({ email, password: hashedPassword, userType }, (error, result) => {
      if (error) {
        return res.status(500).json({ message: 'Database error', error });
      }

      const userId = result.insertId;

      if (userType === 'Guardian') {
        const guardianData = { userId, firstname, middlename, lastname, extension, contact, guardianAddress };
        User.createGuardian(guardianData, (err, guardianResult) => {
          if (err) {
            return res.status(500).json({ message: 'Error creating guardian', err });
          }

          const guardianId = guardianResult.insertId;

          if (patientInfo) {
            const patientData = { ...patientInfo, guardianId };
            User.createPatient(patientData, (err) => {
              if (err) {
                return res.status(500).json({ message: 'Error creating patient', err });
              }
              res.status(201).json({ message: 'Guardian and patient registered successfully' });
            });
          } else {
            res.status(201).json({ message: 'Guardian registered successfully' });
          }
        });
      } else if (userType === 'Pediatrician') {
        const pediatricianData = { userId, firstname, middlename, lastname, extension, contact, clinicAddress, specialization };
        User.createPediatrician(pediatricianData, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Error creating pediatrician', err });
          }
          res.status(201).json({ message: 'Pediatrician registered successfully' });
        });
      } else {
        res.status(201).json({ message: 'User registered successfully' });
      }

      sendVerificationEmail(email);
    });
  });
};


// Login function to authenticate user
const loginUser = (req, res) => {
  console.log("Request body:", req.body);
  const { email, password } = req.body;

  User.findUserByEmail(email, (err, user) => {
    if (err || !user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ message: 'Your email is not verified. Please verify your email and try again.' });
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if (!result) {
        return res.status(400).json({ message: 'Invalid password' });
      }

      // Generate JWT token
      const token = jwt.sign({ 
        id: user.id, 
        email: user.email, 
        userType: user.userType 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' });

      

      res.json({ 
        message: 'Login successful', 
        token, 
        userType: user.userType, 
      });
    });
  });
};

// Endpoint to fetch guardian and patient data by email
const getGuardianAndPatientData = (req, res) => {
  const { email } = req.user;
  console.log('Decoded User in Middleware:', req.user);


  // Find the user by email
  User.findUserByEmail(email, (err, user) => {
    if (err || !user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.userType !== 'Guardian') {
      return res.status(403).json({ message: 'Access restricted to guardians only' });
    }

    console.log('User ID:', user.id); // Debug log

    // Find the guardian's data
    const sqlGuardian = `
    SELECT g.id, u.email, g.firstname, g.middlename, g.lastname, g.extension, g.contact
    FROM guardians g
    JOIN users u ON g.user_id = u.id
    WHERE g.user_id = ?
  `;
    db.execute(sqlGuardian, [user.id], (err, guardians) => {
      if (err || guardians.length === 0) {
        console.error('Error fetching guardian data:', err); // Debug log
        return res.status(404).json({ message: 'Guardian data not found' });
      }

      const guardian = guardians[0];
      console.log('Fetched guardian data:', guardian);
      console.log('Guardian ID:', guardian.id);

      // Find all patients under this guardian
      const sqlPatients = `SELECT * FROM patients WHERE guardian_id = ?`;
      db.execute(sqlPatients, [guardian.id], (err, patients) => {
        if (err) {
          console.error('Error fetching patients data:', err);
          return res.status(500).json({ message: 'Error fetching patients data', err });
        }

        res.json({
          user,
          guardian,
          patients: patients || [], // Return an empty array if no patients found
        });
      });
    });
  });
};


// Function to send verification email
const sendVerificationEmail = (email) => {
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',  // Use Gmail or any other SMTP service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Email Verification',
    text: `Click the link to verify your email: ${verificationUrl}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

// Email verification endpoint
const verifyEmail = (req, res) => {
  const token = req.query.token;

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Token verification failed:', err);
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    console.log('Decoded email:', decoded.email);

    User.updateEmailVerification(decoded.email, (err, result) => {
      if (err) {
        console.error('Database update failed:', err);
        return res.status(500).json({ message: 'Error verifying email' });
      }

      console.log('Email verified successfully for:', decoded.email);
      res.json({ message: 'Email verified successfully' });
    });
  });
};


module.exports = { registerUser, loginUser, getGuardianAndPatientData, verifyEmail };
