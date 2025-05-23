
# MERN Stack Backend Setup Guide

This document outlines how to set up the Express/Node.js backend server that connects to MongoDB for your goldsmith application.

## Project Structure

```
backend/
├── config/
│   └── db.js           # MongoDB connection setup
├── controllers/
│   ├── clientController.js    # Client CRUD operations
│   └── receiptController.js   # Receipt CRUD operations
├── models/
│   ├── Client.js       # Client schema
│   └── Receipt.js      # Receipt schema
├── routes/
│   ├── clientRoutes.js # Client API routes
│   └── receiptRoutes.js # Receipt API routes
├── middleware/
│   └── errorMiddleware.js # Error handling middleware
├── .env               # Environment variables (gitignored)
├── package.json       # Project dependencies
└── server.js          # Main entry point
```

## Installation Steps

1. Create a new directory for your backend:

```bash
mkdir goldsmith-backend
cd goldsmith-backend
npm init -y
```

2. Install the necessary dependencies:

```bash
npm install express mongoose dotenv cors morgan nodemon
```

3. Create a `.env` file in the root directory:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/
NODE_ENV=development
```

## Implementation

### 1. Database Connection (config/db.js)

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### 2. Client Model (models/Client.js)

```javascript
const mongoose = require('mongoose');

const clientSchema = mongoose.Schema(
  {
    shopName: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
```

### 3. Receipt Model (models/Receipt.js)

```javascript
const mongoose = require('mongoose');

const receiptItemSchema = mongoose.Schema({
  itemName: {
    type: String,
    required: true,
  },
  tag: {
    type: String,
    required: true,
  },
  grossWt: {
    type: Number,
    required: true,
  },
  stoneWt: {
    type: Number,
    required: true,
  },
  meltingTouch: {
    type: Number,
    required: true,
  },
  stoneAmt: {
    type: Number,
    required: true,
  },
});

const receiptSchema = mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Client',
    },
    clientInfo: {
      clientName: {
        type: String,
        required: true,
      },
      shopName: {
        type: String,
        required: true,
      },
      phoneNumber: {
        type: String,
        required: true,
      },
    },
    metalType: {
      type: String,
      required: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    items: [receiptItemSchema],
    totals: {
      grossWt: {
        type: Number,
        required: true,
      },
      stoneWt: {
        type: Number,
        required: true,
      },
      netWt: {
        type: Number,
        required: true,
      },
      finalWt: {
        type: Number,
        required: true,
      },
      stoneAmt: {
        type: Number,
        required: true,
      },
    },
    voucherId: {
      type: String,
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Receipt = mongoose.model('Receipt', receiptSchema);

module.exports = Receipt;
```

### 4. Client Controller (controllers/clientController.js)

```javascript
const Client = require('../models/Client');
const asyncHandler = require('express-async-handler');

// @desc    Get all clients
// @route   GET /api/clients
// @access  Public
const getClients = asyncHandler(async (req, res) => {
  const clients = await Client.find({});
  res.json(clients);
});

// @desc    Get client by ID
// @route   GET /api/clients/:id
// @access  Public
const getClientById = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  
  if (client) {
    res.json(client);
  } else {
    res.status(404);
    throw new Error('Client not found');
  }
});

// @desc    Create new client
// @route   POST /api/clients
// @access  Public
const createClient = asyncHandler(async (req, res) => {
  const { shopName, clientName, phoneNumber, address } = req.body;

  const client = await Client.create({
    shopName,
    clientName,
    phoneNumber,
    address,
  });

  if (client) {
    res.status(201).json(client);
  } else {
    res.status(400);
    throw new Error('Invalid client data');
  }
});

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Public
const updateClient = asyncHandler(async (req, res) => {
  const { shopName, clientName, phoneNumber, address } = req.body;

  const client = await Client.findById(req.params.id);

  if (client) {
    client.shopName = shopName || client.shopName;
    client.clientName = clientName || client.clientName;
    client.phoneNumber = phoneNumber || client.phoneNumber;
    client.address = address || client.address;

    const updatedClient = await client.save();
    res.json(updatedClient);
  } else {
    res.status(404);
    throw new Error('Client not found');
  }
});

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Public
const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (client) {
    await client.remove();
    res.json({ message: 'Client removed' });
  } else {
    res.status(404);
    throw new Error('Client not found');
  }
});

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
```

### 5. Receipt Controller (controllers/receiptController.js)

```javascript
const Receipt = require('../models/Receipt');
const Client = require('../models/Client');
const asyncHandler = require('express-async-handler');

