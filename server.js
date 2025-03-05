require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios"); // Use axios for HTTP requests
const mongoose = require("mongoose");
const Booking = require("./models/bookingSchema.js");
const Blog = require("./models/Blog"); 
const stripe = require("stripe")(process.env.STRIPE_SECURET_KEY)
const User = require("./models/User"); 
const multer = require("multer");
const TempBooking = require('./models/TempBooking.js')
const paypal = require("./paypal.js")
const path = require("path");
const Sponsor = require('./models/Sponser.js');
const BoatOwner = require('./models/BoatOwner.js')
const Promocode = require('./models/promoCode.js')
const Destination = require("./models/Destination.js")
const bcrypt = require('bcryptjs'); 
const app = express();
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken'); // For token generation

const router = express.Router();
// Enable CORS
const corsOptions = {
  origin: 'https://tank-h15o.vercel.app/', // Allow requests from both Vercel and localhost
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
};


cloudinary.config({ 
  cloud_name: 'drpuygxkj', 
  api_key: '862122525455791', 
  api_secret: '7c5LGGeCw9tSMEkQK4oqu4bbd2A' // Click 'View API Keys' above to copy your API secret
});




app.use(cors(corsOptions));

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
    if(req.body.paymentMethod === 'Chapa'){
    try {
      //paypal for sell 
     
      // Step 1: Prepare the payment data
      const { promocode, amount, email, firstName, lastName, phone , numberOfPassengers } = req.body;
  const numberOfPassengersInt = parseInt(numberOfPassengers, 10);
      const amountInt = parseInt(amount, 10);
      // Step 2: Validate the promocode if provided
      let finalAmount = amountInt;
      if (promocode) {
        const validPromocode = await Promocode.findOne({ code: promocode });
        if(validPromocode){
        if (numberOfPassengersInt>5) {
          
          // Apply a discount of 10 (you can adjust this logic as needed)
          finalAmount = (amountInt * numberOfPassengersInt) - 30;
          // Delete the promocode from the database
          await Promocode.deleteOne({ code: promocode });
        } else {
          finalAmount = (amountInt * numberOfPassengersInt) - 10;
          
        }}
        else{
          finalAmount = amountInt*numberOfPassengersInt;
        }
      }
      else{
        finalAmount = amountInt*numberOfPassengersInt;
      }
    console.log(finalAmount)
      // Step 3: Fetch all BoatOwners and compare their rounds
      const boatOwners = await BoatOwner.find();
      const minRound = Math.min(...boatOwners.map(owner => owner.round));
      const candidates = boatOwners.filter(owner => owner.round === minRound);
      const selectedBoatOwner = candidates[Math.floor(Math.random() * candidates.length)];
       if (selectedBoatOwner.size>60){
      selectedBoatOwner.round += 1;
       }
       else{
        selectedBoatOwner.size += numberOfPassengersInt;
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
    }} 
    else if(req.body.paymentMethod === 'stripe'){
    try {
      //paypal for sell 
     
      // Step 1: Prepare the payment data
      const { promocode, amount, email, firstName, lastName, phone , numberOfPassengers } = req.body;
  const numberOfPassengersInt = parseInt(numberOfPassengers, 10);
      const amountInt = parseInt(amount, 10);
      // Step 2: Validate the promocode if provided
      let finalAmount = amountInt;
      if (promocode) {
        const validPromocode = await Promocode.findOne({ code: promocode });
        if(validPromocode){
        if (numberOfPassengersInt>5) {
          
          // Apply a discount of 10 (you can adjust this logic as needed)
          finalAmount = (amountInt * numberOfPassengersInt) - 30;
          // Delete the promocode from the database
          await Promocode.deleteOne({ code: promocode });
        } else {
          finalAmount = (amountInt * numberOfPassengersInt) - 10;
          
        }}
        else{
          finalAmount = amountInt*numberOfPassengersInt;
        }
      }
      else{
        finalAmount = amountInt*numberOfPassengersInt;
      }
    console.log(finalAmount)
      // Step 3: Fetch all BoatOwners and compare their rounds
      const boatOwners = await BoatOwner.find();
      const minRound = Math.min(...boatOwners.map(owner => owner.round));
      const candidates = boatOwners.filter(owner => owner.round === minRound);
      const selectedBoatOwner = candidates[Math.floor(Math.random() * candidates.length)];
       if (selectedBoatOwner.size>60){
      selectedBoatOwner.round += 1;
       }
       else{
        selectedBoatOwner.size += numberOfPassengersInt;
       }
      await selectedBoatOwner.save();
  
      // Step 4: Create a new booking and associate the selected BoatOwner
      const newBooking = new Booking({ ...req.body, amount: finalAmount, boatOwner: selectedBoatOwner._id });
      const savedBooking = await newBooking.save();
  
      // Step 5: Prepare the payment request body
  
  
    
   const session = await stripe.checkout.sessions.create({
    line_items:[
      {
        price_data:{
          currency:'usd',
          product_data:{
            name:"tankwa transportaion"
          },
          unit_amount:finalAmount
        },
        quantity: numberOfPassengers,
      }
    ],
    mode:'payment',
    success_url:`${process.env.BASE_URL}/congratulation/${savedBooking._id}`,
    cancel_url:process.env.BASE_URL
   })

   res.json({ checkoutUrl: session.url });
  
    } catch (error) {
      console.log("Error handling payment:", error);
      res.status(500).json({ error: error.message });
    }} 
    else if(req.body.paymentMethod === 'paypal'){
      try {
        //paypal for sell 
       
        // Step 1: Prepare the payment data
        const { promocode, amount, email, firstName, lastName, phone , numberOfPassengers , preferredDate , currency ,paymentMethod , typeOfTransport , destinationLocation , departureLocation} = req.body;
       
    const numberOfPassengersInt = parseInt(numberOfPassengers, 10);
        const amountInt = parseInt(amount, 10);
        // Step 2: Validate the promocode if provided
        let finalAmount = amountInt;
        if (promocode) {
          const validPromocode = await Promocode.findOne({ code: promocode });
          if(validPromocode){
          if (numberOfPassengersInt>5) {
            
            // Apply a discount of 10 (you can adjust this logic as needed)
            finalAmount = (amountInt * numberOfPassengersInt) - 30;
            // Delete the promocode from the database
            await Promocode.deleteOne({ code: promocode });
          } else {
            finalAmount = (amountInt * numberOfPassengersInt) - 10;
            
          }}
          else{
            finalAmount = amountInt*numberOfPassengersInt;
          }
        }
        else{
          finalAmount = amountInt*numberOfPassengersInt;
        }
      console.log(finalAmount)
      const tempBooking = new TempBooking({
        promocode,
        amount: finalAmount,
        email,
        firstName,
        lastName,
        phone,
        currency,
        preferredDate,
        paymentMethod,
        typeOfTransport,
        destinationLocation,
        departureLocation,
        numberOfPassengers: numberOfPassengersInt,
    });
    const savedTempBooking = await tempBooking.save();

    // Step 4: Create PayPal order
    const urlpaypal = await paypal.createOrder(finalAmount, savedTempBooking._id);

    // Check if PayPal order creation was successful
    if (!urlpaypal) {
        throw new Error('Failed to create PayPal order');
    }

      return res.json({ url: urlpaypal });
      
    
       
    
      } catch (error) {
        console.log("Error handling payment:", error);
        res.status(500).json({ error: error.message });
      }
    }


  });

