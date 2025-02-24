const express = require("express");
const cors = require("cors");
const axios = require("axios"); // Use axios for HTTP requests
const mongoose = require("mongoose");
const Booking = require("./models/bookingSchema.js");
const Blog = require("./models/Blog"); 
const multer = require("multer");
const path = require("path");
const Sponsor = require('./models/Sponser.js');
const BoatOwner = require('./models/BoatOwner.js')
const Promocode = require('./models/promoCode.js')
const app = express();
require("dotenv").config();
const router = express.Router();

// Enable CORS
app.use(cors());

// Middleware to parse JSON body
app.use(express.json());

// Connect to MongoDB

const uri = "mongodb+srv://burab1742:l22dIKm7jF8mhzZb@cluster0.wquid.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

  //post
router.post("/PostTransaction", async (req, res) => {
  console.log(req.body);
  try {
    // Step 1: Prepare the payment data
    const { promocode, amount, email, firstName, lastName, phone , numberOfPassengers } = req.body;

    // Step 2: Validate the promocode if provided
    let finalAmount = amount;
    if (promocode) {
      const validPromocode = await Promocode.findOne({ code: promocode });
      if(validPromocode){
      if (numberOfPassengers>5) {
        
        // Apply a discount of 10 (you can adjust this logic as needed)
        finalAmount = (amount * numberOfPassengers) - 30;
        // Delete the promocode from the database
        await Promocode.deleteOne({ code: promocode });
      } else {
        finalAmount = (amount * numberOfPassengers) - 10;
        
      }}
      else{
        finalAmount = amount*numberOfPassengers;
      }
    }

    // Step 3: Fetch all BoatOwners and compare their rounds
    const boatOwners = await BoatOwner.find();
    const minRound = Math.min(...boatOwners.map(owner => owner.round));
    const candidates = boatOwners.filter(owner => owner.round === minRound);
    const selectedBoatOwner = candidates[Math.floor(Math.random() * candidates.length)];
     if (selectedBoatOwner.size>60){
    selectedBoatOwner.round += 1;
     }
     else{
      selectedBoatOwner.size += numberOfPassengers;
     }
    await selectedBoatOwner.save();

    // Step 4: Create a new booking and associate the selected BoatOwner
    const newBooking = new Booking({ ...req.body, amount: finalAmount, boatOwner: selectedBoatOwner._id });
    const savedBooking = await newBooking.save();

    // Step 5: Prepare the payment request body
    const body = {
      amount: finalAmount, // Adjusted amount
      currency: "ETB",
      email,
      first_name: firstName,
      last_name: lastName,
      phone_number: phone,
      tx_ref: "chewatatest-" + Date.now(),
      callback_url: "https://webhook.site/077164d6-29cb-40df-ba29-8a00e59a7e60",
      return_url: `http://localhost:3000/congratulation/${savedBooking._id}`,
      customization: {
        title: "Payment for ",
        description: "I love online payments",
      },
      meta: {
        hide_receipt: "true",
      },
    };

    // Step 6: Send payment initialization request to Chapa
    const options = {
      method: "POST",
      url: "https://api.chapa.co/v1/transaction/initialize",
      headers: {
        Authorization: "Bearer CHASECK_TEST-E2XnZBkD5AqYSXud9MWRnqHtRqgqZYPm", // Replace with your Chapa test key
        "Content-Type": "application/json",
      },
      data: body,
    };

    let response;
    try {
      response = await axios(options);
    } catch (error) {
      console.error('Error handling payment:', error.response?.data || error.message);
      return res.status(500).json({ message: "Payment initialization failed" });
    }

    const chapaResponse = response.data;

    // Step 7: Respond to the client with the payment link and booking
    res.status(201).json({
      message: "Booking created successfully, redirect to payment",
      paymentUrl: chapaResponse.data.checkout_url,
      booking: savedBooking,
    });

  } catch (error) {
    console.log("Error handling payment:", error);
    res.status(500).json({ error: error.message });
  }
});

const generatePromocode = (length = 8) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};