// Helper to generate a unique voucher ID
const generateVoucherId = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `GS-${year}${month}`;
  
  // Find the latest receipt with this prefix
  const latestReceipt = await Receipt.findOne({ 
    voucherId: { $regex: `^${prefix}` } 
  }).sort({ voucherId: -1 });
  
  let nextNumber = 1;
  if (latestReceipt) {
    // Extract the number from the latest receipt ID
    const latestNumber = parseInt(latestReceipt.voucherId.split('-')[2]);
    nextNumber = latestNumber + 1;
  }
  
  // Format the number with leading zeros
  const formattedNumber = nextNumber.toString().padStart(4, '0');
  return `${prefix}-${formattedNumber}`;
};

// @desc    Get all receipts
// @route   GET /api/receipts
// @access  Public
const getReceipts = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find({}).sort({ createdAt: -1 });
  res.json(receipts);
});

// @desc    Get receipt by ID
// @route   GET /api/receipts/:id
// @access  Public
const getReceiptById = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id);
  
  if (receipt) {
    res.json(receipt);
  } else {
    res.status(404);
    throw new Error('Receipt not found');
  }
});

// @desc    Get receipts by client ID
// @route   GET /api/receipts/client/:clientId
// @access  Public
const getReceiptsByClientId = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find({ clientId: req.params.clientId }).sort({ createdAt: -1 });
  res.json(receipts);
});

// @desc    Create new receipt
// @route   POST /api/receipts
// @access  Public
const createReceipt = asyncHandler(async (req, res) => {
  const { clientId, clientInfo, metalType, issueDate, items, totals } = req.body;

  // Validate client exists
  const client = await Client.findById(clientId);
  if (!client) {
    res.status(404);
    throw new Error('Client not found');
  }

  // Generate unique voucher ID
  const voucherId = await generateVoucherId();

  const receipt = await Receipt.create({
    clientId,
    clientInfo,
    metalType,
    issueDate: issueDate || new Date(),
    items,
    totals,
    voucherId,
  });

  if (receipt) {
    res.status(201).json(receipt);
  } else {
    res.status(400);
    throw new Error('Invalid receipt data');
  }
});

// @desc    Update receipt
// @route   PUT /api/receipts/:id
// @access  Public
const updateReceipt = asyncHandler(async (req, res) => {
  const { metalType, issueDate, items, totals } = req.body;

  const receipt = await Receipt.findById(req.params.id);

  if (receipt) {
    receipt.metalType = metalType || receipt.metalType;
    receipt.issueDate = issueDate || receipt.issueDate;
    receipt.items = items || receipt.items;
    receipt.totals = totals || receipt.totals;

    const updatedReceipt = await receipt.save();
    res.json(updatedReceipt);
  } else {
    res.status(404);
    throw new Error('Receipt not found');
  }
});

// @desc    Delete receipt
// @route   DELETE /api/receipts/:id
// @access  Public
const deleteReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id);

  if (receipt) {
    await receipt.remove();
    res.json({ message: 'Receipt removed' });
  } else {
    res.status(404);
    throw new Error('Receipt not found');
  }
});

// @desc    Generate a new unique voucher ID
// @route   GET /api/receipts/generate-voucher-id
// @access  Public
const getVoucherId = asyncHandler(async (req, res) => {
  const voucherId = await generateVoucherId();
  res.json({ voucherId });
});

module.exports = {
  getReceipts,
  getReceiptById,
  getReceiptsByClientId,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  getVoucherId,
};
```

### 6. Client Routes (routes/clientRoutes.js)

```javascript
const express = require('express');
const router = express.Router();
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} = require('../controllers/clientController');

router.route('/').get(getClients).post(createClient);
router.route('/:id').get(getClientById).put(updateClient).delete(deleteClient);

module.exports = router;
```

### 7. Receipt Routes (routes/receiptRoutes.js)

```javascript
const express = require('express');
const router = express.Router();
const {
  getReceipts,
  getReceiptById,
  getReceiptsByClientId,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  getVoucherId,
} = require('../controllers/receiptController');

router.route('/').get(getReceipts).post(createReceipt);
router.route('/generate-voucher-id').get(getVoucherId);
router.route('/client/:clientId').get(getReceiptsByClientId);
router.route('/:id').get(getReceiptById).put(updateReceipt).delete(deleteReceipt);

module.exports = router;
```

### 8. Error Middleware (middleware/errorMiddleware.js)

```javascript
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
```

### 9. Server Entry Point (server.js)

```javascript
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/receipts', require('./routes/receiptRoutes'));

// Error Middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

## Running the Backend

1. Add a script to package.json:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

2. Start the development server:

```bash
npm run dev
```

## Deployment Options

For deploying your backend, consider:

1. Heroku
2. Vercel
3. Netlify Functions
4. AWS Lambda
5. Google Cloud Functions

Make sure to update the API_URL in your frontend to point to your deployed backend.