app.post('/paypal/return', async (req, res) => {
  try {
      const { tempBookingId, message } = req.body;
  console.log("tempBookingId"+tempBookingId)
      // Step 1: Verify the payment with PayPal

      if (message === 'Payment Approved') {
          // Step 2: Retrieve the temporary booking data
          const tempBooking = await TempBooking.findById(tempBookingId);
          if (!tempBooking) {
              throw new Error('Temporary booking data not found');
          }

          // Step 3: Fetch all BoatOwners and compare their rounds
          const boatOwners = await BoatOwner.find();
          const minRound = Math.min(...boatOwners.map(owner => owner.round));
          const candidates = boatOwners.filter(owner => owner.round === minRound);
          const selectedBoatOwner = candidates[Math.floor(Math.random() * candidates.length)];

          if (selectedBoatOwner.size > 60) {
              selectedBoatOwner.round += 1;
          } else {
              selectedBoatOwner.size += tempBooking.numberOfPassengers;
          }
          await selectedBoatOwner.save();

          // Step 4: Create a new booking and associate the selected BoatOwner
          const newBooking = new Booking({
              ...tempBooking.toObject(),
              boatOwner: selectedBoatOwner._id,
          });
          const savedBooking = await newBooking.save();

          // Step 5: Delete the temporary booking data
          await TempBooking.deleteOne({ _id: tempBookingId });

          // Step 6: Respond to the client with the booking details
          res.status(201).json({
              message: "Booking created successfully",
              booking: savedBooking,
              return_url: `http://localhost:3000/congratulation/${savedBooking._id}`,
          });
      } else {
          throw new Error('Payment not approved');
      }
  } catch (error) {
      console.log("Error handling PayPal return:", error);
      res.status(500).json({ error: error.message });
  }
});





// Signup Route

router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10); // Generate a salt
    const hashedPassword = await bcrypt.hash(password, salt); // Hash the password

    // Create a new user with the hashed password
    const newUser = new User({
      email,
      password: hashedPassword,
    });

    // Save the user to the database
    await newUser.save();

    // Generate a JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email }, // Payload
      process.env.JWT_SECRET, // Secret key (store in environment variables)
      { expiresIn: '1h' } // Token expiration time
    );

    // Respond with success and the token
    res.status(201).json({ message: 'User created successfully', user: newUser, token });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // If everything is correct, return a success response
    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
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

