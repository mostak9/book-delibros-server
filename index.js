const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;
const cors = require("cors");
const app = express();

// middleware
app.use(
  cors({
    origin: [
      "https://library-management-d2da6.web.app",
      "https://library-management-d2da6.firebaseapp.com",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// user middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: "unauthorized access" });
    req.user = decoded;
    // console.log(req.user);
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6nmlwzx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const bookCollections = client
  .db("libraryManager")
  .collection("allBooksCollection");
const borrowCollection = client
  .db("libraryManager")
  .collection("borrowedBooksCollection");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // auth related api
    app.post("/api/v1/jwt", async (req, res) => {
      const user = req.body;
      // console.log(user);

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      // res
      //   .cookie("token", token, {
      //     httpOnly: true,
      //     secure: false,
      //     // sameSite: 'none'
      //   })
      //   .send({ success: true });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // clear cookies
    app.post("/jwt/logout", async (req, res) => {
      res.clearCookie("token", { maxAge: 0 }).send("cookie cleared");
    });

    // service related api
    app.get("/api/v1/allBooks", verifyToken, async (req, res) => {
      console.log("quey token", req.query);
      console.log("quey token", req.user);
      if (req.user?.email !== req.query?.email)
        return res.status(403).send({ message: "forbidden access" });

      const cursor = bookCollections.find();

      const result = await cursor.toArray();
      res.send(result);
    });

    // categorized Books
    app.get("/api/v1/categorizedBooks", async (req, res) => {
      const query = req.query;
      const result = await bookCollections
        .find({ category: query?.category })
        .toArray();
      res.send(result);
    });

    app.get("/api/v1/allBooks/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const queryTxt = req?.query?.read;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { _id: 1, title: 1, link: 1, author: 1, quantity: 1 },
      };
      const book = queryTxt
        ? await bookCollections.findOne(query, options)
        : await bookCollections.findOne(query);
      res.send(book);
    });

    app.post("/api/v1/addBook", verifyToken, async (req, res) => {
      if (req.user?.email !== req.query?.email)
        return res.status(403).send({ message: "forbidden access" });
      const book = req.body;
      // console.log(book);
      const result = await bookCollections.insertOne(book);
      res.send(result);
    });

    app.put("/api/v1/updateBook/:id", async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          title: data.title,
          author: data.author,
          imageLink: data.imageLink,
          quantity: data.quantity,
          rating: data.rating,
          category: data.category,
          description: data.description,
          pages: data.pages,
          link: data.link,
        },
      };
      const options = { upsert: true };
      const result = await bookCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.patch("/api/v1/updateQuantity/:id", async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          quantity: data.quantity,
        },
      };
      const result = await bookCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    // borrowed books api
    app.post("/api/v1/borrowBook", async (req, res) => {
      const data = req.body;
      // console.log(data);
      const result = await borrowCollection.insertOne(data);
      res.send(result);
    });

    app.get("/api/v1/borrowBook", async (req, res) => {
      const query = req.query.email;
      const result = await borrowCollection.find({ email: query }).toArray();
      res.send(result);
    });
    app.delete("/api/v1/deleteBorrowedBook/:id", async (req, res) => {
      const id = req.params.id;
      console.log("id from delete", id);
      const query = { _id: new ObjectId(id) };
      const result = await borrowCollection.deleteOne();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("LIBRARY SERVER IS IN ONLINE");
});

app.listen(port, () => console.log(`listening on ${port}`));