router.get('/booking/:id', async (req, res) => {
  try {
    // Find booking by ID and populate boatOwner details
    const booking = await Booking.findById(req.params.id).populate({
      path: 'boatOwner',
      select: 'name fatherName phone', // Only selecting specific fields
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Generate a unique promocode
    let code;
    let promocodeExists = true;

    // Ensure promocode is unique
    while (promocodeExists) {
      code = generatePromocode();
      promocodeExists = await Promocode.findOne({ code });
    }

    // Create and save the promocode to the database
    const promocode = new Promocode({
      code,
      discount: 10, // Example discount value, can be dynamic
      expiryDate: new Date('2025-12-31'), // Example expiration date
    });

    await promocode.save();

    // Send the booking details, boatOwner details, and promocode
    res.json({
      bookingDetails: booking,
      boatOwnerDetails: booking.boatOwner,
      promocodeDetails: promocode,
    });
  } catch (error) {
    console.error('Error fetching booking and generating promocode:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.use(express.urlencoded({ extended: true })); // To handle form submissions
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Storage for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory to save images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename image with timestamp
  },
});
const upload = multer({ storage });

// Route to handle blog post
app.post("/api/blogs", upload.single("image"), async (req, res) => {
  const { title, description } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: "Image is required" });
  }

  const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;

  try {
    const newBlog = new Blog({ title, description, imageUrl });
    await newBlog.save();
    res.status(201).json(newBlog);
  } catch (error) {
    res.status(500).json({ error: "Failed to create blog post" });
  }
});

// Route to get all blog posts
app.get("/api/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find(); // Fetch all blogs from MongoDB
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// Add a new comment to a blog post
router.post("/api/blogs/:id/comments", async (req, res) => {
  try {
    const { comment } = req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    blog.comments.push(comment);
    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// Like a blog post
router.post("/api/blogs/:id/like", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    blog.likes += 1;
    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: "Failed to like the blog post" });
  }
});

// Toggle favorite state
router.post("/api/blogs/:id/favorite", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    blog.isFavorite = !blog.isFavorite;
    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: "Failed to update favorite state" });
  }
});

// Toggle pin state
router.post("/api/blogs/:id/pin", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    blog.isPinned = !blog.isPinned;
    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: "Failed to update pin state" });
  }
});


// Create new boat owner
router.post('/boatowners', async (req, res) => {
  try {
    const { name, fatherName, middleName, phone } = req.body;
    const newBoatOwner = new BoatOwner({ name, fatherName, middleName, phone });
    await newBoatOwner.save();
    res.status(201).json(newBoatOwner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all boat owners
router.get('/boatowners', async (req, res) => {
  try {
    const boatOwners = await BoatOwner.find();
    res.json(boatOwners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update boat owner by ID
router.put('/boatowners/:id', async (req, res) => {
  try {
    const updatedOwner = await BoatOwner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedOwner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete boat owner by ID
router.delete('/boatowners/:id', async (req, res) => {
  try {
    await BoatOwner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Boat Owner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Configure multer for file uploads
const storages = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to save uploaded images
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const uploads = multer({
  storage: storages,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);
    if (mimeType && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

// Get all sponsors
router.get('/sponser', async (req, res) => {
  try {
    const sponsors = await Sponsor.find();
    res.json(sponsors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sponsors' });
  }
});

// Add a new sponsor with image upload
router.post('/sponser', uploads.single('logo'), async (req, res) => {
  const { name, url, description, twitter, facebook, instagram } = req.body;
  const logo = req.file ? `/uploads/${req.file.filename}` : '';

  try {
    const newSponsor = new Sponsor({
      name,
      logo,
      url,
      description,
      twitter,
      facebook,
      instagram,
    });
    await newSponsor.save();
    res.status(201).json(newSponsor);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create sponsor' });
  }
});

// Update a sponsor (with optional new image upload)
router.put('/sponser/:id', upload.single('logo'), async (req, res) => {
  const { id } = req.params;
  const { name, url, description, twitter, facebook, instagram } = req.body;
  const logo = req.file ? `/uploads/${req.file.filename}` : undefined; // Only update logo if a new file is uploaded

  try {
    const updatedSponsor = await Sponsor.findByIdAndUpdate(
      id,
      { name, logo, url, description, twitter, facebook, instagram },
      { new: true }
    );
    res.json(updatedSponsor);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update sponsor' });
  }
});

// Delete a sponsor
router.delete('/sponser/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Sponsor.findByIdAndDelete(id);
    res.json({ message: 'Sponsor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete sponsor' });
  }
});
// Use the router
app.use("/", router);

// Start the server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
