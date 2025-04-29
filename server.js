const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { MongoClient, ObjectId } = require("mongodb"); 
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;
const netlifyFrontendURL = 'https://ibento.co'; 


app.use(cors({
  origin: netlifyFrontendURL,
}));
app.use(express.json());
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, 
});
app.use(limiter);


const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set in the environment variables.");
  process.exit(1);
}
const client = new MongoClient(uri);
let collection;

async function getCollection() {
  if (!collection) {
    try {
      await client.connect();
      const database = client.db("test");
      collection = database.collection("events");
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }
  return collection;
}

app.get("/", (req, res) => {
  res.send("Welcome to the Event Management Backend!");
});


app.post("/events", async (req, res) => {
  try {
    const collection = await getCollection();
    const event = req.body;
    const result = await collection.insertOne(event);
    res.status(201).json({ message: "Event added successfully", result });
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).json({ error: "Failed to add event" });
  }
});


app.get("/events", async (req, res) => {
  try {
    const { page = 1, limit = 10, city } = req.query;
    const query = city ? { city } : {};
    const options = {
      skip: (page - 1) * parseInt(limit),
      limit: parseInt(limit),
      projection: { name: 1, date: 1, city: 1, description: 1 },
      sort: { date: 1 },
    };
    const collection = await getCollection();
    const events = await collection.find(query, options).toArray();
    const total = await collection.countDocuments(query);
    res.status(200).json({ events, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.get("/events/:id", async (req, res) => {
  try {
    const id = new ObjectId(req.params.id);
    const collection = await getCollection();
    const event = await collection.findOne({ _id: id });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.status(200).json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});


app.put("/events/:id", async (req, res) => {
  try {
    const id = new ObjectId(req.params.id);
    const updatedEvent = req.body;
    const collection = await getCollection();
    const result = await collection.updateOne({ _id: id }, { $set: updatedEvent });
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.status(200).json({ message: "Event updated successfully", result });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});


app.delete("/events/:id", async (req, res) => {
  try {
    const id = new ObjectId(req.params.id);
    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