router.get('/bookings', async (req, res) => {
  try {
    // Fetch all bookings and populate the boatOwner details
    const bookings = await Booking.find()// Only include specific fields

    // Check if bookings exist
    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found' });
    }

    // Return the bookings
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Failed to fetch bookings', error: error.message });
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
app.post("/api/blogs", upload.single('image'), async (req, res) => {
  const { title, description } = req.body;

  // Check if a file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: "Image is required" });
  }

  try {
    // Upload the file to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: 'blogs', // Optional: Organize images in a folder
    });

    // Create a new blog post with the Cloudinary image URL
    const newBlog = new Blog({
      title,
      description,
      imageUrl: uploadResult.secure_url, // Use the secure URL from Cloudinary
    });

    // Save the blog post to the database
    await newBlog.save();

    // Respond with the created blog post
    res.status(201).json(newBlog);
  } catch (error) {
    console.error("Error creating blog post:", error);
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

// Route to get all blog posts
app.get("/users", async (req, res) => {
  try {
    const blogs = await User.find(); // Fetch all blogs from MongoDB
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

// Get all boat owners
router.get('/users', async (req, res) => {
  try {
    const userRes = await User.find();
    res.json(userRes);
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
const storagea = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to save uploaded images
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const uploads = multer({
  storage: storagea,
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

 router.post('/sponser', upload.single('logo'), async (req, res) => {
  console.log('Request Body:', req.body); // Log the request body
  console.log('Uploaded File:', req.file); // Log the uploaded file

  const { name, url, description, twitter, facebook, instagram } = req.body;

  try {
    let uploadResult;
    if (req.file) {
      console.log('Uploading to Cloudinary...');
      uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'sponsors', // Optional: specify a folder in Cloudinary
      });
      console.log('Cloudinary Upload Result:', uploadResult);
    }

    const newSponsor = new Sponsor({
      name,
      logo: uploadResult ? uploadResult.secure_url : '', // Use the Cloudinary URL
      url,
      description,
      twitter,
      facebook,
      instagram,
    });

    console.log('Saving Sponsor to Database...');
    await newSponsor.save();
    console.log('Sponsor Saved:', newSponsor);

    res.status(201).json(newSponsor);
  } catch (err) {
    console.error('Error in /sponser route:', err); // Log the full error
    res.status(500).json({ error: 'Failed to create sponsor', details: err.message });
  }
});
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


app.post('/upload', uploads.single('image'), async (req, res) => {
  console.log(req.body);
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'uploads'
    });

    const newDestination = await Destination.create({
      image: result.secure_url,
      title: req.body.title,
      description: req.body.description
    });

    res.status(201).json({
      title: newDestination.title,
      description: newDestination.description,
      imageUrl: newDestination.image
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/destinations', async (req, res) => {
  try {
    const destinations = await Destination.find();
    res.json(destinations);
  } catch (error) {
    res.status(500).send(error);
  }
});


app.get('/destinations', async (req, res) => {
  const { language } = req.query; // Get the language from query params

  try {
    const destinations = await Destination.find();

    // Map destinations to include only the requested language
    const filteredDestinations = destinations.map((destination) => ({
      _id: destination._id,
      title: destination.titles[language] || 'No Title', // Fallback if language not found
      description: destination.descriptions[language] || 'No Description', // Fallback if language not found
      image: destination.image
    }));

    res.json(filteredDestinations);
  } catch (error) {
    res.status(500).send(error);
  }
});


// Get all l.destinations
app.get('/destinations/:id', async (req, res) => {
  try {
      const id = req.params.id;

      // Check if the ID is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid ID format' });
      }

      const destination = await Destination.findById(id);

      if (!destination) {
          return res.status(404).send({ message: 'Destination not found' });
      }

      res.status(200).send(destination);
  } catch (error) {
      res.status(500).send({ message: 'Internal Server Error', error: error.message });
  }
});

// Update a destination
app.put('/destinations/:id', async (req, res) => {
  try {
      const destination = await Destination.findByIdAndUpdate(
          req.params.id,
          req.body,
          { new: true }
      );
      res.json(destination);
  } catch (error) {
      res.status(500).send(error);
  }
});
app.get('/destinations/:id', async (req, res) => {
  try {
      const destination = await Destination.findById(req.params.id);

      if (!destination) {
          return res.status(404).send({ message: 'Destination not found' });
      }

      res.status(200).send(destination);
  } catch (error) {
      res.status(500).send({ message: 'Internal Server Error', error: error.message });
  }
});
// Delete a destination
app.delete('/destinations/:id', async (req, res) => {
  try {
      await Destination.findByIdAndDelete(req.params.id);
      res.status(204).send();
  } catch (error) {
      res.status(500).send(error);
  }
});



// Use the router
app.use("/", router);

// Start the server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
