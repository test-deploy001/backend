const { getGuardianById, updateGuardianById } = require('../models/guardianModel');
const path = require('path');
const fs = require('fs');
const db = require("../config/db");

const getGuardianProfile = (req, res) => {
  const userId = req.user.id; // Extract user ID from authenticated request
  getGuardianById(userId, (err, guardian) => {
    if (err) {
      console.error('Error fetching guardian profile:', err);
      return res.status(500).json({ message: 'Failed to fetch guardian profile.' });
    }
    if (!guardian) {
      return res.status(404).json({ message: 'Guardian not found.' });
    }
    res.json(guardian);
  });
};

const updateGuardianProfile = (req, res) => {
    const userId = req.user.id;
    const updatedData = req.body;
  
    // Handle profile image if provided
    if (req.file) {
      const filePath = `/uploads/profile_images/${req.file.filename}`;
      updatedData.profileImage = filePath;
    }
  
    // Fetch existing profile to ensure we have the current profileImage
    getGuardianById(userId, (err, existingProfile) => {
      if (err) {
        console.error('Error fetching existing profile:', err);
        return res.status(500).json({ message: 'Failed to update profile.' });
      }
  
      // Preserve the existing profile image if no new image is provided
      if (!updatedData.profileImage) {
        updatedData.profileImage = existingProfile?.profileImage || null;
      }
  
      // Proceed with updating the profile
      updateGuardianById(userId, updatedData, (err) => {
        if (err) {
          console.error('Error updating guardian profile:', err);
          return res.status(500).json({ message: 'Failed to update guardian profile.' });
        }
  
        // Send back the updated profile
        const updatedProfile = {
          ...existingProfile,
          ...updatedData,
        };
  
        res.json({
          message: 'Guardian profile updated successfully.',
          updatedProfile,
        });
      });
    });
  };


  const sendNewMessage = (req, res) => {
      const {conversation_id, sender_id, content} = req.body;
  
      const query = 'insert into messages (conversation_id, sender, content) values(?,?,?);';
  
      db.execute(query,[conversation_id,sender_id,content] ,(err, result) => {
          if(err)return console.log(err);
          const query2 = 'select * from messages where conversation_id = ?';
  
          db.execute(query2,[conversation_id],(err, result) => {
              if(err)return console.log(err);
              console.log(result[0].conversation_id)
              res.send(result);
              req.io.emit('UserFirstMsg', result[0].conversation_id);
          });
      })
  };
  
  const createConversation = (req, res) => {
      const {participant_1} = req.body;
      const query = `insert into conversation (participant_1, participant_2) values(${participant_1}, 6)`
  
      db.execute(query, (err, result) => {
          if (err) return console.log(err);
          if (result.affectedRows > 0){
              const query2 = `select id from conversation where participant_1 = ${participant_1}`
              db.execute(query2, (err, result) => {
                  if (err) return console.log(err);
                  return res.send(result[0])
              })
          }
      });
  }
  
  const getGuardianMessages = (req, res) => {
      const {id} = req.params;
      const query = `select conversation_id, sender, content, time from messages m join conversation c on m.conversation_id = c.id WHERE c.participant_1 = ${id};`
  
      db.execute(query, (err, result) => {
          if(err) return console.log(err);
          
          if(result.length < 1) return res.send(result)
  
          res.send(result)
      })
  }
  
  const guardianSendMessage = (req, res) => {
      const {conversation_id, sender_id, content} = req.body;
  
      const query = `INSERT INTO messages (conversation_id, sender, content) VALUES ('${conversation_id}', '${sender_id}', '${content}');`;
      
      db.query(query, (err, result) => {
          if(err) return console.log(err);
      
          if(result){
              const query2 = `select * from messages where conversation_id = ${conversation_id};`
  
              db.query(query2, (err, result) => {
                  req.io.emit('newMessage', result);
              })
          }
      })
  }

module.exports = { getGuardianProfile, updateGuardianProfile, getGuardianMessages, guardianSendMessage, createConversation, sendNewMessage };
