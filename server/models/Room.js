const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
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

code: {
    type: String,
    default: ""
}
}, {
timestamps: true
});
module.exports = mongoose.model("Room", roomSchema);