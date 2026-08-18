const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            unique: true
        },

        roomName: {
            type: String,
            default: "Untitled Room"
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        users: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        // Backward-compatible shared code field.
        // We will keep this for old rooms/data.
        code: {
            type: String,
            default: ""
        },

        // Individual code for each room member.
        // Key = userId
        // Value = that user's code
        memberCodes: {
            type: Map,
            of: String,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Room",
    roomSchema
);