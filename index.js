require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const { default: mongoose } = require("mongoose");
const http = require("http");
const session = require('express-session');

const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3003;
//const uri = "mongodb+srv://sanjana:k75ivClntpqHzNHd@data.hfufl7g.mongodb.net/?retryWrites=true&w=majority"; 
const usersInRoom = new Map();
const client = new MongoClient(process.env.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(bodyParser.json());
app.use(express.json());
app.use(session({
  secret: 'your-secret-key', 
  resave: false,
  saveUninitialized: true,
}));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
mongoose.connect(process.env.uri);
var db = mongoose.connection;
db.on("error", () => console.log("Error in connecting to the database"));
db.once("open", () => {
  console.log("Connected to the database");
  app.post("/createuser", (req, res) => {
    var fname = req.body.fname;
    var lname = req.body.lname;
    var email = req.body.email;
    var mob = req.body.mob;
    var pass = req.body.pass;
    var str = req.body.str;
    var city = req.body.city;
    var stat = req.body.stat;
    var cont = req.body.cont;
    var login = req.body.login;
    var add = `${str}, ${city}, ${stat}, ${cont}`;
    var date = new Date();
    var data = {
      fname: fname,
      lname: lname,
      mobile: mob,
      Address: add,
      email: email,
      loginId: login,
      password: pass,
      createdAt: date,
    };
    db.collection("users").insertOne(data, (err, collection) => {
      if (err) {
        console.error("Error inserting user data:", err);
        res.status(500).send("Error inserting user data");
        return;
      }
      const userId = collection.insertedId;
      console.log(`User with ID ${userId} inserted into MongoDB atlas`);
      });
    io.on("connection", (socket) => {
      console.log("A user connected");
      socket.join("live_users")
      var sock = socket.id;
      usersInRoom.set(socket.id, { sock,email,fname  });
      console.log(usersInRoom)
      io.sockets.in("live_users").emit('connectedRoom',Array.from(usersInRoom.values()));
      socket.on('disconnect', ()=>{
        console.log("A user disconnected");
        usersInRoom.delete(socket.id);
      })
    });
    req.session.userEmail = email;
    console.log("Data Inserted Successfully!");
    res.redirect("/data");
  });
});
app.get('/user', async(req, res) => {
  const email = req.query.email; 
  const db = client.db(); 
  const collection = db.collection("users"); 
  const userEmail = req.session.userEmail;
  try {
    const users = await collection.findOne({ email: email }, (err, user) => {
      if (err) {
        console.error('Error fetching data from MongoDB:', err);
        res.status(500).json({ error: 'Data fetch error' });
        return;
      }
      client.close();
      res.json(user);
    });
    res.json(users)
  } catch (err) {
    console.error("Error fetching user data:", err);
    res.status(500).send("Error fetching user data from MongoDB");
  }
  });
app.get("/", (req, res) => {
  res.set({ "Allow-access-Allow-Origin": "*" });
  return res.redirect("index.html");
});
app.set("view engine", "ejs");
app.get("/data", async (req, res) => {
  const db = client.db(); 
  const collection = db.collection("users"); 
  const userEmail = req.session.userEmail;
  try {
    const users = await collection.find({}).toArray();
    res.render("index", { users,userEmail});    
  } catch (err) {
    console.error("Error fetching user data:", err);
    res.status(500).send("Error fetching user data from MongoDB");
  }
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});